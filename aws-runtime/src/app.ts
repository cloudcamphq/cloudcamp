import * as cdk from "aws-cdk-lib";
import * as _ from "lodash";
import { PipelineStack } from "./pipeline";
import { Stage } from "./stage";
import { makeSsmPath, parseRepositoryUrl } from "./utils";
import {
  CONTEXT_KEY_ACCOUNT,
  CONTEXT_KEY_BRANCH,
  CONTEXT_KEY_DOCKERHUB_CREDENTIALS,
  CONTEXT_KEY_NAME,
  CONTEXT_KEY_REGION,
  CONTEXT_KEY_REPOSITORY,
  CONTEXT_KEY_VPC,
  CONTEXT_REPOSITORY_TOKEN_SECRET,
  TAG_APP_NAME,
} from "./constants";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as cxapi from "aws-cdk-lib/cx-api";
import * as pipelines from "aws-cdk-lib/pipelines";
import { Stack } from "./stack";
import { Step } from "aws-cdk-lib/pipelines";

export interface Configuration {
  /**
   * The unique name of the app.
   */
  readonly name: string;
  /**
   * URL of the git source repository.
   */
  readonly repository: string;
  /**
   * The name of the branch to use for deployments.
   */
  readonly branch: string;
  /**
   * AWS account ID.
   */
  readonly account: string;
  /**
   * AWS region code.
   */
  readonly region: string;
  /**
   * The ID of the VPC.
   */
  readonly vpcId: string;
  /**
   * The name of the secret that holds the GitHub token (default is
   * "github-token").
   */
  readonly repositoryTokenSecret: string;
  /**
   * The name of the secret that contains the DockerHub credentials (default
   * "dockerhub-credentials").
   */
  readonly dockerHubSecret?: string;
}

/**
 * App serves as an entry point to your CloudCamp application․ It's typically
 * instantiated in the beginning of your program and sets up your application's
 * ``{@link "api/app#configuration" | configuration}`` and build pipeline․ An
 * ``App`` instance contains one or more
 * ``{@link Stack | Stacks}``, which you can use to add your own resources, for
 * example  a ``{@link WebService | WebService}`` or a
 * ``{@link Database | Database}``.
 *
 * Apps can be as big or small as you like - from a single webserver to dozens
 * of load-balanced instances serving different parts of your application.
 *
 * This example illustrates how to run a simple app that contains a webservice
 * created from a ``Dockerfile``. We make a new ``App`` instance, then we add a
 * ``{@link WebService | WebService}`` to the
 * ``{@link App.production | production}`` stack:
 *
 * ```ts
 * import { App, WebService } from "@cloudcamp/aws-runtime";
 *
 * const app = new App();
 *
 * new WebService(app.production, "prod-web", {
 *  dockerfile: "../Dockerfile"
 * });
 * ```
 *
 * @order 1
 */

export class App extends cdk.App {
  private static INSTANCE?: App;

  /**
   * Create a CloudCamp application.
   *
   * @remarks To create a CloudCamp application, instantiate an ``App`` object.
   * ``App`` is a singleton - i.e. there can only be a single instance at a
   * time.
   *
   * @topic Initialization
   *
   */
  constructor() {
    super({ autoSynth: true });

    if (App.INSTANCE) {
      throw new Error("App has already been instantiated.");
    }

    App.INSTANCE = this;

    this.configuration = {
      account: this.getContextOrThrow(CONTEXT_KEY_ACCOUNT),
      region: this.getContextOrThrow(CONTEXT_KEY_REGION),
      repository: this.getContextOrThrow(CONTEXT_KEY_REPOSITORY),
      name: this.getContextOrThrow(CONTEXT_KEY_NAME),
      branch: this.getContextOrThrow(CONTEXT_KEY_BRANCH),
      vpcId: this.getContextOrThrow(CONTEXT_KEY_VPC),
      repositoryTokenSecret: this.getContextOrThrow(
        CONTEXT_REPOSITORY_TOKEN_SECRET
      ),
      dockerHubSecret:
        this.node.tryGetContext(CONTEXT_KEY_DOCKERHUB_CREDENTIALS) || undefined,
    };

    cdk.Tags.of(this).add(TAG_APP_NAME, this.configuration.name);
    this.pipelineStack = this.setupCodePipeline();

    //add pipelineStack to our global list of stacks
    new ssm.StringParameter(this.pipelineStack, "ssm-stack", {
      parameterName: makeSsmPath(
        this.configuration.name,
        "stack",
        this.pipelineStack.stackName
      ),
      stringValue: this.pipelineStack.stackName,
    });

    // We need the name of the codepipeline for later use
    new ssm.StringParameter(this.pipelineStack, "ssm-codepipeline", {
      parameterName: makeSsmPath(this.configuration.name, "codepipeline"),
      stringValue: this.pipelineStack.pipelineName,
    });

    // Also, we need to identify the pipeline stack
    new ssm.StringParameter(this.pipelineStack, "ssm-pipeline-stack", {
      parameterName: makeSsmPath(this.configuration.name, "pipeline-stack"),
      stringValue: this.pipelineStack.stackName,
    });
  }

  private getContextOrThrow(key: string): string {
    const value: string = this.node.tryGetContext(key);
    if (value == null) {
      throw new Error("Missing config in cdk.json: " + key);
    }
    return value;
  }

  /**
   * Access the global singleton instance.
   */
  public static get instance(): App {
    if (!App.INSTANCE) {
      throw new Error(
        "instance() called but App has not been instantiated yet."
      );
    }
    return App.INSTANCE;
  }

