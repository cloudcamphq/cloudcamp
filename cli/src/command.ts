import { Command } from "@oclif/command";
import { UX } from "./ux";
import chalk from "chalk";
import { setupAWS } from "./aws";
import * as path from "path";
import { getCdkJsonContext } from "./project";
import { CONTEXT_KEY_NAME } from "@cloudcamp/aws-runtime/src/constants";

/**
 * The base class used for all commands
 */
export abstract class BaseCommand extends Command {
  protected ux: UX;

  constructor(argv: string[], config: any) {
    super(argv, config);

    this.ux = new UX(this);
  }

  protected async setup(flags: any) {
    setupAWS(flags.profile);
    let appName = getCdkJsonContext()[CONTEXT_KEY_NAME];
    let dirName = path.basename(process.cwd());
    if (dirName != appName) {
      // need to call this.catch manually because when throwing from BaseCommand
      // the custom error handler is not called
      this.catch(
        new Error(
          `App name '${appName}' does not match directory name '${dirName}'.\n\n` +
            "Either rename the app in cdk.json or rename the directory to match the app name."
        )
      );
    }
  }

  /**
   * Customized error handler
   */
  async catch(error: Error) {
    let anyerror = error as any;

    if (
      anyerror.oclif &&
      anyerror.oclif.exit !== undefined &&
      anyerror.oclif.exit === 0
    ) {
      return;
    }

    if (this.ux.spinning) {
      this.ux.stop("Failed.");
    }
    if (anyerror.name === "CredentialsProviderError") {
      this.log(
        ` ${chalk.red(
          "›"
        )} AWS credentials not found. Did you run \`aws configure\`?`
      );
    } else {
      if (process.env.DEBUG && (error as any).stack) {
        this.log((error as any).stack);
      }
      this.log(` ${chalk.red("›")} ${error.message ? error.message : error}`);
    }
    let code = anyerror.oclif && anyerror.oclif.exit ? anyerror.oclif : 1;
    process.exit(code);
  }
}
