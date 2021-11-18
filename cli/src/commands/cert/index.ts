import _ from "lodash";
import { BaseCommand } from "../../command";
import { execSync } from "child_process";

export default class CertIndex extends BaseCommand {
  static description =
    "Manage SSL certificates.\nCreate/delete SSL certificates for your domains.";
  async run() {
    process.stdout.write(execSync("camp cert --help").toString());
  }
}
