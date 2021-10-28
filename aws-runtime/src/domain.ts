import * as cdk from "@aws-cdk/core";
import { Ref } from "./ref";
import * as route53 from "@aws-cdk/aws-route53";
import * as certificatemanager from "@aws-cdk/aws-certificatemanager";
import { Duration } from "@aws-cdk/core";

export interface DomainProps {
  readonly name: string;
  readonly certificate?: boolean;
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
export class Domain extends cdk.Construct {
  hostedZone: route53.IHostedZone;
  certificate?: certificatemanager.ICertificate;

  /**
   *
   * @param scope The parent of this resource, for example a ``{@link "app#stacks" | Stack}``.
   * @param id
   * @param props
   */
  constructor(scope: cdk.Construct, id: string, props: DomainProps) {
    super(scope, id);

    this.hostedZone = Ref.getHostedZone(this, "hosted-zone", {
      name: props.name,
    });

    if (props.certificate !== false) {
      this.certificate = new certificatemanager.Certificate(
        this,
        "certificate",
        {
          domainName: "*." + props.name,
          validation: certificatemanager.CertificateValidation.fromDns(
            this.hostedZone
          ),
        }
      );

      Ref.addCertificate(this, "global-certificate", this.certificate, {
        name: props.name,
      });
    }
  }

  addMxRecords(id: string, props: MxRecordProps) {
    new route53.MxRecord(this, id, {
      zone: this.hostedZone,
      values: props.values,
      ttl: props.ttl ? Duration.minutes(props.ttl) : undefined,
    });
  }

  addCnameRecord(id: string, props: CNameRecordProps) {
    new route53.CnameRecord(this, id, {
      recordName: props.name,
      domainName: props.target,
      ttl: props.ttl ? Duration.minutes(props.ttl) : undefined,
      zone: this.hostedZone,
    });
  }

  addARecord(id: string, props: ARecordProps) {
    new route53.ARecord(this, id, {
      recordName: props.name,
      target: route53.RecordTarget.fromIpAddresses(props.targetIP),
      ttl: props.ttl ? Duration.minutes(props.ttl) : undefined,
      zone: this.hostedZone,
    });
  }

  addAaaaRecord(id: string, props: ARecordProps) {
    new route53.AaaaRecord(this, id, {
      recordName: props.name,
      target: route53.RecordTarget.fromIpAddresses(props.targetIP),
      ttl: props.ttl ? Duration.minutes(props.ttl) : undefined,
      zone: this.hostedZone,
    });
  }

  addTxtRecord(id: string, props: TxtRecordProps) {
    new route53.TxtRecord(this, id, {
      recordName: props.name,
      values: props.values,
      ttl: props.ttl ? Duration.minutes(props.ttl) : undefined,
      zone: this.hostedZone,
    });
  }
}
