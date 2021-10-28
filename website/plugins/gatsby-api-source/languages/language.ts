let path = require("path");
let fs = require("fs");
let _ = require("lodash");
let crypto = require("crypto");

import {
  JsiiApi,
  JsiiDefinition,
  JsiiMethod,
  JsiiParameter,
  JsiiProperty,
  JsiiType,
} from "../api-source";
import { Rosetta } from "jsii-rosetta";

export abstract class Language {
  static LANGUAGE_CODES = ["ts", "javascript", "python", "csharp", "java"];

  constructor(public languageCode: string, protected project: JsiiApi) {}

  translate(source: string): string {
    return RosettaTranslation.instance.translate(this.languageCode, source);
  }

  abstract usage(className: string): string;

  abstract methodSignature(className: string, method: JsiiMethod): string;

  abstract propertySignature(className: string, property: JsiiProperty): string;

  abstract simpleMethodSignature(className: string, method: JsiiMethod): string;

  abstract simplePropertySignature(
    className: string,
    property: JsiiProperty
  ): string;

  translateParameterName(paramName: string): string {
    return paramName;
  }

  // typescript/javascript implementation
  translateType(type: JsiiType): string {
    if (type == undefined) {
      return "void";
    }
    if (type.primitive) {
      return type.primitive;
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
      return "[key: string]: string";
    }
    return "";
  }

  internalLink(fqn: string): string {
    let typeName = fqn.split(".")[1];
    if (
      this.project.types[fqn] &&
      this.project.types[fqn].kind == "interface"
    ) {
      return `<a href="#${_.kebabCase(
        typeName
      )}" class="signature-type">${typeName}</a>`;
    } else {
      return `<a href="/docs/api/${_.kebabCase(
        typeName
      )}" class="signature-type">${typeName}</a>`;
    }
  }

  // typescript/javascript implementation
  cdkDocsLink(fqn: string): string {
    // @aws-cdk/core.App
    return (
      '<a href="https://docs.aws.amazon.com/cdk/api/latest/docs/' +
      fqn.replace("/", "_") +
      '.html" class="signature-type" target="_blank">' +
      fqn.split(".")[1] +
      "</a>"
    );
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
      <a href="#${id}">${type.name}</a>
    </h4>
    `;
  }

  propsTable(
    className: string,
    method: JsiiMethod,
    param: JsiiParameter,
    type: JsiiDefinition
  ): string {
    let props: JsiiProperty[] = _.clone(type.properties);

    props = props.sort((a, b) =>
      a.locationInModule.line > b.locationInModule.line ? 1 : -1
    );

    let tbody = props
      .map(
        (prop, ix) => `
      <tr class="${ix % 2 == 1 ? "bg-gray-50" : ""}">
        <td class="px-6 py-2 border">${this.translateParameterName(
          prop.name
        )}</td>
        <td class="px-6 py-2 border font-mono text-sm whitespace-nowrap">${this.translateType(
          prop.type
        )}</td>
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
            <td class="border px-6 font-medium w-1/4">Name</td>
            <td class="border px-6 font-medium w-1/4">Type</td>
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

class RosettaTranslation {
  private static JSII_ASSEMBLY_DIR = path.join(
    __dirname,
    "..",
    "..",
    "..",
    "..",
    "aws-runtime"
  );
  private static JSII_ASSEMBLY_FILE = path.join(
    this.JSII_ASSEMBLY_DIR,
    ".jsii"
  );

  private static INSTANCE: RosettaTranslation;
  private rosetta: Rosetta;
  private cache: Map<string, string>;

  private constructor() {
    this.cache = new Map();
    this.rosetta = new Rosetta({
      liveConversion: true,
      targetLanguages: Language.LANGUAGE_CODES.filter(
        (l) => l != "ts" && l != "javascript"
      ) as any,
      loose: false,
      includeCompilerDiagnostics: true,
    });
    let assembly = JSON.parse(
      fs.readFileSync(RosettaTranslation.JSII_ASSEMBLY_FILE).toString()
    );
    this.rosetta.addAssembly(assembly, RosettaTranslation.JSII_ASSEMBLY_DIR);
  }

  public static get instance(): RosettaTranslation {
    if (!RosettaTranslation.INSTANCE) {
      RosettaTranslation.INSTANCE = new RosettaTranslation();
    }
    return RosettaTranslation.INSTANCE;
  }

  public translate(language: string, source: string): string {
    const hash = crypto
      .createHash("md5")
      .update(language)
      .update(source)
      .digest("hex");

    if (this.cache.has(hash)) {
      return this.cache.get(hash);
    }

    const code = {
      visibleSource: source,
      where: "sample",
    };
    let result = this.rosetta.translateSnippet(code, language as any);
    if (result?.source) {
      let translation = !result.source.endsWith("\n")
        ? result.source + "\n"
        : result.source;
      this.cache.set(hash, translation);
      return translation;
    }
    throw new Error("Could not translate source code:\n" + source);
  }
}

export function manuallyHideCode(source: string) {
  return source.replace(new RegExp("void 0;(.*?)void 'show';", "gms"), "");
}
