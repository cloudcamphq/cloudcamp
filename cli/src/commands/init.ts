import _ from "lodash";
import { flags } from "@oclif/command";
import { BaseCommand } from "../command";
import { Template } from "../template";
import { Project } from "../project";
import { LanguageCode } from "@cloudcamp/aws-runtime/src/language";
import { Settings } from "../options/settings";
import { NameInput } from "../options/name";
import { LanguageChoice } from "../options/language";
import { TemplateChoice } from "../options/template";
import { CAMP_HOME_DIR } from "@cloudcamp/aws-runtime/src/constants";
import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";
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
 */
export default class Init extends BaseCommand {
  static description = `Initialize a new CloudCamp project.
Creates all files necessary for deploying your app on AWS.`;

  static flags = {
    help: flags.help({ char: "h", description: "Show CLI help." }),
    name: flags.string({ char: "n", description: "The name of your app." }),
    home: flags.string({ description: "The output directory of the app." }),
    /**
     * This is some more documentation.
     */
    yes: flags.boolean({ description: "Accept the default choices." }),
  };

  async run() {
    const { flags } = this.parse(Init);

    let home = flags.home || CAMP_HOME_DIR;

    if (fs.existsSync(home)) {
      throw new Error(
        `Directory exists: ${home}\n   ${chalk.gray(
          "(use --home to use a different directory)"
        )}`
      );
    }

    // if the user specified a home dir, be smart and use it as app name
    let name = new NameInput(
      flags.name || (home && home != CAMP_HOME_DIR)
        ? path.basename(home)
        : undefined
    );
    let language = new LanguageChoice(LanguageCode.TYPESCRIPT);
    let template = new TemplateChoice(
      await Template.templatesForInit(
        process.env.DEBUG !== undefined && process.env.DEBUG !== "0"
      )
    );

    let settings = await new Settings(name, language, template).init();

    if (!flags.yes) {
      await settings.edit(this.ux);
    }

    let project = new Project();

    this.ux.start("Generating project");
    await project.generate({
      name: name.value as string,
      template: template.value as Template,
      languageCode: language.value as LanguageCode,
      home: home,
    });
    this.ux.stop();

    // And we are done.
    this.ux.log("");
    this.ux.log("Your app is ready to deploy. To continue run:");
    this.ux.nice(
      flags.home ? `camp deploy --home=${flags.home}` : "camp deploy"
    );
  }
}
