import _ from "lodash";
import { flags } from "@oclif/command";
import { BaseCommand } from "../../command";
import { LanguageCode } from "@cloudcamp/aws-runtime/src/language";
import { Settings } from "../../options/settings";
import { NameInput } from "../../options/name";
import { LanguageChoice } from "../../options/language";
import { CAMP_HOME_DIR } from "@cloudcamp/aws-runtime/src/constants";
import * as path from "path";
import { resolveNewHome } from "../../utils";
import { Generator } from "../../generator";

export default class InitDebug extends BaseCommand {
  static description = `Initialize a new CloudCamp project for debugging.
This copies the whole aws-runtime folder in its current state.`;

  static flags = {
    help: flags.help({ char: "h", description: "Show CLI help." }),
    name: flags.string({ char: "n", description: "The name of your app." }),
    home: flags.string({ description: "The output directory of the app." }),
    yes: flags.boolean({ description: "Accept the default choices." }),
  };

  async run() {
    const { flags } = this.parse(InitDebug);

    let home = resolveNewHome(flags.home);

    // if the user specified a home dir, be smart and use it as app name
    let name = new NameInput(
      flags.name || (home && home != CAMP_HOME_DIR)
        ? path.basename(home)
        : undefined
    );
    let language = new LanguageChoice(LanguageCode.TYPESCRIPT);
    let settings = await new Settings(name, language).init();

    if (!flags.yes) {
      await settings.edit(this.ux);
    }

    this.ux.start("Generating project");
    let generator = new Generator(home, name.value, language.value);
    await generator.generate();

    // copy the whole aws-runtime source to the app directory
    generator.copyDirHome(
      path.join(
        path.dirname(__filename),
        "..",
        "..",
        "..",
        "..",
        "aws-runtime"
      ),
      "aws-runtime"
    );

    // but get rid of node modules and gitignore
    generator.deleteHome(path.join("aws-runtime", "node_modules"));
    generator.deleteHome(path.join("aws-runtime", ".gitignore"));
    generator.copyFileHome(
      generator.resources("debug", ".gitignore"),
      path.join("aws-runtime", ".gitignore")
    );

    // now modify package.json
    generator.copyFileHome(
      generator.resources("debug", "package.json"),
      "package.json"
    );

    // copy dockerfile etc.
    generator.copyDirHome(
      generator.resources("debug", "resources"),
      "resources"
    );

    // create source file
    generator.copySourceHome(generator.resources("debug", "app.ts"), {
      port: 80,
      dockerfile: "resources/Dockerfile",
    });

    // run npm install in aws-runtime
    generator.runAppDir(
      path.join(generator.home, "aws-runtime"),
      "npm install"
    );

    await generator.installAndBuild();
    this.ux.stop();

    // And we are done.
    this.ux.log("");
    this.ux.log("Your app is ready to deploy. To continue run:");
    this.ux.nice(
      flags.home ? `camp deploy --home=${flags.home}` : "camp deploy"
    );
  }
}
