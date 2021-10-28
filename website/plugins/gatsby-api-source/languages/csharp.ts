import { Language } from "./language";
import { JsiiMethod, JsiiProperty, JsiiType } from "../api-source";
let _ = require("lodash");

export class CSharp extends Language {
  translate(source: string): string {
    let translation = super.translate(source);

    const fixedSource = translation.replace(
      /new\s+(.*?)\((.*?),\s+new\s+Struct/g,
      (match, $1, $2) => {
        let fqn = "@cloudcamp/aws-runtime." + $1;

        if (
          !this.project.types[fqn] ||
          !this.project.types[fqn].initializer ||
          !this.project.types[fqn].initializer.parameters
        ) {
          return match;
        }

        let ctor = this.project.types[fqn].initializer;
        let last = ctor.parameters.slice(-1)[0];
        if (last.name == "props" && last.type.fqn) {
          let typeName = last.type.fqn.split(".")[1];
          return `new ${$1}(${$2}, new ${typeName}`;
        }
        return match;
      }
    );
    return fixedSource;
  }

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

  translateType(type: JsiiType): string {
    if (type == undefined) {
      return "void";
    }
    if (type.primitive) {
      switch (type.primitive) {
        case "number":
          return "int";
        case "string":
          return "String";
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
      return "Dictionary&lt;string, string&gt;";
    }
    return "";
  }

  methodSignature(className: string, method: JsiiMethod): string {
    let argsList = [];

    let meths = method.initializer
      ? `new ${className}`
      : _.upperFirst(method.name);
    let rets = method.initializer
      ? ""
      : this.translateType(method.returns?.type) + " ";

    for (let param of method.parameters || []) {
      let paramName = param.name;
      if (param.optional) {
        paramName += "?";
      }
      let typeName = this.translateType(param.type);

      argsList.push(`${paramName}: ${typeName}`);
    }
    return `${rets}${meths}(${argsList.join(", ")})`;
  }

  propertySignature(className: string, property: JsiiProperty): string {
    return `${property.static ? "static " : ""}${this.translateType(
      property.type
    )} ${_.upperFirst(property.name)}`;
  }

  simpleMethodSignature(className: string, method: JsiiMethod): string {
    let meths = method.initializer ? `constructor` : _.upperFirst(method.name);
    return `${meths}`;
  }

  simplePropertySignature(className: string, property: JsiiProperty): string {
    return _.upperFirst(property.name);
  }
}
