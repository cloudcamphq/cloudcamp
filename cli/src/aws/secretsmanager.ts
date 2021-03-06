import {
  CreateSecretCommand,
  DeleteSecretCommand,
  DescribeSecretCommand,
  GetSecretValueCommand,
  RestoreSecretCommand,
  SecretsManagerClient,
  UpdateSecretCommand,
} from "@aws-sdk/client-secrets-manager";
import { TAG_APP_NAME } from "@cloudcamp/aws-runtime/src/constants";
import { AWSClientConfig } from "./config";

/**
 * Manage secrets
 */
export class SecretsManager {
  /**
   * Return true if the secret exists
   */
  static async exists(name: string): Promise<boolean> {
    const secretsmanager = new SecretsManagerClient(AWSClientConfig);
    try {
      const result = await secretsmanager.send(
        new DescribeSecretCommand({ SecretId: name })
      );
      if (result.DeletedDate) {
        return false;
      }
      return true;
    } catch (_err) {
      return false;
    }
  }

  /**
   * Return the contents of a secret
   */
  static async get(name: string): Promise<string> {
    const secretsmanager = new SecretsManagerClient(AWSClientConfig);

    let result = await secretsmanager.send(
      new GetSecretValueCommand({ SecretId: name })
    );
    return result.SecretString!;
  }

  /**
   * Create or update secret
   */
  static async upsert(name: string, secret: string, appName: string) {
    const secretsmanager = new SecretsManagerClient(AWSClientConfig);
    try {
      const result = await secretsmanager.send(
        new DescribeSecretCommand({ SecretId: name })
      );
      if (result.DeletedDate) {
        await secretsmanager.send(new RestoreSecretCommand({ SecretId: name }));
      }
      SecretsManager.update(name, secret);
    } catch (_err) {
      SecretsManager.create(name, secret, appName);
    }
  }

  /**
   * Create a new secret
   */
  static async create(
    name: string,
    secret: string,
    appName: string
  ): Promise<void> {
    await new SecretsManagerClient(AWSClientConfig).send(
      new CreateSecretCommand({
        Name: name,
        SecretString: secret,
        Tags: [
          {
            Key: TAG_APP_NAME,
            Value: appName,
          },
        ],
      })
    );
  }

  /**
   * Update an existing secret
   */
  static async update(name: string, secret: string): Promise<void> {
    await new SecretsManagerClient(AWSClientConfig).send(
      new UpdateSecretCommand({
        SecretId: name,
        SecretString: secret,
      })
    );
  }

  /**
   * Delete secret
   */
  static async delete(name: string): Promise<void> {
    await new SecretsManagerClient(AWSClientConfig).send(
      new DeleteSecretCommand({
        RecoveryWindowInDays: 7,
        SecretId: name,
      })
    );
  }
}
