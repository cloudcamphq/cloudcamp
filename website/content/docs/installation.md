---
slug: "installation"
order: 1
title: "Installation"
category: "getting-started"
---

Learn how to get cloudcamp up and running for your project.

# Prerequisites

To install cloudcamp, you need to have node.js V14 or higher installed. You can
either [install it with your package
manager](https://nodejs.org/en/download/package-manager/), or [download an
installer](https://nodejs.org/en/download/) for your OS.

# Installing cloudcamp

Cloudcamp comes with `camp`, a command line program.

Install it via `npm`

```bash
$ npm install @cloudcamp/cli -g
```

Or with `yarn`

```bash
$ yarn global add @cloudcamp/cli
```

# AWS Setup

You need to make sure that your credentials for AWS are set up.

If you haven't already, [install AWS
CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) and
set up a default profile with administrator access.

```bash
$ aws configure
```

In case you don't want to use your default profile, you can change it to another
profile by setting the environment variable:

```bash
$ export AWS_PROFILE=myprofile
```

Or if you want to specify your profile when running commands, use the
`--profile` flag. For example:

```bash
$ camp deploy --profile=myprofile
```
