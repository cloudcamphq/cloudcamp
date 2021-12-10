import React from "react";
import { Link, graphql } from "gatsby";
import { Disclosure, Menu, Transition } from "@headlessui/react";
import _ from "lodash";

interface ApiNode {
  name: string;
  kind?: string;
  docs?: { custom?: { order?: string; ignore?: string } };
  numericOrder?: number;
}

interface CommandNode {
  name: string;
  group: string;
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
}) {
  let highlighted = false;
  if (_.trimEnd(props.link, "/") === "/docs") {
    if (_.trimEnd(props.location.pathname, "/") === "/docs") {
      highlighted = true;
    }
  } else if (props.location.pathname.startsWith(props.link)) {
    highlighted = true;
  }
  return (
    <li key={props.uniqueKey}>
      <Link
        className={
          highlighted
            ? "flex items-center group py-2 px-4 text-sm rounded-md bg-indigo-50 text-indigo-800 font-medium"
            : "flex items-center group py-2 px-4 text-sm rounded-md text-gray-700 hover:bg-gray-100"
        }
        to={props.link}
      >
        <div className="flex-1">{props.title}</div>
      </Link>
    </li>
  );
}

export function prepareTocData({
  data,
}: {
  data: Toc;
}): [MarkdownNode[], MarkdownNode[], ApiNode[], CommandNode[]] {
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

  let commandNodes: CommandNode[] = Object.values(
    Object.values(_.groupBy(data.allCommandDocs.nodes, (n) => n.group)).map(
      (n) => ({
        name: n[0].group,
        group: n[0].group,
        order: n[0].order,
        numericOrder: n[0].numericOrder,
      })
    )
  );

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

  return [gettingStarted, operationsGuide, apiNodes, commandNodes];
}

const navigation = [
  { name: "Dashboard", href: "#", current: true },
  { name: "Team", href: "#", current: false },
  { name: "Projects", href: "#", current: false },
  { name: "Calendar", href: "#", current: false },
];

function MobileTableOfContentsItem(props: {
  title: string;
  // can't use the name 'key' because it is used internally by React.
  uniqueKey: string;
  link: string;
  location: any;
}) {
  let highlighted = false;
  if (_.trimEnd(props.link, "/") === "/docs") {
    if (_.trimEnd(props.location.pathname, "/") === "/docs") {
      highlighted = true;
    }
  } else if (props.location.pathname.startsWith(props.link)) {
    highlighted = true;
  }
  return (
    <Disclosure.Button
      key={props.uniqueKey}
      as="a"
      href={props.link}
      className={classNames(
        highlighted
          ? "bg-indigo-50 text-indigo-800"
          : "text-gray-700 hover:bg-gray-100",
        "flex h-10 pl-8 pr-4 py-2 text-base font-medium"
      )}
    >
      {props.title}
    </Disclosure.Button>
  );
}

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function MobileTableOfContents({
  data,
  onThisPage,
  location,
}: {
  data: Toc;
  onThisPage: any;
  location: any;
}) {
  let [gettingStarted, operationsGuide, apiNodes, commandNodes] =
    prepareTocData({
      data,
    });
  return (
    <Disclosure.Panel className="lg:hidden h-full overflow-y-auto border-b">
      <div className="pb-3">
        <div
          key="getting-started"
          className="pl-3 pr-4 py-2 text-xs h-10 flex items-center font-medium uppercase"
        >
          Getting Started
        </div>
        {gettingStarted.map((node) => (
          <MobileTableOfContentsItem
            key={node.frontmatter.slug}
            link={
              node.frontmatter.slug == "overview"
                ? "/docs/"
                : `/docs/${node.frontmatter.slug}`
            }
            uniqueKey={node.frontmatter.slug}
            title={node.frontmatter.title}
            location={location}
          />
        ))}
      </div>
      <div className="pb-3">
        <div
          key="using-cloudcamp"
          className="pl-3 pr-4 py-2 text-xs h-10 flex items-center font-medium uppercase"
        >
          Using CloudCamp
        </div>
        {operationsGuide.map((node) => (
          <MobileTableOfContentsItem
            key={node.frontmatter.slug}
            link={`/docs/${node.frontmatter.slug}`}
            uniqueKey={node.frontmatter.slug}
            title={node.frontmatter.title}
            location={location}
          />
        ))}
      </div>
      <div className="pb-3">
        <div
          key="api-reference"
          className="pl-3 pr-4 py-2 text-xs h-10 flex items-center font-medium uppercase"
        >
          API Reference
        </div>
        {apiNodes.map((node) => (
          <MobileTableOfContentsItem
            key={node.name}
            link={`/docs/api/${_.kebabCase(node.name)}`}
            uniqueKey={node.name}
            title={node.name}
            location={location}
          />
        ))}
      </div>
      <div className="pb-3">
        <div
          key="command-reference"
          className="pl-3 pr-4 py-2 text-xs h-10 flex items-center font-medium uppercase"
        >
          Command Reference
        </div>
        {commandNodes.map((node) => (
          <MobileTableOfContentsItem
            key={node.name}
            link={`/docs/command/${_.kebabCase(node.name)}`}
            uniqueKey={node.name}
            title={node.name}
            location={location}
          />
        ))}
      </div>
    </Disclosure.Panel>
  );
}

export function TableOfContents({
  data,
  onThisPage,
  location,
}: {
  data: Toc;
  onThisPage: any;
  location: any;
}) {
  let [gettingStarted, operationsGuide, apiNodes, commandNodes] =
    prepareTocData({
      data,
    });

  return (
    <>
      <nav>
        <h1 className="tracking-wide font-semibold text-xs uppercase py-2 px-4 ">
          Getting Started
        </h1>
        <ul>
          {gettingStarted.map((node) => (
            <TableOfContentsItem
              key={node.frontmatter.slug}
              link={
                node.frontmatter.slug == "overview"
                  ? "/docs/"
                  : `/docs/${node.frontmatter.slug}`
              }
              uniqueKey={node.frontmatter.slug}
              title={node.frontmatter.title}
              location={location}
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
              key={node.frontmatter.slug}
              link={`/docs/${node.frontmatter.slug}`}
              uniqueKey={node.frontmatter.slug}
              title={node.frontmatter.title}
              location={location}
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
              key={node.name}
              link={`/docs/api/${_.kebabCase(node.name)}`}
              uniqueKey={node.name}
              title={node.name}
              location={location}
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
              key={node.name}
              link={`/docs/command/${_.kebabCase(node.name)}`}
              uniqueKey={node.name}
              title={node.name}
              location={location}
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
    group
  }
`;
