import { ProjectFiles } from "../files";
import { NewAppProps } from "../project";
import { Template, TemplateCategory } from "../template";
import * as path from "path";
import * as fs from "fs";
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
    const home = props.home;

    // copy the whole aws-runtime source to the app directory
    fsExtra.copySync(
      path.join(path.dirname(__filename), "..", "..", "..", "aws-runtime"),
      path.join(home, "aws-runtime")
    );

    // but get rid of node modules and gitignore
    fsExtra.removeSync(path.join(home, "aws-runtime", "node_modules"));
    fsExtra.removeSync(path.join(home, "aws-runtime", ".gitignore"));
    fs.copyFileSync(
      path.join(this.resources("debug"), ".gitignore"),
      path.join(home, "aws-runtime", ".gitignore")
    );

    // now modify package.json
    fs.copyFileSync(
      path.join(this.resources("debug"), "package.json"),
      path.join(home, "package.json")
    );

    // get rid of prev install
    fsExtra.removeSync(path.join(home, "node_modules"));
    fsExtra.removeSync(path.join(home, "package-lock.json"));

    // copy dockerfile etc.
    fsExtra.copySync(
      path.join(this.resources("debug"), "resources"),
      path.join(home, "resources")
    );

    // create source file
    let file = path.join(this.resources("debug"), "app.ts");
    this.copyCdkSource(file, {
      ...props,
      port: 80,
      dockerfile: "resources/Dockerfile",
    });

    // run npm install in aws-runtime
    child_process.execSync("npm install", {
      cwd: path.join(home, "aws-runtime"),
    });
  }
}
