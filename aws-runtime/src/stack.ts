import * as ssm from "aws-cdk-lib/aws-ssm";
import * as cdk from "aws-cdk-lib";
import { App } from "./app";
import { Stage } from "./stage";
import * as _ from "lodash";
import { Construct } from "constructs";
import { makeSsmPath } from "./utils";

/**
 * Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus in convallis
 * libero. Ut mattis massa quis dui consequat gravida. Maecenas tincidunt
 * euismod metus vitae ornare. Phasellus non sapien tempor, mollis orci vel,
 * faucibus quam. Mauris vel ligula sit amet lacus maximus vulputate. Nunc
 * tincidunt dolor vehicula neque porta lobortis. Vivamus nec viverra magna. Sed
 * diam massa, accumsan ut placerat vel, facilisis ut dui.
 *
 * @order 2
 */
export class Stack extends cdk.Stack {
  stage!: Stage;

  constructor(scope: Construct, id: string) {
    const stackName = _.upperFirst(
      _.camelCase(App.instance.configuration.name + "-" + id)
    );
    super(scope, id, { stackName: stackName });

    if (scope instanceof Stage) {
      this.stage = scope;
    }

    new ssm.StringParameter(this, "ssm-stack", {
      parameterName: makeSsmPath(
        App.instance.configuration.name,
        "stack",
        stackName
      ),
      stringValue: stackName,
    });

    if (scope instanceof Stage) {
      scope.stack = this;
    }
  }
}
