import * as cdk from "aws-cdk-lib";
import * as pipelines from "aws-cdk-lib/pipelines";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import { App } from "./app";
import { Stack } from "./stack";
import { Construct } from "constructs";
import * as path from "path";
import { Variable } from "./variable";
// import {
//   BuildEnvironmentVariable,
//   BuildEnvironmentVariableType,
// } from "aws-cdk-lib/aws-codebuild";
import * as _ from "lodash";
import { BuildEnvironmentVariableType } from "aws-cdk-lib/aws-codebuild";

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

    let environmentVariables = Object.fromEntries(
      Object.entries(props.environment || {})
        .filter(([_, v]) => typeof v === "string")
        .map(([k, v]) => [
          k,
          { type: BuildEnvironmentVariableType.PLAINTEXT, value: v },
        ])
    );

    let step = new pipelines.CodeBuildStep(id, {
      commands: props.commands,
      buildEnvironment: {
        buildImage: buildImage,
        environmentVariables: environmentVariables,
      },
      envFromCfnOutputs: Object.fromEntries(
        Object.entries(props.environment || {})
          .filter(([_, v]) => typeof v !== "string")
          .map(([k, v]) => [k, (v as Variable).resolve()])
      ),
    });

    preOrPost == "pre" ? this.pre.push(step) : this.post.push(step);
  }
}
