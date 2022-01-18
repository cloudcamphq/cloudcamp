import { flags } from "@oclif/command";
import { CONTEXT_KEY_NAME } from "@cloudcamp/aws-runtime/src/constants";
import { CloudFormation, setupAWS } from "../aws";
import { BaseCommand } from "../command";
import { getCdkJsonContext } from "../utils";
import chalk from "chalk";
import { CodePipeline } from "../aws/codepipeline";
import notifier from "node-notifier";
import * as path from "path";
import { cli } from "cli-ux";
import _ from "lodash";
import { resolveHome } from "../utils";

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
    profile: flags.string({ char: "p", description: "The AWS profile name" }),
    home: flags.string({ description: "The home directory of your app." }),
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
    const home = resolveHome(flags.home);
    await setupAWS(home, flags.profile);

    const appName = getCdkJsonContext(home)[CONTEXT_KEY_NAME];
    const status = await CloudFormation.getDeploymentStatus(appName);
    const statusDescr = this.deploymentStatusDescr(status);

    if (status === undefined) {
      this.ux.log("Deployment Status: \t", statusDescr);

      throw new Error("App is not deployed.");
    }

    let action = undefined;
    let stage = undefined;

    if (flags.action !== "**current**") {
      const idx = flags.action.indexOf(".");
      if (idx == -1) {
        throw new Error(
          `Invalid format: '${flags.action}'. Use 'stage.action'`
        );
      }
      stage = flags.action.slice(0, idx);
      action = flags.action.slice(idx + 1);
    }

    const result = await this.getPipelineStatii(appName, stage, action);
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
    const home = resolveHome(flags.home);
    await setupAWS(home, flags.profile);
    const appName = getCdkJsonContext(home)[CONTEXT_KEY_NAME];

    const form = (label: string, data: string) => {
      const numSpaces =
        Math.max(
          "Deployment Status".length,
          "Build Status".length,
          "Git commit URL".length
        ) +
        2 -
        label.length;
      return label + ":" + " ".repeat(numSpaces) + data;
    };

    this.ux.log("");
    while (true) {
      const deploymentStatus = await CloudFormation.getDeploymentStatus(
        appName
      );
      const deploymentStatusDescr =
        this.deploymentStatusDescr(deploymentStatus);

      if (deploymentStatus === undefined) {
        this.ux.log(form("Deployment Status", deploymentStatusDescr));
        return;
      }

      const result = await this.getPipelineStatus(appName);
      let status = result.status;
      let descr = result.descr;

      if (result.latestCommitUrl) {
        this.ux.log(form("Git commit URL", chalk.blue(result.latestCommitUrl)));
      }

      this.ux.log(form("Deployment Status", deploymentStatusDescr));

      if (!flags.wait && !flags.forever) {
        this.ux.log(form("Build Status", descr));
      } else {
        let prevPipelineStatus = status;
        let prevPipelineStatusDescr = descr;
        if (status != "InProgress") {
          descr = "⧗ Waiting";
        }
        this.ux.start(form("Build Status", descr));
        while (true) {
          await new Promise((resolve, _reject) => setTimeout(resolve, 5000));
          const pipelineStatus = await this.getPipelineStatus(appName);
          status = pipelineStatus.status;
          descr = pipelineStatus.descr;

          if (prevPipelineStatusDescr != descr) {
            this.ux.update(form("Build Status", descr));
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

        const image = path.join(__dirname, "..", "..", "resources", "logo.png");
        notifier.notify({
          title: "Pipeline execution finished.",
          message: "Build Status: " + noteDescr,
          icon: image,
          contentImage: image,
          sound: "Blow",
          wait: true,
        });
      }

      const outputs = await CloudFormation.getOutputs(appName);
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
    const pipeline = await CodePipeline.getPipeline(appName);

    let status = "InProgress";
    let descr: string;
    let stage: string | undefined;
    let action: string | undefined;
    let progress = "";
    let latestCommitUrl = undefined;

    if (pipeline !== undefined) {
      const execution = await CodePipeline.getLatestPipelineExecution(
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
    const pipeline = await CodePipeline.getPipeline(appName);
    if (pipeline == undefined) {
      throw new Error("Pipeline not found.");
    }
    const logs = await CodePipeline.getLogs(pipeline.name!, stage, action);
    let logText = undefined;
    let logStage = undefined;
    let logAction = undefined;

    if (logs) {
      logText = logs.logText;
      logStage = logs.logStage;
      logAction = logs.logAction;
    }

    const result = (await CodePipeline.getAllStatii(pipeline.name!)) || [];
    const statii = result.map((status) => ({
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
