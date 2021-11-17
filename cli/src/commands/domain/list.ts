import { flags } from "@oclif/command";
import { Route53, setupAWS } from "../../aws";
import { BaseCommand } from "../../command";
import { cli } from "cli-ux";
import chalk from "chalk";
import { resolveHome } from "../../utils";

/**
 * @order 6
 */
export default class ListDomain extends BaseCommand {
  static description = `List domains.`;

  static flags = {
    help: flags.help({ char: "h" }),
    profile: flags.string({ char: "p", description: "The AWS profile name." }),
    home: flags.string({ description: "The home directory of your app." }),
  };

  async run() {
    const { flags } = this.parse(ListDomain);
    let home = resolveHome(flags.home);
    setupAWS(home, flags.profile);

    let domains = await Route53.list();
    if (domains.length == 0) {
      this.ux.log(
        "No domains found. To add a domain, run `camp domain:create yourdomain.com`"
      );
    } else {
      console.log("");
      cli.table(domains, {
        // @ts-ignore
        domainName: {
          header: "Domain",
          minWidth: 20,
        },
        certificate: {
          header: "Cert",
          // @ts-ignore
          get: (row) => {
            if (row.certificate == "Issued") {
              return chalk.green("✔ Issued");
            } else if (row.certificate == "None") {
              return chalk.gray("✘ None");
            } else if (row.certificate == "Pending") {
              return chalk.yellow("⧗ Pending");
            } else {
              return chalk.red("✘ " + row.certificate);
            }
          },
        },
      });
      console.log("");
    }
  }
}
