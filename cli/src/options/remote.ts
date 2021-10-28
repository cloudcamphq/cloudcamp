import { GitRepository } from "../git";
import { Choice } from "../option";
import { UX } from "../ux";

/**
 * Pick the git remote
 */
export class GitRemoteChoice extends Choice<string> {
  message = "Repository";
  code = "repository";

  constructor(private repository?: string) {
    super();
  }

  async init() {
    let git = new GitRepository();
    if (await git.isGitRepository()) {
      this.choices = await git.getGitRemotes();

      if (!this.choices.size) {
        throw new Error(
          "No GitHub remote defined in repository.\n\n" +
            "Add a remote to your repository and run `camp deploy` again."
        );
      }

      this.key = Array.from(this.choices.keys())[0];
    } else {
      throw new Error(
        "No git repository found.\n\n" +
          "Create a git repository and run `camp deploy` again."
      );
    }

    for (var k in this.choices.keys()) {
      if (this.choices.get(k) === this.repository) {
        this.key = k;
      }
    }
    if (!this.key) {
      this.key = Array.from(this.choices.keys())[0];
    }
    return this;
  }

  displayChoice(key: string): string {
    return `${this.choices.get(key)} [${key}]`;
  }

  get displayValue() {
    return this.displayChoice(this.key as string);
  }

  async edit(ux: UX) {
    await super.edit(ux);
  }
}
