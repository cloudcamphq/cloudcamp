import * as ssm from "aws-cdk-lib/aws-ssm";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as certificatemanager from "aws-cdk-lib/aws-certificatemanager";
import { Construct } from "constructs";
import { App } from ".";
import { makeSsmPath } from "./utils";

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

  static getPrivateHostedZone(
    scope: Construct,
    id: string
  ): route53.IHostedZone {
    let appName = App.instance.configuration.name;
    const global = new Ref(scope, id);
    const hostedZoneId = ssm.StringParameter.fromStringParameterName(
      global,
      "parameter",
      makeSsmPath(appName, "private-hosted-zone")
    ).stringValue;
    return route53.HostedZone.fromHostedZoneAttributes(global, "construct", {
      hostedZoneId: hostedZoneId,
      zoneName: "local",
    });
  }

  static getHostedZone(
    scope: Construct,
    id: string,
    domain: string
  ): route53.IHostedZone {
    const global = new Ref(scope, id);
    const hostedZoneId = ssm.StringParameter.fromStringParameterName(
      global,
      "parameter",
      makeSsmPath("global", "hosted-zone", domain)
    ).stringValue;
    return route53.HostedZone.fromHostedZoneAttributes(global, "construct", {
      hostedZoneId: hostedZoneId,
      zoneName: domain,
    });
  }

  static getCertificate(
    scope: Construct,
    id: string,
    domain: string
  ): certificatemanager.ICertificate {
    const global = new Ref(scope, id);
    const certificateArn = ssm.StringParameter.fromStringParameterName(
      global,
      "parameter",
      makeSsmPath("global", "certificate", domain)
    ).stringValue;
    return certificatemanager.Certificate.fromCertificateArn(
      global,
      "construct",
      certificateArn
    );
  }
}
