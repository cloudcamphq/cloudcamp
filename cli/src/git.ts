import * as fs from "fs";
import * as path from "path";
import _ from "lodash";
import simpleGit from "simple-git";
import { createOAuthDeviceAuth } from "@octokit/auth-oauth-device";

/**
 * The client ID used to connect with GitHub
 */
const GITHUB_CLIENT_ID = "9b63076cfdcf34009656";

/**
 * Handle git repos
 */
export class GitRepository {
  constructor(private homeDir: string = "./") {}

  /**
   * true if the current dir is a git repo
   */
  async isGitRepository() {
    try {
      await this.getGitRemotes();
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * return a dict of remote name -> url
   */
  async getGitRemotes(): Promise<Map<string, string>> {
    return new Promise((resolve, reject) => {
      const git = simpleGit(this.homeDir);
      git.getRemotes(true, (err, data) => {
        if (err) {
          return reject(err);
        }
        data;
        const remotes = new Map(
          _.sortBy(data, [(r) => (r.name == "origin" ? "0" + r.name : r.name)])
            .map((r) => [
              r.name,
              GitRepository.normalizeRemote(r.refs.push) as string,
            ])
            // filter unsupported remotes
            .filter(([_k, v]) => v !== undefined)
            // make type system happy
            .map(([k, v]) => [k, v as string])
        );
        return resolve(remotes);
      });
    });
  }

  /**
   * returns the current git branch
   */
  async getCurrentBranch(): Promise<string> {
    const git = simpleGit(this.homeDir);
    const branches = await git.branch(["-a"]);
    return branches.current;
  }

  /**
   * returns a normalized representation of a git remote.
   */
  static normalizeRemote(url: string): string | undefined {
    const match1 = url.match(/^.*?@github.com:(.*?)\/(.*?)\.git$/);
    const match2 = url.match(/github\.com\/(.*?)\/(.*?)$/);
    if (match1 || match2) {
      const [, owner, repo] = (match1 || match2) as any;
      return `https://github.com/${owner}/${repo}`;
    } else {
      return undefined;
    }
  }

  /**
   * Safely append to .gitignore, adding a newline if needed
   */
  appendToGitignore(...patterns: string[]) {
    const gitignorePath = path.join(this.homeDir, ".gitignore");

    if (fs.existsSync(gitignorePath)) {
      const contents = fs.readFileSync(gitignorePath).toString();
      const existing = new Set(contents.split("\n").map((p) => p.trim()));

      if (!contents.match(/\r?\n$/)) {
        fs.appendFileSync(gitignorePath, "\n");
      }
      for (const pattern of patterns) {
        if (existing.has(pattern)) {
          continue;
        }
        fs.appendFileSync(gitignorePath, pattern + "\n");
      }
    } else {
      fs.writeFileSync(gitignorePath, "");
      for (let pattern of patterns) {
        fs.appendFileSync(gitignorePath, pattern + "\n");
      }
    }
  }

  /**
   * true if the repository has changed files
   */
  async hasChanges() {
    const git = simpleGit(this.homeDir);
    const status = await git.status();
    return status.files.length > 0;
  }

  /**
   * Commit the current state and push to origin
   */
  async commitAndPush(commitMessage: string) {
    const git = simpleGit(this.homeDir);
    await git.add(".").commit(commitMessage).push();
  }

  /**
   * Get remote access via github
   */
  oauthVerify(verify: (verification: any) => void): any {
    return createOAuthDeviceAuth({
      clientType: "oauth-app",
      clientId: GITHUB_CLIENT_ID,
      scopes: ["repo"],
      onVerification: verify,
    });
  }
}
