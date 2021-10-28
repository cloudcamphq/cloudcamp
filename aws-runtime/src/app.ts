import * as cdk from "@aws-cdk/core";
import * as _ from "lodash";
import { PipelineStack } from "./pipeline";
import { Stage } from "./stage";
import { parseRepositoryUrl } from "./utils";
import {
  CONTEXT_KEY_ACCOUNT,
  CONTEXT_KEY_BRANCH,
  CONTEXT_KEY_NAME,
  CONTEXT_KEY_REGION,
  CONTEXT_KEY_REPOSITORY,
  CONTEXT_KEY_VPC,
  CONTEXT_REPOSITORY_TOKEN_SECRET,
  TAG_APP_NAME,
} from "./constants";
import * as ssm from "@aws-cdk/aws-ssm";
import * as cxapi from "@aws-cdk/cx-api";
import { Stack } from "./stack";

export interface Configuration {
  readonly name: string;
  readonly repository: string;
  readonly account: string;
  readonly region: string;
  readonly branch: string;
  readonly vpcId: string;
  readonly repositoryTokenSecret: string;
}

/**
 * App represents your application running in the cloud․ Every app contains one
 * or more ``{@link Stack | Stacks}``, which you can use to add your own resources, like a
 * ``{@link WebServer | WebServer}`` or a ``{@link Database | Database}``.
 *
 * An app can be as big or small as you like - from a single webserver to
 * dozens of load-balanced instances serving different parts of your
 * application.
 *
 * This example adds a ``{@link WebServer | WebServer}`` to the
 * ``{@link App.production | production}`` stack:
 *
 * ```ts
 * import { App, WebServer } from "@cloudcamp/aws-runtime";
 *
 * let app = new App();
 *
 * new WebServer(app.production, "prod-web", {
 *  dockerfile: "../Dockerfile"
 * });
 * ```
 *
 * @order 1
 */

export class App extends cdk.App {
  private static INSTANCE?: App;

  /**
   * Initialize your cloudcamp application.
   *
   * @remarks App is a singleton class - it is instantiated exactly once, before
   * any other resources are created.
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
    };

    cdk.Tags.of(this).add(TAG_APP_NAME, this.configuration.name);
    this.pipelineStack = this.setupCodePipeline();

    //add pipelineStack to our global list of stacks
    new ssm.StringParameter(this.pipelineStack, "ssm-stack", {
      parameterName: `/cloudcamp/${
        App.instance.configuration.name
      }/_/stack/${_.kebabCase(this.pipelineStack.stackName)}`,
      stringValue: this.pipelineStack.stackName,
    });

    // We need the name of the codepipeline for later use
    new ssm.StringParameter(this.pipelineStack, "ssm-codepipeline", {
      parameterName: `/cloudcamp/${this.configuration.name}/_/codepipeline`,
      stringValue: this.pipelineStack.pipeline.codePipeline.pipelineName,
    });

    // Also, we need to identify the pipeline stack
    new ssm.StringParameter(this.pipelineStack, "ssm-pipeline-stack", {
      parameterName: `/cloudcamp/${this.configuration.name}/_/pipeline-stack`,
      stringValue: this.pipelineStack.stackName,
    });
  }

  private getContextOrThrow(key: string): string {
    let value: string = this.node.tryGetContext(key);
    if (value == null) {
      throw new Error("Missing config in cdk.json: " + key);
    }
    return value;
  }

  /**
   * Returns the global App singleton instance.
   *
   * Throws an exception if App has not been instantiated yet.
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
   * Use this stack for anything related to the network, for example DNS entries.
   *
   * @topic Stacks
   *
   * @remarks To deploy resources to the cloud, they are added to a ``Stack``.
   * Cloudcamp comes with three default stacks:
   */
  get network(): Stack {
    return this.getOrAddStage("network").stack;
  }

  /**
   * This stack can be used to create an environment for testing changes before
   * deploying to production.
   */
  get staging(): Stack {
    return this.getOrAddStage("staging").stack;
  }

  /**
   * The production stack.
   */
  get production(): Stack {
    return this.getOrAddStage("production").stack;
  }

