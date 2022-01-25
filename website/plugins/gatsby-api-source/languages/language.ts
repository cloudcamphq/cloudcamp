let path = require("path");
let fs = require("fs");
let _ = require("lodash");
let crypto = require("crypto");
import * as jsiispec from "@jsii/spec";
import { SourceTranslator } from "../../../../cli/src/assembly";

export abstract class Language {
  static LANGUAGE_CODES = ["ts", "javascript", "python", "csharp", "java"];

  constructor(
    public languageCode: string,
    protected assembly: jsiispec.Assembly,
    protected translator: SourceTranslator
  ) {}

  translate(source: string): string {
    let languageCode = this.languageCode;
    if (this.languageCode == "ts") {
      languageCode = "typescript";
    }
    return this.translator.translate(source, languageCode as any);
  }

  abstract usage(className: string): string;

  abstract methodSignature(className: string, method: jsiispec.Method): string;

  abstract propertySignature(
    className: string,
    property: jsiispec.Property
  ): string;

  abstract simpleMethodSignature(
    className: string,
    method: jsiispec.Method
  ): string;

  abstract simplePropertySignature(
    className: string,
    property: jsiispec.Property
  ): string;

  translateParameterName(paramName: string): string {
    return paramName;
  }

  // typescript/javascript implementation
  translateType(methodName: string, type?: jsiispec.Type): string {
    if (type == undefined) {
      return "void";
    }
    if ((type as any).primitive) {
      return (type as any).primitive;
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
      return "[key: string]: string";
    } else if (
      _.isEqual(type, {
        collection: { elementtype: { primitive: "string" }, kind: "array" },
      })
    ) {
      return "string[]";
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
      return "[key: string]: Variable | string";
    } else {
      console.log("unknown", methodName, JSON.stringify(type));
    }
    return "";
  }

  internalLink(methodName: string, fqn: string): string {
    const typeName = fqn.split(".")[1];
    if (
      this.assembly.types[fqn] &&
      this.assembly.types[fqn].kind == "interface"
    ) {
      return `<a href="#${
        _.kebabCase(methodName) + "-" + _.kebabCase(typeName)
      }" class="signature-type">${typeName}</a>`;
    } else {
      return `<a href="/docs/api/${_.kebabCase(
        typeName
      )}" class="signature-type">${typeName}</a>`;
    }
  }

  // typescript/javascript implementation
  cdkDocsLink(fqn: string): string {
    // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Annotations.html
    // https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.alexa_ask.CfnSkill.html
    const parts = fqn.split(".");
    let url: string;
    if (parts[2] == "core") {
      url = `https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.${parts[2]}.html`;
    } else {
      url = `https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.${parts[1]}.${parts[2]}.html`;
    }
    return `<a href="${url}" class="signature-type" target="_blank">${parts[2]}</a>`;
  }

  propsTableHeader(
    className: string,
    method: jsiispec.Method,
    param: jsiispec.Parameter,
    type: jsiispec.Type
  ): string {
    const id = _.kebabCase(method.name) + "-" + _.kebabCase(type.name);
    return `
    <h4 class="text-xl ml-6 font-bold mt-6 mb-6 font-display">
      <a href="#${id}" id="${id}">${type.name}</a>
    </h4>
    `;
  }

  propsTable(
    className: string,
    method: jsiispec.Method,
    param: jsiispec.Parameter,
    type: jsiispec.ClassType | jsiispec.InterfaceType
  ): string {
    let props: jsiispec.Property[] = _.clone(type.properties);

    props = props.sort((a, b) =>
      a.locationInModule?.line > b.locationInModule?.line ? 1 : -1
    );

    const tbody = props
      .map((prop, ix) => {
        let defaultValue = "";
        if (prop.optional !== true) {
          defaultValue = `<span style="color: rgb(214, 50, 0)">required</span>`;
        } else if (prop.docs?.default) {
          defaultValue = prop.docs?.default;
        }
        return `
      <tr class="${ix % 2 == 1 ? "bg-gray-50" : ""}">
        <td class="px-6 py-2 border">${this.translateParameterName(
          prop.name
        )}</td>
        <td class="px-6 py-2 border font-mono text-sm whitespace-nowrap">${this.translateType(
          method.name,
          (prop as any).type
        )}</td>
        <td class="px-6 py-2 border font-mono text-sm">${defaultValue}</td>
        <td class="px-6 py-2 border">
         ${prop.docs?.summary || ""}
        </td>
      </tr>
    `;
      })
      .join("\n");
    const header = this.propsTableHeader(className, method, param, type);
    return `
      ${header}
      <table class="w-full border overflow-x-auto block">
        <thead>
          <tr class="bg-gray-50">
            <td class="border px-6 font-medium w-1/6">Name</td>
            <td class="border px-6 font-medium w-1/6">Type</td>
            <td class="border px-6 font-medium w-1/6">Default</td>
            <td class="border px-6 font-medium w-1/2">Description</td>
          </tr>
        </thead>
        <tbody>
         ${tbody}
        </tbody>
      </table>
      `;
  }
}
