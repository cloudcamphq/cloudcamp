let showdown = require("showdown");
let Prism = require("prismjs");
let loadLanguages = require("prismjs/components/");
let _ = require("lodash");
let showdownConverter = new showdown.Converter();
let SourceTranslator = require("../../../cli/src/assembly").SourceTranslator;
import * as jsiispec from "@jsii/spec";

import {
  Language,
  TypeScript,
  JavaScript,
  Python,
  CSharp,
  Java,
} from "./languages";

// export interface JsiiApi {
//   types: {
//     [key: string]: JsiiDefinition;
//   };
// }

// export interface JsiiDefinition {
//   name: string;
//   base?: string;
//   datatype?: true;
//   kind: string;
//   fqn: string;
//   docs?: JsiiDoc;
//   initializer?: JsiiMethod;
//   methods?: JsiiMethod[];
//   properties?: JsiiProperty[];
// }

// export interface JsiiDoc {
//   stability?: string;
//   summary?: string;
//   remarks?: string;
//   custom?: {
//     topic?: string;
//     remarks?: string;
//     ignore?: "true";
//     order?: string;
//   };
//   usage?: string;
//   signature?: string;
//   simpleSignature?: string;
//   propsTable?: string;
// }

// export interface JsiiMethod {
//   locationInModule: { line: number };
//   name?: string;
//   docs?: JsiiDoc;
//   parameters?: JsiiParameter[];
//   returns?: { type: JsiiType };
//   static?: true;
//   initializer?: true;
// }

// export interface JsiiProperty {
//   name?: string;
//   docs: JsiiDoc;
//   immutable?: boolean;
//   locationInModule: { line: number };
//   type?: JsiiType;
//   static?: true;
// }

// export interface JsiiParameter {
//   name: string;
//   optional?: true;
//   docs?: JsiiDoc;
//   type: JsiiType;
// }

// export interface JsiiType {
//   fqn?: string;
//   primitive?: string;
// }

loadLanguages(Language.LANGUAGE_CODES);

export default class ApiSource {
  public result!: jsiispec.Assembly;
  private languages: Language[];

  constructor(private assembly: jsiispec.Assembly) {
    let translator = new SourceTranslator();
    this.languages = [
      new TypeScript("ts", this.assembly, translator),
      new JavaScript("javascript", this.assembly, translator),
      new Python("python", this.assembly, translator),
      new CSharp("csharp", this.assembly, translator),
      new Java("java", this.assembly, translator),
    ];
  }

  transform() {
    this.result = {
      ...this.assembly,
      types: Object.fromEntries(
        Object.entries(this.assembly.types).map(([name, definition]) => [
          name,
          this.transformType(name, definition as jsiispec.ClassType),
        ])
      ),
    };
  }

  generateUsage(name: string) {
    return [
      ...this.languages.map(
        (lang) =>
          `<div class="gatsby-highlight" data-language="${lang.languageCode}">` +
          `<pre class="${lang.languageCode} language-${lang.languageCode}">` +
          `<code class="${lang.languageCode} language-${lang.languageCode}">` +
          Prism.highlight(
            lang.usage(name),
            Prism.languages[lang.languageCode],
            lang.languageCode
          ) +
          "</code></pre></div>"
      ),
    ].join("");
  }

  transformType(
    name: string,
    type: jsiispec.ClassType | (jsiispec.InterfaceType & { initializer: any })
  ): jsiispec.ClassType | (jsiispec.InterfaceType & { initializer: any }) {
    // TODO filter private and inherited and ignored

    let summary = type.docs?.summary;
    if (summary) {
      // hack to allow multi line summaries
      summary = summary.replace(/․/g, ".");
    }
    let remarks = type.docs?.remarks;

    return {
      ...type,
      docs: {
        summary: this.parseMarkdown(summary),
        remarks: this.parseMarkdown(this.translateCode(remarks)),
        custom: {
          ...type.docs?.custom,
          usage: this.generateUsage(type.name),
        },
        stability: type.docs?.stability,
      },
      initializer:
        type.initializer &&
        this.transformMethod(type.name, {
          ...type.initializer,
          initializer: true,
        }),
      methods:
        type.methods &&
        type.methods.map((method) => this.transformMethod(type.name, method)),
      properties:
        type.properties &&
        type.properties.map((prop) => this.transformProperty(type.name, prop)),
    };
  }

  generatePropsTable(
    className: string,
    method: jsiispec.Method
  ): string | undefined {
    let params = method.parameters || [];
    if (params.length) {
      let lastParam = params[params.length - 1] as any;
      let type = this.assembly.types[lastParam.type.fqn];
      if (!type) {
        return undefined;
      }
      if (type.kind == "interface") {
        return [
          ...this.languages.map(
            (lang) =>
              `<span data-language="${lang.languageCode}">` +
              lang.propsTable(className, method, lastParam, type as any) +
              "</span>"
          ),
        ].join("");
      }
    }
    return undefined;
  }

  generateMethodSignature(className: string, method: jsiispec.Method): string {
    return [
      ...this.languages.map(
        (lang) =>
          `<span data-language="${lang.languageCode}">` +
          lang.methodSignature(className, method) +
          "</span>"
      ),
    ].join("");
  }

  generateSimpleMethodSignature(
    className: string,
    method: jsiispec.Method
  ): string {
    return [
      ...this.languages.map(
        (lang) =>
          `<span data-language="${lang.languageCode}">` +
          lang.simpleMethodSignature(className, method) +
          "</span>"
      ),
    ].join("");
  }

