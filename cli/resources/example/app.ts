import * as __vars__ from "../../src/vars";
import { App, WebServer } from "@cloudcamp/aws-runtime";

let app = new App();

new WebServer(app.production, "production-web", {
  dockerfile: __vars__.dockerfile,
  port: __vars__.port,
});
