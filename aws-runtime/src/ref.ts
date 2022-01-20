import * as ssm from "aws-cdk-lib/aws-ssm";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as certificatemanager from "aws-cdk-lib/aws-certificatemanager";
import { Construct } from "constructs";
import { App } from ".";

/**
 * AWS Systems Manager functions. Used to communicate IDs between stages and apps.
 *
 * @order 7
 * @ignore
 */

export interface RefParameterProps {
  readonly appName?: string;
  readonly name?: string;
}

/**
 * @ignore
 */
export class Ref extends Construct {
  private constructor(scope: Construct, id: string) {
    super(scope, id);
  }

  /**
   * Return the parameter name
   */
  private static parameter(
    type: string,
    id: string,
    appName?: string,
    name?: string
  ): string {
    return `/cloudcamp/${appName || "global"}/${type}/${name || id}`;
  }

  static getPrivateHostedZone(
    scope: Construct,
    id: string
  ): route53.IHostedZone {
    let appName = App.instance.configuration.name;
    const global = new Ref(scope, id);
    const hostedZoneId = ssm.StringParameter.fromStringParameterName(
      global,
      "parameter",
      `/cloudcamp/${appName}/_/private-hosted-zone`
    ).stringValue;
    return route53.HostedZone.fromHostedZoneAttributes(global, "construct", {
      hostedZoneId: hostedZoneId,
      zoneName: "local",
    });
  }

  static getHostedZone(
    scope: Construct,
    id: string,
    props?: RefParameterProps
  ): route53.IHostedZone {
    const global = new Ref(scope, id);
    const hostedZoneId = ssm.StringParameter.fromStringParameterName(
      global,
      "parameter",
      Ref.parameter("hosted-zone", id, props?.appName, props?.name)
    ).stringValue;
    return route53.HostedZone.fromHostedZoneId(
      global,
      "construct",
      hostedZoneId
    );
  }

  static getCertificate(
    scope: Construct,
    id: string,
    props?: RefParameterProps
  ): certificatemanager.ICertificate {
    const global = new Ref(scope, id);
    const certificateArn = ssm.StringParameter.fromStringParameterName(
      global,
      "parameter",
      Ref.parameter("certificate", id, props?.appName, props?.name)
    ).stringValue;
    return certificatemanager.Certificate.fromCertificateArn(
      global,
      "construct",
      certificateArn
    );
  }
}
