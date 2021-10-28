import * as cdk from "@aws-cdk/core";
// import * as _ from "lodash";
import { App } from "./app";
// import * as ssm from "@aws-cdk/aws-ssm";
import { Stack } from "./stack";

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

  constructor(scope: cdk.Construct, id: string, props?: cdk.StageProps) {
    super(scope, id, {
      ...props,
      env: props?.env || {
        account: App.instance.configuration.account,
        region: App.instance.configuration.region,
      },
    });

    // this.stack =
    //   props?.stack == undefined
    //     ? new cdk.Stack(this, _.kebabCase(id), {
    //         stackName: _.upperFirst(
    //           _.camelCase(App.instance.configuration.name + "-" + id)
    //         ),
    //       })
    //     : props.stack;
    // new ssm.StringParameter(this.stack, "ssm-stack", {
    //   parameterName: `/cloudcamp/${
    //     App.instance.configuration.name
    //   }/_/stack/${_.kebabCase(this.stack.stackName)}`,
    //   stringValue: this.stack.stackName,
    // });
  }
}
