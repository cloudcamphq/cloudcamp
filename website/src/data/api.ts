import * as jsiispec from "@jsii/spec";
let _ = require("lodash");
let path = require("path");

export function sortedPropsAndMethods(
  type: jsiispec.ClassType
): (jsiispec.Method | jsiispec.Property)[] {
  let propsAndMethods = [
    ...(type.initializer
      ? ([type.initializer] as jsiispec.Method[])
      : ([] as jsiispec.Method[])),
    ...(type.properties || []),
    ...(type.methods || []),
  ];
  propsAndMethods.sort((a, b) =>
    a.locationInModule.line > b.locationInModule.line ? 1 : -1
  );
  return propsAndMethods;
}

function extractOnThisPage(type: jsiispec.ClassType) {
  let propsAndMethods = sortedPropsAndMethods(type);

  let onThisPage = [];
  onThisPage.push({ title: "Usage", id: "usage", children: [] });

  let currentTopic = [];
  if (type.docs.summary) {
    onThisPage.push({
      title: "Overview",
      id: "overview",
      children: currentTopic,
    });
  }

  for (let item of propsAndMethods) {
    if (item.docs.custom.ignore) {
      continue;
    }
    if (item.docs.custom.topic) {
      currentTopic = [];
      onThisPage.push({
        title: item.docs.custom.topic,
        id: _.kebabCase(item.docs.custom.topic),
        children: currentTopic,
      });
    }
    let title = item.docs.custom.simpleSignature;
    if (item["parameters"] === undefined) {
      currentTopic.push({
        type: "P",
        title: title,
        id: _.kebabCase(item.name),
      });
    } else {
      currentTopic.push({
        type: item.name === undefined ? "C" : "M",
        title: title,
        id: item.name === undefined ? "constructor" : _.kebabCase(item.name),
      });
    }
  }

  return onThisPage;
}

function makeSlug(node: jsiispec.ClassType) {
  return _.kebabCase(node.name);
}

export function sortedNodes(nodes: jsiispec.ClassType[]) {
  nodes = nodes.filter(
    (node) =>
      !(node.docs && node.docs.custom && node.docs.custom.ignore) &&
      node.kind === "class"
  );
  nodes = _.sortBy(nodes, (node) => node.name);
  nodes = _.sortBy(nodes, (node) =>
    node.docs?.custom?.order ? parseInt(node.docs.custom.order) : 1000
  );
  return nodes;
}

function makeLinks(nodes: jsiispec.ClassType[]) {
  let links = {};
  for (var i = 0; i < nodes.length; i++) {
    let node = nodes[i];
    let prev = undefined;
    let next = undefined;
    if (i != 0) {
      let prevNode = nodes[i - 1];
      prev = { link: `/docs/api/${makeSlug(prevNode)}`, title: prevNode.name };
    }
    if (i + 1 < nodes.length) {
      let nextNode = nodes[i + 1];
      next = { link: `/docs/api/${makeSlug(nextNode)}`, title: nextNode.name };
    }
    links[makeSlug(node)] = { prev: prev, next: next };
  }
  return links;
}

export async function createPages(createPage: any, graphql: any) {
  const { data } = await graphql(`
    query AllClasses {
      allApiDocs {
        nodes {
          base
          datatype
          docs {
            custom {
              ignore
              order
              usage
            }
            remarks
            stability
            summary
          }
          fqn
          initializer {
            docs {
              custom {
                remarks
                topic
                signature
                simpleSignature
              }
              summary
            }
            locationInModule {
              filename
              line
            }
            parameters {
              docs {
                summary
              }
              name
              optional
              type {
                fqn
                primitive
              }
            }
          }
          kind
          properties {
            docs {
              custom {
                remarks
                topic
                ignore
                signature
                simpleSignature
              }
              remarks
              stability
              summary
            }
            immutable
            locationInModule {
              filename
              line
            }
            name
            static
            type {
              fqn
              primitive
            }
          }
          methods {
            docs {
              custom {
                remarks
                topic
                ignore
                signature
                simpleSignature
              }
              remarks
              stability
              summary
            }
            locationInModule {
              filename
              line
            }
            name
            parameters {
              docs {
                summary
              }
              name
              optional
              type {
                fqn
                primitive
              }
            }
            returns {
              type {
                fqn
              }
            }
            static
          }
          name
        }
      }
    }
  `);

  let nodes = sortedNodes(data.allApiDocs.nodes);
  let links = makeLinks(nodes);

  nodes.forEach((node) => {
    if (node.docs?.custom?.ignore) {
      return;
    }
    let slug = makeSlug(node);

    createPage({
      path: `/docs/api/${slug}`,
      component: path.resolve("./src/templates/api.tsx"),
      context: {
        className: node.name,
        onThisPage: extractOnThisPage(node),
        links: links[slug],
      },
    });
  });
}
