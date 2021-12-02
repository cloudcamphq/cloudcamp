import * as fs from "fs";
import * as path from "path";
import { Language, LanguageCode } from "@cloudcamp/aws-runtime/src/language";
import {
  CloudCampProvider,
  CONTEXT_KEY_CLOUDCAMP_VERSION,
  CONTEXT_KEY_NAME,
  CONTEXT_KEY_PROVIDER,
} from "@cloudcamp/aws-runtime/src/constants";
import { exec } from "child_process";
import _ from "lodash";
import { version } from "./utils";
import * as __vars__ from "./vars";
import { SourceTranslator } from "./assembly";
let fsExtra = require("fs-extra");

/**
 * A cloudcamp project. Used to generate new or access existing projects.
 */
export class Generator {
  public language: Language;

  constructor(
    public home: string,
    public name: string,
    public languageCode: LanguageCode
  ) {
    this.language = Language.make(languageCode);
  }

  /**
   * Make a new directory in home
   */
  public makeDirHome(dirname: string) {
    fs.mkdirSync(path.join(this.home, dirname), { recursive: true });
  }

  /**
   * Write a file in home
   */
  public writeFileHome(filename: string, data: string) {
    fs.writeFileSync(path.join(this.home, filename), data);
  }

  /**
   * Copy a file to home
   */
  public copyFileHome(filename: string, dest: string): void {
    fs.copyFileSync(filename, path.join(this.home, dest));
  }

  /**
   * Copy a directory to home
   */
  public copyDirHome(dirname: string, dest: string): void {
    fsExtra.copySync(dirname, path.join(this.home, dest));
  }

  /**
   * Delete something from home
   */
  public deleteHome(filename: string) {
    fsExtra.removeSync(path.join(this.home, filename));
  }

  /**
   * Copy and translate CDK source file.
   */
  public copySourceHome(filename: string, vars?: any): void {
    vars = vars || {};
    let srcDir = path.join(this.home, "src");

    let basefile = path.basename(filename);
    let withoutExt = basefile.slice(0, path.extname(basefile).length * -1);
    let target =
      withoutExt + Language.extensionForLanguageCode(this.languageCode);
    let data = fs.readFileSync(filename).toString();
    data = this.substituteVars(data, vars);

    let trans = new SourceTranslator();
    let result = trans.translate(data, this.languageCode);
    fs.writeFileSync(path.join(srcDir, target), result);
  }

  /**
   * Run a command in the home directory.
   */
  public async runAppDir(
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

  /**
   * Utility to get the path to resources dir
   */
  public resources(...pathInResources: string[]) {
    return path.join(__dirname, "..", "resources", ...pathInResources);
  }

  /**
   * Generates a new app
   */
  async generate() {
    // make the home and src dir
    fs.mkdirSync(this.home, { recursive: true });
    this.makeDirHome("src");

    // write the cdk.json file
    this.writeFileHome(
      "cdk.json",
      JSON.stringify(
        {
          app: this.language.cdkAppCommand,
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
            [CONTEXT_KEY_NAME]: this.name,
            [CONTEXT_KEY_CLOUDCAMP_VERSION]: version(),
            [CONTEXT_KEY_PROVIDER]: CloudCampProvider.AwsCdk,
          },
        },
        null,
        2
      )
    );

    await this.language.generateFiles(this);
  }

  public async installAndBuild() {
    await this.runAppDir(this.home, this.language.installCommand);
    await this.runAppDir(this.home, this.language.buildCommand);
  }

  private substituteVars(source: string, vars: any): string {
    // remove the first line
    let lines = source.split("\n");
    lines.splice(0, 1);
    source = lines.join("\n");

    // subsitute variables
    for (let k of Object.keys(__vars__)) {
      let value: any;
      if (k in vars) {
        value = vars[k];
      } else {
        value = (__vars__ as any)[k];
      }
      if (typeof value === "string") {
        source = source.replace("__vars__." + k, `"${value}"`);
      } else {
        source = source.replace("__vars__." + k, `${value}`);
      }
    }
    return source;
  }
}