let fs = require("fs");
let crypto = require("crypto");
import * as jsiispec from "@jsii/spec";

import { Language } from "@cloudcamp/aws-runtime/src/language";
import {
  RosettaTabletReader,
  TargetLanguage,
  TypeScriptSnippet,
  UnknownSnippetMode,
} from "jsii-rosetta";
import { LanguageCode } from "@cloudcamp/aws-runtime";
import { Runtime } from "@cloudcamp/aws-runtime/src/runtime";

export function loadJsiiAssembly(): jsiispec.Assembly {
  return JSON.parse(fs.readFileSync(Runtime.jsiiAssemblyFile()).toString());
}

export class SourceTranslator {
  rosetta: RosettaTranslator;
  constructor() {
    this.rosetta = RosettaTranslator.instance;
  }

  public translate(source: string, languageCode: LanguageCode): string {
    switch (languageCode) {
      case LanguageCode.TYPESCRIPT:
        return this.translateTypeScript(source);
      case LanguageCode.JAVASCRIPT:
        return this.translateJavaScript(source);
      case LanguageCode.PYTHON:
        return this.translatePython(source);
      case LanguageCode.CSHARP:
        return this.translateCSharp(source);
      case LanguageCode.JAVA:
        return this.translateJava(source);
    }
  }

  private translateTypeScript(source: string) {
    return this.manuallyHideCode(source);
  }

  private translateJavaScript(source: string): string {
    return this.manuallyHideCode(source)
      .replace(/from\s*"(.*?)"/g, '= require("$1")')
      .replace(/import/g, "const");
  }

  private translatePython(source: string): string {
    return this.rosetta.translate("python", source);
  }

  private translateCSharp(source: string): string {
    const translation = this.rosetta.translate("csharp", source);
    const assembly = this.rosetta.assembly;

    const fixedSource = translation.replace(
      /new\s+(.*?)\((.*?),\s+new\s+Struct/g,
      (match, $1, $2) => {
        const fqn = "@cloudcamp/aws-runtime." + $1;

        if (!assembly.types || !assembly.types[fqn]) {
          return match;
        }

        const types = assembly.types!;

        if (
          !(types[fqn] as jsiispec.ClassType).initializer ||
          !(types[fqn] as jsiispec.ClassType).initializer!.parameters
        ) {
          return match;
        }

        const ctor = (assembly.types[fqn] as jsiispec.ClassType).initializer!;
        const last = ctor.parameters!.slice(-1)[0] as any;
        if (last.name == "props" && last.type.fqn) {
          const typeName = last.type.fqn.split(".")[1];
          return `new ${$1}(${$2}, new ${typeName}`;
        }
        return match;
      }
    );
    return fixedSource;
  }

  private translateJava(source: string): string {
    const translation = this.rosetta.translate("java", source);
    const assembly = this.rosetta.assembly;

    // rosetta gives us type 'Object' fix this with a regex
    let fixedSource = translation.replace(
      /Object\s*(.*?)\s*=\s*new\s+(.*?)\(/g,
      "$2 $1 = new $2("
    );

    // fix type annotations on method calls
    fixedSource = fixedSource.replace(
      /Object\s+(.*?)\s*=\s*(.*?)\.(.*?)\(/g,
      (match, $1, $2, $3) => {
        let method: jsiispec.Method | undefined;

        for (let klass of Object.values(assembly.types!)) {
          for (let meth of (klass as jsiispec.ClassType).methods || []) {
            if (meth.name == $3) {
              method = meth;
              break;
            }
          }
          if (method) {
            break;
          }
        }

        if (!method) {
          return match;
        }

        let returnType: string;
        if ((method.returns?.type as jsiispec.ClassType).fqn) {
          returnType = (method.returns?.type as jsiispec.ClassType).fqn.split(
            "."
          )[1];
        } else {
          return match;
        }

        return `${returnType} ${$1} = ${$2}.${$3}(`;
      }
    );

    // fix setters
    fixedSource = fixedSource.replace(
      /(.*?)\.get(.*?)\(\)\s+=\s+(.*?);/g,
      (_match, $1, $2, $3) => {
        return `${$1}.set${$2}(${$3});`;
      }
    );

    // fix builders
    fixedSource = fixedSource.replace(
      /new\s+([a-zA-Z0-9]*?)\(\)((\s*\.[a-zA-Z0-9]*?\(.*?\))*)/gms,
      (match, $1, $2) => {
        const fqn = `@cloudcamp/aws-runtime.${$1}`;
        if (assembly.types![fqn] && assembly.types![fqn].kind == "interface") {
          return `new ${$1}.Builder()${$2}.build()`;
        } else {
          return match;
        }
      }
    );

    return fixedSource;
  }

  private manuallyHideCode(source: string) {
    return source.replace(
      new RegExp("void 0;(.*?)void ['\"]show['\"];", "gms"),
      ""
    );
  }
}

class RosettaTranslator {
  public assembly: jsiispec.Assembly;

  private static INSTANCE: RosettaTranslator;
  private rosetta: RosettaTabletReader;
  private cache: Map<string, string>;

  private constructor() {
    this.cache = new Map();
    this.rosetta = new RosettaTabletReader({
      unknownSnippets: UnknownSnippetMode.TRANSLATE,
      targetLanguages: Language.LANGUAGE_CODES.filter(
        (l) => l != "typescript" && l != "javascript"
      ) as any,
      loose: false,
      includeCompilerDiagnostics: true,
    });
    this.assembly = loadJsiiAssembly();
    this.rosetta.addAssembly(this.assembly, Runtime.jsiiAssemblyDir());
  }

  public static get instance(): RosettaTranslator {
    if (!RosettaTranslator.INSTANCE) {
      RosettaTranslator.INSTANCE = new RosettaTranslator();
    }
    return RosettaTranslator.INSTANCE;
  }

  public translate(language: string, source: string): string {
    const hash = crypto
      .createHash("md5")
      .update(language)
      .update(source)
      .digest("hex");

    if (this.cache.has(hash)) {
      return this.cache.get(hash)!;
    }

    const code = {
      visibleSource: source,
      location: {
        api: {
          api: "file",
          fileName: "sample.ts",
        },
      },
    };
    const result = this.rosetta.translateSnippet(
      code as TypeScriptSnippet,
      language as TargetLanguage
    );
    if (result?.source) {
      const translation = !result.source.endsWith("\n")
        ? result.source + "\n"
        : result.source;
      this.cache.set(hash, translation);
      return translation;
    }
    throw new Error("Could not translate source code:\n" + source);
  }
}