  /**
   * Get an existing stack by name.
   *
   * @param name The name of the stack.
   *
   * @topic Adding custom stacks
   *
   * @remarks In addition to the default stacks provided by cloudcamp, you can
   * create your own stacks.
   */
  public getStack(name: string): Stack {
    try {
      return this.getStage(name).stack;
    } catch (e) {
      if ((e as Error).message.startsWith("Stage doesn't exist")) {
        throw new Error("Stack doesn't exist: " + name);
      } else {
        throw e;
      }
    }
  }

  /**
   * Add a new stack to your application.
   *
   * Pass a stack name to create a new, empty stack:
   *
   * ```ts
   * void 0;
   * import { App, WebServer, Stack} from "@cloudcamp/aws-runtime";
   * const app = new App();
   * void 'show';
   * const devStack = app.addStack("development");
   * ```
   *
   * @param name The name of the stack.
   *
   *
   */
  public addStack(name: string): Stack {
    if (this.stages.get(name)) {
      throw new Error("Stack already exists: " + name);
    }
    return this.getOrAddStage(name).stack;
  }

  private stages: Map<string, Stage> = new Map();

  private getOrAddStage(id: string) {
    let existingStage = this.stages.get(id);
    if (existingStage) {
      return existingStage;
    }
    let stage = new Stage(this, _.upperFirst(_.camelCase(id)));
    let stack = new Stack(stage, id);
    stage.stack = stack;
    this.stages.set(id, stage);

    return stage;
  }

  /**
   * Get an existing stage by name.
   *
   * Stages can be obtained by their name to modify their attributes. A common
   * use case is to require manual approval to deploy to the production stage:
   *
   * ```ts
   * const stage = app.getStage("production");
   * stage.needsManualApproval = true;
   * ```
   *
   * @param name The name of the stage.
   *
   * @topic Stages
   *
   * @remarks Stages are responsible for building your stacks. By default,
   * cloudcamp creates a stage for each stack and gives it the same name. You
   * can customize this behaviour by adding your own stages.
   */

  public getStage(name: string): Stage {
    if (name in ["network", "staging", "production"]) {
      return this.getOrAddStage(name);
    }
    if (!this.stages.has(name)) {
      throw new Error("Stage doesn't exist: " + name);
    }
    return this.stages.get(name)!;
  }

  /**
   * Add a new stage.
   *
   * This method can be used to add a stage with a custom ``Stack`` subclass.
   * ```ts
   * import { App, WebServer, Stack } from "@cloudcamp/aws-runtime";
   *
   * class CustomStack extends Stack {
   *   constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
   *      super(scope, id, props);
   *      new WebServer(this, "web", {
   *        dockerfile: "../Dockerfile"
   *      });
   *   }
   * }
   *
   * // later in the code...
   * const app = new App();
   * const stage = app.addStage("dev");
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
   * @param stage An optional stage object. If not specifed, cloudcamp will
   * create and return an empty stage.
   */
  public addStage(name: string, stage?: Stage): Stage {
    if (this.stages.has(name)) {
      throw new Error("Stage already exists: " + name);
    }
    if (!stage) {
      stage = new Stage(this, _.upperFirst(_.camelCase(name)));
    }
    this.stages.set(name, stage);
    return stage;
  }

  /**
   * @ignore
   */
  configuration: Configuration;

  private pipelineStack: PipelineStack;
  /**
   * @ignore
   */
  public get pipeline() {
    return this.pipelineStack.pipeline;
  }

  private setupCodePipeline(): PipelineStack {
    const repositoryUrl = this.configuration.repository;
    const branch = this.configuration.branch;
    let parsed = parseRepositoryUrl(repositoryUrl);
    let repositoryTokenSecretName = this.configuration.repositoryTokenSecret;
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
    for (let stage of this.stages.values()) {
      let appStage = this.pipeline.addApplicationStage(stage);
      if (stage.needsManualApproval) {
        appStage.addManualApprovalAction();
      }
    }
    return super.synth(options);
  }
}
