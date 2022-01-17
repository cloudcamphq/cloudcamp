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

  const gettingStarted = allNodes.filter(
    (node) => node.frontmatter.category == "getting-started"
  );
  const operationsGuide = allNodes.filter(
    (node) => node.frontmatter.category == "operations-guide"
  );

  return [allNodes, gettingStarted, operationsGuide];
}

function makeLinks(gettingStarted: any[], operationsGuide: any[]) {
  const links = {};
  for (let nodes of [gettingStarted, operationsGuide]) {
    for (var i = 0; i < nodes.length; i++) {
      let node = nodes[i];
      let prev = undefined;
      let next = undefined;
      if (i != 0) {
        const prevNode = nodes[i - 1];
        prev = {
          link: `/docs/${prevNode.frontmatter.slug}`,
          title: prevNode.frontmatter.title,
        };
      }
      if (i + 1 < nodes.length) {
        const nextNode = nodes[i + 1];
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
  const onThisPage = [];
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

  const [allNodes, gettingStarted, operationsGuide] = sortedNodes(
    data.allMarkdownRemark.nodes
  );

  const links = makeLinks(gettingStarted, operationsGuide);

  allNodes.forEach((node) => {
    const onThisPage = extractOnThisPage(node);
    let pagePath = "/docs/" + node.frontmatter.slug;
    if (node.frontmatter.slug === "overview") {
      pagePath = "/docs/";
    }
    createPage({
      path: pagePath,
      component: path.resolve("./src/templates/docs.tsx"),
      context: {
        slug: node.frontmatter.slug,
        onThisPage: onThisPage,
        links: links[node.frontmatter.slug],
      },
    });
  });
}
