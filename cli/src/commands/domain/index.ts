import _ from "lodash";
import { BaseCommand } from "../../command";
import { execSync } from "child_process";

export default class DomainIndex extends BaseCommand {
  static description =
    "Manage domains.\nManage the nameserver setup for your domains.";
  async run() {
    process.stdout.write(execSync("camp domain --help").toString());
  }
}
