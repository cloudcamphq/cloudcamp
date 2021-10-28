import {
  CloudFormationClient,
  DescribeStacksCommand,
  StackStatus,
  Stack,
} from "@aws-sdk/client-cloudformation";
import _ from "lodash";
import { AWSClientConfig } from "./config";
import {
  GetParameterCommand,
  GetParametersByPathCommand,
  SSMClient,
} from "@aws-sdk/client-ssm";

/**
 * Query Cloudformation stacks
 */
export class CloudFormation {
  /**
   * True if the stack exists
   */
  static async stackExists(name: string): Promise<boolean> {
    try {
      await new CloudFormationClient(AWSClientConfig).send(
        new DescribeStacksCommand({ StackName: name })
      );
      return true;
    } catch (_err) {
      return false;
    }
  }

  static async getDeploymentStatus(
    appName: string
  ): Promise<"COMPLETE" | "IN_PROGRESS" | undefined> {
    let pipelineStack = await CloudFormation.getPipelineStack(appName);
    if (!pipelineStack) {
      return undefined;
    }

    switch (pipelineStack.StackStatus) {
      case StackStatus.CREATE_IN_PROGRESS:
      case StackStatus.REVIEW_IN_PROGRESS:
        return "IN_PROGRESS";
      default:
        return "COMPLETE";
    }
  }

  static async getPipelineStack(appName: string): Promise<Stack | undefined> {
    let ssmResult;
    try {
      ssmResult = await new SSMClient(AWSClientConfig).send(
        new GetParameterCommand({
          Name: `/cloudcamp/${appName}/_/pipeline-stack`,
        })
      );
    } catch (_e) {
      return undefined;
    }

    if (!ssmResult.Parameter) {
      return undefined;
    }

    let stackName = ssmResult.Parameter!.Value!;

    let result = await new CloudFormationClient(AWSClientConfig).send(
      new DescribeStacksCommand({ StackName: stackName })
    );
    if (!result.Stacks || !result.Stacks.length) {
      return undefined;
    }

    return result.Stacks[0];
  }

  static async getOutputs(appName: string) {
    let ssmResult;
    try {
      ssmResult = await new SSMClient(AWSClientConfig).send(
        new GetParametersByPathCommand({
          Path: `/cloudcamp/${appName}/_/stack`,
        })
      );
    } catch (_e) {
      return [];
    }
    let stacks: string[] = (ssmResult.Parameters || [])
      .map((param) => param.Value)
      .filter((param) => param !== undefined) as string[];

    let outputs: any[] = [];
    for (let stack of stacks) {
      let stage = stack.toLowerCase().slice(appName.length);

      let stackResult = await new CloudFormationClient(AWSClientConfig).send(
        new DescribeStacksCommand({ StackName: stack })
      );

      for (let output of stackResult.Stacks![0].Outputs || []) {
        outputs.push(
          this.outputDescription(
            output.OutputKey!,
            output.OutputValue!,
            stage,
            stack
          )
        );
      }
    }

    return _.sortBy(
      outputs.filter((o) => o !== undefined),
      ["stack", "id", "name"]
    );
  }

  private static outputDescription(
    key: string,
    value: string,
    stage: string,
    stack: string
  ) {
    let matchers = [
      {
        regex: new RegExp("^(.*?)fargateserviceServiceURL(.*?)$"),
        name: "Web Server URL",
        idIndex: 1,
        skip: false,
      },
      {
        regex: new RegExp("^(.*?)fargateserviceLoadBalancerDNS(.*?)$"),
        name: "Web Server URL",
        idIndex: 1,
        skip: true,
      },
    ];

    let name = key;
    let id = "";
    let skip = false;

    for (let matcher of matchers) {
      let result = key.match(matcher.regex);
      if (result) {
        name = matcher.name;
        id = result[matcher.idIndex];
        skip = matcher.skip;
        break;
      }
    }

    if (skip) {
      return undefined;
    }

    return {
      stack: stack,
      stage: stage,
      id: id,
      name: name,
      value: value,
    };
  }
}
