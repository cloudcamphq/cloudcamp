---
slug: "internals"
order: 100
title: "Internals"
category: "operations-guide"
---

As a regular user of CloudCamp, you don't need to read this document.

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
  <td class="p-2 border">/cloudcamp/${appname}/_/stack/${stackname}</td>
  <td class="p-2 border">Finding all stacks of an app.</td>
</tr>
<tr>
  <td class="p-2 border">/cloudcamp/${appname}/_/codepipeline</td>
  <td class="p-2 border">Finding the main code pipeline.</td>
</tr>
<tr>
  <td class="p-2 border">/cloudcamp/${appname}/_/pipeline-stack</td>
  <td class="p-2 border">Finding the pipeline stack.</td>
</tr>
<tr>
  <td class="p-2 border">/cloudcamp/global/certificate/${domainname}</td>
  <td class="p-2 border">Storing the ARN of a certificate.</td>
</tr>
</tbody>
</table>

# CLI stacktraces

To print the stacktrace when there is an error in the command line interface,
set the `DEBUG` environment variable.
