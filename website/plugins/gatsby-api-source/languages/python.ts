import { Language } from "./language";
import * as jsiispec from "@jsii/spec";
let _ = require("lodash");

export class Python extends Language {
  usage(className: string) {
    return `from cloudcamp.aws_runtime import ${className}`;
  }

  cdkDocsLink(fqn: string): string {
    // https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk/Annotations.html
    // https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.alexa_ask/CfnSkill.html
    // https://docs.aws.amazon.com/cdk/api/v2/python/constructs/Construct.html

    let parts = fqn.split(".");
    let url: string;
    let name: string;
    if (parts[0] == "constructs") {
      url = `https://docs.aws.amazon.com/cdk/api/v2/python/constructs/${parts[1]}.html`;
      name = parts[1];
    } else if (parts.length == 2) {
      url = `https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk/${parts[1]}.html`;
      name = parts[1];
    } else {
      url = `https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.${parts[1]}/${parts[2]}.html`;
      name = parts[2];
    }

    return `<a href="${url}" class="signature-type" target="_blank">${name}</a>`;
  }

  translateType(methodName: string, type: jsiispec.Type): string {
    if (type == undefined) {
      return "None";
    }
    if ((type as any).primitive) {
      switch ((type as any).primitive) {
        case "void":
          return "None";
        case "number":
          return "int";
        case "string":
          return "str";
        case "boolean":
          return "bool";
        default:
          return (type as any).primitive;
      }
    } else if (type.fqn) {
      if (!type.fqn.startsWith("@cloudcamp")) {
        return this.cdkDocsLink(type.fqn);
      } else {
        return this.internalLink(methodName, type.fqn);
      }
    } else if (
      (type as any).collection &&
      (type as any).collection.kind == "array" &&
      (type as any).collection.elementtype?.fqn
    ) {
      const fqn = (type as any).collection.elementtype.fqn;
      if (!fqn.startsWith("@cloudcamp")) {
        return "list[" + this.cdkDocsLink(fqn) + "]";
      } else {
        return "list[" + this.internalLink(methodName, fqn) + "]";
      }
    } else if (
      _.isEqual(type, {
        collection: { elementtype: { primitive: "string" }, kind: "map" },
      })
    ) {
      return "Dict[str, str]";
    } else if (
      _.isEqual(type, {
        collection: { elementtype: { primitive: "string" }, kind: "array" },
      })
    ) {
      return "list[str]";
    } else if (
      _.isEqual(type, {
        collection: {
          elementtype: {
            union: {
              types: [
                { primitive: "string" },
                { fqn: "@cloudcamp/aws-runtime.Variable" },
              ],
            },
          },
          kind: "map",
        },
      })
    ) {
      return "Dict[str, Union[Variable, str]]";
    }
    return "";
  }

  translateParameterName(paramName: string): string {
    return _.snakeCase(paramName);
  }

  propsTableHeader(methodOrPropName: string, typeName: string): string {
    let id = _.kebabCase(methodOrPropName) + "-" + _.kebabCase(typeName);
    return `
    <h4 class="text-xl ml-6 font-bold mt-6 mb-6 font-display">
      <a href="#${id}" id="${id}" name="${id}">**kwargs</a>
    </h4>
    `;
  }

  methodSignature(className: string, method: jsiispec.Method): string {
    const paramsList = [];
    const meths = (method as any).initializer
      ? `new ${className}`
      : _.snakeCase(method.name);
    const rets = (method as any).initializer
      ? ""
      : " -> " + this.translateType(method.name, (method as any).returns?.type);

    for (let param of method.parameters || []) {
      const argName = this.translateParameterName(param.name);
      const typeName = this.translateType(method.name, param.type as any);
      if (
        this.assembly.types[(param.type as any).fqn] &&
        this.assembly.types[(param.type as any).fqn].kind == "interface"
      ) {
        paramsList.push(`**kwargs: ${typeName}`);
      } else {
        paramsList.push(`${argName}: ${typeName}`);
      }
    }
    return `${meths}(${paramsList.join(", ")})${rets}`;
  }

  propertySignature(className: string, property: jsiispec.Property): string {
    return `${property.static ? "static " : ""}${_.snakeCase(
      property.name
    )}: ${this.translateType(property.name, property.type as any)}`;
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
