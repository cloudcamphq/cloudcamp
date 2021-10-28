import * as cdk from "@aws-cdk/core";
import * as rds from "@aws-cdk/aws-rds";
import * as ec2 from "@aws-cdk/aws-ec2";
import { Duration } from "@aws-cdk/core";
import * as secretsmanager from "@aws-cdk/aws-secretsmanager";
import { App } from "./app";
import {
  AuroraMysqlEngineVersion,
  AuroraPostgresEngineVersion,
} from "@aws-cdk/aws-rds";

// TODO logs
// TODO alerts
// TODO how to change password?
// TODO how to run scripts to create databases

// Needs a private subnet
// https://github.com/aws/aws-cdk/issues/7062

type DatabaseCapacity = 1 | 2 | 4 | 8 | 16 | 32 | 64 | 128 | 192 | 256 | 384;

export interface DatabaseProps {
  readonly engine: "mysql" | "postgres";
  readonly databaseName?: string;
  readonly username?: string;
  readonly vpc?: ec2.IVpc;
  readonly autoPause?: number;
  readonly minCapacity?: DatabaseCapacity;
  readonly maxCapacity?: DatabaseCapacity;
}

export interface DatabaseVariables {
  readonly databaseUrl: string;
  readonly databaseName: string;
  readonly databaseUsername: string;
  readonly databasePassword: string;
  readonly databaseHost: string;
  readonly databasePort: string;
  readonly databaseType: string;
}

/**
 * @order 5
 */
export class Database extends cdk.Construct {
  cluster: rds.IServerlessCluster;

  env: DatabaseVariables;

  /**
   *
   * @param scope the scope
   * @param id  the id
   * @param props the props
   */
  constructor(scope: cdk.Construct, id: string, props: DatabaseProps) {
    super(scope, id);

    let engine: rds.IClusterEngine;
    let type: string;
    let port: number;

    switch (props.engine) {
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

    const secret = new secretsmanager.Secret(this, "cluster-secret", {
      generateSecretString: {
        excludePunctuation: true,
      },
    });

    const password = secret.secretValue;
    const databaseName = props.databaseName || "maindb";

    let vpc =
      props.vpc ||
      ec2.Vpc.fromLookup(this, "vpc", {
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

    let host = this.cluster.clusterEndpoint.hostname;

    this.env = {
      databaseUrl: `${type}://${username}:${password}@${host}:${port}/${databaseName}`,
      databaseName: databaseName,
      databaseUsername: username,
      databasePassword: password.toString(),
      databaseHost: host,
      databasePort: `${port}`,
      databaseType: type,
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
