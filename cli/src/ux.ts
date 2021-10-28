import chalk from "chalk";

import { Command } from "@oclif/command";
import inquirer from "inquirer";
import cli from "cli-ux";

let input: any = require("@inquirer/input");

/**
 * UX is a convenience class to combine all user interaction
 * in a single spot.
 */
export class UX {
  spinning: boolean = false;

  constructor(private command: Command) {}

  /**
   * A wrapper of command.log
   */
  log(message?: string, ...args: any[]): void {
    this.command.log(message, ...args);
  }

  /**
   * Highlighted success message
   */
  logSuccess(...args: any[]): void {
    this.log(chalk.green(args.map((a) => a.toString()).join(" ")));
  }

  /**
   * A wrapper of command.log
   */
  warn(message: string): void {
    this.log("");
    this.log(` ${chalk.red("›")} ${message}`);
    this.log("");
  }

  /**
   * A wrapper of command.log
   */
  nice(message: string): void {
    this.log("");
    this.log(` ${chalk.green("›")} ${message}`);
    this.log("");
  }

  /**
   * Wraps inquirer.input
   */
  async input(options: {
    message: string;
    filter?: (val: string) => Promise<string>;
    validate?: (val: string) => Promise<true | string>;
    default?: string;
  }): Promise<string> {
    options.filter = options.filter || (async (val) => val.trim());
    options.validate =
      options.validate ||
      (async (val) => val.trim().length > 0 || "Must not be empty.");
    return await input(options);
  }

  /**
   * Wraps inquirer.input password
   */
  async password(options: {
    message: string;
    filter?: (val: string) => Promise<string>;
    validate?: (val: string) => Promise<true | string>;
    default?: string;
  }): Promise<string> {
    options.filter = options.filter || (async (val) => val.trim());
    options.validate =
      options.validate ||
      (async (val) => val.trim().length > 0 || "Must not be empty.");
    (options as any).type = "password";
    (options as any).name = "input";
    (options as any).mask = true;
    return (await inquirer.prompt([options])).input;
  }

  /**
   * Wraps inquirer.input number
   */
  async number(options: {
    message: string;
    filter?: (val: string) => Promise<string>;
    validate?: (val: number) => Promise<true | string>;
    default?: number;
  }): Promise<number> {
    options.filter = options.filter || (async (val) => val);
    options.validate =
      options.validate ||
      (async (val) => val > 0 || "Must be larger than zero.");
    (options as any).type = "number";
    (options as any).name = "input";
    (options as any).mask = true;
    return (await inquirer.prompt([options])).input;
  }

  /**
   * Wraps inquirer.confirm
   */
  async confirm(options: {
    message: string;
    default?: boolean;
  }): Promise<boolean> {
    let result = await inquirer.prompt([
      {
        type: "confirm",
        name: "value",
        message: options.message,
        default: options.default,
      },
    ]);
    return result.value;
  }

  /**
   * Wraps inquirer.list
   */
  async list(options: {
    message: string;
    default?: string;
    choices?: any;
    pageSize?: number;
    loop?: boolean;
  }): Promise<string> {
    if (options.loop == undefined) {
      options.loop = false;
    }
    let result = await inquirer.prompt([
      {
        type: "list",
        name: "value",
        message: options.message,
        default: options.default,
        choices: options.choices,
        pageSize: options.pageSize,
        loop: options.loop,
      },
    ]);
    return result.value;
  }

  /**
   * Wraps inquirer.separator
   */
  listSeparator() {
    return new inquirer.Separator();
  }

  /**
   * Wraps cli.action.start
   */
  start(message: string) {
    this.spinning = true;
    cli.action.start(message);
  }

  /**
   * Wraps cli.action.stop
   */
  stop(message?: string) {
    this.spinning = false;
    cli.action.stop(message);
  }

  /**
   * Wraps cli.action.update
   */
  update(message: string) {
    if (cli.action.task) {
      cli.action.task.action = message;
    }
  }

  /**
   * Display banner/logo
   */
  displayBanner() {
    this.log(BANNER);
  }

  /**
   * There is a weird bug when you select options very fast.
   */
  workaroundListenersBugIDontWantToInvestigate() {
    // This happens only when you type fast when gathering settings
    require("events").EventEmitter.defaultMaxListeners = 100;
  }
}
let BANNER = `
   ____ _                 _  ____
  / ___| | ___  _   _  __| |/ ___|__ _ _ __ ___  _ __
 | |   | |/ _ \\| | | |/ _\` | |   / _\` | '_ \` _ \\| '_ \\
 | |___| | (_) | |_| | (_| | |__| (_| | | | | | | |_) |
  \\____|_|\\___/ \\__,_|\\__,_|\\____\\__,_|_| |_| |_| .__/
                                                |_|
`;
