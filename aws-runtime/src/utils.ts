import * as _ from "lodash";
import { RepositoryHost } from "./types";
import * as path from "path";
import * as fs from "fs";
import * as cdk from "aws-cdk-lib";
import * as crypto from "crypto";

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
  const packageJsonPath = path.join(__dirname, "..", "package.json");
  const contents = JSON.parse(fs.readFileSync(packageJsonPath).toString());
  return contents.version;
}

export function withUniqueOutputExportName(output: cdk.CfnOutput) {
  const stack = cdk.Stack.of(output);
  const stackId = limitIdentifierLength(stack.artifactId, 100);
  const outputName = stack.resolve(output.logicalId);
  output.exportName = _.camelCase(`${stackId}.${outputName}`);
  return output;
}

function limitIdentifierLength(s: string, n: number): string {
  if (s.length <= n) {
    return s;
  }
  const h = hash(s).substr(0, 8);
  const mid = Math.floor((n - h.length) / 2);

  return s.substr(0, mid) + h + s.substr(s.length - mid);
}

function hash<A>(obj: A) {
  const d = crypto.createHash("sha256");
  d.update(JSON.stringify(obj));
  return d.digest("hex");
}
