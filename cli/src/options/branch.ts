import chalk from "chalk";
import { GitRepository } from "../git";
import { Input } from "../option";
import { UX } from "../ux";
let pressAnyKey = require("press-any-key");

/**
 * Pick a git branch
 */
export class BranchInput extends Input<string> {
  message = "Main branch";
  code = "branch";
  value!: string;

  constructor() {
    super();
  }

  async init() {
    let git = new GitRepository();
    this.value = await git.getCurrentBranch();
    return this;
  }

  get displayValue() {
    return `${this.value} [current]`;
  }

  async edit(ux: UX): Promise<void> {
    ux.log(
      chalk.cyan("❯"),
      "To use another branch, switch to the branch in git (i.e. run `git checkout <branchname>`)."
    );
    ux.log();
    await pressAnyKey();
  }
}
