import * as path from "path";
import { App } from "./app";
import _ = require("lodash");
import * as ec2 from "@aws-cdk/aws-ec2";
import * as logs from "@aws-cdk/aws-logs";
import * as ecs from "@aws-cdk/aws-ecs";
import * as route53 from "@aws-cdk/aws-route53";
import * as ecs_patterns from "@aws-cdk/aws-ecs-patterns";
import * as cdk from "@aws-cdk/core";
import * as elasticloadbalancingv2 from "@aws-cdk/aws-elasticloadbalancingv2";
import * as certificatemanager from "@aws-cdk/aws-certificatemanager";
import * as chatbot from "@aws-cdk/aws-chatbot";
import * as sns from "@aws-cdk/aws-sns";
import * as cloudwatch from "@aws-cdk/aws-cloudwatch";
import * as cloudwatch_actions from "@aws-cdk/aws-cloudwatch-actions";
import * as subscriptions from "@aws-cdk/aws-sns-subscriptions";
import * as applicationautoscaling from "@aws-cdk/aws-applicationautoscaling";
import { setDefaults } from "./utils";

// TODO add redirectHTTP
// TODO add multiple domains https://jeremynagel.medium.com/adding-multiple-certificates-to-a-applicationloadbalancedfargateservice-with-cdk-adc877e2831d
export interface WebServerProps {
  /**
   * The path to the Dockerfile to run.
   */
  readonly dockerfile: string;
  /**
   * The port exposed in the docker container.
   *
   * @default 80
   */
  readonly port?: number;
  /**
   * Environment variables.
   */
  readonly environment?: {
    [key: string]: string;
  };
  /**
   * TODO
   */
  readonly domain?: string;
  readonly domainName?: string;
  /**
   * The number of cpu units.
   *
   * Valid values, which determines your range of valid values for the memory parameter:
   *
   * - 256 (.25 vCPU) - Available memory values: 0.5GB, 1GB, 2GB
   * - 512 (.5 vCPU) - Available memory values: 1GB, 2GB, 3GB, 4GB
   * - 1024 (1 vCPU) - Available memory values: 2GB, 3GB, 4GB, 5GB, 6GB, 7GB,
   *   8GB
   * - 2048 (2 vCPU) - Available memory values: Between 4GB and 16GB in 1GB
   *   increments
   * - 4096 (4 vCPU) - Available memory values: Between 8GB and 30GB in 1GB
   *   increments
   *
   * @default 256
   */
  readonly cpu?: number;
  /**
   * The amount (in MiB) of memory.
   *
   * - 512 (0.5 GB), 1024 (1 GB), 2048 (2 GB) - Available cpu values: 256 (.25
   *   vCPU)
   * - 1024 (1 GB), 2048 (2 GB), 3072 (3 GB), 4096 (4 GB) - Available cpu
   *   values: 512 (.5 vCPU)
   * - 2048 (2 GB), 3072 (3 GB), 4096 (4 GB), 5120 (5 GB), 6144 (6 GB), 7168 (7
   *   GB), 8192 (8 GB) - Available cpu values: 1024 (1 vCPU)
   * - Between 4096 (4 GB) and 16384 (16 GB) in increments of 1024 (1 GB) -
   *   Available cpu values: 2048 (2 vCPU)
   * - Between 8192 (8 GB) and 30720 (30 GB) in increments of 1024 (1 GB) -
   *   Available cpu values: 4096 (4 vCPU)
   *
   * @default 512
   */
  readonly memory?: number;

  readonly vpc?: ec2.IVpc;
  readonly cluster?: ecs.Cluster;
  readonly desiredCount?: number;
  readonly domainZone?: route53.IHostedZone;
  readonly certificate?: certificatemanager.ICertificate;
  readonly healthCheckPath?: string;
}

export interface AlarmConfiguration {
  readonly duration?: number;
  readonly threshold?: number;
  readonly enabled?: boolean;
}

export interface SlackConfiguration {
  readonly workspaceId: string;
  readonly channelId: string;
}

