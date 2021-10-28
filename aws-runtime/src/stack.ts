import * as ssm from "@aws-cdk/aws-ssm";
import * as cdk from "@aws-cdk/core";
import { App } from "./app";
import { Stage } from "./stage";
import * as _ from "lodash";

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
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    let stackName =
      props?.stackName ||
      _.upperFirst(_.camelCase(App.instance.configuration.name + "-" + id));

    super(scope, id, { ...props, stackName: stackName });

    new ssm.StringParameter(this, "ssm-stack", {
      parameterName: `/cloudcamp/${
        App.instance.configuration.name
      }/_/stack/${_.kebabCase(stackName)}`,
      stringValue: stackName,
    });

    if (scope instanceof Stage) {
      scope.stack = this;
    }
  }
}
