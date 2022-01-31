---
slug: "tutorial"
order: 3
title: "Tutorial"
category: "overview"
---

This tutorial will walk you through building and deploying an application with
CloudCamp. Make sure that CloudCamp is installed and your AWS account is
configured.

```bash
$ npm install cloudcamp
$ aws configure
```

For more information, check the docs on [Installation](/docs/installation/).

# Clone the tutorial repo

The easiest way to get started is to fork <a
href="https://github.com/cloudcamphq/tutorial" target="_blank"> the tutorial
repository</a> and then clone it:

```bash
$ git clone git@github.com:YOUR-USERNAME/tutorial.git && cd tutorial
```

# Setting up camp

To add CloudCamp to your project, run `camp init`:

<div class="gatsby-highlight" data-language="ts">
  <pre class="ts language-ts"><code class="ts language-ts">$ camp init --dockerfile=Dockerfile --language=typescript</code></pre>
</div>
<div class="gatsby-highlight" data-language="javascript">
  <pre class="javascript language-javascript"><code class="javascript language-javascript">$ camp init --dockerfile=Dockerfile --language=javascript</code></pre>
</div>
<div class="gatsby-highlight" data-language="python">
  <pre class="python language-python"><code class="python language-python">$ camp init --dockerfile=Dockerfile --language=python</code></pre>
</div>
<div class="gatsby-highlight" data-language="csharp">
  <pre class="csharp language-csharp"><code class="csharp language-csharp">$ camp init --dockerfile=Dockerfile --language=csharp</code></pre>
</div>
<div class="gatsby-highlight" data-language="java">
  <pre class="java language-java"><code class="java language-java">$ camp init --dockerfile=Dockerfile --language=java</code></pre>
</div>

Note that passing a Dockerfile is optional - doing so will simply add a small
piece of code that builds and runs a web service based on its contents.

You now have a new directory called `cloudcamp` which contains all the files needed to deploy your app.

# Deploying to AWS

Now let's deploy:

```bash
$ camp deploy
```

Follow the on screen instructions to connect your GitHub account (the secret token will be stored in your own AWS account).

TODO this needs to explain what is really going on (build pipeline)
"Once the command has finished, your app will be built and deployed."

You can run `camp status` to watch the progress:

```bash
$ camp status --wait --notify
```

Once finished, status will print the the URL of our web server. You can copy and paste the
URL in your browser to verify everything is working.

So far, we have:

- a build pipeline that deploys your app on `git push`.

- a load balanced, scalable web service.

# Infrastructure as Code

CloudCamp is based on _Amazon Cloud Development Kit (CDK)_, a declarative way of
building infrastructure. Instead of imperatively creating and updating
resources, we declare the state of what our infrastructure should look like. CDK
then takes care of making the necessary changes to accomplish our desired state.

Open up <code class="language-text" data-language="ts">src/camp.ts</code><code class="language-text" data-language="javascript">src/camp.js</code><code class="language-text" data-language="python">src/camp.py</code><code class="language-text" data-language="java">src/Camp.java</code><code class="language-text" data-language="csharp">src/Camp.cs</code> in your camp's directory and take a look.

```ts
import { App, WebService } from "@cloudcamp/aws-runtime";

const app = new App();

const web = new WebService(app.production, "web", {
  dockerfile: "../../Dockerfile",
  port: 3000,
});
```

In the beginning we instantiate the class `App` which stands
for an instance of our application running in the cloud.

Next, we create a new `WebService`, by passing in the stack it belongs to
(`app.production`) and a unique identifier (`"web"`). Additionally, we pass a Dockerfile and a
port so our web server knows what to run.

# Making Changes

TODO add a database and monitoring at the same time

To add a PostgreSQL database, change the code to look like this:

```ts
import { App, WebService, Database } from "@cloudcamp/aws-runtime";

const app = new App();

const db = new Database(app.production, "db", {
  engine: "postgres",
});

const web = new WebService(app.production, "web", {
  dockerfile: "../../Dockerfile",
  port: 3000,
  environment: { DATABASE_URL: db.databaseUrl },
});
```

We create a database and add it to the production stack.
Then we let the web server know about the database by adding the environment
variable `DATABASE_URL`.

Push the code to apply this change and wait for the pipeline to complete:

```bash
$ git add -A && git commit -m "add database" && git push
$ camp status --wait --notify
```

When refreshing our app in the browser it should now be connected to
the database.

# Setting up monitoring

In a production app, we need to know when things goes wrong - for example, when
users encounter a server error. To simulate an error, visit the `/error` path on
your webserver. Now wouldn't it be nice if we got a notification whenever there
is an error? The `WebService` class provides an API for exactly that.

Update your code to add error notifications:

```ts
import { App, WebService, Database } from "@cloudcamp/aws-runtime";

const app = new App();

const db = new Database(app.production, "db", {
  engine: "postgres",
});

const web = new WebService(app.production, "web", {
  dockerfile: "../../Dockerfile",
  port: 3000,
  environment: { DATABASE_URL: db.databaseUrl },
});

productionWeb.alarms({
  email: ["youremail@example.com"],
});
```

Now update the app - you know the drill.

```bash
$ git add -A && git commit -m "add monitoring" && git push
$ camp status --wait --notify
```

Visit `/error` again, and you will get an email notification that something went
wrong. Neat.

# Custom domain (Optional)

Domains and certificates have to be added via the command line before being used. Use
`domain:create` to set up a domain:

```bash
$ camp domain:create yourdomain.com

 Nameservers
 ───────────────────────
 ns-1320.awsdns-37.org
 ns-999.awsdns-60.net
 ns-1838.awsdns-37.co.uk
 ns-72.awsdns-09.com

 › To request a certificate, run `camp cert:create yourdomain.com`

Domain created: yourdomain.com
```

Now change the settings of your domain to point to the nameservers in the
command output.

Once this is done, you can request a certificate.

(Note that this might take a couple of minutes to complete):

```bash
$ camp cert:create yourdomain.com

Creating new certificate... done
Waiting for certificate validation... done
Certificate created: yourdomain.com
```

Finally, update the source code:

```ts
void 0;
import { App, WebService, Database } from "@cloudcamp/aws-runtime";

const app = new App();

const productionDb = new Database(app.production, "db", {
  engine: "postgres",
});
void "show";

const productionWeb = new WebService(app.production, "web", {
  // ⬇ add your domain
  domains: ["yourdomain.com"],
  // ⬇ enable https
  ssl: true,
  // ⬇ redirect http to https
  redirectHttp: true,
  // ...
  dockerfile: "../../Dockerfile",
  port: 3000,
  environment: { DATABASE_URL: productionDb.databaseUrl },
});
```

And push your changes:

```bash
$ git add -A && git commit -m "add custom domain" && git push
$ camp status --wait --notify
```

Now, your app will be running under your custom domain.

# Cleaning up

To delete all resources we created during this tutorial, run `destroy` in your camps directory:

```bash
$ camp destroy
```

CloudCamp will list and upon confirmation destroy all the resources you created.

If you added a custom domain, use this command to delete the DNS zone:

```bash
$ camp domain:delete yourdomain.com
```
