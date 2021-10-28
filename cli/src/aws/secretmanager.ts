import {
  CreateSecretCommand,
  DeleteSecretCommand,
  DescribeSecretCommand,
  RestoreSecretCommand,
  SecretsManagerClient,
  UpdateSecretCommand,
} from "@aws-sdk/client-secrets-manager";
import { TAG_APP_NAME } from "@cloudcamp/aws-runtime/src/constants";
import { AWSClientConfig } from "./config";

/**
 * Manage secrets
 */
export class SecretManager {
  /**
   * Return true if the secret exists
   */
  static async exists(name: string): Promise<boolean> {
    let secretsmanager = new SecretsManagerClient(AWSClientConfig);
    try {
      let result = await secretsmanager.send(
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
   * Create or update secret
   */
  static async upsert(name: string, secret: string, appName: string) {
    let secretsmanager = new SecretsManagerClient(AWSClientConfig);
    try {
      let result = await secretsmanager.send(
        new DescribeSecretCommand({ SecretId: name })
      );
      if (result.DeletedDate) {
        await secretsmanager.send(new RestoreSecretCommand({ SecretId: name }));
      }
      SecretManager.update(name, secret);
    } catch (_err) {
      SecretManager.create(name, secret, appName);
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
