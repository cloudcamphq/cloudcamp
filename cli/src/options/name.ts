import * as path from "path";
import * as fs from "fs";
import { GitRepository } from "../git";
import { Input } from "../option";
import { UX } from "../ux";
import { CAMP_HOME_DIR } from "@cloudcamp/aws-runtime/src/constants";

/**
 * Pick project name
 */
export class NameInput extends Input<string> {
  message = "App name";
  code = "name";
  value!: string;

  constructor(name?: string) {
    super();
    if (name) {
      this.value = name;
    }
  }

  async init() {
    let name: string | undefined = this.value;

    if (!name) {
      let git = new GitRepository();
      if (await git.isGitRepository()) {
        let remotes = await git.getGitRemotes();
        for (let url of Array.from(remotes.values())) {
          let m1 = url.match(/\/([\w._-]*?)\.git/);
          let m2 = url.match(/github\.com\/(.*?)\/(.*?)$/);

          let repo = (m1 && m1[1]) || (m2 && m2[2]);
          if (repo && this.validateProjectName(repo)) {
            name = repo;
            break;
          }
        }
      }

      if (!name) {
        let base = path.basename(process.cwd());
        if (this.validateProjectName(base)) {
          name = base;
        } else {
          name = "app";
        }
      }
    }

    this.value = name;
    let i = 1;
    while (this.projectExists(this.value)) {
      this.value = `${name}${i}`;
      i += 1;
    }

    return this;
  }

  get displayValue() {
    if (!this.value) {
      throw new Error(
        "Project name option has no value when displayValue() was called."
      );
    }
    return this.value;
  }

  async edit(ux: UX): Promise<void> {
    this.value = await ux.input({
      message: "App name:",
      validate: async (name) => {
        let validName = this.validateProjectName(name);
        if (validName !== true) {
          return validName;
        }
        if (this.projectExists(name)) {
          return "Project already exists.";
        }
        return true;
      },
    });
  }

  private validateProjectName(name: string) {
    if (!/^[a-zA-Z0-9]+$/.test(name)) {
      return "Name must contain alphanumeric characters only.";
    } else if (name.length < 1) {
      return "Name must not be empty.";
    } else if (name[0] >= "0" && name[0] <= "9") {
      return "Name must not start with a number.";
    } else if (name == "global") {
      return "The name `global` is reserved.";
    }
    return true;
  }

  private projectExists(name: string): boolean {
    let projectPath = path.join(CAMP_HOME_DIR, name);
    return fs.existsSync(projectPath);
  }
}
