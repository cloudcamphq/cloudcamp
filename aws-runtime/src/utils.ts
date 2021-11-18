import * as _ from "lodash";
import { RepositoryHost } from "./types";
import * as path from "path";
import * as fs from "fs";

export function setDefaults<T>(props: T | undefined, defaults: any): T {
  return _.defaultsDeep(props, defaults || {}) as T;
}

export function parseRepositoryUrl(url: string): {
  host: RepositoryHost;
  owner: string;
  repo: string;
} {
  let match = url.match(/^.*?@github.com:(.*?)\/(.*?)\.git$/);
  if (match !== null) {
    return { host: RepositoryHost.GITHUB, owner: match[1], repo: match[2] };
  }
  match = url.match(/github\.com\/(.*?)\/(.*?)$/);
  if (match !== null) {
    return { host: RepositoryHost.GITHUB, owner: match[1], repo: match[2] };
  }
  throw new Error("Invalid repository url: " + url);
}

export function version(): string {
  let packageJsonPath = path.join(__dirname, "..", "package.json");
  let contents = JSON.parse(fs.readFileSync(packageJsonPath).toString());
  return contents.version;
}
