import * as __vars__ from "../../src/vars";
import { App, Database, WebServer } from "@cloudcamp/aws-runtime";

let app = new App();

let productionDb = new Database(app.production, "production-db", {
  engine: "postgres",
});

new WebServer(app.production, "production-web", {
  dockerfile: __vars__.dockerfile,
  port: __vars__.port,
  environment: { DATABASE_URL: productionDb.env.databaseUrl },
});
