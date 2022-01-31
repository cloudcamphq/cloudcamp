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
    (node) => node.frontmatter.category == "overview"
  );
  const operationsGuide = allNodes.filter(
    (node) => node.frontmatter.category == "guide"
  );

  return [allNodes, gettingStarted, operationsGuide];
}

function makeLinks(overview: any[], guide: any[], lastOverview: any) {
  const links = {};
  for (let nodes of [overview, guide]) {
    for (var i = 0; i < nodes.length; i++) {
      let node = nodes[i];
      let prev = undefined;
      let next = undefined;
      if (i != 0) {
        const prevNode = nodes[i - 1];
        let link = `/docs/${prevNode.frontmatter.slug}`;
        if (prevNode.frontmatter.slug == "index") {
          link = "/docs/";
        } else if (prevNode.frontmatter.slug == "guide/index") {
          link = "/docs/guide/";
        }
        prev = {
          link: link,
          title: prevNode.frontmatter.title,
        };
      } else if (guide.includes(node)) {
        prev = {
          link: `/docs/${lastOverview.allMarkdownRemark.nodes[0].frontmatter.slug}`,
          title: lastOverview.allMarkdownRemark.nodes[0].frontmatter.title,
        };
      }
      if (i + 1 < nodes.length) {
        const nextNode = nodes[i + 1];
        next = {
          link: `/docs/${nextNode.frontmatter.slug}`,
          title: nextNode.frontmatter.title,
        };
      } else if (overview.includes(node)) {
        next = {
          link: `/docs/guide/`,
          title: "Using CloudCamp",
        };
      } else if (guide.includes(node)) {
        next = {
          link: `/docs/api/`,
          title: "API Reference",
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

  const lastOverview = (
    await graphql(`
      query PrevItem {
        allMarkdownRemark(
          sort: { order: DESC, fields: frontmatter___order }
          filter: { frontmatter: { category: { eq: "overview" } } }
          limit: 1
        ) {
          nodes {
            frontmatter {
              title
              order
              slug
            }
          }
        }
      }
    `)
  ).data;

  const [allNodes, overview, guide] = sortedNodes(data.allMarkdownRemark.nodes);

  const links = makeLinks(overview, guide, lastOverview);

  allNodes.forEach((node) => {
    const onThisPage = extractOnThisPage(node);
    let pagePath = "/docs/" + node.frontmatter.slug;
    if (node.frontmatter.slug === "index") {
      pagePath = "/docs/";
    } else if (node.frontmatter.slug === "guide/index") {
      pagePath = "/docs/guide/";
    } else if (
      node.frontmatter.slug === "api/index" ||
      node.frontmatter.slug === "command/index"
    ) {
      return;
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
