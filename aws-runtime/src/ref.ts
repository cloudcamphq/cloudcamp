import * as cdk from "@aws-cdk/core";
import * as ssm from "@aws-cdk/aws-ssm";
import * as route53 from "@aws-cdk/aws-route53";
import * as certificatemanager from "@aws-cdk/aws-certificatemanager";
import * as rds from "@aws-cdk/aws-rds";

/**
 * AWS Systems Manager functions. Used to communicate IDs between stages and apps.
 *
 * @order 7
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

export class Ref extends cdk.Construct {
  private constructor(scope: cdk.Construct, id: string) {
    super(scope, id);
  }

  static addHostedZone(
    scope: cdk.Construct,
    id: string,
    hostedZone: route53.IHostedZone,
    props?: RefParameterProps
  ) {
    let global = new Ref(scope, id);
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
    scope: cdk.Construct,
    id: string,
    props?: RefParameterProps
  ): route53.IHostedZone {
    let global = new Ref(scope, id);
    let hostedZoneId = ssm.StringParameter.fromStringParameterName(
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
    scope: cdk.Construct,
    id: string,
    certificate: certificatemanager.ICertificate,
    props?: RefParameterProps
  ) {
    let global = new Ref(scope, id);
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
    scope: cdk.Construct,
    id: string,
    props?: RefParameterProps
  ): certificatemanager.ICertificate {
    let global = new Ref(scope, id);
    let certificateArn = ssm.StringParameter.fromStringParameterName(
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
    scope: cdk.Construct,
    id: string,
    serverlessCluster: rds.IServerlessCluster,
    props?: RefParameterProps
  ) {
    let global = new Ref(scope, id);
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
    scope: cdk.Construct,
    id: string,
    props?: RefParameterProps
  ): rds.IServerlessCluster {
    let global = new Ref(scope, id);
    let clusterIdentifier = ssm.StringParameter.fromStringParameterName(
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
