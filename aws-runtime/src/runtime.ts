import * as path from "path";

export class Runtime {
  static jsiiAssemblyFile(): string {
    return path.join(__dirname, "..", ".jsii");
  }
  static jsiiAssemblyDir(): string {
    return path.join(__dirname, "..");
  }
}
