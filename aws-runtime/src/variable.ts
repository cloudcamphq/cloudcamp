import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

import { SecretValue, Tokenization } from "aws-cdk-lib";
import { BuildEnvironmentVariableType } from "aws-cdk-lib/aws-codebuild";

export class Variable {
  private output: cdk.CfnOutput;

  constructor(scope: Construct, id: string, value: string) {
    this.output = new cdk.CfnOutput(scope, id, { value: value });
  }

  resolve() {
    return this.output;
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

// resolveToBuildVar(scope: Construct, id: string) {
//   const v = this.resolve(scope, id);
//   return {
//     type: classifyTokenType(v),
//     value: v,
//   };
// }
