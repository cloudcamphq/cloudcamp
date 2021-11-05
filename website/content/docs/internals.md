---
slug: "internals"
order: 100
title: "Internals"
category: "operations-guide"
---

This guide documents the internals of CloudCamp. It might come in handy if you
want to make a source code contribution.

# Software

This software is used to build/release CloudCamp for various programming languages:

- npm (https://www.npmjs.com)
- yarn (https://yarnpkg.com/)
- sponge (https://linux.die.net/man/1/sponge)
- jsii tooling (https://github.com/aws/jsii)
- fswatch (https://github.com/emcrisostomo/fswatch)
- twine (https://pypi.org/project/twine/)
- dotnet (https://dotnet.microsoft.com)

# Releasing

To prerelease, run:

```bash
$ git checkout main
$ yarn release --prerelease alpha
$ git checkout release
$ git merge main
$ git push
```

To release, run:

```bash
$ git checkout main
$ yarn release
$ git checkout release
$ git merge main
$ git push
```

# SSM usage

This is a list of all SSM keys used internally by CloudCamp.

<table>
<thead>
<tr>
  <td class="p-2 border font-semibold bg-gray-50">Key</td>
  <td class="p-2 border font-semibold bg-gray-50">Used for</td>
</tr>
</thead>
<tbody>
<tr>
  <td class="p-2 border"><code>/cloudcamp/${appname}/_/stack/${stackname}</code></td>
  <td class="p-2 border">Finding all stacks of an app.</td>
</tr>
<tr>
  <td class="p-2 border"><code>/cloudcamp/${appname}/_/codepipeline</code></td>
  <td class="p-2 border">Finding the main code pipeline.</td>
</tr>
<tr>
  <td class="p-2 border"><code>/cloudcamp/${appname}/_/pipeline-stack</code></td>
  <td class="p-2 border">Finding the pipeline stack.</td>
</tr>
<tr>
  <td class="p-2 border"><code>/cloudcamp/global/certificate/${domainname}</code></td>
  <td class="p-2 border">Storing the ARN of a certificate.</td>
</tr>
</tbody>
</table>

# CLI stacktraces

To print the stacktrace when there is an error in the command line interface,
set the `DEBUG` environment variable.
