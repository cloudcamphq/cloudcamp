import { flags } from "@oclif/command";
import { assumeAWSProfile, SecretsManager } from "../../aws";
import { BaseCommand } from "../../command";
import {
  getCdkJsonContext,
  resolveHome,
  updateCdkJsonContext,
} from "../../utils";
import {
  CONTEXT_KEY_DOCKERHUB_CREDENTIALS,
  CONTEXT_KEY_NAME,
  CONTEXT_REPOSITORY_TOKEN_SECRET,
  DEFAULT_DOCKERHUB_CREDENTIALS_SECRET_NAME,
  DEFAULT_GITHUB_TOKEN_SECRET_NAME,
} from "@cloudcamp/aws-runtime/src/constants";
import { DockerHub } from "../../dockerhub";

/**
 * @order 5
 * @suborder 2
 */
export default class ConfigureDockerHub extends BaseCommand {
  static description = `Configure the GitHub Token.`;

  static args = [];

  static flags = {
    help: flags.help({ char: "h" }),
    profile: flags.string({
      char: "p",
      description: "The name of the AWS profile.",
    }),
    home: flags.string({ description: "The home directory of your app." }),
    secret: flags.string({
      description: "The name of the DockerHub secret",
    }),
  };

  async run() {
    const { flags } = this.parse(ConfigureDockerHub);
    const home = resolveHome(flags.home);
    const context = getCdkJsonContext(home);
    await assumeAWSProfile(flags.profile);

    const secretName =
      flags.secret || DEFAULT_DOCKERHUB_CREDENTIALS_SECRET_NAME;

    // if exists, dont confirm.
    // otherwise, set up a new token
    const shouldWriteKey = await DockerHub.setupDockerHubCredentials(
      this.ux,
      context[CONTEXT_KEY_NAME],
      secretName,
      false
    );

    if (shouldWriteKey) {
      context[CONTEXT_KEY_DOCKERHUB_CREDENTIALS] = secretName;
      updateCdkJsonContext(home, context);
    }
  }
}
