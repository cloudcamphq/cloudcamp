import { Language } from "./language";
import * as jsiispec from "@jsii/spec";

let _ = require("lodash");

export class CSharp extends Language {
  usage(className: string) {
    return `using Cloudcamp.Aws.Runtime;`;
  }

  cdkDocsLink(fqn: string): string {
    // = https://docs.aws.amazon.com/cdk/api/latest/dotnet/api/Amazon.CDK.CxApi.CloudAssembly.html

    // https://docs.aws.amazon.com/cdk/api/latest/dotnet/api/Amazon.CDK.Pipelines.CdkPipeline.html

    let urlPart;
    if (fqn.startsWith("@aws-cdk/core")) {
      urlPart = fqn.split(".")[1];
    } else {
      let [module, klass] = fqn.split("/")[1].split(".");
      module = _.upperFirst(_.camelCase(module));
      urlPart = `${module}.${klass}`;
    }
    // @aws-cdk/core.App
    return (
      '<a href="https://docs.aws.amazon.com/cdk/api/latest/dotnet/api/Amazon.CDK.' +
      urlPart +
      '.html" class="signature-type" target="_blank">' +
      fqn.split(".")[1] +
      "</a>"
    );
  }

  translateType(type: jsiispec.Type): string {
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
        return this.internalLink(type.fqn);
      }
    } else if (
      _.isEqual(type, {
        collection: { elementtype: { primitive: "string" }, kind: "map" },
      })
    ) {
      return "Dictionary&lt;string, string&gt;";
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
      : this.translateType(method.returns?.type as any) + " ";

    for (let param of method.parameters || []) {
      let paramName = param.name;
      if (param.optional) {
        paramName += "?";
      }
      let typeName = this.translateType(param.type as any);

      argsList.push(`${paramName}: ${typeName}`);
    }
    return `${rets}${meths}(${argsList.join(", ")})`;
  }

  propertySignature(className: string, property: jsiispec.Property): string {
    return `${property.static ? "static " : ""}${this.translateType(
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
