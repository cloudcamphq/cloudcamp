import { flags } from "@oclif/command";
import { CertificateManager } from "../../aws";
import { BaseCommand } from "../../command";

/**
 * @order 9
 */
export default class DeleteCert extends BaseCommand {
  static description = `Delete an SSL certificate.`;

  static args = [
    {
      name: "domain",
      description: "the domain name of the SSL certificate.",
    },
  ];

  static flags = {
    help: flags.help({ char: "h" }),
    profile: flags.string({ char: "p", description: "the AWS profile name" }),
  };

  async run() {
    const { flags, args } = this.parse(DeleteCert);
    this.setup(flags);

    await CertificateManager.remove(args.domain);
    this.ux.logSuccess("Certificate deleted:", args.domain);
  }
}
