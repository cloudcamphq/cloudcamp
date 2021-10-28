import { Language, manuallyHideCode } from "./language";
import { JsiiMethod, JsiiProperty, JsiiType } from "../api-source";

export class TypeScript extends Language {
  translate(source: string): string {
    return manuallyHideCode(source);
  }

  usage(className: string) {
    return `import { ${className} } from "@cloudcamp/aws-runtime";`;
  }

  methodSignature(className: string, method: JsiiMethod): string {
    let argsList = [];
    let meths = method.initializer ? `new ${className}` : method.name!;
    let rets = method.initializer
      ? ""
      : ": " + this.translateType(method.returns?.type);

    for (let param of method.parameters || []) {
      let paramName = param.name;
      if (param.optional) {
        paramName += "?";
      }
      let typeName = this.translateType(param.type);
      argsList.push(`${paramName}: ${typeName}`);
    }
    return `${meths}(${argsList.join(", ")})${rets}`;
  }

  propertySignature(className: string, property: JsiiProperty): string {
    return `${property.static ? "static " : ""}${
      property.name
    }: ${this.translateType(property.type)}`;
  }

  simpleMethodSignature(className: string, method: JsiiMethod): string {
    let meths = method.initializer ? `constructor` : method.name;
    return `${meths}`;
  }

  simplePropertySignature(className: string, property: JsiiProperty): string {
    return property.name;
  }
}
