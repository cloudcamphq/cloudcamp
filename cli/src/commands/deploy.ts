import _ from "lodash";
import { flags } from "@oclif/command";
import { BaseCommand } from "../command";
import { getCdkJsonContext, updateCdkJsonContext } from "../utils";
import {
  assumeAWSProfile,
  setAWSRegion,
  SecretsManager,
  CloudFormation,
  CDK,
  VPC,
} from "../aws";
import {
  makeSsmPath,
  parseRepositoryUrl,
} from "@cloudcamp/aws-runtime/src/utils";
import { STS } from "../aws";
import { CredentialsInput } from "../options/credentials";
import { RegionChoice } from "../options/region";
import { GitRemoteChoice } from "../options/remote";
import { BranchInput } from "../options/branch";
import { Settings } from "../options/settings";
import { GitRepository } from "../git";
import chalk from "chalk";
import {
  CONTEXT_KEY_ACCOUNT,
  CONTEXT_KEY_BRANCH,
  CONTEXT_KEY_DOCKERHUB_CREDENTIALS,
  CONTEXT_KEY_NAME,
  CONTEXT_KEY_NEW_APP,
  CONTEXT_KEY_REGION,
  CONTEXT_KEY_REPOSITORY,
  CONTEXT_KEY_VPC,
  CONTEXT_REPOSITORY_TOKEN_SECRET,
  DEFAULT_DOCKERHUB_CREDENTIALS_SECRET_NAME,
  DEFAULT_GITHUB_TOKEN_SECRET_NAME,
} from "@cloudcamp/aws-runtime/src/constants";
import { RepositoryHost } from "@cloudcamp/aws-runtime";
import { resolveHome } from "../utils";
import { AwsRegion } from "@cloudcamp/aws-runtime/src/types";
import { DockerHub } from "../dockerhub";
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import { AWSClientConfig } from "../aws/config";

/**
 * Deploy a CloudCamp app to AWS.
 *
 * @order 2
 */
export default class Deploy extends BaseCommand {
  /**
   * oclif description
   */
  static description = `Deploy an app to AWS.`;

  /**
   * oclif command line flags
   */
  static flags = {
    help: flags.help({ char: "h" }),
    profile: flags.string({ char: "p", description: "The AWS profile name" }),
    home: flags.string({ description: "The home directory of your app." }),
    yes: flags.boolean({ description: "Accept default choices" }),
    region: flags.string({
      char: "r",
      description: "The AWS region to deploy to.",
      options: Object.values(AwsRegion),
    }),
  };