export interface WebServerAlarmProps {
  readonly slack?: SlackConfiguration;
  readonly email?: string[];
  readonly sms?: string[];
  readonly http5xx?: AlarmConfiguration;
  readonly http4xx?: AlarmConfiguration;
  readonly rejected?: AlarmConfiguration;
  readonly slow?: AlarmConfiguration;
}

export interface ScalingSchedule extends applicationautoscaling.CronOptions {
  readonly id: string;
}

export interface ScheduleScalingProps {
  readonly min: number;
  readonly max: number;
  readonly schedule: ScalingSchedule[];
}

export interface MetricScalingProps {
  readonly min: number;
  readonly max: number;
  readonly cpu?: number;
  readonly memory?: number;
  readonly requestCount?: number;
}

/**
 * A scalable web server running one or more docker containers behind a load balancer.
 *
 *
 * `WebServer` runs any web application behing a load balancers as docker
 * containers. For example, this runs a web application as a single container
 * exposed on port 8080:
 *
 * ```ts
 * void 0;
 * import { App, WebServer } from "@cloudcamp/aws-runtime";
 * let app = new App();
 * void 'show';
 * new WebServer(app.production, "prod-web", {
 *   dockerfile: "../Dockerfile",
 *   port: 8080
 * });
 * ```
 * @order 4
 */
