import {
  AssociateRouteTableCommand,
  AttachInternetGatewayCommand,
  CreateInternetGatewayCommand,
  CreateRouteCommand,
  CreateRouteTableCommand,
  CreateSubnetCommand,
  CreateVpcCommand,
  DescribeAvailabilityZonesCommand,
  DescribeVpcsCommand,
  EC2Client,
  ModifyVpcAttributeCommand,
  TagSpecification,
  waitUntilVpcAvailable,
} from "@aws-sdk/client-ec2";
import { TAG_APP_NAME } from "@cloudcamp/aws-runtime/src/constants";
import _ from "lodash";
import { AWSClientConfig } from "./config";
import { Netmask } from "netmask";

/**
 * Manage VPCs
 */
export class VPC {
  static async list(): Promise<
    { id: string; descr: string; default: boolean }[]
  > {
    let ec2 = new EC2Client(AWSClientConfig);
    let data = await ec2.send(new DescribeVpcsCommand({ MaxResults: 500 }));
    let vpcs = data.Vpcs || [];
    vpcs = _.sortBy(
      vpcs.filter((vpc) => vpc.VpcId),
      (vpc) => (vpc.IsDefault ? "000" + vpc.VpcId! : vpc.VpcId!)
    );
    return vpcs.map((vpc) => {
      let descr = vpc.VpcId!;
      let name = "";
      for (let tag of vpc.Tags || []) {
        if (tag.Key == "name" && tag.Value) {
          name = tag.Value!;
        }
      }
      if (name) {
        descr += " " + name;
      }
      if (vpc.IsDefault) {
        descr += " (default)";
      }
      return { id: vpc.VpcId!, descr: descr, default: !!vpc.IsDefault };
    });
  }

  private static tagSpec(
    appName: string,
    resourceType: string,
    suffix?: string
  ): TagSpecification[] {
    return [
      {
        Tags: [
          { Key: TAG_APP_NAME, Value: appName },
          {
            Key: "Name",
            Value: appName + "-" + resourceType + (suffix ? "-" + suffix : ""),
          },
        ],
        ResourceType: resourceType,
      },
    ];
  }

  private static async createVpc(appName: string): Promise<string> {
    let ec2 = new EC2Client(AWSClientConfig);
    let vpcData = await ec2.send(
      new CreateVpcCommand({
        CidrBlock: "10.0.0.0/16",
        TagSpecifications: VPC.tagSpec(appName, "vpc"),
      })
    );
    let vpcId = vpcData.Vpc!.VpcId!;
    await waitUntilVpcAvailable(
      { client: ec2, maxWaitTime: 10_000 },
      { VpcIds: [vpcId] }
    );

    await ec2.send(
      new ModifyVpcAttributeCommand({
        VpcId: vpcId,
        EnableDnsHostnames: { Value: true },
      })
    );

    await ec2.send(
      new ModifyVpcAttributeCommand({
        VpcId: vpcId,
        EnableDnsSupport: { Value: true },
      })
    );
    return vpcId;
  }

  private static async createSubnets(
    vpcId: string,
    appName: string
  ): Promise<[string[], string[]]> {
    let ec2 = new EC2Client(AWSClientConfig);
    let azsData = await ec2.send(
      new DescribeAvailabilityZonesCommand({ AllAvailabilityZones: true })
    );

    var block = new Netmask("10.0.0.0/20");
    let incNetMask = () => {
      let result = block;
      block = block.next();
      return `${result.base}/${result.bitmask}`;
    };

    let publicNets: string[] = [];
    let privateNets: string[] = [];

    let azs = azsData.AvailabilityZones!.filter(
      (z) => z.ZoneType === "availability-zone"
    );

    // create a private and a public subnet in all AZs
    for (let az of azs) {
      let azId = az.ZoneId!;

      let publicSubnet = await ec2.send(
        new CreateSubnetCommand({
          VpcId: vpcId,
          CidrBlock: incNetMask(),
          AvailabilityZoneId: azId,
          TagSpecifications: VPC.tagSpec(appName, "subnet", "public-" + azId),
        })
      );
      publicNets.push(publicSubnet.Subnet!.SubnetId!);

      let privateSubnet = await ec2.send(
        new CreateSubnetCommand({
          VpcId: vpcId,
          CidrBlock: incNetMask(),
          AvailabilityZoneId: azId,
          TagSpecifications: VPC.tagSpec(appName, "subnet", "private-" + azId),
        })
      );
      privateNets.push(privateSubnet.Subnet!.SubnetId!);
    }
    return [publicNets, privateNets];
  }

  private static async createRoutes(
    appName: string,
    vpcId: string,
    publicNets: string[],
    privateNets: string[]
  ): Promise<void> {
    let ec2 = new EC2Client(AWSClientConfig);

    // create and attach a new internet gateway to the VPC
    let gatewayId = (
      await ec2.send(
        new CreateInternetGatewayCommand({
          TagSpecifications: VPC.tagSpec(appName, "internet-gateway"),
        })
      )
    ).InternetGateway!.InternetGatewayId!;

    await ec2.send(
      new AttachInternetGatewayCommand({
        InternetGatewayId: gatewayId,
        VpcId: vpcId,
      })
    );

    // create a new route table for public subnets
    let publicRouteTableId = (
      await ec2.send(
        new CreateRouteTableCommand({
          VpcId: vpcId,
          TagSpecifications: VPC.tagSpec(
            appName,
            "route-table",
            "public-" + vpcId
          ),
        })
      )
    ).RouteTable!.RouteTableId!;

    // create a new route table for private subnets
    let privateRouteTableId = (
      await ec2.send(
        new CreateRouteTableCommand({
          VpcId: vpcId,
          TagSpecifications: VPC.tagSpec(
            appName,
            "route-table",
            "private-" + vpcId
          ),
        })
      )
    ).RouteTable!.RouteTableId!;

    // attach a route to the internet gateway to the route table for public
    // subnets
    await ec2.send(
      new CreateRouteCommand({
        RouteTableId: publicRouteTableId,
        DestinationCidrBlock: "0.0.0.0/0",
        GatewayId: gatewayId,
      })
    );

    // associate the route table with all public subnets
    for (let subnetId of publicNets) {
      await ec2.send(
        new AssociateRouteTableCommand({
          RouteTableId: publicRouteTableId,
          SubnetId: subnetId,
        })
      );
    }

    // associate the private routetable with all private subnets
    for (let subnetId of privateNets) {
      await ec2.send(
        new AssociateRouteTableCommand({
          RouteTableId: privateRouteTableId,
          SubnetId: subnetId,
        })
      );
    }
  }

  static async create(appName: string): Promise<string> {
    let vpcId = await VPC.createVpc(appName);
    let [publicNets, privateNets] = await VPC.createSubnets(vpcId, appName);
    await VPC.createRoutes(appName, vpcId, publicNets, privateNets);
    return vpcId;
  }
}
