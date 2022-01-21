import { Ref } from "./ref";
import * as route53 from "aws-cdk-lib/aws-route53";
import { Duration } from "aws-cdk-lib";
import { Construct } from "constructs";

export interface DomainProps {
  readonly domain: string;
}

export interface MxRecordProps {
  readonly ttl?: number;
  readonly values: route53.MxRecordValue[];
}

export interface CNameRecordProps {
  readonly ttl?: number;
  readonly name: string;
  readonly target: string;
}

export interface ARecordProps {
  readonly ttl?: number;
  readonly name: string;
  readonly targetIP: string;
}

export interface AaaaRecordProps extends ARecordProps {}

export interface TxtRecordProps {
  readonly ttl?: number;
  readonly name: string;
  readonly values: string[];
}

/**
 * @order 6
 */
export class Domain extends Construct {
  hostedZone: route53.IHostedZone;

  /**
   *
   * @param scope The parent of this resource, for example a ``{@link "app#stacks" | Stack}``.
   * @param id
   * @param props
   */
  constructor(scope: Construct, id: string, props: DomainProps) {
    super(scope, id);

    this.hostedZone = Ref.getHostedZone(this, "hosted-zone", props.domain);
  }

  mxRecord(id: string, props: MxRecordProps) {
    new route53.MxRecord(this, id, {
      zone: this.hostedZone,
      values: props.values,
      ttl: props.ttl ? Duration.minutes(props.ttl) : undefined,
    });
  }

  cnameRecord(id: string, props: CNameRecordProps) {
    new route53.CnameRecord(this, id, {
      recordName: props.name,
      domainName: props.target,
      ttl: props.ttl ? Duration.minutes(props.ttl) : undefined,
      zone: this.hostedZone,
    });
  }

  aRecord(id: string, props: ARecordProps) {
    new route53.ARecord(this, id, {
      recordName: props.name,
      target: route53.RecordTarget.fromIpAddresses(props.targetIP),
      ttl: props.ttl ? Duration.minutes(props.ttl) : undefined,
      zone: this.hostedZone,
    });
  }

  aaaaRecord(id: string, props: ARecordProps) {
    new route53.AaaaRecord(this, id, {
      recordName: props.name,
      target: route53.RecordTarget.fromIpAddresses(props.targetIP),
      ttl: props.ttl ? Duration.minutes(props.ttl) : undefined,
      zone: this.hostedZone,
    });
  }

  txtRecord(id: string, props: TxtRecordProps) {
    new route53.TxtRecord(this, id, {
      recordName: props.name,
      values: props.values,
      ttl: props.ttl ? Duration.minutes(props.ttl) : undefined,
      zone: this.hostedZone,
    });
  }
}
