import * as cdk from "aws-cdk-lib";
import { App } from "./app";
import { Stack } from "./stack";
import { Construct } from "constructs";

/**
 * @order 3
 */
export class Stage extends cdk.Stage {
  stack!: Stack;

  private _needsManualApproval = false;

  set needsManualApproval(value: boolean) {
    this._needsManualApproval = value;
  }

  get needsManualApproval(): boolean {
    return this._needsManualApproval;
  }

  constructor(scope: Construct, id: string) {
    super(scope, id, {
      env: {
        account: App.instance.configuration.account,
        region: App.instance.configuration.region,
      },
    });
  }
}
