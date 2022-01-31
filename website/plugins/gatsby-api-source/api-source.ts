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

loadLanguages(Language.LANGUAGE_CODES);

export default class ApiSource {
  public result!: jsiispec.Assembly;
  private languages: Language[];

  constructor(private assembly: jsiispec.Assembly) {
    const translator = new SourceTranslator();
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

    console.log("Transforming type: ", name);

    let summary = type.docs?.summary;
    if (summary) {
      // hack to allow multi line summaries
      summary = summary.replace(/․/g, ".");
    }
    const remarks = type.docs?.remarks;

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

  private generatePropsAllLanguages(
    methodOrPropName: string,
    type: jsiispec.ClassType | jsiispec.InterfaceType,
    showDefaults: boolean = true
  ): string {
    const id = _.kebabCase(methodOrPropName) + "-" + _.kebabCase(type.name);
    let result = [
      ...this.languages.map(
        (lang) =>
          `<span data-language="${lang.languageCode}">` +
          lang.propsTable(methodOrPropName, type as any, showDefaults, this) +
          "</span>"
      ),
    ].join("");
    return `<span id="${id}">${result}</span>`;
  }

  generatePropsTableForProperty(
    property: jsiispec.Property
  ): string | undefined {
    if (!property.type["fqn"]) {
      return undefined;
    }
    if (!this.assembly.types[property.type["fqn"]]) {
      return undefined;
    }
    const type = this.assembly.types[property.type["fqn"]];
    return this.generatePropsAllLanguages(property.name, type as any, false);
  }

  generatePropsTableForMethod(method: jsiispec.Method): string | undefined {
    const params = method.parameters || [];
    if (!params.length) {
      return undefined;
    }
    const lastParam = params[params.length - 1] as any;
    const type = this.assembly.types[lastParam.type.fqn];
    if (!type) {
      return undefined;
    }
    if (type.kind == "interface") {
      let result = this.generatePropsAllLanguages(method.name, type as any);

      const types = {};
      const typeNames = [];
      let props: jsiispec.Property[] = _.clone(type.properties);

      props = props.sort((a, b) =>
        a.locationInModule?.line > b.locationInModule?.line ? 1 : -1
      );

      for (let prop of props || []) {
        const type = this.assembly.types[(prop.type as any).fqn];
        if (type && type.kind == "interface") {
          if (!typeNames.includes(type.fqn)) {
            types[type.fqn] = type;
            typeNames.push(type.fqn);
          }
        } else if (
          (prop.type as any)?.collection?.kind == "array" &&
          (prop.type as any)?.collection?.elementtype?.fqn
        ) {
          const type =
            this.assembly.types[
              (prop.type as any)?.collection?.elementtype?.fqn
            ];
          if (type && type.kind == "interface") {
            if (!typeNames.includes(type.fqn)) {
              types[type.fqn] = type;
              typeNames.push(type.fqn);
            }
          }
        }
      }

      for (let typeName of typeNames) {
        const type = types[typeName];
        result += this.generatePropsAllLanguages(method.name, type as any);
      }

      return result;
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
          propsTable: this.generatePropsTableForMethod(method),
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
      optional: param.optional ? true : false,
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
          propsTable: prop.docs?.custom?.inline
            ? this.generatePropsTableForProperty(prop)
            : undefined,
        },
        stability: prop.docs?.stability,
      },
    };
  }

  parseMarkdown(text?: string): string | undefined {
    if (!text) {
      return undefined;
    }

    return (
      showdownConverter
        .makeHtml(text)
        .replaceAll("<code>", `<code class="language-text">`)
        .replaceAll("<em>", `<em style="font-weight: 500;">`)
        .replaceAll(
          /{@link\s*"([a-zA-Z0-9\#\/-]*?)"\s*\|\s*(.*?)}/g,
          (match, $1, $2) => `<a href="/docs/${$1}">${$2}</a>`
        )
        .replaceAll(
          /{@link\s*([a-zA-Z0-9\#]*?)\s*\|\s*(.*?)}/g,
          (match, $1, $2) => `<a href="/docs/api/${_.kebabCase($1)}">${$2}</a>`
        )
        .replaceAll(
          /{@link\s*([a-zA-Z0-9]*?)\.(.*?)\s*\|\s*(.*?)}/g,
          (match, $1, $2, $3) =>
            `<a href="/docs/api/${_.kebabCase($1)}#${_.kebabCase(
              $2
            )}">${$3}</a>`
        )
        .replaceAll(
          /{@link\s*([a-zA-Z0-9]*?)\s*\|\s*(.*?)}/g,
          (match, $1, $2) => `<a href="/docs/api/${_.kebabCase($1)}">${$2}</a>`
        )
        // jsii introduces a period at the end of a summary. When the sentence
        // ends with a colon, remove the period.
        .replaceAll(/:\./g, ":")
    );
  }

  translateCode(
    text?: string,
    fixEmptyLinesForMarkdown: boolean = false
  ): string | undefined {
    if (!text) {
      return undefined;
    }

    const regex = new RegExp("```ts(.*?)```", "gms");
    const match = text.match(regex);
    if (match) {
      for (let codeSection of match) {
        const code = codeSection.slice("```ts".length, "```".length * -1);

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
          const translatedCode = language.translate(code);
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

    const ret = source
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
