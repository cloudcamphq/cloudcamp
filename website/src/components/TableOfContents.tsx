import React, { useState } from "react";
import { Link, graphql } from "gatsby";

import _ from "lodash";
import OnThisPage from "./OnThisPage";
import { ArrowRightIcon, ArrowLeftIcon } from "@heroicons/react/outline";

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

function TableOfContentsItem(props: {
  title: string;
  // can't use the name 'key' because it is used internally by React.
  uniqueKey: string;
  link: string;
  location: any;
  setShowOnThisPage: any;
}) {
  return (
    <li key={props.uniqueKey}>
      <Link
        className={
          props.location.pathname.startsWith(props.link)
            ? "flex items-center group py-2 px-4 text-sm rounded-md bg-indigo-50 text-indigo-800 font-medium"
            : "flex items-center group py-2 px-4 text-sm rounded-md text-gray-700 hover:bg-gray-100"
        }
        to={props.link}
      >
        <div className="flex-1">{props.title}</div>
        {props.location.pathname.startsWith(props.link) && (
          <ArrowRightIcon
            className="w-4 h-4 p-0.5  bg-indigo-400 text-white rounded-sm hidden group-hover:block"
            onClick={() => props.setShowOnThisPage(true)}
          />
        )}
      </Link>
    </li>
  );
}

export default function TableOfContents({
  data,
  onThisPage,
  location,
}: {
  data: Toc;
  onThisPage: any;
  location: any;
}) {
  const [showOnThisPage, setShowOnThisPage] = useState(false);

  console.log(onThisPage);

  if (showOnThisPage) {
    return (
      <>
        <nav>
          <h1 className="tracking-wide font-semibold text-xs uppercase py-2 px-4 flex items-center">
            <ArrowLeftIcon
              className="w-5 h-5 inline-block cursor-pointer"
              onClick={() => setShowOnThisPage(false)}
            />{" "}
            <div className="ml-2">On This Page</div>
          </h1>

          <OnThisPage onThisPage={onThisPage} />
        </nav>
      </>
    );
  }

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
          {gettingStarted.map((node) => (
            <TableOfContentsItem
              link={`/docs/${node.frontmatter.slug}`}
              uniqueKey={node.frontmatter.slug}
              title={node.frontmatter.title}
              location={location}
              setShowOnThisPage={setShowOnThisPage}
            />
          ))}
        </ul>
      </nav>
      <nav>
        <h1 className="tracking-wide font-semibold text-xs uppercase py-2 px-4">
          Using CloudCamp
        </h1>
        <ul>
          {operationsGuide.map((node) => (
            <TableOfContentsItem
              link={`/docs/${node.frontmatter.slug}`}
              uniqueKey={node.frontmatter.slug}
              title={node.frontmatter.title}
              location={location}
              setShowOnThisPage={setShowOnThisPage}
            />
          ))}
        </ul>
      </nav>
      <nav>
        <h1 className="tracking-wide font-semibold text-xs uppercase py-2 px-4">
          API Reference
        </h1>
        <ul>
          {apiNodes.map((node) => (
            <TableOfContentsItem
              link={`/docs/api/${_.kebabCase(node.name)}`}
              uniqueKey={node.name}
              title={node.name}
              location={location}
              setShowOnThisPage={setShowOnThisPage}
            />
          ))}
        </ul>
      </nav>
      <nav>
        <h1 className="tracking-wide font-semibold text-xs uppercase py-2 px-4">
          Command Reference
        </h1>
        <ul>
          {commandNodes.map((node) => (
            <TableOfContentsItem
              link={`/docs/command/${_.kebabCase(node.name)}`}
              uniqueKey={node.name}
              title={node.name}
              location={location}
              setShowOnThisPage={setShowOnThisPage}
            />
          ))}
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
