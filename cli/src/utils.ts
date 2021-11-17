import { CAMP_HOME_DIR } from "@cloudcamp/aws-runtime/src/constants";
import chalk from "chalk";
import * as fs from "fs";
import * as path from "path";
import _ from "lodash";

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

export function resolveNewHome(homeFlag?: string): string {
  let home = homeFlag == undefined ? CAMP_HOME_DIR : homeFlag;
  if (fs.existsSync(home)) {
    throw new Error(
      `Directory exists: ${home}\n   ${chalk.gray(
        "(use --home to use a different directory)"
      )}`
    );
  }
  return home;
}

/**
 * Update the CDK Json file to include account etc.
 */
export function updateCdkJsonContext(home: string, context: any) {
  let cdkJsonFile = path.join(home, "cdk.json");
  let cdkJson = JSON.parse(fs.readFileSync(cdkJsonFile).toString());
  _.assign(cdkJson.context, context);
  fs.writeFileSync(path.join(cdkJsonFile), JSON.stringify(cdkJson, null, 2));
}

/**
 * Read the cdk.json file or throw an error if it does not exist.
 */
export function getCdkJsonContext(home: string) {
  let cdkJsonFile = path.join(home, "cdk.json");
  if (!fs.existsSync(cdkJsonFile)) {
    throw new Error("cdk.json not found.");
  }
  return JSON.parse(fs.readFileSync(cdkJsonFile).toString()).context;
}
