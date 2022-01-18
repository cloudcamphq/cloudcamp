import * as cdk from "aws-cdk-lib";
import * as rds from "aws-cdk-lib/aws-rds";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Duration } from "aws-cdk-lib";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { App } from "./app";
import {
  CfnOutputVariable,
  DatabaseUrlVariable,
  SecretVariable,
  Variable,
} from "./variable";

import {
  AuroraMysqlEngineVersion,
  AuroraPostgresEngineVersion,
} from "aws-cdk-lib/aws-rds";
import { Construct } from "constructs";
import * as _ from "lodash";
import { withUniqueOutputExportName } from "./utils";
// TODO logs
// TODO alerts
// TODO how to change password?
// TODO how to run scripts to create databases

// Needs a private subnet
// https://github.com/aws/aws-cdk/issues/7062

type DatabaseCapacity = 1 | 2 | 4 | 8 | 16 | 32 | 64 | 128 | 192 | 256 | 384;

export interface DatabaseProps {
  /**
   * @default "postgres"
   */
  readonly engine?: "mysql" | "postgres";
  readonly secretName?: string;
  readonly databaseName?: string;
  readonly username?: string;
  readonly autoPause?: number;
  readonly minCapacity?: DatabaseCapacity;
  readonly maxCapacity?: DatabaseCapacity;
}

export interface DatabaseVariables {
  readonly url: Variable;
  readonly database: string;
  readonly username: string;
  readonly password: Variable;
  readonly port: string;
  readonly engine: string;
  readonly host: Variable;
}

/**
 * @order 5
 */
export class Database extends Construct {
  cluster: rds.IServerlessCluster;

  hostOutput: cdk.CfnOutput;
  secretNameOutput: cdk.CfnOutput;

  vars: DatabaseVariables;

  /**
   *
   * @param scope the scope
   * @param id  the id
   * @param props the props
   */
  constructor(scope: Construct, id: string, props?: DatabaseProps) {
    super(scope, id);

    let engine: rds.IClusterEngine;
    let type: string;
    let port: number;

    props = props || {};

    switch (props.engine) {
      case undefined:
      case "postgres":
        engine = rds.DatabaseClusterEngine.auroraPostgres({
          version: AuroraPostgresEngineVersion.VER_10_14,
        });
        type = "postgres";
        port = 5432;
        break;
      case "mysql":
        engine = rds.DatabaseClusterEngine.auroraMysql({
          version: AuroraMysqlEngineVersion.VER_5_7_12,
        });
        type = "mysql";
        port = 3306;
        break;
    }

    const username = props.username || "administrator";
    let secret: secretsmanager.ISecret;

    let secretName: string;

    if (props.secretName) {
      secretName = props.secretName;
      secret = secretsmanager.Secret.fromSecretNameV2(
        this,
        "cluster-secret",
        props.secretName
      );
    } else {
      const stack = cdk.Stack.of(scope);
      const appName = App.instance.configuration.name;
      secretName = _.camelCase(`${appName}-${stack.artifactId}-${id}-secret`);
      secret = new secretsmanager.Secret(this, "cluster-secret", {
        generateSecretString: { excludePunctuation: true },
        secretName: secretName,
      });
    }

    const password = secret.secretValue;
    const databaseName = props.databaseName || "maindb";

    const vpc = ec2.Vpc.fromLookup(this, "vpc", {
      vpcId: App.instance.configuration.vpcId,
    });

    const securityGroup = new ec2.SecurityGroup(this, "security-group", {
      vpc,
      allowAllOutbound: true,
    });
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(port));

    this.cluster = new rds.ServerlessCluster(this, "cluster", {
      engine: engine,
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      scaling: {
        autoPause: Duration.minutes(props.autoPause || 0),
        minCapacity: this.getCapacity(props.minCapacity),
        maxCapacity: this.getCapacity(props.maxCapacity),
      },
      deletionProtection: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      defaultDatabaseName: databaseName,
      securityGroups: [securityGroup],
      credentials: {
        username: username,
        password: password,
      },
    });

    const host = this.cluster.clusterEndpoint.hostname;

    this.hostOutput = withUniqueOutputExportName(
      new cdk.CfnOutput(this, "host-output", { value: host })
    );

    this.secretNameOutput = withUniqueOutputExportName(
      new cdk.CfnOutput(this, "secret-name-output", {
        value: secretName,
      })
    );

    this.vars = {
      password: new SecretVariable(
        this,
        secretName,
        secret.secretValue.toString()
      ),
      database: databaseName,
      username: username,
      host: new CfnOutputVariable(this.hostOutput, host),
      port: `${port}`,
      engine: type,
      url: new DatabaseUrlVariable(
        this,
        props.engine || "postgres",
        username,
        secretName,
        secret.secretValue.toString(),
        host,
        this.hostOutput,
        port,
        databaseName
      ),
    };
  }

  private getCapacity(capacity?: DatabaseCapacity) {
    switch (capacity) {
      case undefined:
        return rds.AuroraCapacityUnit.ACU_2;
      case 1:
        return rds.AuroraCapacityUnit.ACU_1;
      case 2:
        return rds.AuroraCapacityUnit.ACU_2;
      case 4:
        return rds.AuroraCapacityUnit.ACU_4;
      case 8:
        return rds.AuroraCapacityUnit.ACU_1;
      case 16:
        return rds.AuroraCapacityUnit.ACU_16;
      case 32:
        return rds.AuroraCapacityUnit.ACU_32;
      case 64:
        return rds.AuroraCapacityUnit.ACU_64;
      case 128:
        return rds.AuroraCapacityUnit.ACU_128;
      case 192:
        return rds.AuroraCapacityUnit.ACU_192;
      case 256:
        return rds.AuroraCapacityUnit.ACU_256;
      case 384:
        return rds.AuroraCapacityUnit.ACU_384;
      default:
        throw new Error(`Unsupported database capacity: ${capacity}`);
    }
  }
}
