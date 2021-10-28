import * as docker from "docker-file-parser";
import * as fs from "fs";
import glob from "glob-promise";

/**
 * This class contains information about a Dockerfile
 */
export class Dockerfile {
  /**
   * The image the Dockerfile is building from. e.g.
   * FROM alpine:3.14
   */
  readonly from?: string;

  /**
   * The port number, e.g.
   * EXPOSE 8080
   */
  readonly port?: number;

  /**
   * All source directories, via ADD or COPY
   */
  readonly sources: string[] = [];

  constructor(public location: string) {
    let commands = docker.parse(fs.readFileSync(location).toString());

    for (let command of commands) {
      let arg1 =
        typeof command.args == "string"
          ? (command.args as string)
          : (command.args as any)[0];

      if (command.name == "FROM") {
        // FROM

        this.from = arg1;
      } else if (command.name == "EXPOSE") {
        // EXPOSE

        let expose = arg1;

        if (expose.includes("/")) {
          // EXPOSE can also include a protocol like this: 80/udp
          // get rid of the last part.
          [expose, ,] = expose.split("/");
        }
        this.port = parseInt(expose);
      } else if (command.name == "ADD" || command.name == "COPY") {
        // ADD or COPY

        // add sources
        if (typeof command.args != "string") {
          (command.args as string[]).pop();
          this.sources.concat(command.args as string[]);
        }
      }
    }
  }
}

/**
 * Gets all the files we can use to find out what kind of project
 * we are dealing with.
 */
export class ProjectFiles {
  dockerfiles: Dockerfile[] = [];

  async build() {
    for (let file of await this.glob("**/Dockerfile*")) {
      try {
        this.dockerfiles.push(new Dockerfile(file));
      } catch {}
    }
  }

  async glob(pattern: string) {
    let result = await glob(pattern, {
      silent: true,
      ignore: ["**/node_modules/*", "**/.venv/*"],
    });
    return result;
  }
}
