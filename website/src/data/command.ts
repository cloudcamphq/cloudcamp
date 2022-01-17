import { CommandDefinition } from "../../plugins/gatsby-api-source/command-source";
let _ = require("lodash");
let path = require("path");

function makeSlug(groupName: string) {
  return _.kebabCase(groupName);
}

function sortedNodes(nodes: CommandDefinition[]) {
  nodes = _.sortBy(nodes, (node) => node.name);
  nodes = _.sortBy(nodes, (node) =>
    node.suborder ? parseInt(node.suborder) : 1000
  );
  nodes = _.filter(nodes, (node) => !node.ignore);
  return nodes;
}

function groupedNodes(nodes: CommandDefinition[]): CommandDefinition[][] {
  let grouped: CommandDefinition[][] = Object.values(
    _.groupBy(nodes, (n) => n.group)
  );
  grouped = _.sortBy(grouped, (n) =>
    n[0].order ? parseInt(n[0].order) : 1000
  );
  grouped = grouped.map((n) => sortedNodes(n));
  return grouped;
}

function makeLinks(nodes: CommandDefinition[][]) {
  const links = {};
  for (var i = 0; i < nodes.length; i++) {
    let group = nodes[i];
    let prev = undefined;
    let next = undefined;
    if (i != 0) {
      const prevGroup = nodes[i - 1];
      prev = {
        link: `/docs/command/${makeSlug(prevGroup[0].group)}`,
        title: prevGroup[0].group,
      };
    }
    if (i + 1 < nodes.length) {
      const nextGroup = nodes[i + 1];
      next = {
        link: `/docs/command/${makeSlug(nextGroup[0].group)}`,
        title: nextGroup[0].group,
      };
    }
    links[makeSlug(group[0].group)] = { prev: prev, next: next };
  }
  return links;
}

function extractOnThisPage(group: CommandDefinition[]) {
  const onThisPage = [];

  for (let node of group) {
    const children = [];
    let name = node.name;

    if (name.includes(":") && name.split(":")[1] == "index") {
      name = name.split(":")[0];
    }
    const id = name.replace(/:/g, "-");
    onThisPage.push({ title: name, id: id, children: children });

    children.push({
      title: "Usage",
      id: `${id}-usage`,
      children: [],
    });

    children.push({
      title: "Arguments",
      id: `${id}-arguments`,
      children: [],
    });

    var re = /<h1(.*?)>(.*?)<\/h1>/g;
    var m: any;
    while ((m = re.exec(node.description))) {
      children.push({
        title: m[2],
        id: id + "-" + _.kebabCase(m[2]),
        children: [],
      });
    }
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
          suborder
          ignore
          group
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

  const groups = groupedNodes(data.allCommandDocs.nodes);
  const links = makeLinks(groups);

  groups.forEach((group) => {
    const onThisPage = extractOnThisPage(group);
    const slug = makeSlug(group[0].group);

    createPage({
      path: `/docs/command/${slug}`,
      component: path.resolve("./src/templates/command.tsx"),
      context: {
        name: group[0].group,
        onThisPage: onThisPage,
        links: links[slug],
      },
    });
  });
}
