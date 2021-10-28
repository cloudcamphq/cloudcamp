let showdown = require("showdown");
let Prism = require("prismjs");
let loadLanguages = require("prismjs/components/");
let _ = require("lodash");
let showdownConverter = new showdown.Converter();

import {
  Language,
  TypeScript,
  JavaScript,
  Python,
  CSharp,
  Java,
} from "./languages";

export interface JsiiApi {
  types: {
    [key: string]: JsiiDefinition;
  };
}

export interface JsiiDefinition {
  name: string;
  base?: string;
  datatype?: true;
  kind: string;
  fqn: string;
  docs?: JsiiDoc;
  initializer?: JsiiMethod;
  methods?: JsiiMethod[];
  properties?: JsiiProperty[];
}

export interface JsiiDoc {
  stability?: string;
  summary?: string;
  remarks?: string;
  custom?: {
    topic?: string;
    remarks?: string;
    ignore?: "true";
    order?: string;
  };
  usage?: string;
  signature?: string;
  simpleSignature?: string;
  propsTable?: string;
}

export interface JsiiMethod {
  locationInModule: { line: number };
  name?: string;
  docs?: JsiiDoc;
  parameters?: JsiiParameter[];
  returns?: { type: JsiiType };
  static?: true;
  initializer?: true;
}

export interface JsiiProperty {
  name?: string;
  docs: JsiiDoc;
  immutable?: boolean;
  locationInModule: { line: number };
  type?: JsiiType;
  static?: true;
}

export interface JsiiParameter {
  name: string;
  optional?: true;
  docs?: JsiiDoc;
  type: JsiiType;
}

export interface JsiiType {
  fqn?: string;
  primitive?: string;
}

loadLanguages(Language.LANGUAGE_CODES);

export default class ApiSource {
  public api!: JsiiApi;
  private languages: Language[];

  constructor(private project: JsiiApi) {
    this.languages = [
      new TypeScript("ts", this.project),
      new JavaScript("javascript", this.project),
      new Python("python", this.project),
      new CSharp("csharp", this.project),
      new Java("java", this.project),
    ];
  }

  generateApi() {
    this.api = {
      types: Object.fromEntries(
        Object.entries(this.project.types).map(([name, definition]) => [
          name,
          this.makeDefinition(name, definition),
        ])
      ),
    };
  }

  makeUsage(name: string) {
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

  makeDefinition(name: string, definition: JsiiDefinition): JsiiDefinition {
    // TODO filter private and inherited and ignored

    let summary = definition.docs?.summary;
    if (summary) {
      // hack to allow multi line summaries
      summary = summary.replace(/․/g, ".");
    }
    let remarks = definition.docs?.remarks;

    // if (definition.docs?.remarks) {
    //   let parts = remarks.split("\n\n");
    //   if (parts.length > 1) {
    //     summary += " " + parts[0].trim();
    //     remarks = parts.slice(1).join("\n\n");
    //   }
    // }

    return {
      name: definition.name,
      base: definition.base,
      datatype: definition.datatype,
      kind: definition.kind,
      fqn: definition.fqn,
      docs: {
        summary: this.parseMarkdown(summary),
        remarks: this.parseMarkdown(this.translateCode(remarks)),
        custom: definition.docs?.custom,
        stability: definition.docs?.stability,
        usage: this.makeUsage(definition.name),
      },
      initializer:
        definition.initializer &&
        this.makeMethod(definition.name, {
          ...definition.initializer,
          initializer: true,
        }),
      methods:
        definition.methods &&
        definition.methods.map((method) =>
          this.makeMethod(definition.name, method)
        ),
      properties:
        definition.properties &&
        definition.properties.map((prop) =>
          this.makeProperty(definition.name, prop)
        ),
    };
  }

  makePropsTable(className: string, method: JsiiMethod): string | undefined {
    let params = method.parameters || [];
    if (params.length) {
      let lastParam = params[params.length - 1];
      let type = this.project.types[lastParam.type.fqn];
      if (!type) {
        return undefined;
      }
      if (type.kind == "interface") {
        return [
          ...this.languages.map(
            (lang) =>
              `<span data-language="${lang.languageCode}">` +
              lang.propsTable(className, method, lastParam, type) +
              "</span>"
          ),
        ].join("");
      }
    }
    return undefined;
  }

  makeMethodSignature(className: string, method: JsiiMethod): string {
    return [
      ...this.languages.map(
        (lang) =>
          `<span data-language="${lang.languageCode}">` +
          lang.methodSignature(className, method) +
          "</span>"
      ),
    ].join("");
  }

  makeSimpleMethodSignature(className: string, method: JsiiMethod): string {
    return [
      ...this.languages.map(
        (lang) =>
          `<span data-language="${lang.languageCode}">` +
          lang.simpleMethodSignature(className, method) +
          "</span>"
      ),
    ].join("");
  }

  makeMethod(className: string, method: JsiiMethod): JsiiMethod {
    return {
      locationInModule: method.locationInModule,
      name: method.name,
      docs: {
        summary: this.parseMarkdown(method.docs?.summary),
        remarks: this.parseMarkdown(this.translateCode(method.docs?.remarks)),
        custom: {
          remarks: this.parseMarkdown(
            this.translateCode(method.docs?.custom?.remarks)
          ),
          topic: method.docs?.custom?.topic,
          ignore: method.docs?.custom?.ignore,
        },
        stability: method.docs?.stability,
        signature: this.makeMethodSignature(className, method),
        simpleSignature: this.makeSimpleMethodSignature(className, method),
        propsTable: this.makePropsTable(className, method),
      },
      parameters:
        method.parameters &&
        method.parameters.map((param) => this.makeParameter(param)),
      returns: method.returns,
      static: method.static,
    };
  }

  makeParameter(param: JsiiParameter): JsiiParameter {
    return {
      name: param.name,
      optional: param.optional,
      docs: {
        summary:
          param.docs?.summary &&
          this.parseMarkdown(param.docs?.summary)
            // @ts-ignore
            .replaceAll("<p>", "")
            .replaceAll("</p>", ""),
      },
      type: param.type,
    };
  }

  makePropertySignature(className: string, property: JsiiProperty): string {
    return [
      ...this.languages.map(
        (lang) =>
          `<span data-language="${lang.languageCode}">` +
          lang.propertySignature(className, property) +
          "</span>"
      ),
    ].join("");
  }

  makeSimplePropertySignature(
    className: string,
    property: JsiiProperty
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

  makeProperty(className: string, prop: JsiiProperty): JsiiProperty {
    // TODO static
    return {
      name: prop.name,
      docs: {
        summary: this.parseMarkdown(prop.docs?.summary),
        remarks: this.parseMarkdown(this.translateCode(prop.docs?.remarks)),
        custom: {
          remarks: this.parseMarkdown(
            this.translateCode(prop.docs?.custom?.remarks)
          ),
          topic: prop.docs?.custom?.topic,
          ignore: prop.docs?.custom?.ignore,
        },
        stability: prop.docs?.stability,
        signature: this.makePropertySignature(className, prop),
        simpleSignature: this.makeSimplePropertySignature(className, prop),
      },
      immutable: prop.immutable,
      locationInModule: prop.locationInModule,
      type: prop.type,
      static: prop.static,
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
          new TypeScript("ts", this.project).translate(code).trim()
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

    return source
      .split("\n")
      .map((line) => (line.trim().length == 0 ? "&nbsp;" : line))
      .join("\n");
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
