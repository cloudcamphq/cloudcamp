import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as crypto from "crypto";

export interface ResolvedVariable {
  readonly variableType: "secret" | "plain" | "output";
  readonly stringValue?: string;
  readonly cfnOutputValue?: cdk.CfnOutput;
  readonly tokenValue?: string;
  readonly installCommands?: string[];
  readonly tempName?: string;
}

export abstract class Variable {
  /**
   * Resolve for simple cases (ECS)
   */
  abstract resolve(scope: Construct): string;

  /**
   * Resolve for actions, where some hacking is needed to work around
   * "Secrets Manager can't find the specified secret."
   */
  abstract resolveForAction(name: string, os: string): ResolvedVariable[];

  protected hasSameStage(
    constructA: Construct,
    constructB: Construct
  ): boolean {
    const stackA = cdk.Stack.of(constructA);
    const stackB = cdk.Stack.of(constructB);
    const stageA = cdk.Stage.of(stackA);
    const stageB = cdk.Stage.of(stackB);
    return stageA === stageB;
  }
}

export class CfnOutputVariable extends Variable {
  constructor(private output: cdk.CfnOutput, private value: string) {
    super();
  }

  resolve(scope: Construct): string {
    return this.hasSameStage(scope, this.output)
      ? this.value
      : this.output.importValue;
  }

  resolveForAction(_name: string, _os: string): ResolvedVariable[] {
    return [
      {
        variableType: "output",
        cfnOutputValue: this.output,
      },
    ];
  }
}

export class SecretVariable extends Variable {
  constructor(
    private origin: Construct,
    private name: string,
    private value: string
  ) {
    super();
  }

  resolve(scope: Construct): string {
    return this.hasSameStage(scope, this.origin)
      ? this.value
      : cdk.Fn.join("", [
          "{{resolve:secretsmanager:",
          this.name,
          ":SecretString:::}}",
        ]);
  }

  resolveForAction(_name: string, _os: string): ResolvedVariable[] {
    return [
      {
        variableType: "secret",
        stringValue: this.name,
      },
    ];
  }
}

export class DatabaseUrlVariable extends Variable {
  constructor(
    private origin: Construct,
    private engine: string,
    private username: string,
    private secretName: string,
    private secretValue: string,
    private host: string,
    private hostOutput: cdk.CfnOutput,
    private port: number,
    private database: string
  ) {
    super();
  }

  resolve(scope: Construct): string {
    return this.hasSameStage(scope, this.origin)
      ? `${this.engine}://${this.username}:${this.secretValue}@` +
          `${this.host}:${this.port}/${this.database}`
      : cdk.Fn.join("", [
          this.engine,
          "://",
          this.username,
          ":",
          cdk.Fn.join("", [
            "{{resolve:secretsmanager:",
            this.secretName,
            ":SecretString:::}}",
          ]),
          "@",
          this.hostOutput.importValue,
          ":",
          this.port.toString(),
          "/",
          this.database,
        ]);
  }

  resolveForAction(name: string, os: string): ResolvedVariable[] {
    const stack = cdk.Stack.of(this.hostOutput);
    const stackId = limitIdentifierLength(stack.artifactId, 100);
    const tmpPostfix = `${stackId}_${name}`;
    let installCommands: string[];

    switch (os) {
      case "windows":
        installCommands = [
          `set "${name}=${this.engine}://${this.username}:%DATABASE_SECRET_${tmpPostfix}%@"` +
            `%DATABASE_HOST_${tmpPostfix}%:${this.port}/${this.database}"`,
        ];
        break;
      case "linux":
      default:
        installCommands = [
          `export ${name}="${this.engine}://${this.username}:$DATABASE_SECRET_${tmpPostfix}@` +
            `$DATABASE_HOST_${tmpPostfix}:${this.port}/${this.database}"`,
        ];
        break;
    }
    return [
      {
        variableType: "output",
        cfnOutputValue: this.hostOutput,
        tempName: `DATABASE_HOST_${tmpPostfix}`,
      },
      {
        variableType: "secret",
        tempName: `DATABASE_SECRET_${tmpPostfix}`,
        stringValue: this.secretName,
        installCommands: installCommands,
      },
    ];
  }
}

function limitIdentifierLength(s: string, n: number): string {
  if (s.length <= n) {
    return s;
  }
  const h = hash(s).substr(0, 8);
  const mid = Math.floor((n - h.length) / 2);

  return s.substr(0, mid) + h + s.substr(s.length - mid);
}

function hash<A>(obj: A) {
  const d = crypto.createHash("sha256");
  d.update(JSON.stringify(obj));
  return d.digest("hex");
}

// export function classifyTokenType(value: any) {
//   const fragments = Tokenization.reverseString(value);
//   for (const token of fragments.tokens) {
//     if (token instanceof SecretValue) {
//       return BuildEnvironmentVariableType.SECRETS_MANAGER;
//     }
//   }
//   return BuildEnvironmentVariableType.PLAINTEXT;
// }
