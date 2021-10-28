import * as fs from "fs";
import * as path from "path";

export function version(): string {
  let packageJsonPath = path.join(__dirname, "..", "package.json");
  let contents = JSON.parse(fs.readFileSync(packageJsonPath).toString());
  return contents.version;
}
