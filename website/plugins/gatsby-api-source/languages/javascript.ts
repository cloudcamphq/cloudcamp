import { Language } from "./language";
import * as jsiispec from "@jsii/spec";

export class JavaScript extends Language {
  usage(className: string) {
    return `const { ${className} } = require("@cloudcamp/aws-runtime");`;
  }

  methodSignature(className: string, method: jsiispec.Method): string {
    let meths = method.name;
    if ((method as any).initializer) {
      meths = `new ${className}`;
    }
    const paramsList = (method.parameters || []).map((arg) => arg.name);
    return `${meths}(${paramsList.join(", ")})`;
  }

  propertySignature(className: string, property: jsiispec.Method): string {
    return `${property.static ? "static " : ""}${property.name}`;
  }

  simpleMethodSignature(className: string, method: jsiispec.Method): string {
    const meths = (method as any).initializer ? `constructor` : method.name;
    return `${meths}`;
  }

  simplePropertySignature(
    className: string,
    property: jsiispec.Property
  ): string {
    return property.name;
  }
}
