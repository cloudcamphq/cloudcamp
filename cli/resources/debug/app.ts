import * as __vars__ from "../../src/vars";
import { App, WebService, Database } from "@cloudcamp/aws-runtime";

let app = new App();

let dockerfile = __vars__.dockerfile;

new WebService(app.production, "production-web", {
  dockerfile: dockerfile,
  port: __vars__.port,
});

let db = new Database(app.production, "production-db");

app.production.stage.runPost("test-post-run", {
  commands: ["echo $DATABASE_URL"],
  dockerfile: dockerfile,
  environment: { DATABASE_URL: db.vars.databaseSecret },
});
