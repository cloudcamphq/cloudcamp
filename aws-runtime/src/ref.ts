import * as ssm from "aws-cdk-lib/aws-ssm";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as certificatemanager from "aws-cdk-lib/aws-certificatemanager";
import * as rds from "aws-cdk-lib/aws-rds";
import { Construct } from "constructs";

/**
 * AWS Systems Manager functions. Used to communicate IDs between stages and apps.
 *
 * @order 7
 * @ignore
 */
class SSM {
  /**
   * Return the parameter name
   */
  static parameter(
    type: string,
    id: string,
    appName?: string,
    name?: string
  ): string {
    return `/cloudcamp/${appName || "global"}/${type}/${name || id}`;
  }
}

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

  static addHostedZone(
    scope: Construct,
    id: string,
    hostedZone: route53.IHostedZone,
    props?: RefParameterProps
  ) {
    const global = new Ref(scope, id);
    new ssm.StringParameter(global, "parameter", {
      parameterName: SSM.parameter(
        "hosted-zone",
        id,
        props?.appName,
        props?.name
      ),
      stringValue: hostedZone.hostedZoneId,
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
      SSM.parameter("hosted-zone", id, props?.appName, props?.name)
    ).stringValue;
    return route53.HostedZone.fromHostedZoneId(
      global,
      "construct",
      hostedZoneId
    );
  }

  static addCertificate(
    scope: Construct,
    id: string,
    certificate: certificatemanager.ICertificate,
    props?: RefParameterProps
  ) {
    const global = new Ref(scope, id);
    new ssm.StringParameter(global, "parameter", {
      parameterName: SSM.parameter(
        "certificate",
        id,
        props?.appName,
        props?.name
      ),
      stringValue: certificate.certificateArn,
    });
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
      SSM.parameter("certificate", id, props?.appName, props?.name)
    ).stringValue;
    return certificatemanager.Certificate.fromCertificateArn(
      global,
      "construct",
      certificateArn
    );
  }

  static addServerlessCluster(
    scope: Construct,
    id: string,
    serverlessCluster: rds.IServerlessCluster,
    props?: RefParameterProps
  ) {
    const global = new Ref(scope, id);
    new ssm.StringParameter(global, "parameter", {
      parameterName: SSM.parameter(
        "serverless-cluster",
        id,
        props?.appName,
        props?.name
      ),
      stringValue: serverlessCluster.clusterIdentifier,
    });
  }

  static getServerlessCluster(
    scope: Construct,
    id: string,
    props?: RefParameterProps
  ): rds.IServerlessCluster {
    const global = new Ref(scope, id);
    const clusterIdentifier = ssm.StringParameter.fromStringParameterName(
      global,
      "parameter",
      SSM.parameter("serverless-cluster", id, props?.appName, props?.name)
    ).stringValue;
    return rds.ServerlessCluster.fromServerlessClusterAttributes(
      global,
      "construct",
      { clusterIdentifier: clusterIdentifier }
    );
  }
}
