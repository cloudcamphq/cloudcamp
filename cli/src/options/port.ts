import { Input } from "../option";
import { UX } from "../ux";

/**
 * Edit port number
 */
export class PortInput extends Input<number> {
  message = "HTTP Port";
  code = "port";

  constructor(public value: number) {
    super();
  }

  get displayValue() {
    return `${this.value}`;
  }

  async edit(ux: UX): Promise<void> {
    this.value = await ux.number({
      message: "Port:",
      validate: async (port: number) =>
        port > 0 && port <= 65535 ? true : "Must be between 0 and 65,535",
    });
  }
}
