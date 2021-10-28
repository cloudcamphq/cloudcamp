import { flags } from "@oclif/command";
import { CONTEXT_KEY_NAME } from "@cloudcamp/aws-runtime/src/constants";
import { CloudFormation } from "../aws";
import { BaseCommand } from "../command";
import { getCdkJsonContext } from "../project";
import chalk from "chalk";
import { CodePipeline } from "../aws/codepipeline";
import notifier from "node-notifier";
import * as path from "path";
import { cli } from "cli-ux";
import _ from "lodash";

interface PipelineStatus {
  stage?: string;
  action?: string;
  status: string | undefined;
  descr: string;
  latestCommitUrl?: string;
  date?: Date;
}
/**
 * @order 3
 */
export default class ShowStatus extends BaseCommand {
  static description = `Show the status of the current pipeline execution.`;

  static flags = {
    help: flags.help({ char: "h" }),
    profile: flags.string({ char: "p", description: "the AWS profile name" }),
    wait: flags.boolean({
      char: "w",
      description: "Wait for the next pipeline execution",
    }),
    forever: flags.boolean({
      char: "f",
      description: "Continuously wait for the next pipeline execution",
    }),
    notify: flags.boolean({
      char: "n",
      description: "Get a desktop notification when the pipeline is finished",
    }),
    trace: flags.boolean({
      char: "t",
      description: "Print logs of the execution of a stage/action.",
    }),
    action: flags.string({
      char: "a",
      required: true,
      default: "**current**",
      description: "Use this to set the stage.action together with --trace.",
    }),
  };

  async run() {
    const { flags } = this.parse(ShowStatus);
    if (!flags.trace) {
      await this.status();
    } else {
      await this.trace();
    }
  }

  private async trace() {
    const { flags } = this.parse(ShowStatus);
    this.setup(flags);
    let appName = getCdkJsonContext()[CONTEXT_KEY_NAME];
    let status = await CloudFormation.getDeploymentStatus(appName);
    let statusDescr = this.deploymentStatusDescr(status);

    if (status === undefined) {
      this.ux.log("Deployment Status: \t", statusDescr);

      throw new Error("App is not deployed.");
    }

    let action = undefined;
    let stage = undefined;

    if (flags.action !== "**current**") {
      let idx = flags.action.indexOf(".");
      if (idx == -1) {
        throw new Error(
          `Invalid format: '${flags.action}'. Use 'stage.action'`
        );
      }
      stage = flags.action.slice(0, idx);
      action = flags.action.slice(idx + 1);
    }

    let result = await this.getPipelineStatii(appName, stage, action);
    this.ux.log("");

    cli.table(
      result.statii,
      {
        stage: {},
        action: {},
        descr: {},
        date: {},
      },
      // @ts-ignore
      {
        printLine: this.log,
      }
    );

    this.ux.log("");

    if (result.logText) {
      this.ux.log(chalk.bold(`Logs (${result.logStage}.${result.logAction}):`));
      this.ux.log("");
      this.ux.log(result.logText);
      this.ux.log("");
    } else if (result.logEvents) {
      this.ux.log(
        chalk.bold(
          `CloudFormation Events (${result.logStage}.${result.logAction}):`
        )
      );
      this.ux.log("");
      cli.table(
        result.logEvents,
        {
          date: {},
          status: {},
          reason: {},
          id: {},
          type: {},
        },
        // @ts-ignore
        {
          printLine: this.log,
        }
      );

      this.ux.log("");
    }
  }

