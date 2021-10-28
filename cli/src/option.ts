import { UX } from "./ux";
import _ from "lodash";
import chalk from "chalk";
let pressAnyKey = require("press-any-key");

/**
 * Abstract base class for an input which is editable by users.
 */
export abstract class Input<A> {
  /**
   * A message to show to users
   */
  abstract readonly message: string;

  /**
   * A code representing the input
   */
  abstract readonly code: string;

  /**
   * A string representation of the current value.
   */
  abstract readonly displayValue: string;

  /**
   * The current value.
   */
  abstract get value(): A;

  /**
   * Asynchronous init.
   */
  async init(_parent?: Input<any>): Promise<Input<A>> {
    return this;
  }

  /**
   * Edit the input.
   */
  abstract edit(ux: UX, parent?: Input<any>): Promise<void>;

  toString(): string {
    let tab = this.message.length <= 3 ? "\t\t" : "\t";
    return `${this.message}:${tab}${chalk.bold(this.displayValue)}`;
  }
}

/**
 * Lets users pick from a list of choices
 */
export abstract class Choice<A> extends Input<A> {
  /**
   * The selected key.
   */
  public key!: string;

  /**
   * Available choices
   */
  public choices: Map<string, A> = new Map();

  /**
   * A string representation of a choice
   */
  abstract displayChoice(key: string): string;

  /**
   * The current value in choices
   */
  public get value(): A {
    return this.choices.get(this.key)!;
  }

  /**
   * Show a picker
   */
  async edit(ux: UX): Promise<void> {
    let choices = this.choicesForPicker;

    if (choices.length == 0) {
      // should not happen
      throw new Error("Called edit, but no choice!");
    } else if (choices.length == 1) {
      ux.log(chalk.cyan("❯ " + choices[0].name) + chalk.gray(" (only choice)"));
      ux.log();
      await pressAnyKey();
    } else {
      let key = await ux.list({
        message: this.message + ":",
        choices: choices,
        default: this.key,
      });
      this.key = key;
    }
  }

  /**
   * Choices for the picker
   */
  protected get choicesForPicker(): any[] {
    return Array.from(this.choices).map(([k, _v]) => ({
      value: k,
      short: k,
      name: this.displayChoice(k),
    }));
  }
}

/**
 * Lets users confirm and edit a collection of inputs.
 */
export abstract class CompositeInput extends Input<Input<any>[]> {
  value: Input<any>[];

  constructor(...inputs: Input<any>[]) {
    super();
    this.value = inputs;
  }

  /**
   * True if the composite has a quit option (default)
   */
  quitOption: boolean = true;

  /**
   * Name of the continue option
   */
  continueOptionName: string = "Continue";

  /**
   * Code of the continue option
   */
  continueOptionCode: string = "continue";

  /**
   * Asynchronous init.
   */
  async init(): Promise<Input<any>> {
    for (let input of this.value) {
      await input.init(this);
    }
    return this;
  }

  /**
   * Prompt users to edit settings.
   *
   * They can choose to continue(default), edit an input or quit.
   */
  async edit(ux: UX) {
    ux.workaroundListenersBugIDontWantToInvestigate();

    let choices: any[] = this.value.map((input) => ({
      value: input.code,
      short: input.code,
      name: input.toString(),
    }));
    choices = choices.concat([
      ux.listSeparator(),
      {
        value: this.continueOptionCode,
        short: this.continueOptionCode,
        name: this.continueOptionName,
      },
    ]);

    if (this.quitOption) {
      choices.push({ value: "quit", short: "quit", name: "Quit" });
    }

    let selection = await ux.list({
      message: "Settings:",
      choices: choices,
      default: "continue",
      pageSize: choices.length + 3,
      loop: false,
    });

    if (selection == "continue") {
      return;
    } else if (selection == "quit") {
      await this.quit();
    } else {
      let editInput: Input<any> | undefined = undefined;
      for (let input of this.value) {
        if (input.code == selection) {
          editInput = input;
          break;
        }
      }

      if (editInput === undefined) {
        // should not happen
        throw new Error("Unknown selection: " + selection);
      } else {
        await editInput.edit(ux, this);
        ux.log("");
        await this.edit(ux);
      }
    }
  }

  /**
   * User selected quit
   */
  async quit() {
    process.exit(0);
  }
}
