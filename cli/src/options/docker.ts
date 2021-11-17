import * as fs from "fs";
import { Input } from "../option";
import { UX } from "../ux";

/**
 * Pick project name
 */
export class DockerfileInput extends Input<string | undefined> {
  message = "Dockerfile";
  code = "docker";
  value: string | undefined;

  constructor(dockerfile?: string) {
    super();
    this.value = dockerfile;
  }

  get displayValue() {
    if (!this.value) {
      return "*Generate*";
    }
    return this.value;
  }

  async edit(ux: UX): Promise<void> {
    const value = await ux.input({
      message: "Path to Dockerfile:",
      validate: async (dockerfile) => {
        dockerfile = dockerfile.trim();
        if (dockerfile.length == 0) {
          return true;
        }
        if (!fs.existsSync(dockerfile)) {
          return "File not found: " + dockerfile;
        }
        return true;
      },
    });

    if (value.trim().length === 0) {
      this.value = undefined;
    } else {
      this.value = value.trim();
    }
  }
}
