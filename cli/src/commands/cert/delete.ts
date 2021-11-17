import { flags } from "@oclif/command";
import { CertificateManager, setupAWS } from "../../aws";
import { BaseCommand } from "../../command";
import { resolveHome } from "../../utils";

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
    home: flags.string({ description: "The home directory of your app." }),
  };

  async run() {
    const { flags, args } = this.parse(DeleteCert);
    let home = resolveHome(flags.home);
    setupAWS(home, flags.profile);

    await CertificateManager.remove(args.domain);
    this.ux.logSuccess("Certificate deleted:", args.domain);
  }
}
