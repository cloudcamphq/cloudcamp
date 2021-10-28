import React from "react";
import { Link, graphql } from "gatsby";

import _ from "lodash";

interface ApiNode {
  name: string;
  kind?: string;
  docs?: { custom?: { order?: string; ignore?: string } };
  numericOrder?: number;
}

interface CommandNode {
  name: string;
  order?: string;
  numericOrder?: number;
}

interface MarkdownNode {
  frontmatter?: {
    slug?: string;
    title?: string;
    order?: string;
    category?: string;
  };
}

interface Toc {
  allApiDocs: {
    nodes: ApiNode[];
  };
  allCommandDocs: {
    nodes: CommandNode[];
  };
  allMarkdownRemark: {
    nodes: MarkdownNode[];
  };
}

export default function TableOfContents({
  data,
  location,
}: {
  data: Toc;
  location: any;
}) {
  let docNodes = data.allMarkdownRemark.nodes.filter(
    (node) =>
      node.frontmatter && node.frontmatter.slug && node.frontmatter.title
  );
  docNodes = _.sortBy(docNodes, (node) => node.frontmatter.slug);
  docNodes = _.sortBy(docNodes, (node) =>
    node.frontmatter?.order ? parseInt(node.frontmatter.order) : 1000
  );

  let gettingStarted: MarkdownNode[] = docNodes.filter(
    (node) => node.frontmatter.category == "getting-started"
  );
  let operationsGuide: MarkdownNode[] = docNodes.filter(
    (node) => node.frontmatter.category == "operations-guide"
  );

  let commandNodes: CommandNode[] = data.allCommandDocs.nodes;
  commandNodes = _.sortBy(commandNodes, (node) => node.name);
  commandNodes = _.sortBy(commandNodes, (node) =>
    node.order ? parseInt(node.order) : 1000
  );

  let apiNodes: ApiNode[] = data.allApiDocs.nodes.filter(
    (node) =>
      !(node.docs && node.docs.custom && node.docs.custom.ignore) &&
      node.kind === "class"
  );

  apiNodes = _.sortBy(apiNodes, (node) => node.name);
  apiNodes = _.sortBy(apiNodes, (node) =>
    node.docs?.custom?.order ? parseInt(node.docs.custom.order) : 1000
  );

  return (
    <>
      <nav>
        <h1 className="tracking-wide font-semibold text-xs uppercase py-2 px-4">
          Getting Started
        </h1>
        <ul>
          {gettingStarted.map((node) => {
            let className: string;
            let link = `/docs/${node.frontmatter.slug}`;
            if (location.pathname.startsWith(link)) {
              className =
                "text-sm rounded-md bg-indigo-50 text-indigo-800 font-medium";
            } else {
              className = "text-sm rounded-md text-gray-700 hover:bg-gray-100";
            }
            return (
              <li className={className} key={node.frontmatter.slug}>
                <Link className="block py-2 px-4" to={link}>
                  {node.frontmatter.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <nav>
        <h1 className="tracking-wide font-semibold text-xs uppercase py-2 px-4">
          Using cloudcamp
        </h1>
        <ul>
          {operationsGuide.map((node) => {
            let className: string;
            let link = `/docs/${node.frontmatter.slug}`;
            if (location.pathname.startsWith(link)) {
              className =
                "text-sm rounded-md bg-indigo-50 text-indigo-800 font-medium";
            } else {
              className = "text-sm rounded-md text-gray-700 hover:bg-gray-100";
            }
            return (
              <li className={className} key={node.frontmatter.slug}>
                <Link className="block py-2 px-4" to={link}>
                  {node.frontmatter.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <nav>
        <h1 className="tracking-wide font-semibold text-xs uppercase py-2 px-4">
          API Reference
        </h1>
        <ul>
          {apiNodes.map((node) => {
            let className: string;
            let link = `/docs/api/${_.kebabCase(node.name)}`;
            if (location.pathname.startsWith(link)) {
              className =
                "text-sm rounded-md bg-indigo-50 text-indigo-800 font-medium";
            } else {
              className = "text-sm rounded-md text-gray-700 hover:bg-gray-100";
            }
            return (
              <li className={className} key={node.name}>
                <Link className="block py-2 px-4" to={link}>
                  {node.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <nav>
        <h1 className="tracking-wide font-semibold text-xs uppercase py-2 px-4">
          Command Reference
        </h1>
        <ul>
          {commandNodes.map((node) => {
            let className: string;
            let link = `/docs/command/${_.kebabCase(node.name)}`;
            if (location.pathname.startsWith(link)) {
              className =
                "text-sm rounded-md bg-indigo-50 text-indigo-800 font-medium";
            } else {
              className = "text-sm rounded-md text-gray-700 hover:bg-gray-100";
            }
            return (
              <li className={className} key={node.name}>
                <Link className="block py-2 px-4" to={link}>
                  {node.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

export const tocMarkdownFields = graphql`
  fragment tocMarkdownFields on MarkdownRemark {
    frontmatter {
      slug
      title
      order
      category
    }
  }
`;

export const tocApiDocsFields = graphql`
  fragment tocApiDocsFields on ApiDocs {
    kind
    name
    docs {
      custom {
        order
        ignore
      }
    }
  }
`;

export const tocCommandDocsFields = graphql`
  fragment tocCommandDocsFields on CommandDocs {
    name
    order
  }
`;
