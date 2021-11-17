import { CAMP_HOME_DIR } from "@cloudcamp/aws-runtime/src/constants";
import chalk from "chalk";
import * as fs from "fs";
import * as path from "path";

export function version(): string {
  let packageJsonPath = path.join(__dirname, "..", "package.json");
  let contents = JSON.parse(fs.readFileSync(packageJsonPath).toString());
  return contents.version;
}

export function resolveHome(homeFlag?: string): string {
  if (homeFlag !== undefined) {
    if (!fs.existsSync(homeFlag)) {
      throw new Error("Home directory does not exist: " + homeFlag);
    } else {
      return homeFlag;
    }
  }

  if (fs.existsSync("cdk.json")) {
    return ".";
  }

  if (
    fs.existsSync(".git") && // is project root
    fs.existsSync(CAMP_HOME_DIR)
  ) {
    return CAMP_HOME_DIR;
  }

  throw new Error(
    `Could not find home directory.\n   ${chalk.gray(
      "(use --home specify the home directory)"
    )}`
  );
}
