import { Language } from "./language";
import * as jsiispec from "@jsii/spec";
import ApiSource from "../api-source";

let _ = require("lodash");

export class Java extends Language {
  usage(className: string) {
    return `import cloudcamp.aws.runtime.${className};`;
  }

  cdkDocsLink(fqn: string): string {
    // https://docs.aws.amazon.com/cdk/api/v2/java/software/amazon/awscdk/Annotations.html
    // https://docs.aws.amazon.com/cdk/api/v2/java/software/amazon/awscdk/alexa/ask/CfnSkill.html

    let parts = fqn.split(".");
    let url: string;
    let name: string;
    if (parts[1] == "cx_api") {
      parts[1] = "cxapi";
    }
    if (parts[0] == "constructs") {
      return parts[1];
    } else if (parts.length == 2) {
      url = `https://docs.aws.amazon.com/cdk/api/v2/java/software/amazon/awscdk/${parts[1]}.html`;
      name = parts[1];
    } else if (parts[1].startsWith("aws_")) {
      const pkg = parts[1].substring("aws_".length).replace("_", "/");
      url = `https://docs.aws.amazon.com/cdk/api/v2/java/software/amazon/awscdk/services/${pkg}/${parts[2]}.html`;
      name = parts[2];
    } else {
      const pkg = parts[1].replace("_", "/").toLowerCase();
      url = `https://docs.aws.amazon.com/cdk/api/v2/java/software/amazon/awscdk/${pkg}/${parts[2]}.html`;
      name = parts[2];
    }

    return `<a href="${url}" class="signature-type" target="_blank">${name}</a>`;
  }

  propsTableHeader(methodOrPropName: string, typeName: string): string {
    const id = _.kebabCase(methodOrPropName) + "-" + _.kebabCase(typeName);
    return `
    <h4 class="text-xl ml-6 font-bold mt-6 mb-6 font-display">
      <a href="#${id}" id="${id}" name="${id}">new ${typeName}.Builder()</a>
    </h4>
    `;
  }

  propsTable(
    methodOrPropName: string,
    type: jsiispec.ClassType | jsiispec.InterfaceType,
    showDefaults: boolean,
    apiSource: ApiSource
  ): string {
    if (!type.properties) {
      return undefined;
    }
    const tbody = type.properties
      .map((prop, ix) => {
        let defaultValue = "";
        if (prop.optional !== true) {
          defaultValue = `<span style="color: rgb(214, 50, 0)">required</span>`;
        } else if (prop.docs?.default) {
          defaultValue = prop.docs?.default;
        }
        return `
      <tr class="${ix % 2 == 0 ? "bg-gray-50" : ""}">
        <td class="px-6 py-2 border font-mono text-sm whitespace-nowrap">${
          prop.name
        } (${this.translateType(methodOrPropName, prop.type as any)} ${
          prop.name
        })</td>
        ${
          showDefaults
            ? '<td class="px-6 py-2 border font-mono text-sm whitespace-nowrap">' +
              defaultValue +
              "</td>"
            : ""
        }
        <td class="px-6 py-2 border">
        ${apiSource.parseMarkdown(prop.docs?.summary) || ""}
        ${apiSource.parseMarkdown(prop.docs?.remarks) || ""}
        </td>
      </tr>
    `;
      })
      .join("\n");
    const header = this.propsTableHeader(methodOrPropName, type.name);
    return `
      ${header}
      <table class="w-full border overflow-x-auto block">
        <thead>
          <tr class="bg-gray-50">
            <td class="border px-6 font-medium w-1/4">Method</td>
            ${
              showDefaults
                ? '<td class="border px-6 font-medium w-1/4">Default</td>'
                : ""
            }
            <td class="border px-6 font-medium w-1/2">Description</td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="px-6 py-2 border font-mono text-sm whitespace-nowrap">new ${
              type.name
            }.Builder()</td>
            <td class="px-6 py-2 border">Construct a ${type.name} builder.</td>
          </tr>
          ${tbody}
          <tr>
            <td class="px-6 py-2 border font-mono text-sm whitespace-nowrap">${
              type.name
            } build()</td>
            <td class="px-6 py-2 border">Build ${type.name}.</td>
          </tr>
        </tbody>
      </table>
      `;
  }

  methodSignature(className: string, method: jsiispec.Method): string {
    const argsList = [];

    const meths = (method as any).initializer
      ? `new ${className}`
      : method.name;
    const rets = (method as any).initializer
      ? ""
      : this.translateType(method.name, method.returns?.type as any) + " ";

    for (let param of method.parameters || []) {
      const paramName = param.name;
      const typeName = this.translateType(method.name, param.type as any);

      argsList.push(`${typeName} ${paramName}`);
    }
    return `${rets}${meths}(${argsList.join(", ")})`;
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
        return this.cdkDocsLink(fqn) + "[]";
      } else {
        return this.internalLink(methodName, fqn) + "[]";
      }
    } else if (
      _.isEqual(type, {
        collection: { elementtype: { primitive: "string" }, kind: "map" },
      })
    ) {
      return "Map&lt;String, String&gt;";
    } else if (
      _.isEqual(type, {
        collection: { elementtype: { primitive: "string" }, kind: "array" },
      })
    ) {
      return "String[]";
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
      return "Map&lt;String, Object&gt;";
    }
    return "";
  }

  propertySignature(className: string, property: jsiispec.Property): string {
    return `${property.static ? "static " : ""}${this.translateType(
      property.name,
      property.type as any
    )} get${_.upperFirst(property.name)}()`;
  }

  simpleMethodSignature(className: string, method: jsiispec.Method): string {
    const meths = (method as any).initializer ? `constructor` : method.name;
    return `${meths}`;
  }

  simplePropertySignature(
    className: string,
    property: jsiispec.Property
  ): string {
    return `get${_.upperFirst(property.name)}`;
  }
}
