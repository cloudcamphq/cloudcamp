import { Language, manuallyHideCode } from "./language";
import { JsiiMethod, JsiiProperty, JsiiType } from "../api-source";

export class JavaScript extends Language {
  translate(source: string): string {
    return manuallyHideCode(source)
      .replace(/from\s*"(.*?)"/g, '= require("$1")')
      .replace(/import/g, "const");
  }

  usage(className: string) {
    return `const { ${className} } = require("@cloudcamp/aws-runtime");`;
  }

  methodSignature(className: string, method: JsiiMethod): string {
    let meths = method.name;
    if (method.initializer) {
      meths = `new ${className}`;
    }
    let paramsList = (method.parameters || []).map((arg) => arg.name);
    return `${meths}(${paramsList.join(", ")})`;
  }

  propertySignature(className: string, property: JsiiProperty): string {
    return `${property.static ? "static " : ""}${property.name}`;
  }

  simpleMethodSignature(className: string, method: JsiiMethod): string {
    let meths = method.initializer ? `constructor` : method.name;
    return `${meths}`;
  }

  simplePropertySignature(className: string, property: JsiiProperty): string {
    return property.name;
  }
}
