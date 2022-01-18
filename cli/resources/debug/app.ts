import * as __vars__ from "../../src/vars";
import { App, Database, WebService } from "@cloudcamp/aws-runtime";

const app = new App();

const dockerfile = __vars__.dockerfile;
const db = new Database(app.staging, "db");

new WebService(app.production, "web", {
  dockerfile: dockerfile,
  port: __vars__.port,
  environment: {
    DATABASE_HOST: db.vars.host,
    DATABASE_PASSWORD: db.vars.password,
    DATABASE_URL: db.vars.url,
  },
});

new WebService(app.staging, "web", {
  dockerfile: dockerfile,
  port: __vars__.port,
  environment: {
    DATABASE_HOST: db.vars.host,
    DATABASE_PASSWORD: db.vars.password,
    DATABASE_URL: db.vars.url,
  },
});

// things to try:

// in same stage: use variable via cfnoutput (DATABASE_HOST) WORKS
// in same stage: use secret (DATABASE_PASSWORD) WORKS
// in same stage: use complex variable (DATABASE_URL)

// in other stage: use variable via cfnoutput (DATABASE_HOST)
// in other stage: use secret
// in other stage: use complex variable (DATABASE_URL)

// app.production.stage.runPost("test-post-run", {
//   commands: [
//     "export",
//     "echo $DATABASE_URL",
//     "echo $DATABASE_HOST",
//     "echo $DATABASE_PASSWORD",
//   ],
//   dockerfile: dockerfile,
//   environment: {
//     DATABASE_HOST: db.vars.host,
//     DATABASE_PASSWORD: db.vars.password,
//     DATABASE_URL: db.vars.url,
//   },
// });
