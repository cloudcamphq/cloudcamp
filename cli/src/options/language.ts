import { Language, LanguageCode } from "@cloudcamp/aws-runtime/src/language";
import { Choice } from "../option";

/**
 * Pick the template language
 */
export class LanguageChoice extends Choice<LanguageCode> {
  message = "Language";
  code = "language";

  constructor(language: LanguageCode) {
    super();
    this.key = language;
    this.choices = new Map<string, LanguageCode>(
      Language.LANGUAGE_CODES.map((l: LanguageCode) => [l, l])
    );
  }

  displayChoice(key: string): string {
    return Language.nameForLanguageCode(key as LanguageCode);
  }

  get displayValue(): string {
    return this.displayChoice(this.key as string);
  }
}
