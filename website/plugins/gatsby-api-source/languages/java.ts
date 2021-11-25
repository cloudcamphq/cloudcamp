import { Language } from "./language";
import * as jsiispec from "@jsii/spec";

let _ = require("lodash");

export class Java extends Language {
  usage(className: string) {
    return `import cloudcamp.aws.runtime.${className};`;
  }

  cdkDocsLink(fqn: string): string {
    // @aws-cdk/core.App
    return (
      '<a href="https://docs.aws.amazon.com/cdk/api/latest/java/software/amazon/awscdk/' +
      fqn.split("/")[1].replace(".", "/") +
      '.html" class="signature-type" target="_blank">' +
      fqn.split(".")[1] +
      "</a>"
    );
  }

  propsTableHeader(
    className: string,
    method: jsiispec.Method,
    param: jsiispec.Parameter,
    type: jsiispec.Type
  ): string {
    let id = _.kebabCase(type.name);
    return `
    <h4 class="text-xl ml-6 font-bold mb-6 font-display">
      <a href="#${id}">new ${type.name}.Builder()</a>
    </h4>
    `;
  }

  propsTable(
    className: string,
    method: jsiispec.Method,
    param: jsiispec.Parameter,
    type: jsiispec.ClassType | jsiispec.InterfaceType
  ): string {
    let tbody = type.properties
      .map(
        (prop, ix) => `
      <tr class="${ix % 2 == 0 ? "bg-gray-50" : ""}">
        <td class="px-6 py-2 border font-mono text-sm whitespace-nowrap">${
          prop.name
        } (${this.translateType(prop.type as any)} ${prop.name})</td>
        <td class="px-6 py-2 border">
         ${prop.docs?.summary || ""}
        </td>
      </tr>
    `
      )
      .join("\n");
    let header = this.propsTableHeader(className, method, param, type);
    return `
      ${header}
      <table class="w-full border">
        <thead>
          <tr class="bg-gray-50">
            <td class="border px-6 font-medium w-1/2">Method</td>
            <td class="border px-6 font-medium w-1/2">Description</td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="px-6 py-2 border font-mono text-sm whitespace-nowrap">new ${type.name}.Builder()</td>
            <td class="px-6 py-2 border">Construct a ${type.name} builder.</td>
          </tr>
          ${tbody}
          <tr>
            <td class="px-6 py-2 border font-mono text-sm whitespace-nowrap">${type.name} build()</td>
            <td class="px-6 py-2 border">Build ${type.name}.</td>
          </tr>
        </tbody>
      </table>
      `;
  }

  methodSignature(className: string, method: jsiispec.Method): string {
    let argsList = [];

    let meths = (method as any).initializer ? `new ${className}` : method.name;
    let rets = (method as any).initializer
      ? ""
      : this.translateType(method.returns?.type as any) + " ";

    for (let param of method.parameters || []) {
      let paramName = param.name;
      let typeName = this.translateType(param.type as any);

      argsList.push(`${typeName} ${paramName}`);
    }
    return `${rets}${meths}(${argsList.join(", ")})`;
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
      return "Map&lt;String, String&gt;";
    }
    return "";
  }

  propertySignature(className: string, property: jsiispec.Property): string {
    return `${property.static ? "static " : ""}${this.translateType(
      property.type as any
    )} get${_.upperFirst(property.name)}()`;
  }

  simpleMethodSignature(className: string, method: jsiispec.Method): string {
    let meths = (method as any).initializer ? `constructor` : method.name;
    return `${meths}`;
  }

  simplePropertySignature(
    className: string,
    property: jsiispec.Property
  ): string {
    return `get${_.upperFirst(property.name)}`;
  }
}
