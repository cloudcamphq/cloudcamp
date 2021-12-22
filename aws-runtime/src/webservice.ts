import * as path from "path";
import { App } from "./app";
import _ = require("lodash");
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as logs from "aws-cdk-lib/aws-logs";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns";
import * as cdk from "aws-cdk-lib";
import * as elasticloadbalancingv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as chatbot from "aws-cdk-lib/aws-chatbot";
import * as sns from "aws-cdk-lib/aws-sns";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as cloudwatch_actions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as applicationautoscaling from "aws-cdk-lib/aws-applicationautoscaling";
import { setDefaults } from "./utils";
import { ICertificate } from "aws-cdk-lib/aws-certificatemanager";
import { Ref } from ".";
import { Construct } from "constructs";
import { Variable } from "./variable";
// import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";

// TODO add redirectHTTP
// TODO add multiple domains https://jeremynagel.medium.com/adding-multiple-certificates-to-a-applicationloadbalancedfargateservice-with-cdk-adc877e2831d
export interface WebServiceProps {
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
    [key: string]: string | Variable;
  };
  /**
   * TODO
   */
  readonly domain?: string;
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

  readonly desiredCount?: number;
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

export interface WebServiceAlarmProps {
  readonly slack?: SlackConfiguration;
  readonly email?: string[];
  readonly sms?: string[];
  readonly http5xx?: AlarmConfiguration;
  readonly http4xx?: AlarmConfiguration;
  readonly rejected?: AlarmConfiguration;
  readonly slow?: AlarmConfiguration;
}

export interface ScalingSchedule {
  readonly id: string;
  /**
   * The minute to run this rule at.
   *
   * @default - Every minute
   */
  readonly minute?: string;
  /**
   * The hour to run this rule at.
   *
   * @default - Every hour
   */
  readonly hour?: string;
  /**
   * The day of the month to run this rule at.
   *
   * @default - Every day of the month
   */
  readonly day?: string;
  /**
   * The month to run this rule at.
   *
   * @default - Every month
   */
  readonly month?: string;
  /**
   * The year to run this rule at.
   *
   * @default - Every year
   */
  readonly year?: string;
  /**
   * The day of the week to run this rule at.
   *
   * @default - Any day of the week
   */
  readonly weekDay?: string;
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
 * `WebService` runs any web application behing a load balancers as docker
 * containers. For example, this runs a web application as a single container
 * exposed on port 8080:
 *
 * ```ts
 * void 0;
 * import { App, WebService } from "@cloudcamp/aws-runtime";
 * let app = new App();
 * void 'show';
 * new WebService(app.production, "prod-web", {
 *   dockerfile: "../Dockerfile",
 *   port: 8080
 * });
 * ```
 * @order 4
 */
export class WebService extends Construct {
  /**
   * Initialize a new web service.
   *
   * *Examples:*
   *
   * To use your own domain and serve traffic via SSL, use the `domain`
   * and `ssl` properties:
   * ```ts
   * void 0;
   * import { App, WebService } from "@cloudcamp/aws-runtime";
   * let app = new App();
   * void 'show';
   *
   * new WebService(app.production, "prod", {
   *   dockerfile: "../Dockerfile",
   *   domain: "example.com",
   *   ssl: true
   * });
   * ```
   *
   * See `{@link "command/domain/#domain-create" | domain:create}` and
   * `{@link "command/cert/#cert-create" | cert:create}` for more information on
   * setting up domains/SSL.
   *
   * @remarks During initialization you can configure: Custom domains, SSL,
   * machine configuration, health checks and the default number of instances.
   *
   * @param scope the parent, i.e. a stack
   * @param id a unique identifier within the parent scope
   * @param props the properties of WebService
   *
   * @topic Initialization
   */
  constructor(scope: Construct, id: string, props: WebServiceProps) {
    super(scope, id);

    let appName = App.instance.configuration.name;

    let vpc = ec2.Vpc.fromLookup(this, "vpc", {
      vpcId: App.instance.configuration.vpcId,
    });

    let logGroup = new logs.LogGroup(this, "log-group", {
      logGroupName: `/${appName}/webserver/${id}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    let certificate: ICertificate | undefined = undefined;

    if (props.domain) {
      certificate = Ref.getCertificate(this, props.domain! + "-certificate", {
        appName: App.instance.configuration.name,
        name: props.domain!,
      });
    }

    let environment: Record<string, string> = {};
    let stack = cdk.Stack.of(this);

    for (let [k, v] of Object.entries(props.environment || {})) {
      if (typeof v === "string") {
        environment[k] = v;
      } else {
        environment[k] = (v as Variable).resolve(stack);
      }
    }

    this.fargateService =
      new ecs_patterns.ApplicationLoadBalancedFargateService(
        this,
        "fargate-service",
        {
          vpc: vpc,
          cpu: props.cpu,
          memoryLimitMiB: props.memory,
          desiredCount: props.desiredCount,
          assignPublicIp: true,
          publicLoadBalancer: true,
          domainName: props.domain,
          certificate: certificate,
          redirectHTTP: certificate ? true : false,
          serviceName: id,
          protocol: certificate
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
            environment: environment,
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

  alarms(props?: WebServiceAlarmProps) {
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
          dimensionsMap: {
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
            dimensionsMap: {
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
        dimensionsMap: {
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
        dimensionsMap: {
          LoadBalancer: this.fargateService.loadBalancer.loadBalancerFullName,
        },
      }),
    });
    alarm.addAlarmAction(new cloudwatch_actions.SnsAction(topic));
    alarm.addOkAction(new cloudwatch_actions.SnsAction(topic));
  }
}
