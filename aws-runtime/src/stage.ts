import * as cdk from "aws-cdk-lib";
import * as pipelines from "aws-cdk-lib/pipelines";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import { App } from "./app";
import { Stack } from "./stack";
import { Construct } from "constructs";
import * as path from "path";
import { Variable } from "./variable";
import * as _ from "lodash";
import {
  BuildEnvironmentVariable,
  BuildEnvironmentVariableType,
} from "aws-cdk-lib/aws-codebuild";

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
    const environmentVariables: { [name: string]: BuildEnvironmentVariable } =
      {};
    const envFromCfnOutputs: { [name: string]: cdk.CfnOutput } = {};

    for (let [k, v] of Object.entries(props.environment || {})) {
      if (typeof v === "string") {
        environmentVariables[k] = {
          type: BuildEnvironmentVariableType.PLAINTEXT,
          value: v,
        };
      } else {
        const resolved = (v as Variable).resolveForAction(
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
                value: res.stringValue,
              };
              break;
          }
          if (res.installCommands) {
            installCommands = installCommands.concat(res.installCommands);
          }
        }
      }
    }

    const appName = App.instance.configuration.name;
    const step = new pipelines.CodeBuildStep(id, {
      projectName: _.upperFirst(
        _.camelCase(`${appName}.${this.stageName}.${id}`)
      ),
      commands: props.commands,
      installCommands: installCommands,
      buildEnvironment: {
        buildImage: buildImage,
        environmentVariables: environmentVariables,
      },
      envFromCfnOutputs: envFromCfnOutputs,
    });

    preOrPost == "pre" ? this.pre.push(step) : this.post.push(step);
  }
}
