import { ProjectFiles } from "../files";
import { NewAppProps } from "../project";
import { Template, TemplateCategory } from "../template";
import * as path from "path";

export default class ExampleTemplate extends Template {
  public category = TemplateCategory.EXAMPLE;

  constructor() {
    super();
  }

  get description(): string {
    return `Example App`;
  }

  static make(_info: ProjectFiles): Template[] {
    return [new ExampleTemplate()];
  }

  async apply(props: NewAppProps): Promise<void> {
    this.copyResource(
      path.join(this.resources("example"), "resources"),
      props.name
    );

    let file = path.join(this.resources("example"), "app.ts");
    this.copyCdkSource(file, {
      ...props,
      port: 80,
      dockerfile: "resources/Dockerfile",
    });
  }
}
