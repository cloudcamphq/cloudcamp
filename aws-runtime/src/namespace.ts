import * as servicediscovery from "aws-cdk-lib/aws-servicediscovery";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { App } from ".";

export class PrivateNamespace extends Construct {
  private constructor(scope: Construct, id: string) {
    super(scope, id);
  }

  static getPrivateNamespace(
    scope: Construct,
    id: string
  ): servicediscovery.PrivateDnsNamespace {
    let namespace = new PrivateNamespace(scope, id);
    let appName = App.instance.configuration.name;

    let param = ssm.StringListParameter.fromStringListParameterName(
      namespace,
      "parameter",
      `/cloudcamp/${appName}/_/private-namespace`
    );

    let [namespaceId, namespaceArn, namespaceName] = param.stringListValue;

    return servicediscovery.PrivateDnsNamespace.fromPrivateDnsNamespaceAttributes(
      namespace,
      "namespace",
      {
        namespaceId: namespaceId,
        namespaceArn: namespaceArn,
        namespaceName: namespaceName,
      }
    ) as servicediscovery.PrivateDnsNamespace;
  }
}
