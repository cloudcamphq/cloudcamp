import { Language } from "./language";
import {
  JsiiDefinition,
  JsiiMethod,
  JsiiParameter,
  JsiiProperty,
  JsiiType,
} from "../api-source";
let _ = require("lodash");

export class Python extends Language {
  usage(className: string) {
    return `from cloudcamp.aws_runtime import ${className}`;
  }

  cdkDocsLink(fqn: string): string {
    let urlPart =
      fqn.split("/")[0].replace("@", "").replace("-", "_") +
      "." +
      fqn.split("/")[1].replace(".", "/");

    return (
      '<a href="https://docs.aws.amazon.com/cdk/api/latest/python/' +
      urlPart +
      '.html" class="signature-type" target="_blank">' +
      fqn.split(".")[1] +
      "</a>"
    );
  }

  translateType(type: JsiiType): string {
    if (type == undefined) {
      return "None";
    }
    if (type.primitive) {
      switch (type.primitive) {
        case "void":
          return "None";
        case "number":
          return "int";
        case "string":
          return "str";
        case "boolean":
          return "bool";
        default:
          return type.primitive;
      }
    } else if (type.fqn) {
      if (!type.fqn.startsWith("@cloudcamp")) {
        return this.cdkDocsLink(type.fqn);
      } else {
        return this.internalLink(type.fqn);
      }
    } else if (
      _.isEqual(type, {
        collection: { elementtype: { primitive: "string" }, kind: "map" },
      })
    ) {
      return "Dict[str, str]";
    }
    return "";
  }

  translateParameterName(paramName: string): string {
    return _.snakeCase(paramName);
  }

  propsTableHeader(
    className: string,
    method: JsiiMethod,
    param: JsiiParameter,
    type: JsiiDefinition
  ): string {
    let id = _.kebabCase(type.name);
    return `
    <h4 class="text-xl ml-6 font-bold mb-6 font-display">
      <a href="#${id}">**kwargs</a>
    </h4>
    `;
  }

  methodSignature(className: string, method: JsiiMethod): string {
    let paramsList = [];
    let meths = method.initializer
      ? `new ${className}`
      : _.snakeCase(method.name);
    let rets = method.initializer
      ? ""
      : " -> " + this.translateType(method.returns?.type);

    for (let param of method.parameters || []) {
      let argName = this.translateParameterName(param.name);
      let typeName = this.translateType(param.type);
      if (
        this.project.types[param.type.fqn] &&
        this.project.types[param.type.fqn].kind == "interface"
      ) {
        paramsList.push(`**kwargs: ${typeName}`);
      } else {
        paramsList.push(`${argName}: ${typeName}`);
      }
    }
    return `${meths}(${paramsList.join(", ")})${rets}`;
  }

  propertySignature(className: string, property: JsiiProperty): string {
    return `${property.static ? "static " : ""}${_.snakeCase(
      property.name
    )}: ${this.translateType(property.type)}`;
  }

  simpleMethodSignature(className: string, method: JsiiMethod): string {
    let meths = method.initializer ? `constructor` : method.name;
    return `${meths}`;
  }

  simplePropertySignature(className: string, property: JsiiProperty): string {
    return property.name;
  }
}
