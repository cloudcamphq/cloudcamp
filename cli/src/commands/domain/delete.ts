import { flags } from "@oclif/command";
import { assumeAWSProfile, CertificateManager, Route53 } from "../../aws";
import { BaseCommand } from "../../command";
import { cli } from "cli-ux";

/**
 * @order 4
 * @suborder 2
 */
export default class DeleteDomain extends BaseCommand {
  static description = `Delete a domain.`;

  static args = [{ name: "domain" }];

  static flags = {
    help: flags.help({ char: "h" }),
    profile: flags.string({ char: "p", description: "The AWS profile name" }),
  };

  async run() {
    const { flags, args } = this.parse(DeleteDomain);
    await assumeAWSProfile(flags.profile);
    // TODO check if the record exists

    const records = await Route53.listRecords(args.domain);
    const hasCert = await CertificateManager.hasCert(args.domain);
    this.ux.log("");
    this.ux.log(
      `The domain ${args.domain} contains ${records.length} records:`
    );
    this.ux.log("");
    cli.table(records, {
      // @ts-ignore
      type: {
        header: "Type",
        minWidth: 8,
      },
      name: {
        header: "Name",
      },
    });
    this.ux.log("");
    if (hasCert) {
      this.ux.log("It also has an SSL certificate.");
      this.ux.log("");
    }
    const shouldDelete = await this.ux.confirm({
      message: hasCert
        ? "Delete all records and certificate?"
        : "Delete all records?",
      default: false,
    });
    if (shouldDelete) {
      await Route53.remove(args.domain);
      this.ux.logSuccess("Domain deleted:", args.domain);
    }
  }
}
