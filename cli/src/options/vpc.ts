import { Input } from "../option";
import { UX } from "../ux";
import { VPC } from "../aws";

/**
 * Pick AWS VPC
 */

export class VpcInput extends Input<string> {
  message = "VPC";
  code = "vpc";
  value: string;

  constructor(vpcId?: string) {
    super();
    this.value = vpcId || "default";
  }

  get displayValue(): string {
    if (this.value == "default") {
      return "Default";
    }
    return this.value;
  }

  async edit(ux: UX, _parent?: Input<any>): Promise<void> {
    ux.start("Retrieving VPCs");
    let vpcs = await VPC.list();
    ux.stop();
    ux.log("");

    let choices = vpcs.map((vpc) => ({
      value: vpc.id,
      short: vpc.id,
      name: vpc.descr,
    }));

    if (choices.length == 0) {
      ux.log("No VPCs found!");
      ux.log();
    }

    this.value = await ux.list({
      message: this.message + ":",
      choices: choices,
      default: this.value == "default" ? choices[0].value : this.value,
    });
  }
}