  /**
   * The app's configuration parameters as specified in the config file
   * ``cdk.json`` in your app's home directory.
   * @inline
   */
  configuration: Configuration;

  /**
   * Use this stack for anything related to the network, for example to set up
   * DNS entries.
   *
   * @topic Stacks
   *
   * @remarks To deploy resources to the cloud, they are added to a ``Stack``.
   * Stacks come in handy to isolate different environments from each other. For
   * example, you might have a stack for testing your application and another
   * one for the production version.
   *
   * CloudCamp comes with three default stacks:
   */
  get network(): Stack {
    return this.stage("network").stack;
  }

  /**
   * Use this stack to create an environment for testing changes before
   * deploying to production.
   */
  get staging(): Stack {
    return this.stage("staging").stack;
  }

  /**
   * The production stack.
   */
  get production(): Stack {
    return this.stage("production").stack;
  }

  /**
   * Add a new stack or access an existing one.
   *
   * Pass a stack name to create a new, empty stack. If the stack does not exist
   * already, a new one will be created.
   *
   * ```ts
   * void 0;
   * import { App, WebService, Stack} from "@cloudcamp/aws-runtime";
   * const app = new App();
   * void 'show';
   * const devStack = app.stack("development");
   * ```
   *
   * @param name The name of the stack.
   *
   * @topic Adding custom stacks
   *
   * @remarks In addition to the default stacks provided by CloudCamp, you can
   * create your own stacks.
   *
   */
  public stack(name: string): Stack {
    return this.stage(name).stack;
  }

  private stages: Map<string, Stage> = new Map();

  /**
   * Add a new stage or access an existing one.
   *
   * Stages can be obtained by their name to modify their attributes. A common
   * use case is to require manual approval to deploy to the production stage:
   *
   * ```ts
   * const stage = app.getStage("production");
   * stage.needsManualApproval = true;
   * ```
   *
   * You can also add a stage with a custom ``Stack`` subclass:
   * ```ts
   * import { App, WebService, Stack } from "@cloudcamp/aws-runtime";
   *
   * class CustomStack extends Stack {
   *   constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
   *      super(scope, id, props);
   *      new WebService(this, "web", {
   *        dockerfile: "../Dockerfile"
   *      });
   *   }
   * }
   *
   * // later in the code...
   * const app = new App();
   * const stage = app.stage("dev");
   * const stack = new CustomStack(stage, "dev");
   *
   * // stack is automatically set to the new stack we created
   * if (stage.stack == stack) {
   *   // outputs "True!"
   *   console.log("True!");
   * }
   * ```
   *
   * @param name The name of the stage.
   *
   *
   * @param stage An optional stage object. If not specifed, CloudCamp will
   * create and return an empty stage.
   *
   * @topic Stages
   *
   * @remarks Stages are responsible for building your stacks. By default,
   * CloudCamp creates a stage for each stack and gives it the same name. You
   * can customize this behaviour by adding your own stages.
   */

  stage(name: string, stage?: Stage) {
    const existingStage = this.stages.get(name);
    if (existingStage) {
      return existingStage;
    }
    if (!stage) {
      stage = new Stage(this, _.upperFirst(_.camelCase(name)));
      const stack = new Stack(stage, name);
      stage.stack = stack;
    }

    this.stages.set(name, stage);

    return stage;
  }

  /**
   * The order in which stages are executed. For example, to ensure the custom
   * stage ``"development"`` is always executed before production:
   *
   * ```ts
   * void 0;
   * import { App, WebService, Stack} from "@cloudcamp/aws-runtime";
   * const app = new App();
   * void 'show';
   * app.stageOrder = ["development", "production"];
   * ```
   *
   * @default ["network", "staging", "production"]
   */
  public stageOrder: string[] = ["network", "staging", "production"];

  /**
   * @ignore
   */
  public pipelineStack: PipelineStack;
  /**
   * @ignore
   */
  public get pipeline() {
    return this.pipelineStack.pipeline;
  }

  private setupCodePipeline(): PipelineStack {
    const repositoryUrl = this.configuration.repository;
    const branch = this.configuration.branch;
    const parsed = parseRepositoryUrl(repositoryUrl);
    const repositoryTokenSecretName = this.configuration.repositoryTokenSecret;
    return new PipelineStack(
      this,
      _.upperFirst(_.camelCase(this.configuration.name + "-pipeline")),
      {
        appName: this.configuration.name,
        repositoryTokenSecretName: repositoryTokenSecretName,
        host: parsed.host,
        owner: parsed.owner,
        repo: parsed.repo,
        branch: branch,
      }
    );
  }

  /**
   * @ignore
   */
  synth(options?: cdk.StageSynthesisOptions): cxapi.CloudAssembly {
    const names = Array.from(this.stages.keys());
    names.sort((a, b) => {
      if (this.stageOrder.includes(a) && this.stageOrder.includes(b)) {
        return this.stageOrder.indexOf(a) < this.stageOrder.indexOf(b) ? -1 : 1;
      }
      return 0;
    });
    for (let name of names) {
      const stage = this.stages.get(name)!;
      let pre: Step[] = [];
      let post: Step[] = [];
      if (stage.needsManualApproval) {
        pre = [new pipelines.ManualApprovalStep("approve-" + name)];
      }

      pre = pre.concat(stage.pre);
      post = post.concat(stage.post);

      this.pipeline.addStage(stage, {
        pre: pre.length ? pre : undefined,
        post: post.length ? post : undefined,
      });
    }
    return super.synth(options);
  }
}
