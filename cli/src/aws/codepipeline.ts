import {
  CodePipelineClient,
  GetPipelineCommand,
  GetPipelineStateCommand,
  PipelineDeclaration,
  GetPipelineExecutionCommand,
  ListActionExecutionsCommand,
} from "@aws-sdk/client-codepipeline";
import _ from "lodash";
import { AWSClientConfig } from "./config";
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import {
  CodeBuildClient,
  ListBuildsForProjectCommand,
  BatchGetBuildsCommand,
} from "@aws-sdk/client-codebuild";
import {
  CloudWatchLogsClient,
  GetLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import {
  CloudFormationClient,
  DescribeStackEventsCommand,
} from "@aws-sdk/client-cloudformation";

export class CodePipeline {
  static async getLatestPipelineExecution(pipelineName: string): Promise<
    | {
        executionId: string;
        status: string;
        stage?: string;
        action?: string;
        revisionUrl?: string;
        progress: string;
      }
    | undefined
  > {
    let result = await new CodePipelineClient(AWSClientConfig).send(
      new GetPipelineStateCommand({ name: pipelineName })
    );
    if (
      !result.stageStates ||
      !result.stageStates.length ||
      !result.stageStates[0].latestExecution
    ) {
      return undefined;
    }

    // we are always interested in the latest execution (stage 1)
    let pipelineExecutionId =
      result.stageStates[0].latestExecution.pipelineExecutionId!;

    let executionResult = await new CodePipelineClient(AWSClientConfig).send(
      new GetPipelineExecutionCommand({
        pipelineExecutionId: pipelineExecutionId,
        pipelineName: pipelineName,
      })
    );

    let actionExecutions = await new CodePipelineClient(AWSClientConfig).send(
      new ListActionExecutionsCommand({
        pipelineName: pipelineName,
        filter: { pipelineExecutionId: pipelineExecutionId },
      })
    );

    let stage = undefined;
    let action = undefined;
    let progress = "";

    if (
      actionExecutions.actionExecutionDetails &&
      actionExecutions.actionExecutionDetails.length
    ) {
      stage = actionExecutions.actionExecutionDetails[0].stageName;
      action = actionExecutions.actionExecutionDetails[0].actionName;
      let numStages = result.stageStates.length;
      let currentStage = new Set(
        actionExecutions.actionExecutionDetails.map((d) => d.stageName)
      ).size;
      progress = ` [${currentStage}/${numStages}]`;
    }

    let revisionUrl = undefined;
    if (
      executionResult.pipelineExecution?.artifactRevisions &&
      executionResult.pipelineExecution?.artifactRevisions.length
    ) {
      revisionUrl =
        executionResult.pipelineExecution?.artifactRevisions[0].revisionUrl;
    }

    return {
      executionId: pipelineExecutionId,
      status: executionResult.pipelineExecution!.status!,
      revisionUrl: revisionUrl,
      stage: stage,
      action: action,
      progress: progress,
    };
  }

  static async getLogs(
    pipelineName: string,
    stage?: string,
    action?: string
  ): Promise<
    | {
        logText?: string;
        logEvents?: {
          date: Date;
          id: string;
          type: string;
          status: string;
          reason: string;
        }[];
        logStage: string;
        logAction: string;
      }
    | undefined
  > {
    let result = await new CodePipelineClient(AWSClientConfig).send(
      new GetPipelineStateCommand({ name: pipelineName })
    );
    if (!result.stageStates || !result.stageStates.length) {
      return;
    }

    let pipelineExecutionId = undefined;
    let logStage = undefined;
    let logAction = undefined;

    if (!stage) {
      if (!result.stageStates[0].latestExecution) {
        return;
      }
      pipelineExecutionId =
        result.stageStates[0].latestExecution.pipelineExecutionId!;
      logStage = result.stageStates[0].stageName!;
    } else {
      for (let state of result.stageStates) {
        if (state.stageName == stage && state.latestExecution) {
          if (!state.latestExecution) {
            return;
          }
          pipelineExecutionId = state.latestExecution.pipelineExecutionId;
          logStage = state.stageName!;
        }
      }
    }

    if (!pipelineExecutionId) {
      throw new Error(`Stage not found: ${stage}.${action}`);
    }

    let actionExecutions = await new CodePipelineClient(AWSClientConfig).send(
      new ListActionExecutionsCommand({
        pipelineName: pipelineName,
        filter: { pipelineExecutionId: pipelineExecutionId },
      })
    );

    if (
      !actionExecutions.actionExecutionDetails ||
      !actionExecutions.actionExecutionDetails.length
    ) {
      return;
    }

    let executionDetail = undefined;
    if (!action) {
      executionDetail = actionExecutions.actionExecutionDetails[0];
      logAction = actionExecutions.actionExecutionDetails[0].actionName!;
    } else {
      for (let execution of actionExecutions.actionExecutionDetails) {
        if (execution.actionName == action) {
          executionDetail = execution;
          logAction = execution.actionName!;
        }
      }
    }

    if (!executionDetail) {
      throw new Error(`Action not found: ${stage}.${action}`);
    }

    if (
      !(
        executionDetail.input &&
        executionDetail.input.configuration &&
        executionDetail.input.actionTypeId
      )
    ) {
      return;
    }

    if (executionDetail.input.actionTypeId.provider == "CodeBuild") {
      let projectName: string = executionDetail.input.configuration.ProjectName;
      let buildsList = await new CodeBuildClient(AWSClientConfig).send(
        new ListBuildsForProjectCommand({ projectName: projectName })
      );
      if (!(buildsList.ids && buildsList.ids.length)) {
        return;
      }
      let buildId: string = buildsList.ids[0];
      let build = await new CodeBuildClient(AWSClientConfig).send(
        new BatchGetBuildsCommand({ ids: [buildId] })
      );

      if (
        !(
          build.builds &&
          build.builds.length &&
          build.builds[0].logs &&
          build.builds[0].logs.groupName &&
          build.builds[0].logs.streamName
        )
      ) {
        return;
      }
      let logGroupName = build.builds[0].logs.groupName;
      let logStreamName = build.builds[0].logs.streamName;
      let logEvents = await new CloudWatchLogsClient(AWSClientConfig).send(
        new GetLogEventsCommand({
          logGroupName: logGroupName,
          logStreamName: logStreamName,
        })
      );
      let logs = (logEvents.events || [])
        .map((ev) => ev.message || "")
        .join("")
        .trim();
      return { logText: logs, logStage: logStage!, logAction: logAction! };
    } else if (
      executionDetail.input.actionTypeId.provider == "CloudFormation"
    ) {
      let stackEvents = await new CloudFormationClient(AWSClientConfig).send(
        new DescribeStackEventsCommand({
          StackName: executionDetail.input.configuration!.StackName,
        })
      );
      let logEvents = [];
      for (let event of stackEvents.StackEvents || []) {
        logEvents.push({
          date: event.Timestamp!,
          id: event.LogicalResourceId!,
          type: event.ResourceType!,
          status: event.ResourceStatus!,
          reason: event.ResourceStatusReason || "",
        });
      }
      return {
        logEvents: logEvents,
        logStage: logStage!,
        logAction: logAction!,
      };
    }
    return undefined;
  }

  static async getAllStatii(pipelineName: string): Promise<
    | {
        status: string | undefined;
        stage: string;
        action: string;
        date?: Date;
      }[]
    | undefined
  > {
    let pipelineState = await new CodePipelineClient(AWSClientConfig).send(
      new GetPipelineStateCommand({ name: pipelineName })
    );
    if (
      !pipelineState.stageStates ||
      !pipelineState.stageStates.length ||
      !pipelineState.stageStates[0].latestExecution
    ) {
      return undefined;
    }

    let results = [];
    for (let stageState of pipelineState.stageStates) {
      for (let actionState of stageState.actionStates || []) {
        results.push({
          status: actionState.latestExecution?.status,
          stage: stageState.stageName!,
          action: actionState.actionName!,
          date: actionState.latestExecution?.lastStatusChange,
        });
      }
    }

    return results;
  }

  static async getPipeline(
    appName: string
  ): Promise<PipelineDeclaration | undefined> {
    let ssmResult;
    try {
      ssmResult = await new SSMClient(AWSClientConfig).send(
        new GetParameterCommand({
          Name: `/cloudcamp/${appName}/_/codepipeline`,
        })
      );
    } catch (_e) {
      return undefined;
    }

    if (!ssmResult.Parameter) {
      return undefined;
    }

    let result = await new CodePipelineClient(AWSClientConfig).send(
      new GetPipelineCommand({ name: ssmResult.Parameter.Value! })
    );
    return result.pipeline;
  }
}
