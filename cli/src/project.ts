import * as fs from "fs";
import * as path from "path";
import { Language, LanguageCode } from "@cloudcamp/aws-runtime/src/language";
import {
  CAMP_HOME_DIR,
  CONTEXT_KEY_CLOUDCAMP_VERSION,
  CONTEXT_KEY_NAME,
} from "@cloudcamp/aws-runtime/src/constants";
import { GitRepository } from "./git";
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
    let language = Language.make(props.languageCode);
    let template = props.template;
    let appName = props.name;
    template.languageCode = props.languageCode;

    // make the cloudcamp home dir
    if (!fs.existsSync(CAMP_HOME_DIR)) {
      fs.mkdirSync(CAMP_HOME_DIR);
    }

    let appDir = path.join(CAMP_HOME_DIR, appName);
    fs.mkdirSync(appDir);
    fs.mkdirSync(path.join(appDir, "src"));

    // write the cdk.json file
    fs.writeFileSync(
      path.join(appDir, CDK_JSON_FILE),
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
            [CONTEXT_KEY_NAME]: props.name,
            [CONTEXT_KEY_CLOUDCAMP_VERSION]: version(),
          },
        },
        null,
        2
      )
    );

    // write language specific files
    for (let [name, contents] of Object.entries(language.additionalFiles)) {
      let file = path.join(appDir, name);
      if (!fs.existsSync(file)) {
        fs.writeFileSync(file, contents);
      }
    }

    // add patterns to .gitignore
    let repo = new GitRepository();
    repo.appendToGitignore(appDir + "/cdk.out");

    // write additional patterns
    for (let pattern of language.gitignorePatterns) {
      repo.appendToGitignore(appDir + "/" + pattern);
    }

    // finally, install and build;
    await this.runAppDir(appDir, language.installCommand);
    await this.runAppDir(appDir, language.buildCommand);

    // and apply the template
    await template.apply(props);
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
export function updateCdkJsonContext(context: any) {
  let cdkJson = JSON.parse(fs.readFileSync(CDK_JSON_FILE).toString());
  _.assign(cdkJson.context, context);
  fs.writeFileSync(path.join(CDK_JSON_FILE), JSON.stringify(cdkJson, null, 2));
}

/**
 * Read the cdk.json file or throw an error if it does not exist.
 */
export function getCdkJsonContext() {
  if (!fs.existsSync(CDK_JSON_FILE)) {
    throw new Error(
      "cdk.json not found.\n\nMake sure to change to your app directory e.g. `cd cloudcamp/myapp`"
    );
  }
  return JSON.parse(fs.readFileSync(CDK_JSON_FILE).toString()).context;
}
