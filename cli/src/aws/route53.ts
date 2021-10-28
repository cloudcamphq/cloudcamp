import { ACMClient, DescribeCertificateCommand } from "@aws-sdk/client-acm";
import {
  ChangeResourceRecordSetsCommand,
  CreateHostedZoneCommand,
  DeleteHostedZoneCommand,
  GetHostedZoneCommand,
  ListHostedZonesByNameCommand,
  ListResourceRecordSetsCommand,
  Route53Client,
} from "@aws-sdk/client-route-53";
import { GetParametersByPathCommand, SSMClient } from "@aws-sdk/client-ssm";
import _ from "lodash";
import { CertificateManager } from "./certificatemanager";
import { AWSClientConfig } from "./config";

/**
 * Manage Route53
 */
export class Route53 {
  /**
   * List all domains in all hosted zones of an account.
   */
  static async list(
    domainName?: string
  ): Promise<{ id: string; domainName: string; certificate: string }[]> {
    let route53 = new Route53Client(AWSClientConfig);
    let ssm = new SSMClient(AWSClientConfig);
    let acm = new ACMClient(AWSClientConfig);

    let ssmData = await ssm.send(
      new GetParametersByPathCommand({ Path: "/cloudcamp/global/certificate" })
    );
    let params = domainName ? { DNSName: domainName + "." } : {};
    let data = await route53.send(new ListHostedZonesByNameCommand(params));
    let results = [];
    // when a domainName was specified, we only want the first zone
    let zones =
      (domainName ? data.HostedZones?.slice(0, 1) : data.HostedZones) || [];
    for (let zone of zones) {
      let certStatus: string;
      let certSsm = (ssmData.Parameters || []).filter((param) =>
        _.endsWith(param.Name, "/" + _.trimEnd(zone.Name, "."))
      );
      if (certSsm.length) {
        let certData = await acm.send(
          new DescribeCertificateCommand({
            CertificateArn: certSsm[0].Value!,
          })
        );
        certStatus = Route53.statusName(certData.Certificate?.Status);
      } else {
        certStatus = "None";
      }
      results.push({
        id: zone.Id!,
        domainName: _.trimEnd(zone.Name, "."),
        certificate: certStatus,
      });
    }
    return _.sortBy(results, (domain) => domain.domainName);
  }

  private static statusName(status?: string) {
    if (!status) {
      return "Unknown";
    } else if (status == "PENDING_VALIDATION") {
      return "Pending";
    } else if (status == "ISSUED") {
      return "Issued";
    } else {
      return _.capitalize(status);
    }
  }

  static async getDomain(domainName: string) {
    domainName = domainName.toLowerCase();
    let domains = (await Route53.list()).filter(
      (domain) => domain.domainName === domainName
    );
    if (domains.length === 0) {
      throw new Error("Domain not found: " + domainName);
    }
    return domains[0];
  }

  static async getNameServers(
    domainName: string
  ): Promise<{ nameserver: string }[]> {
    domainName = domainName.toLowerCase();
    let route53 = new Route53Client(AWSClientConfig);
    let domain = await Route53.getDomain(domainName);
    let data = await route53.send(new GetHostedZoneCommand({ Id: domain.id }));
    if (!data.DelegationSet?.NameServers?.length) {
      throw new Error("Could not find nameserver information.");
    } else {
      return data.DelegationSet.NameServers.map((ns) => ({
        nameserver: ns,
      }));
    }
  }

  static async create(domainName: string): Promise<void> {
    domainName = domainName.toLowerCase();
    let route53 = new Route53Client(AWSClientConfig);
    let exists = false;
    try {
      await Route53.getDomain(domainName);
      exists = true;
    } catch (err) {}

    if (exists) {
      throw new Error("Domain already exists: " + domainName);
    }

    await route53.send(
      new CreateHostedZoneCommand({
        Name: domainName,
        CallerReference: new Date().toString(),
      })
    );
  }

  static async listRecords(
    domainName: string
  ): Promise<
    { name: string; type: string; ttl: any; resourceRecords: any; alias: any }[]
  > {
    domainName = domainName.toLowerCase();
    let route53 = new Route53Client(AWSClientConfig);
    let domain = await Route53.getDomain(domainName);
    let data = await route53.send(
      new ListResourceRecordSetsCommand({ HostedZoneId: domain.id })
    );
    return (
      data.ResourceRecordSets?.map((rec) => ({
        name: rec.Name!,
        type: rec.Type!,
        ttl: rec.TTL,
        resourceRecords: rec.ResourceRecords,
        alias: rec.AliasTarget,
      })) || []
    );
  }

  static async remove(domainName: string): Promise<void> {
    domainName = domainName.toLowerCase();
    let route53 = new Route53Client(AWSClientConfig);
    let domain = await Route53.getDomain(domainName);
    let changes = (await Route53.listRecords(domainName))
      .filter(
        (record) =>
          !(record.name == domainName + "." && record.type == "NS") &&
          !(record.name == domainName + "." && record.type == "SOA")
      )
      .map((record) => {
        let rset: any = {
          Name: record.name,
          Type: record.type,
          AliasTarget: record.alias,
          TTL: record.ttl,
        };

        // can't have undefined ResourceRecords
        // othwerwise we get Cannot read property 'HostedZoneId' of undefined
        // https://github.com/aws/aws-sdk-js/issues/3506
        if (record.resourceRecords) {
          rset.ResourceRecords = record.resourceRecords;
        }

        return {
          Action: "DELETE",
          ResourceRecordSet: rset,
        };
      });

    if (changes.length) {
      await route53.send(
        new ChangeResourceRecordSetsCommand({
          HostedZoneId: domain.id,
          ChangeBatch: {
            Changes: changes,
          },
        })
      );
    }

    await route53.send(new DeleteHostedZoneCommand({ Id: domain.id }));
    if (await CertificateManager.hasCert(domainName)) {
      await CertificateManager.remove(domainName);
    }
  }
}
