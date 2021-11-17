import { flags } from "@oclif/command";
import { CertificateManager, setupAWS } from "../../aws";
import { BaseCommand } from "../../command";
import { resolveHome } from "../../utils";

/**
 * @order 8
 */
export default class CreateCert extends BaseCommand {
  static description = `Create a new SSL certificate.`;

  static args = [
    {
      name: "domain",
      description: "the domain to request the certificate for.",
    },
  ];

  static flags = {
    help: flags.help({ char: "h" }),
    profile: flags.string({ char: "p", description: "the AWS profile name" }),
    home: flags.string({ description: "The home directory of your app." }),
  };

  async run() {
    const { flags, args } = this.parse(CreateCert);
    let home = resolveHome(flags.home);
    setupAWS(home, flags.profile);
    if (!(await CertificateManager.hasCert(args.domain))) {
      this.ux.start("Creating new certificate");
      await CertificateManager.request(args.domain);
      this.ux.stop();
    }
    this.ux.start("Waiting for certificate validation");
    await CertificateManager.waitForValidated(args.domain);
    this.ux.stop();
    this.ux.logSuccess("Certificate created:", args.domain);
  }
}
