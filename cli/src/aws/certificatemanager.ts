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
import { makeSsmPath } from "@cloudcamp/aws-runtime/src/utils";
import { AWSClientConfig } from "./config";

export class CertificateManager {
  static async request(domainName: string): Promise<void> {
    domainName = domainName.toLowerCase();
    const wildcard = "*." + domainName;

    const acm = new ACMClient(AWSClientConfig);
    const ssm = new SSMClient(AWSClientConfig);
    const route53 = new Route53Client(AWSClientConfig);

    // We need to validate DNS manually
    // https://docs.amazonaws.cn/en_us/acm/latest/userguide/dns-validation.html

    const reqData = await acm.send(
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
      const certData = await acm.send(
        new DescribeCertificateCommand({
          CertificateArn: reqData.CertificateArn!,
        })
      );

      if (certData.Certificate?.DomainValidationOptions![0].ResourceRecord) {
        const resourceRec =
          certData.Certificate.DomainValidationOptions![0].ResourceRecord;
        valRecordName = resourceRec.Name!;
        valRecordValue = resourceRec.Value!;
        break;
      }
    }

    const params = { DNSName: domainName + "." };
    const hostedZoneData = await route53.send(
      new ListHostedZonesByNameCommand(params)
    );
    if (hostedZoneData.HostedZones?.length == 0) {
      throw new Error("Domain not found: " + domainName);
    }
    const hostedZoneId = hostedZoneData.HostedZones![0].Id;

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
        Name: makeSsmPath("global", "certificate", domainName),
        Value: reqData.CertificateArn!,
        Type: "String",
      })
    );
  }

  static async waitForValidated(domainName: string): Promise<void> {
    domainName = domainName.toLowerCase();

    const acm = new ACMClient(AWSClientConfig);
    const ssm = new SSMClient(AWSClientConfig);

    const certData = await ssm.send(
      new GetParameterCommand({
        Name: makeSsmPath("global", "certificate", domainName),
      })
    );

    await waitUntilCertificateValidated(
      { client: acm, maxWaitTime: 10_000 },
      { CertificateArn: certData.Parameter!.Value! }
    );
  }

  static async remove(domainName: string): Promise<void> {
    domainName = domainName.toLowerCase();

    const acm = new ACMClient(AWSClientConfig);
    const ssm = new SSMClient(AWSClientConfig);
    const ssmParam = makeSsmPath("global", "certificate", domainName);

    const data = await ssm.send(new GetParameterCommand({ Name: ssmParam }));
    await acm.send(
      new DeleteCertificateCommand({ CertificateArn: data.Parameter!.Value! })
    );
    await ssm.send(new DeleteParameterCommand({ Name: ssmParam }));
  }

  static async hasCert(domainName: string): Promise<boolean> {
    domainName = domainName.toLowerCase();
    const ssm = new SSMClient(AWSClientConfig);

    const ssmParam = makeSsmPath("global", domainName);
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
