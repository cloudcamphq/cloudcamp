import { fromIni } from "@aws-sdk/credential-provider-ini";
import { CONTEXT_KEY_REGION } from "@cloudcamp/aws-runtime/src/constants";
import { AwsRegion } from "@cloudcamp/aws-runtime/src/types";
import { getCdkJsonContext } from "../project";

export const AWSClientConfig: any = {};

/**
 * Switch the whole aws sdk to a specific AWS profile
 */
export async function assumeAWSProfile(profile?: string) {
  let profileConf = await getProfile(profile);

  AWSClientConfig.credentials = {
    accessKeyId: profileConf.key,
    secretAccessKey: profileConf.secret,
  };
}

/**
 * Globally set region
 */
export function setAWSRegion(region: AwsRegion) {
  AWSClientConfig.region = region;
}

/**
 * Generic setup function for commands
 */
export function setupAWS(profile?: string) {
  assumeAWSProfile(profile);

  let context = getCdkJsonContext();
  if (!context[CONTEXT_KEY_REGION]) {
    throw new Error("No region found in cdk.json.");
  }
  setAWSRegion(context[CONTEXT_KEY_REGION]);
}

/**
 * Function to get the profile name and key.
 */
export async function getProfile(profile?: string): Promise<{
  profile: string;
  key: string;
  secret: string;
  description: string;
}> {
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    return {
      profile: "*env*",
      key: process.env.AWS_ACCESS_KEY_ID,
      secret: process.env.AWS_SECRET_ACCESS_KEY,
      description: `${process.env.AWS_ACCESS_KEY_ID} [from env vars]`,
    };
  } else {
    let credentials = await (profile
      ? fromIni({ profile: profile })
      : fromIni())();
    let profile_ = profile || process.env.AWS_PROFILE || "default";
    return {
      profile: profile || process.env.AWS_PROFILE || "default",
      key: credentials.accessKeyId,
      secret: credentials.secretAccessKey,
      description: `${credentials.accessKeyId} [${profile_}]`,
    };
  }
}
