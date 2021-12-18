import * as __vars__ from "../../src/vars";
import { App, Database, WebService } from "@cloudcamp/aws-runtime";

let app = new App();

let dockerfile = __vars__.dockerfile;
let db = new Database(app.production, "production-db");

new WebService(app.production, "production-web", {
  dockerfile: dockerfile,
  port: __vars__.port,
  environment: {
    DATABASE_HOST: db.vars.databaseHost,
    DATABASE_PASSWORD: db.vars.databasePassword,
    DATABASE_URL: db.vars.databaseUrl,
  },
});

// things to try:

// in same stage: use variable via cfnoutput (DATABASE_HOST) WORKS
// in same stage: use secret (DATABASE_PASSWORD) WORKS
// in same stage: use complex variable (DATABASE_URL)

// in other stage: use variable via cfnoutput (DATABASE_HOST) WORKS
// in other stage: use secret WORKS
// in other stage: use complex variable (DATABASE_URL) WORKS

app.production.stage.runPost("test-post-run", {
  commands: ["echo $DATABASE_URL", "export"],
  dockerfile: dockerfile,
  environment: { DATABASE_URL: db.vars.databaseUrl },
});
