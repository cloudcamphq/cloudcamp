/**
 * Language codes supported by CDK.
 */
export enum LanguageCode {
  TYPESCRIPT = "typescript",
  JAVASCRIPT = "javascript",
  PYTHON = "python",
  CSHARP = "csharp",
  JAVA = "java",
}

/**
 * Abstract Language class, serves as a template for subclasses
 * which implement a specific language.
 */
export abstract class Language {
  /**
   * A list of valid language codes.
   */
  static LANGUAGE_CODES = Object.values(LanguageCode);

  /**
   * Is a language code valid?
   */
  static isValidCode(code: string): boolean {
    return Language.LANGUAGE_CODES.includes(code as LanguageCode);
  }

  /**
   * Get the language code by file extension.
   */
  static languageCodeForExtension(ext: string): LanguageCode {
    switch (ext) {
      case ".ts":
        return LanguageCode.TYPESCRIPT;
      case ".py":
        return LanguageCode.PYTHON;
      case ".js":
        return LanguageCode.JAVASCRIPT;
      case ".cs":
        return LanguageCode.CSHARP;
      case ".java":
        return LanguageCode.JAVA;
      default:
        throw new Error("Unknown extension.");
    }
  }

  /**
   * Get the extension for a language code.
   */
  static extensionForLanguageCode(code: LanguageCode): string {
    switch (code) {
      case LanguageCode.TYPESCRIPT:
        return ".ts";
      case LanguageCode.PYTHON:
        return ".py";
      case LanguageCode.JAVASCRIPT:
        return ".js";
      case LanguageCode.CSHARP:
        return ".cs";
      case LanguageCode.JAVA:
        return ".java";
    }
  }

  static nameForLanguageCode(code: LanguageCode): string {
    switch (code) {
      case LanguageCode.TYPESCRIPT:
        return "TypeScript";
      case LanguageCode.PYTHON:
        return "Python";
      case LanguageCode.JAVASCRIPT:
        return "JavaScript";
      case LanguageCode.CSHARP:
        return "C#";
      case LanguageCode.JAVA:
        return "Java";
    }
  }

  /**
   * @param code The code of the language
   */
  constructor(public code: LanguageCode) {}

  /**
   * A list of patterns for .gitignore, relative to CAMP_HOME_DIR.
   */
  abstract get gitignorePatterns(): string[];

  /**
   * The command CDK uses to synthesize.
   *
   * Note: This command is run in the project directory.
   */
  abstract get cdkAppCommand(): string;

  /**
   * Any additional files needed by the implementation, relative to CAMP_HOME_DIR.
   */
  abstract get additionalFiles(): { [key: string]: string };

  /**
   * Command to install dependencies
   *
   * Note: This command is run in the project directory.
   */
  abstract get installCommand(): string;

  /**
   * Command to build the CDK code
   *
   * Note: This command is run in the project directory.
   */
  abstract get buildCommand(): string | undefined;

  /**
   * Instantiate new Language based on code.
   */
  static make(code: LanguageCode): Language {
    switch (code) {
      case LanguageCode.TYPESCRIPT:
        return new TypescriptLanguage(code);
      case LanguageCode.PYTHON:
        return new PythonLanguage(code);
      default:
        throw new Error("Not yet implemented: " + code);
    }
  }
}

/**
 * Typescript
 */
class TypescriptLanguage extends Language {
  get gitignorePatterns() {
    return ["node_modules"];
  }

  get cdkAppCommand() {
    return "npx ts-node --prefer-ts-exts src/app.ts";
  }

  get additionalFiles() {
    return {
      "package.json": JSON.stringify(
        {
          dependencies: {
            "@cloudcamp/aws-runtime":
              "/Users/markus/Code/cloudcamp/aws-runtime",
            "ts-node": "10.0.0",
          },
        },
        null,
        2
      ),
    };
  }

  get installCommand() {
    return "npm i -g typescript && npm install";
  }

  get buildCommand() {
    // When debugging, the aws-runtime directory is copied to the
    // build dir. Compile it with tsc.
    return `[ -d "aws-runtime" ] && cd aws-runtime && tsc || true`;
  }
}

/**
 * TPython
 */
class PythonLanguage extends Language {
  get gitignorePatterns(): string[] {
    return [".venv", "*.py[cod]", "*$py.class"];
  }

  get cdkAppCommand() {
    return "python3 src/camp.py";
  }

  get additionalFiles(): { [key: string]: string } {
    return {
      "requirements.txt": "cloudcamp",
    };
  }

  get installCommand(): string {
    if (process.platform == "win32") {
      return `python -m venv .venv &&
              .venv\\Scripts\\activate.bat &&
              pip install -r requirements.txt`;
    } else {
      return `python -m venv .venv &&
              source .venv/bin/activate &&
              pip install -r requirements.txt`;
    }
  }

  get buildCommand() {
    return undefined;
  }
}
