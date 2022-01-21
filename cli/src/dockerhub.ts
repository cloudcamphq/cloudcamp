import axios from "axios";
import { SecretsManager } from "./aws";
import { UX } from "./ux";

export class DockerHub {
  static async verifyDockerHubCredentials(
    username: string,
    password: string
  ): Promise<boolean> {
    try {
      await axios.post("https://hub.docker.com/v2/users/login", {
        username: username,
        password: password,
      });
      return true;
    } catch (e: any) {
      if (e.response && e.response.status == 401) {
        return false;
      }
      throw new Error(
        "Could not connect to DockerHub. Please try again later."
      );
    }
  }

  static async getExistingDockerHubCredentials(
    secretName: string
  ): Promise<string | undefined> {
    const exists = await SecretsManager.exists(secretName);

    if (exists) {
      let secretString = await SecretsManager.get(secretName);
      return JSON.parse(secretString).username;
    } else {
      return undefined;
    }
  }

  static async setupDockerHubCredentials(
    ux: UX,
    appName: string,
    secretName: string,
    askNewCredentials: boolean = true,
    skipNewCredentials: boolean = false
  ): Promise<boolean> {
    ux.start("Checking DockerHub secret");
    const existingUsername = await this.getExistingDockerHubCredentials(
      secretName
    );
    ux.stop();
    if (existingUsername) {
      ux.log(`Using existing DockerHub credentials: ${existingUsername}`);
      return true;
    }

    if (askNewCredentials) {
      let shouldAddNewCredentials = await ux.confirm({
        message: `Do you want to set up DockerHub?`,
      });
      if (!shouldAddNewCredentials) {
        return false;
      }
    }

    if (skipNewCredentials) {
      return false;
    }

    let username = await ux.input({
      message: "DockerHub username:",
    });
    let password = await ux.password({
      message: "DockerHub password:",
    });
    ux.start("Creating DockerHub secret");
    await SecretsManager.upsert(
      secretName,
      JSON.stringify({ username: username, password: password }),
      appName
    );
    ux.stop();
    return true;
  }
}
