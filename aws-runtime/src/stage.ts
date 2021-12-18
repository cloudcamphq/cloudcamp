import * as cdk from "aws-cdk-lib";
import * as pipelines from "aws-cdk-lib/pipelines";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import { App } from "./app";
import { Stack } from "./stack";
import { Construct } from "constructs";
import * as path from "path";
import { Variable } from "./variable";
// import * as crypto from "crypto";
// import {
//   BuildEnvironmentVariable,
//   BuildEnvironmentVariableType,
// } from "aws-cdk-lib/aws-codebuild";
import * as _ from "lodash";
import {
  BuildEnvironmentVariable,
  BuildEnvironmentVariableType,
} from "aws-cdk-lib/aws-codebuild";
// import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";

export interface RunProps {
  readonly commands: string[];
  readonly os?: "linux" | "windows";
  readonly dockerfile?: string;
  /**
   * Environment variables.
   */
  readonly environment?: {
    [key: string]: Variable | string;
  };
}

/**
 * @order 3
 */
export class Stage extends cdk.Stage {
  stack!: Stack;

  private _needsManualApproval = false;

  set needsManualApproval(value: boolean) {
    this._needsManualApproval = value;
  }

  get needsManualApproval(): boolean {
    return this._needsManualApproval;
  }

  constructor(scope: Construct, id: string) {
    super(scope, id, {
      env: {
        account: App.instance.configuration.account,
        region: App.instance.configuration.region,
      },
    });
  }

  /**
   * @ignore
   */
  public post: pipelines.Step[] = [];

  /**
   * @ignore
   */
  public pre: pipelines.Step[] = [];

  runPre(id: string, props: RunProps) {
    return this.runPrePost(id, props, "pre");
  }

  runPost(id: string, props: RunProps) {
    return this.runPrePost(id, props, "post");
  }

  private runPrePost(id: string, props: RunProps, preOrPost: "pre" | "post") {
    let buildImage: codebuild.IBuildImage;
    switch (props.os) {
      case "windows":
        buildImage = props.dockerfile
          ? codebuild.WindowsBuildImage.fromAsset(
              this.stack,
              id + "-docker-asset",
              {
                file: path.basename(props.dockerfile),
                directory: path.dirname(props.dockerfile),
              }
            )
          : codebuild.WindowsBuildImage.WIN_SERVER_CORE_2019_BASE;
        break;
      case "linux":
      default:
        buildImage = props.dockerfile
          ? codebuild.LinuxBuildImage.fromAsset(
              this.stack,
              id + "-docker-asset",
              {
                file: path.basename(props.dockerfile),
                directory: path.dirname(props.dockerfile),
              }
            )
          : codebuild.LinuxBuildImage.STANDARD_5_0;
        break;
    }

    let installCommands: string[] = [];
    let environmentVariables: { [name: string]: BuildEnvironmentVariable } = {};
    let envFromCfnOutputs: { [name: string]: cdk.CfnOutput } = {};

    for (let [k, v] of Object.entries(props.environment || {})) {
      if (typeof v === "string") {
        environmentVariables[k] = {
          type: BuildEnvironmentVariableType.PLAINTEXT,
          value: v,
        };
      } else {
        let resolved = (v as Variable).resolve(
          App.instance.pipelineStack,
          k,
          props.os || "linux"
        );
        for (let res of resolved) {
          switch (res.variableType) {
            case "output":
              envFromCfnOutputs[res.tempName || k] = res.cfnOutputValue!;
              break;
            case "secret":
            case "plain":
              environmentVariables[res.tempName || k] = {
                type:
                  res.variableType == "secret"
                    ? BuildEnvironmentVariableType.SECRETS_MANAGER
                    : BuildEnvironmentVariableType.PLAINTEXT,
                value: res.value,
              };
              break;
          }
          if (res.installCommands) {
            installCommands = installCommands.concat(res.installCommands);
          }
        }
      }
    }

    // let secret = secretsmanager.Secret.fromSecretNameV2(
    //   App.instance.pipelineStack,
    //   "get-secret-by-namev2",
    //   "databaseSecret"
    // );

    // let output = (props.environment!["DATABASE_URL"] as Variable).resolve();
    // let stack = cdk.Stack.of(output);
    // let stackId = limitIdentifierLength(stack.artifactId, 100);
    // let outputName = stack.resolve(output.logicalId);
    // let token = `#{${stackId}.${outputName}}`;

    // let secret = secretsmanager.Secret.fromSecretNameV2(
    //   App.instance.pipelineStack,
    //   "get-the-secret",
    //   token
    // );

    // let environmentVariables = Object.fromEntries(
    //   Object.entries(props.environment || {})
    //     .filter(([_, v]) => typeof v === "string")
    //     .map(([k, v]) => [
    //       k,
    //       { type: BuildEnvironmentVariableType.PLAINTEXT, value: v },
    //     ])
    // );

    let step = new pipelines.CodeBuildStep(id, {
      commands: props.commands,
      installCommands: installCommands,
      buildEnvironment: {
        buildImage: buildImage,
        environmentVariables: environmentVariables,
        //  {
        //   DATABASE_URL: {
        //     type: BuildEnvironmentVariableType.SECRETS_MANAGER,
        //     value: "databaseSecret",
        //   },
      },
      envFromCfnOutputs: envFromCfnOutputs,
      // envFromCfnOutputs: {
      //   DATABASE_URL: (
      //     props.environment!["DATABASE_URL"] as Variable
      //   ).resolve(),
      // },
      // envFromCfnOutputs: Object.fromEntries(
      //   Object.entries(props.environment || {})
      //     .filter(([_, v]) => typeof v !== "string")
      //     .map(([k, v]) => [k, (v as Variable).resolve()])
      // ),
    });

    preOrPost == "pre" ? this.pre.push(step) : this.post.push(step);
  }
}

// function limitIdentifierLength(s: string, n: number): string {
//   if (s.length <= n) {
//     return s;
//   }
//   const h = hash(s).substr(0, 8);
//   const mid = Math.floor((n - h.length) / 2);

//   return s.substr(0, mid) + h + s.substr(s.length - mid);
// }

// function hash<A>(obj: A) {
//   const d = crypto.createHash("sha256");
//   d.update(JSON.stringify(obj));
//   return d.digest("hex");
// }
