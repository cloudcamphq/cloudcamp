import { ProjectFiles } from "../files";
import { Template } from "../template";
import { PortInput } from "../options/port";
import * as path from "path";
import { NewAppProps } from "../project";

export default class DockerTemplate extends Template {
  constructor(public dockerfile: string, public port?: number) {
    super();
    this.inputs = [new PortInput(port || 80)];
  }

  get description(): string {
    return `Docker ${path.join(process.cwd(), this.dockerfile)}`;
  }

  static make(info: ProjectFiles): Template[] {
    return info.dockerfiles.map((f) => {
      return new DockerTemplate(f.location, f.port);
    });
  }

  async apply(props: NewAppProps): Promise<void> {
    let file = path.join(this.resources("generic"), "app.ts");
    this.copyCdkSource(file, {
      ...props,
      port: this.inputs[0].value,
      dockerfile: path.join("..", "..", this.dockerfile),
    });
  }
}
