import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { AWSClientConfig } from "./config";

/**
 * Get general information about an AWS account
 */
export class STS {
  /**
   * Get the account ID
   */
  static async getAccountId(): Promise<string> {
    let account: string | undefined = undefined;
    try {
      account = (
        await new STSClient(AWSClientConfig).send(
          new GetCallerIdentityCommand({})
        )
      ).Account;
    } catch (_err) {
      console.log(AWSClientConfig);
      console.log(_err);
    }
    if (!account) {
      throw new Error(
        "Authentication failed. Please check your AWS credentials and try again."
      );
    }
    return account;
  }
}
