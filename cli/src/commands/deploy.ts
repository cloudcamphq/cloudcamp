import _ from "lodash";
import { flags } from "@oclif/command";
import { BaseCommand } from "../command";
import { getCdkJsonContext, updateCdkJsonContext } from "../project";
import {
  assumeAWSProfile,
  setAWSRegion,
  SecretManager,
  CloudFormation,
  CDK,
  VPC,
} from "../aws";
import { parseRepositoryUrl } from "@cloudcamp/aws-runtime/src/utils";
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
  CONTEXT_KEY_NAME,
  CONTEXT_KEY_REGION,
  CONTEXT_KEY_REPOSITORY,
  CONTEXT_KEY_VPC,
  CONTEXT_REPOSITORY_TOKEN_SECRET,
} from "@cloudcamp/aws-runtime/src/constants";
import { RepositoryHost } from "@cloudcamp/aws-runtime";

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
    profile: flags.string({ char: "p", description: "the AWS profile name" }),
    yes: flags.boolean({ description: "accept default choices" }),
  };

  /**
   * The main function
   */
  async run() {
    const { flags } = this.parse(Deploy);

    let context = getCdkJsonContext();
    await assumeAWSProfile(flags.profile);

    this.ux.displayBanner();

    let credentials = new CredentialsInput(flags.profile);
    let region = new RegionChoice(context[CONTEXT_KEY_REGION]);
    let remote = new GitRemoteChoice(context[CONTEXT_KEY_REPOSITORY]);
    let branch = new BranchInput();
    let settings = await new Settings(
      credentials,
      region,
      remote,
      branch
    ).init();
    this.ux.log(
      "Confirm deployment settings for " + context[CONTEXT_KEY_NAME] + ":"
    );
    this.ux.log(
      "(CloudCamp will make changes and push to your git repository)"
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
    let account = await STS.getAccountId();
    this.ux.stop();

    if (
      !flags.yes &&
      context[CONTEXT_KEY_ACCOUNT] &&
      account != context[CONTEXT_KEY_ACCOUNT]
    ) {
      let shouldContinue = await this.ux.confirm({
        message: "WARNING: AWS account has changed. Continue?",
        default: false,
      });

      if (!shouldContinue) {
        this.exit(0);
      }
    }

    // Get the GitHub token name
    let parsedUrl = parseRepositoryUrl(remote.value);

    if (!context[CONTEXT_REPOSITORY_TOKEN_SECRET]) {
      switch (parsedUrl.host) {
        case RepositoryHost.GITHUB:
          context[CONTEXT_REPOSITORY_TOKEN_SECRET] =
            _.kebabCase(context[CONTEXT_KEY_NAME]) + "-github-repository-token";
          break;
      }
    }

    // Get GitHub token
    let gitRepo = new GitRepository();

    await this.retrieveAndStoreRepositoryToken(
      context[CONTEXT_KEY_NAME],
      context[CONTEXT_REPOSITORY_TOKEN_SECRET],
      gitRepo,
      flags.yes
    );

    // Set up vpc
    let vpcId: string;
    if (context[CONTEXT_KEY_VPC]) {
      vpcId = context[CONTEXT_KEY_VPC];
    } else {
      this.ux.start("Creating VPC");
      vpcId = await VPC.create(context[CONTEXT_KEY_NAME]);
      this.ux.stop();
    }

    context[CONTEXT_KEY_ACCOUNT] = account;
    context[CONTEXT_KEY_REPOSITORY] = remote.value;
    context[CONTEXT_KEY_BRANCH] = branch.value;
    context[CONTEXT_KEY_REGION] = region.value;
    context[CONTEXT_KEY_VPC] = vpcId;

    updateCdkJsonContext(context);

    // Run bootstrap if needed
    if (!(await CloudFormation.stackExists("CDKToolkit"))) {
      this.ux.start("Running cdk bootstrap...");
      await CDK.bootstrap(account, region.value, flags.profile);
      this.ux.stop();
    }

    this.ux.start("Synthesizing app");
    await CDK.synth(flags.profile);
    this.ux.stop();

    // push changes
    if (await gitRepo.hasChanges()) {
      this.ux.start("Pushing changes");
      await gitRepo.commitAndPush("[cloudcamp] deploy");
      this.ux.stop();
    }

    await CDK.deploy(this.ux, flags.profile);
    this.ux.nice("Deploy succeeded.");
  }

  async retrieveAndStoreRepositoryToken(
    appName: string,
    tokenName: string,
    gitRepo: GitRepository,
    yesFlag: boolean
  ) {
    let keep = true;

    let secretExists = await SecretManager.exists(tokenName);
    if (yesFlag && secretExists) {
      keep = true;
    } else if (secretExists) {
      this.log("");
      this.log(
        ` ${chalk.red(
          "›"
        )} There already is a GitHub token associated with this app.`
      );
      this.log("");

      keep = await this.ux.confirm({
        message: "Keep current GitHub token?",
        default: true,
      });
    }

    if (!secretExists && yesFlag) {
      throw new Error(
        "Github token not found.\n\n" +
          "To setup your GitHub token, either:\n" +
          " * Run `camp deploy` without --yes\n" +
          " * Set the token name via `camp configure:github-token`"
      );
    }

    if (!secretExists || !keep) {
      let auth = gitRepo.oauthVerify((verification) => {
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
      let token = tokenAuth.token;

      this.ux.start("Storing GitHub token");
      await SecretManager.upsert(tokenName, token, appName);
      this.ux.stop();
    }
  }
}
