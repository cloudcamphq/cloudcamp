import { flags } from "@oclif/command";
import { assumeAWSProfile, Route53 } from "../../aws";
import { BaseCommand } from "../../command";
import { cli } from "cli-ux";

/**
 * @order 4
 * @suborder 1
 */
export default class CreateDomain extends BaseCommand {
  static description = `Create a domain.`;

  static args = [
    {
      name: "domain",
      description: "The domain name to create NS entries for.",
    },
  ];

  static flags = {
    help: flags.help({ char: "h" }),
    profile: flags.string({
      char: "p",
      description: "The name of the AWS profile.",
    }),
  };

  async run() {
    const { flags, args } = this.parse(CreateDomain);
    await assumeAWSProfile(flags.profile);
    await Route53.create(args.domain);
    const nameservers = await Route53.getNameServers(args.domain);
    this.ux.log("");
    cli.table(nameservers, {
      // @ts-ignore
      nameserver: {
        header: "Nameservers",
        minWidth: 20,
      },
    });
    this.ux.nice(
      "To request a certificate, run `camp cert:create " + args.domain + "`"
    );
    this.ux.logSuccess("Domain created:", args.domain);
  }
}
