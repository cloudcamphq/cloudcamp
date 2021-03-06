import _ from "lodash";
import { flags } from "@oclif/command";
import { BaseCommand } from "../../command";
import { Language, LanguageCode } from "@cloudcamp/aws-runtime/src/language";
import { Settings } from "../../options/settings";
import { NameInput } from "../../options/name";
import { LanguageChoice } from "../../options/language";
import { CAMP_HOME_DIR } from "@cloudcamp/aws-runtime/src/constants";
import * as path from "path";
import { resolveNewHome } from "../../utils";
import { Generator } from "../../generator";
import { DockerfileInput } from "../../options/docker";
import { PortInput } from "../../options/port";
/**
 * # Examples
 *
 * This will create a new app named `myapp`:
 *
 * ```bash
 * $ camp init --name=myapp
 * ```
 *
 * @order 1
 * @suborder 1
 */
export default class Init extends BaseCommand {
  static description = `Initialize a new CloudCamp project based on Docker.
Creates all files necessary for deploying a docker based app on AWS.`;

  static flags = {
    help: flags.help({ char: "h", description: "Show CLI help." }),
    name: flags.string({ char: "n", description: "The name of your app." }),
    home: flags.string({ description: "The app home directory." }),
    /**
     * This is some more documentation.
     */
    yes: flags.boolean({ description: "Accept the default choices." }),
    language: flags.string({
      char: "l",
      description: "The programming language to use.",
      options: Language.LANGUAGE_CODES,
      default: LanguageCode.TYPESCRIPT,
    }),
    dockerfile: flags.string({ description: "The path to a Dockerfile." }),
    port: flags.integer({
      default: 80,
      description: "The port exposed in the Dockerfile.",
    }),
  };

  async run() {
    const { flags } = this.parse(Init);

    const home = resolveNewHome(flags.home);

    // if the user specified a home dir, be smart and use it as app name
    const name = new NameInput(
      flags.name ||
        (home && home != CAMP_HOME_DIR ? path.basename(home) : undefined)
    );
    const language = new LanguageChoice(flags.language as LanguageCode);
    const dockerfile = new DockerfileInput(flags.dockerfile);
    const port = new PortInput(flags.port);
    const settings = await new Settings(
      name,
      language,
      dockerfile,
      port
    ).init();

    if (!flags.yes) {
      await settings.edit(this.ux);
    }

    this.ux.start("Generating project");
    const generator = new Generator(home, name.value, language.value);
    await generator.generate();
    if (dockerfile.value === undefined) {
      generator.copySourceHome(generator.resources("docker", "app.ts"), {
        port: 80,
        dockerfile: "../Dockerfile",
      });
      generator.writeFileHome(
        "Dockerfile",
        "FROM public.ecr.aws/nginx/nginx:latest\n"
      );
    } else {
      generator.copySourceHome(generator.resources("docker", "app.ts"), {
        port: port.value,
        dockerfile: path.join("..", "..", dockerfile.value),
      });
    }

    await generator.install();
    await generator.build();
    this.ux.stop();

    // And we are done.
    this.ux.log("");
    this.ux.log("Your app is ready to deploy. To continue run:");
    this.ux.nice(
      flags.home ? `camp deploy --home=${flags.home}` : "camp deploy"
    );
  }
}
