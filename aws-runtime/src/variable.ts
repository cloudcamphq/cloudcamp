import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as crypto from "crypto";

export interface ResolvedVariable {
  readonly variableType: "secret" | "plain" | "output";
  readonly value: string;
  readonly cfnOutputValue?: cdk.CfnOutput;
  readonly installCommands?: string[];
  readonly tempName?: string;
}

export abstract class Variable {
  abstract resolve(
    scope: Construct,
    name: string,
    os: string
  ): ResolvedVariable[];

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

  resolve(scope: Construct, _name: string, _os: string): ResolvedVariable[] {
    if (this.hasSameStage(scope, this.output)) {
      return [
        {
          variableType: "plain",
          value: this.value,
        },
      ];
    } else {
      return [
        {
          variableType: "output",
          value: this.output.importValue,
          cfnOutputValue: this.output,
        },
      ];
    }
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

  resolve(scope: Construct, _name: string, _os: string): ResolvedVariable[] {
    if (this.hasSameStage(scope, this.origin)) {
      return [
        {
          variableType: "plain",
          value: this.value,
        },
      ];
    } else {
      return [
        {
          variableType: "secret",
          value: this.name,
        },
      ];
    }
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

  resolve(scope: Construct, name: string, os: string): ResolvedVariable[] {
    if (this.hasSameStage(scope, this.origin)) {
      return [
        {
          variableType: "plain",
          value:
            `${this.engine}://${this.username}:${this.secretValue}@` +
            `${this.host}:${this.port}/${this.database}`,
        },
      ];
    } else {
      let stack = cdk.Stack.of(this.hostOutput);
      const stackId = limitIdentifierLength(stack.artifactId, 100);
      let tmpPostfix = `${stackId}_${name}`;
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
          value: this.hostOutput.importValue,
          cfnOutputValue: this.hostOutput,
          tempName: `DATABASE_HOST_${tmpPostfix}`,
        },
        {
          variableType: "secret",
          value: this.secretName,
          tempName: `DATABASE_SECRET_${tmpPostfix}`,
          installCommands: installCommands,
        },
      ];
    }
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
