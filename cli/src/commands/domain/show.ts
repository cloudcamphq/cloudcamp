import { flags } from "@oclif/command";
import { assumeAWSProfile, Route53 } from "../../aws";
import { BaseCommand } from "../../command";
import { cli } from "cli-ux";
import chalk from "chalk";

/**
 * @order 4
 * @suborder 4
 */
export default class ShowDomain extends BaseCommand {
  static description = `Show nameservers and certificate.`;

  static args = [{ name: "domain" }];

  static flags = {
    help: flags.help({ char: "h" }),
    profile: flags.string({ char: "p", description: "The AWS profile name" }),
  };

  async run() {
    const { flags, args } = this.parse(ShowDomain);
    await assumeAWSProfile(flags.profile);

    const nameservers = await Route53.getNameServers(args.domain);
    const domain = await Route53.getDomain(args.domain);
    this.ux.log("");
    cli.table(nameservers, {
      // @ts-ignore
      nameserver: {
        header: "Nameservers",
        minWidth: 20,
      },
    });
    this.ux.log("");
    let message;
    if (domain.certificate == "Issued") {
      message = chalk.green("✔ Issued");
    } else if (domain.certificate == "None") {
      message = chalk.gray("✘ None");
    } else if (domain.certificate == "Pending") {
      message = chalk.yellow("⧗ Pending");
    } else {
      message = chalk.red("✘ " + domain.certificate);
    }
    this.ux.log(" Cert:", message);
  }
}
