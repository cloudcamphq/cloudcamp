import { ProjectFiles } from "../files";
import { NewAppProps } from "../project";
import { Template, TemplateCategory } from "../template";
import * as path from "path";
import { CAMP_HOME_DIR } from "@cloudcamp/aws-runtime/src/constants";
import * as child_process from "child_process";
let fsExtra = require("fs-extra");

export default class DebugTemplate extends Template {
  public category = TemplateCategory.EXAMPLE;

  constructor() {
    super();
  }

  get description(): string {
    return `Debug App`;
  }

  static make(_info: ProjectFiles): Template[] {
    return [new DebugTemplate()];
  }

  async apply(props: NewAppProps): Promise<void> {
    let appDir = path.join(CAMP_HOME_DIR, props.name);

    // copy the whole aws-runtime source to the app directory
    this.copyResource(
      path.join(path.dirname(__filename), "..", "..", "..", "aws-runtime"),
      props.name
    );

    // but get rid of node modules and gitignore
    fsExtra.removeSync(path.join(appDir, "aws-runtime", "node_modules"));
    fsExtra.removeSync(path.join(appDir, "aws-runtime", ".gitignore"));
    this.copyResource(
      path.join(this.resources("debug"), ".gitignore"),
      path.join(props.name, "aws-runtime")
    );

    // now modify package.json and run npm install again
    this.copyResource(
      path.join(this.resources("debug"), "package.json"),
      props.name
    );

    // but get rid of prev install
    fsExtra.removeSync(path.join(appDir, "node_modules"));
    fsExtra.removeSync(path.join(appDir, "package-lock.json"));

    this.copyResource(
      path.join(this.resources("debug"), "resources"),
      props.name
    );

    let file = path.join(this.resources("debug"), "app.ts");
    this.copyCdkSource(file, {
      ...props,
      port: 80,
      dockerfile: "resources/Dockerfile",
    });

    child_process.execSync("npm install", { cwd: appDir });
  }
}
