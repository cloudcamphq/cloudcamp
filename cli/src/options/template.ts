import { Choice, CompositeInput, Input } from "../option";
import { Template } from "../template";
import { UX } from "../ux";
import _ from "lodash";

/**
 * Pick the template
 */
export class TemplateChoice extends Choice<Template> {
  message = "Template";
  code = "template";

  constructor(templates: Template[]) {
    super();
    this.key = "#1";
    this.choices = new Map<string, Template>(
      templates.map((t, i) => [`#${i + 1}`, t])
    );
  }

  async init(parent?: Input<any>) {
    if (parent && this.value) {
      for (let input of this.value.inputs) {
        (parent.value as any).push(input);
      }
    }
    return this;
  }

  displayChoice(key: string): string {
    return (this.choices.get(key) as Template).description;
  }

  get displayValue(): string {
    return this.displayChoice(this.key as string);
  }

  async edit(ux: UX, parent?: Input<any>): Promise<void> {
    let prevValue = this.value;

    await super.edit(ux);

    if (prevValue !== this.value && parent instanceof CompositeInput) {
      // remove previous inputs
      parent.value = _.reject(parent.value, (e) =>
        prevValue?.inputs.includes(e)
      ) as any;

      // add new inputs
      for (let input of this.value!.inputs) {
        (parent.value as any).push(input);
      }
    }
  }
}
