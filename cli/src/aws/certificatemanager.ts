import {
  ACMClient,
  DeleteCertificateCommand,
  DescribeCertificateCommand,
  RequestCertificateCommand,
  waitUntilCertificateValidated,
} from "@aws-sdk/client-acm";
import {
  ChangeResourceRecordSetsCommand,
  ListHostedZonesByNameCommand,
  Route53Client,
} from "@aws-sdk/client-route-53";
import {
  DeleteParameterCommand,
  GetParameterCommand,
  PutParameterCommand,
  SSMClient,
} from "@aws-sdk/client-ssm";
import { AWSClientConfig } from "./config";

export class CertificateManager {
  static async request(domainName: string): Promise<void> {
    domainName = domainName.toLowerCase();
    let wildcard = "*." + domainName;

    let acm = new ACMClient(AWSClientConfig);
    let ssm = new SSMClient(AWSClientConfig);
    let route53 = new Route53Client(AWSClientConfig);

    // We need to validate DNS manually
    // https://docs.amazonaws.cn/en_us/acm/latest/userguide/dns-validation.html

    let reqData = await acm.send(
      new RequestCertificateCommand({
        DomainName: wildcard,
        ValidationMethod: "DNS",
      })
    );
    // get the validation record
    let valRecordName: string;
    let valRecordValue: string;

    // Initially, the response does not contain the validation rec
    // https://github.com/aws/aws-sdk-js/issues/2133
    // So we wait until it does.

    while (true) {
      await (async () => new Promise((resolve) => setTimeout(resolve, 5000)))();
      let certData = await acm.send(
        new DescribeCertificateCommand({
          CertificateArn: reqData.CertificateArn!,
        })
      );

      if (certData.Certificate?.DomainValidationOptions![0].ResourceRecord) {
        let resourceRec =
          certData.Certificate.DomainValidationOptions![0].ResourceRecord;
        valRecordName = resourceRec.Name!;
        valRecordValue = resourceRec.Value!;
        break;
      }
    }

    let params = { DNSName: domainName + "." };
    let hostedZoneData = await route53.send(
      new ListHostedZonesByNameCommand(params)
    );
    if (hostedZoneData.HostedZones?.length == 0) {
      throw new Error("Domain not found: " + domainName);
    }
    let hostedZoneId = hostedZoneData.HostedZones![0].Id;

    await route53.send(
      new ChangeResourceRecordSetsCommand({
        HostedZoneId: hostedZoneId,
        ChangeBatch: {
          Changes: [
            {
              Action: "CREATE",
              ResourceRecordSet: {
                Name: valRecordName,
                Type: "CNAME",
                TTL: 3600,
                ResourceRecords: [{ Value: valRecordValue }],
              },
            },
          ],
        },
      })
    );

    // Finally, safe cert ARN in SSM
    await ssm.send(
      new PutParameterCommand({
        Name: `/cloudcamp/global/certificate/${domainName}`,
        Value: reqData.CertificateArn!,
        Type: "String",
      })
    );
  }

  static async waitForValidated(domainName: string): Promise<void> {
    domainName = domainName.toLowerCase();

    let acm = new ACMClient(AWSClientConfig);
    let ssm = new SSMClient(AWSClientConfig);

    let certData = await ssm.send(
      new GetParameterCommand({
        Name: `/cloudcamp/global/certificate/${domainName}`,
      })
    );

    await waitUntilCertificateValidated(
      { client: acm, maxWaitTime: 10_000 },
      { CertificateArn: certData.Parameter!.Value! }
    );
  }

  static async remove(domainName: string): Promise<void> {
    domainName = domainName.toLowerCase();

    let acm = new ACMClient(AWSClientConfig);
    let ssm = new SSMClient(AWSClientConfig);
    let ssmParam = `/cloudcamp/global/certificate/${domainName}`;

    let data = await ssm.send(new GetParameterCommand({ Name: ssmParam }));
    await acm.send(
      new DeleteCertificateCommand({ CertificateArn: data.Parameter!.Value! })
    );
    await ssm.send(new DeleteParameterCommand({ Name: ssmParam }));
  }

  static async hasCert(domainName: string): Promise<boolean> {
    domainName = domainName.toLowerCase();
    let ssm = new SSMClient(AWSClientConfig);

    let ssmParam = `/cloudcamp/global/certificate/${domainName}`;
    try {
      await ssm.send(new GetParameterCommand({ Name: ssmParam }));
      return true;
    } catch (err) {
      if (err && (err as any).message == "ParameterNotFound") {
        return false;
      }
      throw err;
    }
  }
}
