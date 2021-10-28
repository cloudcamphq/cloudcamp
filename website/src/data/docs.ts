let _ = require("lodash");
let path = require("path");

function sortedNodes(nodes: any[]) {
  let allNodes = nodes.filter(
    (node) =>
      node.frontmatter && node.frontmatter.slug && node.frontmatter.title
  );
  allNodes = _.sortBy(allNodes, (node) => node.frontmatter.slug);
  allNodes = _.sortBy(allNodes, (node) =>
    node.frontmatter?.order ? parseInt(node.frontmatter.order) : 1000
  );

  let gettingStarted = allNodes.filter(
    (node) => node.frontmatter.category == "getting-started"
  );
  let operationsGuide = allNodes.filter(
    (node) => node.frontmatter.category == "operations-guide"
  );

  return [allNodes, gettingStarted, operationsGuide];
}

function makeLinks(gettingStarted: any[], operationsGuide: any[]) {
  let links = {};
  for (let nodes of [gettingStarted, operationsGuide]) {
    for (var i = 0; i < nodes.length; i++) {
      let node = nodes[i];
      let prev = undefined;
      let next = undefined;
      if (i != 0) {
        let prevNode = nodes[i - 1];
        prev = {
          link: `/docs/${prevNode.frontmatter.slug}`,
          title: prevNode.frontmatter.title,
        };
      }
      if (i + 1 < nodes.length) {
        let nextNode = nodes[i + 1];
        next = {
          link: `/docs/${nextNode.frontmatter.slug}`,
          title: nextNode.frontmatter.title,
        };
      }
      links[node.frontmatter.slug] = { prev: prev, next: next };
    }
  }
  return links;
}

function extractOnThisPage(node: any) {
  let onThisPage = [];
  for (let item of node.headings) {
    onThisPage.push({
      title: item.value,
      id: _.kebabCase(item.value),
      children: [],
    });
  }
  return onThisPage;
}

export async function createPages(createPage: any, graphql: any) {
  const { data } = await graphql(`
    query AllDocs {
      allMarkdownRemark {
        nodes {
          frontmatter {
            category
            order
            slug
            title
          }
          headings(depth: h1) {
            value
          }
          html
        }
      }
    }
  `);

  let [allNodes, gettingStarted, operationsGuide] = sortedNodes(
    data.allMarkdownRemark.nodes
  );

  let links = makeLinks(gettingStarted, operationsGuide);

  allNodes.forEach((node) => {
    let onThisPage = extractOnThisPage(node);
    createPage({
      path: "/docs/" + node.frontmatter.slug,
      component: path.resolve("./src/templates/docs.tsx"),
      context: {
        slug: node.frontmatter.slug,
        onThisPage: onThisPage,
        links: links[node.frontmatter.slug],
      },
    });
  });
}
