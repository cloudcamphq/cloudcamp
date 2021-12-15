import { Language } from "./language";
import * as jsiispec from "@jsii/spec";

let _ = require("lodash");

export class CSharp extends Language {
  usage(className: string) {
    return `using Cloudcamp.Aws.Runtime;`;
  }

  cdkDocsLink(fqn: string): string {
    // https://docs.aws.amazon.com/cdk/api/v2/dotnet/api/Amazon.CDK.Annotations.html
    // https://docs.aws.amazon.com/cdk/api/v2/dotnet/api/Amazon.CDK.Alexa.Ask.CfnSkill.html

    let parts = fqn.split(".");
    let url: string;
    if (parts[2] == "core") {
      url = `https://docs.aws.amazon.com/cdk/api/v2/dotnet/api/Amazon.CDK.${parts[2]}.html`;
    } else {
      let pkg = _.upperFirst(_.camelCase(parts[1]));
      url = `https://docs.aws.amazon.com/cdk/api/v2/dotnet/api/Amazon.CDK.${pkg}.${parts[2]}.html`;
    }

    return `<a href="${url}" class="signature-type" target="_blank">${parts[2]}</a>`;
  }

  translateType(methodName: string, type: jsiispec.Type): string {
    if (type == undefined) {
      return "void";
    }
    if ((type as any).primitive) {
      switch ((type as any).primitive) {
        case "number":
          return "int";
        case "string":
          return "String";
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
      let fqn = (type as any).collection.elementtype.fqn;
      if (!fqn.startsWith("@cloudcamp")) {
        return this.cdkDocsLink(fqn) + "[]";
      } else {
        return this.internalLink(methodName, fqn) + "[]";
      }
    } else if (
      _.isEqual(type, {
        collection: { elementtype: { primitive: "string" }, kind: "map" },
      })
    ) {
      return "Dictionary&lt;string, string&gt;";
    } else if (
      _.isEqual(type, {
        collection: { elementtype: { primitive: "string" }, kind: "array" },
      })
    ) {
      return "string[]";
    }
    return "";
  }

  methodSignature(className: string, method: jsiispec.Method): string {
    let argsList = [];

    let meths = (method as any).initializer
      ? `new ${className}`
      : _.upperFirst(method.name);
    let rets = (method as any).initializer
      ? ""
      : this.translateType(method.name, method.returns?.type as any) + " ";

    for (let param of method.parameters || []) {
      let paramName = param.name;
      if (param.optional) {
        paramName += "?";
      }
      let typeName = this.translateType(method.name, param.type as any);

      argsList.push(`${paramName}: ${typeName}`);
    }
    return `${rets}${meths}(${argsList.join(", ")})`;
  }

  propertySignature(className: string, property: jsiispec.Property): string {
    return `${property.static ? "static " : ""}${this.translateType(
      property.name,
      property.type as any
    )} ${_.upperFirst(property.name)}`;
  }

  simpleMethodSignature(className: string, method: jsiispec.Method): string {
    let meths = (method as any).initializer
      ? `constructor`
      : _.upperFirst(method.name);
    return `${meths}`;
  }

  simplePropertySignature(
    className: string,
    property: jsiispec.Property
  ): string {
    return _.upperFirst(property.name);
  }
}