export class WebServer extends cdk.Construct {
  /**
   * Initialize a new web server.
   *
   * *Examples:*
   *
   * To use your own domain and serve traffic via SSL, use the `domain`
   * and `ssl` properties:
   * ```ts
   * void 0;
   * import { App, WebServer } from "@cloudcamp/aws-runtime";
   * let app = new App();
   * void 'show';
   *
   * new WebServer(app.production, "prod", {
   *   dockerfile: "../Dockerfile",
   *   domain: "example.com",
   *   ssl: true
   * });
   * ```
   *
   * See `{@link "command/domain-create" | domain:create}` and
   * `{@link "command/cert-create" | cert:create}` for more information on
   * setting up domains/SSL.
   *
   * @remarks During initialization you can configure: Custom domains, SSL,
   * machine configuration, health checks and the default number of instances.
   *
   * @param scope the parent, i.e. a stack
   * @param id a unique identifier within the parent scope
   * @param props the properties of WebServer
   *
   * @topic Initialization
   */
  constructor(scope: cdk.Construct, id: string, props: WebServerProps) {
    super(scope, id);

    let appName = App.instance.configuration.name;

    let cluster: ecs.Cluster;
    if (props.cluster === undefined) {
      // Either use the provided vpc or the default
      let vpc =
        props.vpc ||
        ec2.Vpc.fromLookup(this, "vpc", {
          vpcId: App.instance.configuration.vpcId,
        });

      cluster = new ecs.Cluster(this, "ecs-cluster", { vpc: vpc });
    } else {
      cluster = props.cluster;
    }

    let logGroup = new logs.LogGroup(this, "log-group", {
      logGroupName: `/${appName}/webserver/${id}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.fargateService =
      new ecs_patterns.ApplicationLoadBalancedFargateService(
        this,
        "fargate-service",
        {
          cluster: cluster,
          cpu: props.cpu,
          memoryLimitMiB: props.memory,
          desiredCount: props.desiredCount,
          assignPublicIp: true,
          publicLoadBalancer: true,
          domainZone: props.domainZone,
          domainName: props.domainName,
          certificate: props.certificate,
          redirectHTTP: props.certificate ? true : false,
          serviceName: id,
          protocol: props.certificate
            ? elasticloadbalancingv2.ApplicationProtocol.HTTPS
            : elasticloadbalancingv2.ApplicationProtocol.HTTP,
          taskImageOptions: {
            image: ecs.ContainerImage.fromAsset(
              path.dirname(props.dockerfile),
              {
                file: path.basename(props.dockerfile),

                // exclude is deprecated, but this seems to be just a
                // side-effect of internal refactoring
                // https://github.com/aws/aws-cdk/issues/10125
                exclude: ["cdk.out"],
              }
            ),
            containerPort: props.port || 80,
            enableLogging: true,
            logDriver: ecs.LogDriver.awsLogs({
              streamPrefix: "ecs",
              logGroup: logGroup,
            }),
            environment: props.environment,
          },
        }
      );

    if (props.healthCheckPath) {
      this.fargateService.targetGroup.configureHealthCheck({
        path: props.healthCheckPath,
        port: (props.port || 80).toString(),
      });
    }
  }

  fargateService: ecs_patterns.ApplicationLoadBalancedFargateService;

  scaleOnSchedule(props: ScheduleScalingProps) {
    let task = this.fargateService.service.autoScaleTaskCount({
      minCapacity: props.min,
      maxCapacity: props.max,
    });
    for (let schedule of props.schedule) {
      task.scaleOnSchedule(schedule.id, {
        schedule: applicationautoscaling.Schedule.cron(schedule),
      });
    }
  }

  scaleOnMetric(props: MetricScalingProps) {
    let task = this.fargateService.service.autoScaleTaskCount({
      minCapacity: props.min,
      maxCapacity: props.max,
    });
    if (props.cpu !== undefined) {
      task.scaleOnCpuUtilization("autoscale-cpu", {
        targetUtilizationPercent: props.cpu,
      });
    }

    if (props.memory !== undefined) {
      task.scaleOnMemoryUtilization("autoscale-memory", {
        targetUtilizationPercent: props.memory,
      });
    }

    if (props.requestCount !== undefined) {
      task.scaleOnRequestCount("autoscale-request-count", {
        requestsPerTarget: props.requestCount,
        targetGroup: this.fargateService.targetGroup,
      });
    }
  }

  addAlarms(props?: WebServerAlarmProps) {
    props = setDefaults(props, {
      slack: undefined,
      emails: [],
      phones: [],
      http5xx: {
        duration: 1,
        threshold: 1,
        enabled: true,
      },
      http4xx: {
        duration: 1,
        threshold: 5,
        enabled: true,
      },
      rejected: {
        duration: 1,
        threshold: 5,
        enabled: true,
      },
      slow: {
        duration: 1,
        threshold: 5,
        enabled: true,
      },
    });

    let appName = App.instance.configuration.name;

    let topic = new sns.Topic(this, "web-service-alarms-topic", {
      displayName: "Web service Alarms Topic",
    });

    if (props.slack !== undefined) {
      new chatbot.SlackChannelConfiguration(this, "slack-channel", {
        slackChannelConfigurationName: "Slack Alarms Channel",
        slackWorkspaceId: props.slack.workspaceId,
        slackChannelId: props.slack.channelId,
        notificationTopics: [topic],
        loggingLevel: chatbot.LoggingLevel.INFO, // TODO should be ERROR?
      });
    }

    for (let email of props.email as string[]) {
      topic.addSubscription(new subscriptions.EmailSubscription(email));
    }

    for (let sms of props.sms as string[]) {
      topic.addSubscription(new subscriptions.SmsSubscription(sms));
    }

    if (props?.http5xx?.enabled) {
      this.addHttpAlarm(
        "HTTP_5XX",
        `${appName}/${this.node.id}: HTTP 5XX threshold exceeded`,
        topic,
        props?.http5xx?.threshold as number,
        props?.http5xx?.duration as number
      );
    }

    if (props?.http4xx?.enabled) {
      this.addHttpAlarm(
        "HTTP_4XX",
        `${appName}/${this.node.id}: HTTP 4XX threshold exceeded`,
        topic,
        props?.http4xx?.threshold as number,
        props?.http4xx?.duration as number
      );
    }

    if (props?.rejected?.enabled) {
      this.addRejectedAlarm(
        topic,
        props?.rejected?.threshold as number,
        props?.rejected?.duration as number
      );
    }

    if (props?.slow?.enabled) {
      this.addSlowAlarm(
        topic,
        props?.slow?.threshold as number,
        props?.slow?.duration as number
      );
    }
  }

  private addHttpAlarm(
    name: "HTTP_5XX" | "HTTP_4XX",
    description: string,
    topic: sns.ITopic,
    threshold: number,
    period: number
  ) {
    let elbCode: elasticloadbalancingv2.HttpCodeElb;
    switch (name) {
      case "HTTP_5XX":
        elbCode = elasticloadbalancingv2.HttpCodeElb.ELB_5XX_COUNT;
        break;
      case "HTTP_4XX":
        elbCode = elasticloadbalancingv2.HttpCodeElb.ELB_4XX_COUNT;
        break;
    }

    let elbAlarm = new cloudwatch.Alarm(
      this,
      _.kebabCase(name + "-elb-alarm"),
      {
        alarmName: name,
        alarmDescription: description,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        threshold: threshold,
        evaluationPeriods: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        metric: this.fargateService.loadBalancer.metricHttpCodeElb(elbCode, {
          period: cdk.Duration.minutes(period),
          statistic: "Sum",
          dimensions: {
            LoadBalancer: this.fargateService.loadBalancer.loadBalancerFullName,
          },
        }),
      }
    );
    elbAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(topic));
    elbAlarm.addOkAction(new cloudwatch_actions.SnsAction(topic));

    let targetCode: elasticloadbalancingv2.HttpCodeTarget;
    switch (name) {
      case "HTTP_5XX":
        targetCode = elasticloadbalancingv2.HttpCodeTarget.TARGET_5XX_COUNT;
        break;
      case "HTTP_4XX":
        targetCode = elasticloadbalancingv2.HttpCodeTarget.TARGET_4XX_COUNT;
        break;
    }

    let targetAlarm = new cloudwatch.Alarm(
      this,
      _.kebabCase(name + "-target-alarm"),
      {
        alarmName: name,
        alarmDescription: description,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        threshold: threshold,
        evaluationPeriods: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        metric: this.fargateService.loadBalancer.metricHttpCodeTarget(
          targetCode,
          {
            period: cdk.Duration.minutes(period),
            statistic: "Sum",
            dimensions: {
              LoadBalancer:
                this.fargateService.loadBalancer.loadBalancerFullName,
            },
          }
        ),
      }
    );
    targetAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(topic));
    targetAlarm.addOkAction(new cloudwatch_actions.SnsAction(topic));
  }

  private addRejectedAlarm(
    topic: sns.ITopic,
    threshold: number,
    period: number
  ) {
    let appName = App.instance.configuration.name;
    let alarm = new cloudwatch.Alarm(this, "rejected-connections-alarm", {
      alarmName: "REJECTED",
      alarmDescription: `${appName}/${this.node.id}: Rejected connections threshold exceeded`,
      comparisonOperator:
        cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      threshold: threshold,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      metric: this.fargateService.loadBalancer.metricRejectedConnectionCount({
        period: cdk.Duration.minutes(period),
        statistic: "Sum",
        dimensions: {
          LoadBalancer: this.fargateService.loadBalancer.loadBalancerFullName,
        },
      }),
    });
    alarm.addAlarmAction(new cloudwatch_actions.SnsAction(topic));
    alarm.addOkAction(new cloudwatch_actions.SnsAction(topic));
  }

  private addSlowAlarm(topic: sns.ITopic, threshold: number, period: number) {
    let appName = App.instance.configuration.name;
    let alarm = new cloudwatch.Alarm(this, "rejected-connections-alarm", {
      alarmName: "REJECTED",
      alarmDescription: `${appName}/${this.node.id}: Rejected connections threshold exceeded`,
      comparisonOperator:
        cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      threshold: threshold,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      metric: this.fargateService.loadBalancer.metricTargetResponseTime({
        period: cdk.Duration.minutes(period),
        statistic: "Sum",
        dimensions: {
          LoadBalancer: this.fargateService.loadBalancer.loadBalancerFullName,
        },
      }),
    });
    alarm.addAlarmAction(new cloudwatch_actions.SnsAction(topic));
    alarm.addOkAction(new cloudwatch_actions.SnsAction(topic));
  }
}
