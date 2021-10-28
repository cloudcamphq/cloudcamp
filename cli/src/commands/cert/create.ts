import { flags } from "@oclif/command";
import { CertificateManager } from "../../aws";
import { BaseCommand } from "../../command";

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
  };

  async run() {
    const { flags, args } = this.parse(CreateCert);
    this.setup(flags);
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
