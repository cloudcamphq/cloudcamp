import { AwsRegion } from "@cloudcamp/aws-runtime/src/types";
import * as child_process from "child_process";
import * as readline from "readline";
import cli from "cli-ux";
import { Readable } from "stream";
import { UX } from "../ux";
import path from "path";
let fsExtra = require("fs-extra");

let cdkBinary = path.join(__dirname, "..", "..", "node_modules", ".bin", "cdk");

/**
 * Run CDK commands
 */
export class CDK {
  static async bootstrap(account: string, region: AwsRegion, profile?: string) {
    let cmd =
      `${cdkBinary} bootstrap --trust ${account} aws://${account}/${region} ` +
      ` --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess`;
    if (profile) {
      cmd += ` --profile ${profile}`;
    }
    return new Promise<void>((resolve, reject) => {
      child_process.exec(
        cmd,
        {
          windowsHide: true,
        },
        (err, stdout, stderr) => {
          if (err) {
            console.log(stdout);
            console.log(stderr);
            reject("cdk bootstrap failed.");
          } else {
            resolve();
          }
        }
      );
    });
  }

  static async synth(profile?: string) {
    let cmd = `${cdkBinary} synth`;
    if (profile) {
      cmd += ` --profile ${profile}`;
    }
    return new Promise<void>((resolve, reject) => {
      child_process.exec(
        cmd,
        {
          windowsHide: true,
        },
        (err, stdout, stderr) => {
          if (err) {
            console.log(stdout);
            console.log(stderr);
            reject("cdk synth failed.");
          } else {
            fsExtra.removeSync("cdk.out");
            resolve();
          }
        }
      );
    });
  }

  static async runDeployCommand(cmd: string, ux: UX): Promise<void> {
    return new Promise((resolve, reject) => {
      let child = child_process.exec(
        cmd,
        {
          windowsHide: true,
        },
        (err) => {
          if (err) {
            return reject(err);
          }
          return resolve();
        }
      );
      let progress = new DeployProgress(child.stderr, ux);
      progress.start();
    });
  }

  static async deploy(ux: UX, profile?: string) {
    let cmd = `${cdkBinary} deploy --require-approval never --progress events`;
    if (profile) {
      cmd += ` --profile ${profile}`;
    }
    try {
      await this.runDeployCommand(cmd, ux);
    } catch (e) {
      console.log(e);
      throw new Error("cdk deploy failed.");
    } finally {
      fsExtra.removeSync("cdk.out");
    }
  }
}

class DeployProgress {
  private rl: readline.Interface;
  private status: "INIT" | "SPINNING" | "PROGRESS" | "ERROR" = "INIT";
  private lines: string[] = [];
  private progress: any = cli.progress({
    format: "Deploying app... [{bar}] {percentage}% | Step {value}/{total} ",
    hideCursor: true,
    barsize: 30,
  });

  constructor(input: Readable, private ux: UX) {
    this.rl = readline.createInterface({
      input: input,
    });
  }

  start() {
    this.rl.on("line", (line) => this.lineEvent(line));
    this.rl.on("close", () => this.closeEvent());
    this.ux.start("Preparing deployment");
    this.status = "SPINNING";
  }

  private splitLine(line: string): [number, number, string] | undefined {
    let parts = line.split("|").map((c) => c.trim());
    if (parts.length != 5) {
      return undefined;
    }
    let progParts = parts[0].split("/");
    if (progParts.length != 2) {
      return undefined;
    }
    return [parseInt(progParts[0]), parseInt(progParts[1]), parts[2]];
  }

  private lineEvent(line: string) {
    this.lines.push(line);
    let parts = this.splitLine(line);
    if (!parts) {
      return;
    }
    let [step, total, status] = parts;

    if (status == "CREATE_FAILED") {
      if (this.status == "SPINNING") {
        this.ux.stop("Failed.");
      } else if (this.status == "PROGRESS") {
        this.progress.stop();
      }
      this.status = "ERROR";
    } else if (this.status != "ERROR") {
      if (this.status != "PROGRESS") {
        if (this.status == "SPINNING") {
          this.ux.stop();
        }
        this.status = "PROGRESS";
        this.progress.start(total, step);
      } else {
        this.progress.update(step);
      }
    }
  }

  private closeEvent() {
    if (this.status == "ERROR") {
      let idx = this.lines.findIndex((val) =>
        val.startsWith("Failed resources:")
      );
      console.log("");
      for (var i = idx; i < this.lines.length; i++) {
        console.log(this.lines[i]);
      }
      console.log("");
    } else {
      this.progress.stop();
    }
  }
}
