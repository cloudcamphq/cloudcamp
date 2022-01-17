import { Command } from "@oclif/command";
import { UX } from "./ux";
import chalk from "chalk";

/**
 * The base class used for all commands
 */
export abstract class BaseCommand extends Command {
  protected ux: UX;

  constructor(argv: string[], config: any) {
    super(argv, config);

    this.ux = new UX(this);
  }

  /**
   * Customized error handler
   */
  async catch(error: Error) {
    const anyerror = error as any;

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
    const code = anyerror.oclif && anyerror.oclif.exit ? anyerror.oclif : 1;
    process.exit(code);
  }
}
