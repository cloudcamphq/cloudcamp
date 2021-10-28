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
import * as path from "path";

/**
 * # Examples
 *
 * This will create an app in the directory `cloudcamp/myapp`:
 *
 * ```bash
 * $ camp init --name=myapp
 * ```
 *
 * @order 1
 */
export default class Init extends BaseCommand {
  static description = `Initialize a new CloudCamp project.
Running this command creates all files necessary for deploying your app on AWS.`;

  static flags = {
    help: flags.help({ char: "h", description: "Show CLI help." }),
    name: flags.string({ char: "n", description: "The name of your app." }),
    /**
     * This is some more documentation.
     */
    yes: flags.boolean({ description: "Accept the default choices." }),
    debug: flags.boolean({
      description:
        "Debug mode. This is only useful for working on the cloudcamp source.",
    }),
  };

  async run() {
    const { flags } = this.parse(Init);

    let name = new NameInput(flags.name);
    let language = new LanguageChoice(LanguageCode.TYPESCRIPT);
    let template = new TemplateChoice(
      await Template.templatesForInit(flags.debug)
    );

    this.ux.displayBanner();

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
    });
    this.ux.stop();

    // And we are done.
    this.ux.log("");
    this.ux.log("Your app is ready to deploy.");
    this.ux.nice("To continue run:");
    this.ux.log(`cd ${path.join(CAMP_HOME_DIR, name.value)}`);
    this.ux.log("camp deploy");
  }
}
