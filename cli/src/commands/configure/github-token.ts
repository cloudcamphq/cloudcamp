import { flags } from "@oclif/command";
import { assumeAWSProfile, SecretsManager } from "../../aws";
import { BaseCommand } from "../../command";
import { getCdkJsonContext, resolveHome } from "../../utils";
import {
  CONTEXT_KEY_NAME,
  CONTEXT_REPOSITORY_TOKEN_SECRET,
  DEFAULT_GITHUB_TOKEN_SECRET_NAME,
} from "@cloudcamp/aws-runtime/src/constants";

/**
 * @order 5
 * @suborder 1
 */
export default class ConfigureGitHubToken extends BaseCommand {
  static description = `Configure the GitHub Token.`;

  static args = [];

  static flags = {
    help: flags.help({ char: "h" }),
    profile: flags.string({
      char: "p",
      description: "The name of the AWS profile.",
    }),
    home: flags.string({ description: "The home directory of your app." }),
    name: flags.string({
      char: "n",
      description: "The name of the GitHub token.",
    }),
    token: flags.string({
      char: "t",
      description: "The GitHub token.",
    }),
  };

  async run() {
    const { flags } = this.parse(ConfigureGitHubToken);

    const home = resolveHome(flags.home);

    const context = getCdkJsonContext(home);
    await assumeAWSProfile(flags.profile);

    let name: string;
    if (!flags.name) {
      name = await this.ux.input({
        message: "GitHub secret name",
        default: DEFAULT_GITHUB_TOKEN_SECRET_NAME,
      });
    } else {
      name = flags.name;
    }

    let token: string | undefined;
    if (!flags.token) {
      token = await this.ux.input({
        message: "GitHub token",
        default: undefined,
      });
    } else {
      token = flags.token;
    }

    context[CONTEXT_REPOSITORY_TOKEN_SECRET] = name;

    if (token) {
      this.ux.start("Storing GitHub token");
      await SecretsManager.upsert(name, token, context[CONTEXT_KEY_NAME]);
      this.ux.stop();
    }
  }
}
