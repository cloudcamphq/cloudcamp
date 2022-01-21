import * as __vars__ from "../../src/vars";
import { App, Database, WebService } from "@cloudcamp/aws-runtime";

const app = new App();

const productionDb = new Database(app.production, "production-db", {
  engine: "postgres",
});

new WebService(app.production, "production-web", {
  dockerfile: __vars__.dockerfile,
  port: __vars__.port,
  environment: { DATABASE_URL: productionDb.vars.url },
});
