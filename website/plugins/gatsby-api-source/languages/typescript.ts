import { Language } from "./language";
import * as jsiispec from "@jsii/spec";

export class TypeScript extends Language {
  usage(className: string) {
    return `import { ${className} } from "@cloudcamp/aws-runtime";`;
  }

  methodSignature(className: string, method: jsiispec.Method): string {
    let argsList = [];
    let meths = (method as any).initializer ? `new ${className}` : method.name!;
    let rets = (method as any).initializer
      ? ""
      : ": " + this.translateType(method.returns?.type as any);

    for (let param of method.parameters || []) {
      let paramName = param.name;
      if (param.optional) {
        paramName += "?";
      }
      let typeName = this.translateType(param.type as any);
      argsList.push(`${paramName}: ${typeName}`);
    }
    return `${meths}(${argsList.join(", ")})${rets}`;
  }

  propertySignature(className: string, property: jsiispec.Property): string {
    return `${property.static ? "static " : ""}${
      property.name
    }: ${this.translateType(property.type as any)}`;
  }

  simpleMethodSignature(className: string, method: jsiispec.Method): string {
    let meths = (method as any).initializer ? `constructor` : method.name;
    return `${meths}`;
  }

  simplePropertySignature(
    className: string,
    property: jsiispec.Property
  ): string {
    return property.name;
  }
}
