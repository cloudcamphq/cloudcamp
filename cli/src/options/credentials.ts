import { Input } from "../option";
import { UX } from "../ux";
import chalk from "chalk";
import { getProfile } from "../aws";

let pressAnyKey = require("press-any-key");

/**
 * Pick AWS credentials
 */

export class CredentialsInput extends Input<string> {
  message = "Credentials";
  code = "credentials";
  value!: string;
  displayValue!: string;
  profile?: string;

  constructor(profile?: string) {
    super();
    this.profile = profile;
  }
  async init() {
    this.value = await (await getProfile(this.profile)).description;
    this.displayValue = this.value;
    return this;
  }

  async edit(ux: UX, _parent?: Input<any>): Promise<void> {
    ux.log(
      chalk.cyan("❯ "),
      "To change the AWS profile, set --profile or environment variables."
    );
    ux.log("");
    await pressAnyKey();
  }
}
