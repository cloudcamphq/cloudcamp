import * as cdk from "@aws-cdk/core";
import * as codepipeline from "@aws-cdk/aws-codepipeline";
import * as pipelines from "@aws-cdk/pipelines";
import * as codepipeline_actions from "@aws-cdk/aws-codepipeline-actions";
import * as _ from "lodash";
import * as fs from "fs";
import * as path from "path";
import { RepositoryHost } from "./types";
import { CAMP_HOME_DIR } from "./constants";
import { Language } from "./language";
import { App } from "./app";

export interface PipelineStackProps extends cdk.StackProps {
  readonly appName: string;
  readonly repositoryTokenSecretName: string;
  readonly host: RepositoryHost;
  readonly owner: string;
  readonly repo: string;
  readonly branch: string;
}

/**
 * @ignore
 */
export class PipelineStack extends cdk.Stack {
  pipeline: pipelines.CdkPipeline;

  constructor(scope: cdk.Construct, id: string, props: PipelineStackProps) {
    super(scope, id, {
      ...props,
      env: props?.env || {
        account: App.instance.configuration.account,
        region: App.instance.configuration.region,
      },
    });

    let sourceArtifact = new codepipeline.Artifact();
    let cloudAssemblyArtifact = new codepipeline.Artifact();
    let pipelineName = _.upperFirst(_.camelCase(props.appName + "-pipeline"));

    let { installCommand, buildCommand, synthCommand } =
      this.getPipelineCommands();

    this.pipeline = new pipelines.CdkPipeline(this, "cdk-pipeline", {
      cloudAssemblyArtifact: cloudAssemblyArtifact,
      pipelineName: pipelineName,
      sourceAction: this.getSourceAction(
        props.host,
        props.owner,
        props.repo,
        props.branch,
        props.repositoryTokenSecretName,
        sourceArtifact
      ),
      synthAction: new pipelines.SimpleSynthAction({
        sourceArtifact: sourceArtifact,
        cloudAssemblyArtifact: cloudAssemblyArtifact,
        installCommands: installCommand ? [installCommand] : undefined,
        buildCommands: buildCommand ? [buildCommand] : undefined,
        synthCommand: synthCommand,
        subdirectory: path.join(CAMP_HOME_DIR, App.instance.configuration.name),
      }),
      crossAccountKeys: false,
    });
  }

  private getSourceAction(
    host: RepositoryHost,
    owner: string,
    repo: string,
    branch: string,
    repositoryTokenSecretName: string,
    sourceArtifact: codepipeline.Artifact
  ): codepipeline_actions.Action {
    switch (host) {
      case RepositoryHost.GITHUB:
        return new codepipeline_actions.GitHubSourceAction({
          actionName: "GitHub",
          output: sourceArtifact,
          oauthToken: cdk.SecretValue.secretsManager(repositoryTokenSecretName),
          owner: owner,
          repo: repo,
          branch: branch,
          trigger: codepipeline_actions.GitHubTrigger.POLL,
        });
    }
  }

  private getLanguage(): Language {
    let cdk_json = JSON.parse(fs.readFileSync("cdk.json").toString());
    let code = Language.languageCodeForExtension(path.extname(cdk_json.app));
    return Language.make(code);
  }

  private getPipelineCommands(): {
    installCommand?: string;
    buildCommand?: string;
    synthCommand: string;
  } {
    let language = this.getLanguage();
    let packageJson = JSON.parse(
      fs.readFileSync(path.join(__dirname, "..", "package.json")).toString()
    );
    let cdkVersion = packageJson.devDependencies["@aws-cdk/core"];

    // commands run in a subshell (the parentheses) to preserve cwd
    let installCommand =
      `npm install -g npm@latest && npm install aws-cdk@${cdkVersion} -g ` +
      `&& (${language.installCommand})`;
    let buildCommand = `(${language.buildCommand})`;
    if (buildCommand) {
      buildCommand = `(${buildCommand})`;
    }
    let synthCommand = `pwd && ls && cdk synth`;

    return {
      installCommand: installCommand,
      buildCommand: buildCommand,
      synthCommand: synthCommand,
    };
  }
}
