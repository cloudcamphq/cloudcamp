import * as cdk from "aws-cdk-lib";
import * as pipelines from "aws-cdk-lib/pipelines";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as codepipeline_actions from "aws-cdk-lib/aws-codepipeline-actions";
import * as _ from "lodash";
import * as fs from "fs";
import * as path from "path";
import { RepositoryHost } from "./types";
import { Language } from "./language";
import { App } from "./app";
import { CONTEXT_KEY_HOME } from "./constants";
import { Construct } from "constructs";

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
  pipeline: pipelines.CodePipeline;
  pipelineName: string;

  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, {
      ...props,
      env: props?.env || {
        account: App.instance.configuration.account,
        region: App.instance.configuration.region,
      },
    });

    this.pipelineName = _.upperFirst(_.camelCase(props.appName + "-pipeline"));
    const home = this.getHome();

    const { installCommands, buildCommands, synthCommands } =
      this.getPipelineCommands(home);

    let dockerCredentials: pipelines.DockerCredential[] | undefined;
    if (App.instance.configuration.dockerHubSecret) {
      const dockerHubSecret = secretsmanager.Secret.fromSecretNameV2(
        this,
        "dockerhub-secret",
        App.instance.configuration.dockerHubSecret
      );
      dockerCredentials = [
        pipelines.DockerCredential.dockerHub(dockerHubSecret),
      ];
    }

    this.pipeline = new pipelines.CodePipeline(this, "cdk-pipeline", {
      dockerCredentials: dockerCredentials,
      selfMutation: true,
      dockerEnabledForSelfMutation: true,
      pipelineName: this.pipelineName,
      synth: new pipelines.ShellStep("Synth", {
        input: pipelines.CodePipelineSource.gitHub(
          props.owner + "/" + props.repo,
          props.branch,
          {
            authentication: cdk.SecretValue.secretsManager(
              props.repositoryTokenSecretName
            ),
            trigger: codepipeline_actions.GitHubTrigger.POLL,
          }
        ),
        installCommands: installCommands,
        commands: buildCommands.concat(synthCommands),
        primaryOutputDirectory: path.join(home, "cdk.out"),
      }),
      crossAccountKeys: false,
    });
  }

  private getHome(): string {
    // when running locally, home is passed in via a context variable
    if (this.node.tryGetContext(CONTEXT_KEY_HOME) !== undefined) {
      return this.node.tryGetContext(CONTEXT_KEY_HOME);
    }

    // otherwise, we depend on CODEBUILD_SRC_DIR to find home
    if (process.env.CODEBUILD_SRC_DIR == undefined) {
      throw new Error("Could not determine app home.");
    }
    return process.cwd().slice(process.env.CODEBUILD_SRC_DIR.length + 1);
  }

  private getLanguage(): Language {
    const cdk_json = JSON.parse(fs.readFileSync("cdk.json").toString());
    const code = Language.languageCodeForExtension(path.extname(cdk_json.app));
    return Language.make(code);
  }

  private getPipelineCommands(home: string): {
    installCommands: string[];
    buildCommands: string[];
    synthCommands: string[];
  } {
    const inHome = (cmd: string) => `(cd ${home} && ${cmd})`;
    const language = this.getLanguage();
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(__dirname, "..", "package.json")).toString()
    );
    const cdkVersion = packageJson.dependencies["aws-cdk-lib"];

    const installCommands = [
      "npm install -g npm@latest",
      `npm install aws-cdk@${cdkVersion} -g`,
    ].concat(language.installCommands);
    const buildCommands = language.buildCommands;
    const synthCommands = [
      // TODO remove this when it's not needed anymore
      // "pwd",
      // "ls",
      // "ls node_modules/aws-cdk-lib/package.json",
      // "ls -al ..",
      // "env",
      // 'sed -i \'571 i ".\\/core\\": ".\\/core\\/index.js",\' node_modules/aws-cdk-lib/package.json',
      "cdk synth",
    ];

    return {
      installCommands: installCommands.map(inHome),
      buildCommands: buildCommands.map(inHome),
      synthCommands: synthCommands.map(inHome),
    };
  }
}