  /**
   * The main function
   */
  async run() {
    const { flags } = this.parse(Deploy);
    const home = resolveHome(flags.home);

    const context = getCdkJsonContext(home);
    await assumeAWSProfile(flags.profile);

    const credentials = new CredentialsInput(flags.profile);
    const region = new RegionChoice(
      flags.region || context[CONTEXT_KEY_REGION]
    );
    const remote = new GitRemoteChoice(context[CONTEXT_KEY_REPOSITORY]);
    const branch = new BranchInput();
    const settings = await new Settings(
      credentials,
      region,
      remote,
      branch
    ).init();

    this.ux.log(
      "Note: CloudCamp will update configuration files and push to your git repository."
    );
    this.ux.log("");
    if (!flags.yes) {
      await settings.edit(this.ux);
    }

    // set the region selected by the user
    setAWSRegion(region.value);

    // We need to get the AWS account number- we do this by making
    // an API call to STS; At the same time, we verify if the credentials
    // are working.
    this.ux.start("Getting AWS account info");
    const account = await STS.getAccountId();
    this.ux.stop();

    if (
      !flags.yes &&
      context[CONTEXT_KEY_ACCOUNT] &&
      account != context[CONTEXT_KEY_ACCOUNT]
    ) {
      const shouldContinue = await this.ux.confirm({
        message: "WARNING: AWS account has changed. Continue?",
        default: false,
      });

      if (!shouldContinue) {
        this.exit(0);
      }
    }

    // check if app exists
    if (context[CONTEXT_KEY_NEW_APP]) {
      const ssm = new SSMClient(AWSClientConfig);
      let didThrow = false;
      try {
        await ssm.send(
          new GetParameterCommand({
            Name: makeSsmPath(context[CONTEXT_KEY_NAME], "codepipeline"),
          })
        );
      } catch (e: any) {
        if (e.name == "ParameterNotFound") {
          didThrow = true;
        }
      }
      if (!didThrow) {
        throw new Error(
          `App already exists: ${context[CONTEXT_KEY_NAME]}\nPlease choose a different name.`
        );
      }
      context[CONTEXT_KEY_NEW_APP] = false;
    }

    // Get the GitHub token name
    const parsedUrl = parseRepositoryUrl(remote.value);

    if (!context[CONTEXT_REPOSITORY_TOKEN_SECRET]) {
      switch (parsedUrl.host) {
        case RepositoryHost.GITHUB:
          context[CONTEXT_REPOSITORY_TOKEN_SECRET] =
            DEFAULT_GITHUB_TOKEN_SECRET_NAME;
          break;
      }
    }

    // Get GitHub token
    const gitRepo = new GitRepository();

    await this.retrieveAndStoreRepositoryToken(
      context[CONTEXT_KEY_NAME],
      context[CONTEXT_REPOSITORY_TOKEN_SECRET],
      gitRepo,
      flags.yes
    );

    const shouldWriteKey = await DockerHub.setupDockerHubCredentials(
      this.ux,
      context[CONTEXT_KEY_NAME],
      DEFAULT_DOCKERHUB_CREDENTIALS_SECRET_NAME,
      true,
      flags.yes
    );

    if (shouldWriteKey) {
      context[CONTEXT_KEY_DOCKERHUB_CREDENTIALS] =
        DEFAULT_DOCKERHUB_CREDENTIALS_SECRET_NAME;
    }

    // Set up vpc
    let vpcId: string;
    if (context[CONTEXT_KEY_VPC]) {
      vpcId = context[CONTEXT_KEY_VPC];
      this.ux.log("Using VPC: " + vpcId);
    } else {
      this.ux.start("Creating VPC");
      vpcId = await VPC.create(context[CONTEXT_KEY_NAME]);
      await VPC.createPrivateHostedZone(
        vpcId,
        region.value,
        context[CONTEXT_KEY_NAME]
      );
      this.ux.stop();
    }

    context[CONTEXT_KEY_ACCOUNT] = account;
    context[CONTEXT_KEY_REPOSITORY] = remote.value;
    context[CONTEXT_KEY_BRANCH] = branch.value;
    context[CONTEXT_KEY_REGION] = region.value;
    context[CONTEXT_KEY_VPC] = vpcId;

    updateCdkJsonContext(home, context);

    // Run bootstrap if needed
    if (!(await CloudFormation.stackExists("CDKToolkit"))) {
      this.ux.start("Running cdk bootstrap...");
      await CDK.bootstrap(account, region.value, flags.profile);
      this.ux.stop();
    }

    this.ux.start("Synthesizing app");
    await CDK.synth(home, flags.profile);
    this.ux.stop();

    // push changes
    if (await gitRepo.hasChanges()) {
      this.ux.start("Pushing changes");
      await gitRepo.commitAndPush("[cloudcamp] deploy");
      this.ux.stop();
    }

    await CDK.deploy(this.ux, home, flags.profile);
    this.ux.nice("Deploy succeeded.");
  }

  async retrieveAndStoreRepositoryToken(
    appName: string,
    tokenName: string,
    gitRepo: GitRepository,
    yesFlag: boolean
  ) {
    const secretExists = await SecretsManager.exists(tokenName);

    if (secretExists) {
      this.log(`Using existing GitHub token.`);
    } else {
      if (yesFlag) {
        throw new Error(
          "No Github token found.\n\n" +
            "To setup your GitHub token, either:\n" +
            " * Run `camp deploy` without --yes\n" +
            " * Set the token name via `camp configure:github-token`"
        );
      }
      const auth = gitRepo.oauthVerify((verification) => {
        this.log("Authorizing GitHub access...");
        this.log("");
        this.log(
          ` ${chalk.green("›")} Open ${
            verification.verification_uri
          } and paste this code: ${verification.user_code}`
        );
        this.log("");
        this.ux.start("Waiting for Authorization");
      });

      let tokenAuth = await auth({
        type: "oauth",
      });
      this.ux.stop();
      const token = tokenAuth.token;

      this.ux.start("Storing GitHub token");
      await SecretsManager.upsert(tokenName, token, appName);
      this.ux.stop();
    }
  }
}
