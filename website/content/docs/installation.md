---
slug: "installation"
order: 2
title: "Installation"
category: "overview"
---

Learn how to install CloudCamp on your machine.

# Prerequisites

To install CloudCamp, you need to have node.js V14 or higher installed. You can
either [install it with your package
manager](https://nodejs.org/en/download/package-manager/), or [download an
installer](https://nodejs.org/en/download/) for your OS.

# Installing CloudCamp

CloudCamp comes with `camp`, a command line program.

Install it via `npm`

```bash
$ npm install @cloudcamp/cli -g
```

# AWS Setup

To deploy to AWS, your credentials must be set up.

If you haven't already, [install the AWS
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