  private async status() {
    const { flags } = this.parse(ShowStatus);
    this.setup(flags);
    let appName = getCdkJsonContext()[CONTEXT_KEY_NAME];

    this.ux.log("");
    while (true) {
      let deploymentStatus = await CloudFormation.getDeploymentStatus(appName);
      let deploymentStatusDescr = this.deploymentStatusDescr(deploymentStatus);

      if (deploymentStatus === undefined) {
        this.ux.log("Deployment Status: \t", deploymentStatusDescr);
        return;
      }

      let result = await this.getPipelineStatus(appName);
      let status = result.status;
      let descr = result.descr;

      this.ux.log("Deployment Status: \t", deploymentStatusDescr);

      if (!flags.wait && !flags.forever) {
        this.ux.log("Build Status: \t", descr);
      } else {
        let prevPipelineStatus = status;
        let prevPipelineStatusDescr = descr;
        if (status != "InProgress") {
          descr = "⧗ Waiting";
        }
        this.ux.start("Build Status: \t " + descr);
        while (true) {
          await new Promise((resolve, _reject) => setTimeout(resolve, 5000));
          let pipelineStatus = await this.getPipelineStatus(appName);
          status = pipelineStatus.status;
          descr = pipelineStatus.descr;

          if (prevPipelineStatusDescr != descr) {
            this.ux.update("Build Status: \t " + descr);
          }
          prevPipelineStatusDescr = descr;

          if (prevPipelineStatus != status) {
            if (pipelineStatus.status !== "InProgress") {
              this.ux.stop("");
              break;
            }
          }
          prevPipelineStatus = status;
        }
      }
      if (result.latestCommitUrl) {
        this.ux.log("Git commit URL: \t", chalk.blue(result.latestCommitUrl));
      }

      if ((flags.wait || flags.forever) && flags.notify) {
        let noteDescr: string;

        switch (status) {
          case "Succeeded":
            noteDescr = "✅ Succeeded";
            break;
          case "Failed":
            noteDescr = "❌ Failed";
            break;
          default:
            noteDescr = status || "";
            break;
        }

        let image = path.join(__dirname, "..", "..", "resources", "logo.png");
        notifier.notify({
          title: "Pipeline execution finished.",
          message: "Build Status: " + noteDescr,
          icon: image,
          contentImage: image,
          sound: "Blow",
          wait: true,
        });
      }

      let outputs = await CloudFormation.getOutputs(appName);
      if (outputs.length) {
        this.ux.log("");
        this.ux.log("Outputs:");
        this.ux.log("");
        cli.table(
          outputs,
          {
            stack: {},
            id: {
              header: "ID",
            },
            name: {
              header: "Type",
            },
            value: {},
          },
          // @ts-ignore
          {
            printLine: this.log,
          }
        );
      }
      this.ux.log("");

      if (!flags.forever) {
        break;
      }
    }
  }

  private deploymentStatusDescr(status?: string) {
    switch (status) {
      case "COMPLETE":
        return chalk.green("✔ Deployed");
      case "IN_PROGRESS":
        return chalk.blue("⧗ In Progress");
      default:
        return chalk.gray("✘ Not Deployed");
    }
  }

  private async getPipelineStatus(appName: string): Promise<PipelineStatus> {
    let pipeline = await CodePipeline.getPipeline(appName);

    let status = "InProgress";
    let descr: string;
    let stage: string | undefined;
    let action: string | undefined;
    let progress = "";
    let latestCommitUrl = undefined;

    if (pipeline !== undefined) {
      let execution = await CodePipeline.getLatestPipelineExecution(
        pipeline.name!
      );

      if (execution) {
        status = execution.status;
        progress = execution.progress;
        stage = execution.stage;
        action = execution.action;
        latestCommitUrl = execution.revisionUrl;
      }
    }

    descr = this.descrForStatus(status, stage, action, progress, false);

    return {
      status: status,
      descr: descr,
      stage: stage,
      action: action,
      latestCommitUrl: latestCommitUrl,
    };
  }

  private descrForStatus(
    status: string,
    stage?: string,
    action?: string,
    progress?: string,
    traceMode: boolean = true
  ) {
    switch (status) {
      case "Failed":
        let descrf;
        if (stage && action && !traceMode) {
          descrf = chalk.red(`✘ Failed - ${stage}.${action}`);
        } else {
          descrf = chalk.red("✘ Failed");
        }
        if (!traceMode) {
          descrf += chalk.gray(" (run `camp status --trace` to see details)");
        }
        return descrf;
      case "InProgress":
        let descr;
        if (progress) {
          descr = chalk.blue("⧗ In Progress" + progress);
          if (stage && action && !traceMode) {
            descr += ` ${stage}.${action}`;
          }
        } else {
          descr = chalk.blue("⧗ In Progress");
        }
        return descr;
      case "Succeeded":
        return chalk.green("✔ Succeeded");
      default:
        return chalk.gray("✘ " + status);
    }
  }

  private async getPipelineStatii(
    appName: string,
    stage?: string,
    action?: string
  ): Promise<{
    logText?: string;
    logEvents?: any[];
    logStage?: string;
    logAction?: string;
    statii: PipelineStatus[];
  }> {
    let pipeline = await CodePipeline.getPipeline(appName);
    if (pipeline == undefined) {
      throw new Error("Pipeline not found.");
    }
    let logs = await CodePipeline.getLogs(pipeline.name!, stage, action);
    let logText = undefined;
    let logStage = undefined;
    let logAction = undefined;

    if (logs) {
      logText = logs.logText;
      logStage = logs.logStage;
      logAction = logs.logAction;
    }

    let result = (await CodePipeline.getAllStatii(pipeline.name!)) || [];
    let statii = result.map((status) => ({
      stage: status.stage,
      action: status.action,
      status: status.status,
      descr: this.descrForStatus(
        status.status || "Not Started",
        status.stage,
        status.action
      ),
      latestCommitUrl: undefined,
      date: status.date,
    }));

    return {
      logText: logText,
      logEvents: logs?.logEvents,
      logStage: logStage,
      logAction: logAction,
      statii: statii,
    };
  }
}
