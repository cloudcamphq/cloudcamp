import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

import { SecretValue, Tokenization } from "aws-cdk-lib";
import { BuildEnvironmentVariableType } from "aws-cdk-lib/aws-codebuild";

export class Variable {
  private output?: cdk.CfnOutput;
  private scope: Construct;
  private id: string;
  private value: string;

  constructor(scope: Construct, id: string, value: string) {
    this.scope = scope;
    this.id = id;
    this.value = value;
  }

  resolve() {
    if (!this.output) {
      this.output = new cdk.CfnOutput(this.scope, this.id, {
        value: this.value,
      });
    }
    return this.output!;
  }
}

export function classifyTokenType(value: any) {
  const fragments = Tokenization.reverseString(value);
  for (const token of fragments.tokens) {
    if (token instanceof SecretValue) {
      return BuildEnvironmentVariableType.SECRETS_MANAGER;
    }
  }
  return BuildEnvironmentVariableType.PLAINTEXT;
}
