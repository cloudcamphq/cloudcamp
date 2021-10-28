import { Language } from "./language";
import {
  JsiiDefinition,
  JsiiMethod,
  JsiiParameter,
  JsiiProperty,
  JsiiType,
} from "../api-source";
let _ = require("lodash");

export class Java extends Language {
  translate(source: string): string {
    let translation = super.translate(source);

    // rosetta gives us type 'Object' fix this with a regex
    let fixedSource = translation.replace(
      /Object\s*(.*?)\s*=\s*new\s+(.*?)\(/g,
      "$2 $1 = new $2("
    );

    // fix type annotations on method calls
    fixedSource = fixedSource.replace(
      /Object\s+(.*?)\s*=\s*(.*?)\.(.*?)\(/g,
      (match, $1, $2, $3) => {
        let method: JsiiMethod | undefined;

        for (let klass of Object.values(this.project.types)) {
          for (let meth of klass.methods || []) {
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
        if (method.returns?.type.fqn) {
          returnType = method.returns.type.fqn.split(".")[1];
        } else {
          return match;
        }

        return `${returnType} ${$1} = ${$2}.${$3}(`;
      }
    );

    // fix setters
    fixedSource = fixedSource.replace(
      /(.*?)\.get(.*?)\(\)\s+=\s+(.*?);/g,
      (match, $1, $2, $3) => {
        return `${$1}.set${$2}(${$3});`;
      }
    );

    // fix builders
    fixedSource = fixedSource.replace(
      /new\s+([a-zA-Z0-9]*?)\(\)((\s*\.[a-zA-Z0-9]*?\(.*?\))*)/gms,
      (match, $1, $2) => {
        let fqn = `@cloudcamp/aws-runtime.${$1}`;
        if (
          this.project.types[fqn] &&
          this.project.types[fqn].kind == "interface"
        ) {
          return `new ${$1}.Builder()${$2}.build()`;
        } else {
          return match;
        }
      }
    );

    return fixedSource;
  }

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
    method: JsiiMethod,
    param: JsiiParameter,
    type: JsiiDefinition
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
    method: JsiiMethod,
    param: JsiiParameter,
    type: JsiiDefinition
  ): string {
    let tbody = type.properties
      .map(
        (prop, ix) => `
      <tr class="${ix % 2 == 0 ? "bg-gray-50" : ""}">
        <td class="px-6 py-2 border font-mono text-sm whitespace-nowrap">${
          prop.name
        } (${this.translateType(prop.type)} ${prop.name})</td>
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

  methodSignature(className: string, method: JsiiMethod): string {
    let argsList = [];

    let meths = method.initializer ? `new ${className}` : method.name;
    let rets = method.initializer
      ? ""
      : this.translateType(method.returns?.type) + " ";

    for (let param of method.parameters || []) {
      let paramName = param.name;
      let typeName = this.translateType(param.type);

      argsList.push(`${typeName} ${paramName}`);
    }
    return `${rets}${meths}(${argsList.join(", ")})`;
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
      return "Map&lt;String, String&gt;";
    }
    return "";
  }

  propertySignature(className: string, property: JsiiProperty): string {
    return `${property.static ? "static " : ""}${this.translateType(
      property.type
    )} get${_.upperFirst(property.name)}()`;
  }

  simpleMethodSignature(className: string, method: JsiiMethod): string {
    let meths = method.initializer ? `constructor` : method.name;
    return `${meths}`;
  }

  simplePropertySignature(className: string, property: JsiiProperty): string {
    return `get${_.upperFirst(property.name)}`;
  }
}
