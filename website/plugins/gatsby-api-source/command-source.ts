import TsType from "typescript";
let ts = require("typescript");
let path = require("path");
let fs = require("fs");
import ApiSource from "./api-source";

let project = JSON.parse(
  fs
    .readFileSync(
      path.join(__dirname, "..", "..", "content", "api", "api.json")
    )
    .toString()
);
let apiSource = new ApiSource(project);

interface FlagDefinition {
  name: string;
  type: string;
  char?: string;
  description?: string;
  overview?: string;
}

interface ArgDefinition {
  name: string;
  description?: string;
}

export interface CommandDefinition {
  name: string;
  group: string;
  summary: string;
  order?: string;
  suborder?: string;
  ignore: boolean;
  description?: string;
  flags: FlagDefinition[];
  args: ArgDefinition[];
}

export default class CommandSource {
  public definition: CommandDefinition;

  constructor(absolutePath: string) {
    let filename = path.basename(absolutePath);
    const node = ts.createSourceFile(
      filename,
      fs.readFileSync(absolutePath, "utf8"),
      ts.ScriptTarget.Latest
    );

    this.definition = this.parseFile(node, absolutePath);
  }

  private parseFile(node: TsType.SourceFile, absolutePath: string) {
    let parts = absolutePath.split(path.sep);
    let name: string = path.basename(absolutePath, ".ts");
    let group: string = name;

    if (parts[parts.length - 2] !== "commands") {
      name = parts[parts.length - 2] + ":" + name;
      group = parts[parts.length - 2];
    }

    let klass: TsType.ClassDeclaration;
    node.forEachChild((child) => {
      if (ts.SyntaxKind[child.kind] === "ClassDeclaration") {
        let klassDecl = child as TsType.ClassDeclaration;
        if (
          klassDecl.heritageClauses &&
          klassDecl.heritageClauses.length &&
          klassDecl.heritageClauses[0].types &&
          klassDecl.heritageClauses[0].types.length &&
          klassDecl.heritageClauses[0].types[0].expression &&
          (klassDecl.heritageClauses[0].types[0].expression as any)
            .escapedText == "BaseCommand"
        ) {
          klass = child as TsType.ClassDeclaration;
        }
      }
    });

    if (!klass) {
      throw new Error("No command found in file: " + absolutePath);
    }

    let descriptionDefinition: any = klass.members.filter(
      (member) =>
        member.name && (member.name as any).escapedText === "description"
    )[0];

    let summary = descriptionDefinition.initializer.text;

    let argsDefinition: TsType.VariableDeclaration = klass.members.filter(
      (member) => member.name && (member.name as any).escapedText === "args"
    ) as any;
    if (argsDefinition) {
      argsDefinition = argsDefinition[0];
    }

    let args = [];
    if (argsDefinition) {
      let argsDefinitionElements =
        (argsDefinition.initializer as any).elements || [];
      let arg = {};
      for (let argDefinition of argsDefinitionElements) {
        for (let prop of argDefinition.properties) {
          if (prop.name.escapedText == "name") {
            arg["name"] = prop.initializer.text;
          } else if (prop.name.escapedText == "description") {
            arg["description"] = prop.initializer.text;
          }
        }
      }
      args.push(arg);
    }

    let flagsDefinition: TsType.VariableDeclaration = klass.members.filter(
      (member) => member.name && (member.name as any).escapedText === "flags"
    )[0] as any;

    let flags = [];
    let flagsDefinitionProperties = flagsDefinition
      ? (flagsDefinition.initializer as any).properties
      : [];

    for (let flagDefinition of flagsDefinitionProperties) {
      let flag = {};
      flag["name"] = flagDefinition.name.escapedText;
      flag["type"] = flagDefinition.initializer.expression.name.escapedText;

      if (flagDefinition.jsDoc && flagDefinition.jsDoc.length !== 0) {
        flag["overview"] = apiSource.parseMarkdown(
          apiSource.translateCode(flagDefinition.jsDoc[0].comment)
        );
      }

      for (let prop of flagDefinition.initializer.arguments[0].properties) {
        let key = prop.name.escapedText;
        let value = prop.initializer.text;

        if (!value) {
          if (prop.initializer.kind == 95) {
            value = "false";
          } else if (prop.initializer.kind == 110) {
            value = "true";
          }
        }
        flag[key] = value;
      }

      flags.push(flag);
    }

    let description = "";
    let order = undefined;
    let suborder = undefined;
    let ignore = false;
    if ((klass as any).jsDoc && (klass as any).jsDoc.length) {
      let jsdoc = (klass as any).jsDoc[0];
      if (jsdoc.comment) {
        description = jsdoc.comment;
      }
      if (jsdoc.tags && jsdoc.tags.length) {
        for (let tag of jsdoc.tags) {
          if (tag.tagName.escapedText == "order") {
            order = tag.comment;
          } else if (tag.tagName.escapedText == "suborder") {
            suborder = tag.comment;
          } else if (tag.tagName.escapedText == "ignore") {
            ignore = true;
          }
        }
      }
    }

    if (description) {
      description = apiSource.parseMarkdown(
        apiSource.translateCode(description)
      );
    }

    return {
      name: name,
      summary: summary,
      order: order,
      suborder: suborder,
      group: group,
      ignore: ignore,
      description: description,
      flags: flags,
      args: args,
    };
  }
}
