import { CommandDefinition } from "../../plugins/gatsby-api-source/command-source";
let _ = require("lodash");
let path = require("path");

function makeSlug(node: CommandDefinition) {
  return _.kebabCase(node.name);
}

function sortedNodes(nodes: CommandDefinition[]) {
  nodes = _.sortBy(nodes, (node) => node.name);
  nodes = _.sortBy(nodes, (node) => (node.order ? parseInt(node.order) : 1000));
  return nodes;
}

function makeLinks(nodes: CommandDefinition[]) {
  let links = {};
  for (var i = 0; i < nodes.length; i++) {
    let node = nodes[i];
    let prev = undefined;
    let next = undefined;
    if (i != 0) {
      let prevNode = nodes[i - 1];
      prev = {
        link: `/docs/command/${makeSlug(prevNode)}`,
        title: prevNode.name,
      };
    }
    if (i + 1 < nodes.length) {
      let nextNode = nodes[i + 1];
      next = {
        link: `/docs/command/${makeSlug(nextNode)}`,
        title: nextNode.name,
      };
    }
    links[makeSlug(node)] = { prev: prev, next: next };
  }
  return links;
}

function extractOnThisPage(node: CommandDefinition) {
  let onThisPage = [];

  onThisPage.push({
    title: "Usage",
    id: "usage",
    children: [],
  });

  let children = [];
  if (node.flags) {
    children = node.flags.map((flag) => ({
      type: "F",
      title: `--${flag.name}`,
      id: _.kebabCase(flag.name),
    }));
  }

  onThisPage.push({
    title: "Arguments",
    id: "arguments",
    children: children,
  });

  var re = /<h1(.*?)>(.*?)<\/h1>/g;
  var m: any;
  while ((m = re.exec(node.description))) {
    onThisPage.push({
      title: m[2],
      id: _.kebabCase(m[2]),
      children: [],
    });
  }
  return onThisPage;
}

export async function createPages(createPage, graphql) {
  const { data } = await graphql(`
    query AllCommands {
      allCommandDocs {
        nodes {
          name
          order
          summary
          description
          flags {
            char
            default
            description
            name
            required
            type
            overview
          }
        }
      }
    }
  `);

  let nodes = sortedNodes(data.allCommandDocs.nodes);
  let links = makeLinks(nodes);

  nodes.forEach((node) => {
    let onThisPage = extractOnThisPage(node);
    let slug = makeSlug(node);

    createPage({
      path: `/docs/command/${slug}`,
      component: path.resolve("./src/templates/command.tsx"),
      context: { name: node.name, onThisPage: onThisPage, links: links[slug] },
    });
  });
}
