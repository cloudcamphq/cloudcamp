import * as fs from "fs";
import * as path from "path";
import { Language, LanguageCode } from "@cloudcamp/aws-runtime/src/language";
import {
  CONTEXT_KEY_CLOUDCAMP_VERSION,
  CONTEXT_KEY_NAME,
} from "@cloudcamp/aws-runtime/src/constants";
import { exec } from "child_process";
import { Template } from "./template";
import _ from "lodash";
import { version } from "./utils";

/**
 * Properties of a new app.
 */
export interface NewAppProps {
  /**
   * Name of the app.
   */
  readonly name: string;

  /**
   * The target CDK language code.
   *
   * The code for creating the infrastructure will be transformed
   * to this language.
   */
  readonly languageCode: LanguageCode;

  /**
   * The template to use.
   */
  readonly template: Template;

  /**
   * The home direcotry of the app.
   */
  readonly home: string;
}

/**
 * The location of the cdk.json file.
 */
export const CDK_JSON_FILE = "cdk.json";

/**
 * A cloudcamp project. Used to generate new or access existing projects.
 */
export class Project {
  /**
   * Runs the full project generation process.
   */
  async generate(props: NewAppProps) {
    const language = Language.make(props.languageCode);
    const template = props.template;
    const appName = props.name;
    const home = props.home;
    template.languageCode = props.languageCode;

    if (fs.existsSync(home)) {
      throw new Error("Directory already exists: " + home);
    }

    fs.mkdirSync(home, { recursive: true });

    fs.mkdirSync(path.join(home, "src"));

    // write the cdk.json file
    fs.writeFileSync(
      path.join(home, CDK_JSON_FILE),
      JSON.stringify(
        {
          app: language.cdkAppCommand,
          context: {
            "@aws-cdk/aws-apigateway:usagePlanKeyOrderInsensitiveId": true,
            "@aws-cdk/core:enableStackNameDuplicates": "true",
            "aws-cdk:enableDiffNoFail": "true",
            "@aws-cdk/core:stackRelativeExports": "true",
            "@aws-cdk/aws-ecr-assets:dockerIgnoreSupport": true,
            "@aws-cdk/aws-secretsmanager:parseOwnedSecretName": true,
            "@aws-cdk/aws-kms:defaultKeyPolicies": true,
            "@aws-cdk/aws-s3:grantWriteWithoutAcl": true,
            "@aws-cdk/aws-ecs-patterns:removeDefaultDesiredCount": true,
            "@aws-cdk/aws-rds:lowercaseDbIdentifier": true,
            "@aws-cdk/aws-efs:defaultEncryptionAtRest": true,
            "@aws-cdk/core:newStyleStackSynthesis": true,
            [CONTEXT_KEY_NAME]: appName,
            [CONTEXT_KEY_CLOUDCAMP_VERSION]: version(),
          },
        },
        null,
        2
      )
    );

    // write language specific files
    for (let [name, contents] of Object.entries(language.additionalFiles)) {
      let file = path.join(home, name);
      if (!fs.existsSync(file)) {
        fs.writeFileSync(file, contents);
      }
    }

    let gitignorePatterns = ["cdk.out/", ".DS_Store"].concat(
      language.gitignorePatterns
    );

    fs.writeFileSync(
      path.join(home, ".gitignore"),
      gitignorePatterns.join("\n") + "\n"
    );

    // apply the template
    await template.apply(props);

    // finally, install and build;
    await this.runAppDir(home, language.installCommand);
    await this.runAppDir(home, language.buildCommand);
  }

  /**
   * Async utility, runs the command in home directory.
   */
  protected async runAppDir(
    appDir: string,
    cmd: string | undefined
  ): Promise<void> {
    if (cmd !== undefined) {
      return new Promise<void>((resolve, reject) => {
        exec(cmd, { cwd: appDir }, (err, _stdout, stderr) => {
          if (err) {
            let msg = err.message + "\n" + stderr;
            reject(msg);
          } else {
            resolve();
          }
        });
      });
    } else {
      return;
    }
  }
}

/**
 * Update the CDK Json file to include account etc.
 */
export function updateCdkJsonContext(home: string, context: any) {
  let cdkJsonFile = path.join(home, CDK_JSON_FILE);
  let cdkJson = JSON.parse(fs.readFileSync(cdkJsonFile).toString());
  _.assign(cdkJson.context, context);
  fs.writeFileSync(path.join(cdkJsonFile), JSON.stringify(cdkJson, null, 2));
}

/**
 * Read the cdk.json file or throw an error if it does not exist.
 */
export function getCdkJsonContext(home: string) {
  let cdkJsonFile = path.join(home, CDK_JSON_FILE);
  if (!fs.existsSync(cdkJsonFile)) {
    throw new Error("cdk.json not found.");
  }
  return JSON.parse(fs.readFileSync(cdkJsonFile).toString()).context;
}
