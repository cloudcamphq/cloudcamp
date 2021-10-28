import { Language, LanguageCode } from "@cloudcamp/aws-runtime/src/language";
import * as fs from "fs";
import * as path from "path";
import { ProjectFiles } from "./files";
import { NewAppProps } from "./project";
import { CAMP_HOME_DIR } from "@cloudcamp/aws-runtime/src/constants";
let fsExtra = require("fs-extra");
import { Input } from "./option";
import _ from "lodash";
import * as __vars__ from "./vars";
import { Rosetta, TypeScriptSnippet } from "jsii-rosetta";
import { Runtime } from "@cloudcamp/aws-runtime/src/runtime";
import ts from "typescript";

/**
 * Templates will be sorted by category
 */
export enum TemplateCategory {
  BACKEND = 0,
  FRONTEND = 1,
  GENERIC = 2,
  EXAMPLE = 3,
}

/**
 * Name of the templates directory.
 */
const RESOURCES_DIR = "resources";

/**
 * Location of init, generate and example templates
 */

const TEMPLATES_LOCATION = path.join(__dirname, "templates");

/**
 * Interface for dynamically loading a template
 */
interface DynamicallyLoadedTemplate {
  new (): Template;
  make(info: ProjectFiles): Template[];
  category: TemplateCategory;
}

/**
 * A cloudcamp template.
 */
export abstract class Template {
  /**
   * Category for sorting
   */
  public category = TemplateCategory.BACKEND;

  /**
   * Language code of the target language
   */
  public languageCode: LanguageCode = LanguageCode.TYPESCRIPT;

  /**
   * Description of an instantiatd template
   */
  abstract readonly description: string;

  /**
   * Template input
   */
  inputs: Input<any>[] = [];

  /**
   * Apply the template
   */

  async apply(props: NewAppProps): Promise<void> {
    let file = path.join(this.resources("generic"), "app.ts");
    this.copyCdkSource(file, props);
  }

  /**
   * Create instances for a project
   */
  static make(_info: ProjectFiles): Template[] {
    return [];
  }

  /**
   * Get all templates of a category
   */
  public static templates(debug?: boolean): DynamicallyLoadedTemplate[] {
    let templates: DynamicallyLoadedTemplate[] = [];
    for (let file of fs.readdirSync(TEMPLATES_LOCATION)) {
      if (file == "debug.ts" && !debug) {
        continue;
      }
      let template: DynamicallyLoadedTemplate = require(path.join(
        TEMPLATES_LOCATION,
        file
      ))["default"];
      templates.push(template);
    }
    return _.sortBy(templates, (t) => t.category);
  }

  /**
   * Propose templates based on project
   */
  static async templatesForInit(debug?: boolean): Promise<Template[]> {
    let projectInfo = new ProjectFiles();
    await projectInfo.build();
    let templates: Template[] = [];

    for (let template of Template.templates(debug)) {
      templates = templates.concat(template.make(projectInfo));
    }

    return templates;
  }

  /**
   * Usually called as part of apply - copy and
   * translate CDK source.
   */
  protected copyCdkSource(file: string, vars?: any): void {
    let appName: string = vars.name;
    let appDir = path.join(CAMP_HOME_DIR, appName, "src");
    vars = vars || {};

    let basefile = path.basename(file);
    let withoutExt = basefile.slice(0, path.extname(basefile).length * -1);
    let target =
      withoutExt + Language.extensionForLanguageCode(this.languageCode);
    let data = fs.readFileSync(file).toString();
    data = this.substituteVars(data, vars);
    let result: string;

    if (
      this.languageCode != LanguageCode.JAVASCRIPT &&
      this.languageCode != LanguageCode.TYPESCRIPT
    ) {
      result = this.translateRosetta(data, this.languageCode);
    } else if (this.languageCode == LanguageCode.JAVASCRIPT) {
      result = ts.transpileModule(data, {
        compilerOptions: { module: ts.ModuleKind.CommonJS },
      }).outputText;
    } else {
      result = data;
    }
    fs.writeFileSync(path.join(appDir, target), result);
  }

  /**
   * Translate source code via jsii rosetta
   */
  private translateRosetta(source: string, languageCode: LanguageCode) {
    let rosetta = new Rosetta({
      liveConversion: true,
      targetLanguages: [this.languageCode as any],
    });
    let assembly = JSON.parse(
      fs.readFileSync(Runtime.jsiiAssemblyFile()).toString()
    );
    rosetta.addAssembly(assembly, Runtime.jsiiAssemblyDir());
    const code: TypeScriptSnippet = {
      visibleSource: source,
      where: "sample",
    };
    let result = rosetta.translateSnippet(code, languageCode as any);
    if (result?.source) {
      return !result.source.endsWith("\n")
        ? result.source + "\n"
        : result.source;
    }
    throw new Error("Could not translate source code:\n" + source);
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

  /**
   * Copy a resource to cloudcamp home or project root
   */
  protected copyResource(fileOrDir: string, targetPath: string): void {
    let appDir = path.join(CAMP_HOME_DIR, targetPath);

    if (fs.statSync(fileOrDir).isDirectory()) {
      fsExtra.copySync(fileOrDir, path.join(appDir, path.basename(fileOrDir)));
    } else {
      fs.copyFileSync(fileOrDir, path.join(appDir, path.basename(fileOrDir)));
    }
  }

  /**
   * Utility to get the path to resources
   */
  protected resources(template: string) {
    return path.join(__dirname, "..", RESOURCES_DIR, template);
  }
}