  transformMethod(className: string, method: jsiispec.Method): jsiispec.Method {
    return {
      ...method,
      docs: {
        summary: this.parseMarkdown(method.docs?.summary),
        remarks: this.parseMarkdown(this.translateCode(method.docs?.remarks)),
        custom: {
          remarks: this.parseMarkdown(
            this.translateCode(method.docs?.custom?.remarks)
          ),
          topic: method.docs?.custom?.topic,
          ignore: method.docs?.custom?.ignore,
          signature: this.generateMethodSignature(className, method),
          simpleSignature: this.generateSimpleMethodSignature(
            className,
            method
          ),
          propsTable: this.generatePropsTable(className, method),
        },
        stability: method.docs?.stability,
      },
      parameters:
        method.parameters &&
        method.parameters.map((param) => this.transformParameter(param)),
    };
  }

  transformParameter(param: jsiispec.Parameter): jsiispec.Parameter {
    return {
      ...param,
      docs: {
        summary:
          param.docs?.summary &&
          this.parseMarkdown(param.docs?.summary)
            // @ts-ignore
            .replaceAll("<p>", "")
            .replaceAll("</p>", ""),
      },
    };
  }

  generatePropertySignature(
    className: string,
    property: jsiispec.Property
  ): string {
    return [
      ...this.languages.map(
        (lang) =>
          `<span data-language="${lang.languageCode}">` +
          lang.propertySignature(className, property) +
          "</span>"
      ),
    ].join("");
  }

  generateSimplePropertySignature(
    className: string,
    property: jsiispec.Property
  ): string {
    return [
      ...this.languages.map(
        (lang) =>
          `<span data-language="${lang.languageCode}">` +
          lang.simplePropertySignature(className, property) +
          "</span>"
      ),
    ].join("");
  }

  transformProperty(
    className: string,
    prop: jsiispec.Property
  ): jsiispec.Property {
    return {
      ...prop,
      docs: {
        summary: this.parseMarkdown(prop.docs?.summary),
        remarks: this.parseMarkdown(this.translateCode(prop.docs?.remarks)),
        custom: {
          remarks: this.parseMarkdown(
            this.translateCode(prop.docs?.custom?.remarks)
          ),
          topic: prop.docs?.custom?.topic,
          ignore: prop.docs?.custom?.ignore,
          signature: this.generatePropertySignature(className, prop),
          simpleSignature: this.generateSimplePropertySignature(
            className,
            prop
          ),
        },
        stability: prop.docs?.stability,
      },
    };
  }

  parseMarkdown(text?: string): string | undefined {
    if (!text) {
      return undefined;
    }

    return showdownConverter
      .makeHtml(text)
      .replaceAll("<code>", `<code class="language-text">`)
      .replaceAll("<em>", `<em style="font-weight: 500;">`)
      .replaceAll(
        /{@link\s*"([a-zA-Z0-9\#\/-]*?)"\s*\|\s*(.*?)}/g,
        (match, $1, $2) => `<a href="/docs/${$1}">${$2}</a>`
      )
      .replaceAll(
        /{@link\s*([a-zA-Z0-9\#]*?)\s*\|\s*(.*?)}/g,
        (match, $1, $2) => `<a href="/docs/api/${$1}">${$2}</a>`
      )
      .replaceAll(
        /{@link\s*([a-zA-Z0-9]*?)\.(.*?)\s*\|\s*(.*?)}/g,
        (match, $1, $2, $3) =>
          `<a href="/docs/api/${_.kebabCase($1)}#${_.kebabCase($2)}">${$3}</a>`
      )
      .replaceAll(
        /{@link\s*([a-zA-Z0-9]*?)\s*\|\s*(.*?)}/g,
        (match, $1, $2) => `<a href="/docs/api/${_.kebabCase($1)}">${$2}</a>`
      );
  }

  translateCode(
    text?: string,
    fixEmptyLinesForMarkdown: boolean = false
  ): string | undefined {
    if (!text) {
      return undefined;
    }

    let regex = new RegExp("```ts(.*?)```", "gms");
    let match = text.match(regex);
    if (match) {
      for (let codeSection of match) {
        let code = codeSection.slice("```ts".length, "```".length * -1);

        let highlightedCode = this.highlightCode(
          "ts",
          new TypeScript("ts", this.assembly, new SourceTranslator())
            .translate(code)
            .trim()
        );

        if (fixEmptyLinesForMarkdown) {
          highlightedCode = this.fixEmptyLinesForMarkdown(highlightedCode);
        }

        let multiCodeSection = highlightedCode;

        for (let language of this.languages) {
          if (language.languageCode == "ts") {
            continue;
          }
          let translatedCode = language.translate(code);
          let highlightedCode = this.highlightCode(
            language.languageCode,
            translatedCode.trim()
          );

          if (fixEmptyLinesForMarkdown) {
            highlightedCode = this.fixEmptyLinesForMarkdown(highlightedCode);
          }
          multiCodeSection += highlightedCode;
        }

        multiCodeSection += "\n\n";

        text = text.replace(codeSection, multiCodeSection);
      }
    }
    return text;
  }

  fixEmptyLinesForMarkdown(source?: string): string | undefined {
    if (!source) {
      return source;
    }

    let ret = source
      .split("\n")
      .map((line) => (line.trim().length == 0 ? "&nbsp;" : line))
      .join("\n");
    return ret;
  }

  highlightCode(languageCode: string, source: string): string {
    return (
      `<div class="gatsby-highlight" data-language="${languageCode}">` +
      `<pre class="${languageCode} language-${languageCode}">` +
      `<code class="${languageCode} language-${languageCode}">` +
      Prism.highlight(source, Prism.languages[languageCode], languageCode) +
      "</code></pre></div>"
    );
  }
}
