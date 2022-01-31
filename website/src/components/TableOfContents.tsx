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

function isItemHighlighted(link: string, pathname: string) {
  const indexPaths = ["/docs", "/docs/guide", "/docs/api", "/docs/command"];
  link = _.trimEnd(link, "/");
  pathname = _.trimEnd(pathname, "/");
  if (indexPaths.includes(link)) {
    return link === pathname;
  } else {
    return pathname.startsWith(link);
  }
}

function TableOfContentsItem(props: {
  title: string;
  // can't use the name 'key' because it is used internally by React.
  uniqueKey: string;
  link: string;
  location: any;
  className?: string;
}) {
  let highlighted = isItemHighlighted(props.link, props.location.pathname);

  const className = props.className ? props.className + " " : "text-sm ";
  return (
    <li key={props.uniqueKey}>
      <Link
        className={
          className +
          (highlighted
            ? "flex items-center group py-2 px-4 rounded-md bg-indigo-50 text-indigo-800 font-medium"
            : "flex items-center group py-2 px-4 rounded-md text-gray-700 hover:bg-gray-100")
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

  const gettingStarted: MarkdownNode[] = docNodes.filter(
    (node) => node.frontmatter.category == "overview"
  );
  const operationsGuide: MarkdownNode[] = docNodes.filter(
    (node) => node.frontmatter.category == "guide"
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

function MobileTableOfContentsItem(props: {
  title: string;
  // can't use the name 'key' because it is used internally by React.
  uniqueKey: string;
  link: string;
  location: any;
  className?: string;
}) {
  let highlighted = isItemHighlighted(props.link, props.location.pathname);

  const className = props.className ? props.className + " " : "text-base pl-8 ";

  return (
    <Disclosure.Button
      key={props.uniqueKey}
      as="a"
      href={props.link}
      className={classNames(
        highlighted
          ? "bg-indigo-50 text-indigo-800"
          : "text-gray-700 hover:bg-gray-100",
        "flex h-10 pr-4 py-2 font-medium",
        className
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
  const [gettingStarted, operationsGuide, apiNodes, commandNodes] =
    prepareTocData({
      data,
    });
  return (
    <Disclosure.Panel className="lg:hidden h-full overflow-y-auto border-b">
      <div className="pb-3">
        <MobileTableOfContentsItem
          key={gettingStarted[0].frontmatter.slug}
          link="/docs/"
          uniqueKey={gettingStarted[0].frontmatter.slug}
          title={gettingStarted[0].frontmatter.title}
          location={location}
          className="font-medium uppercase pl-3 text-xs flex items-center  h-10"
        />

        {gettingStarted.slice(1).map((node) => (
          <MobileTableOfContentsItem
            key={node.frontmatter.slug}
            link={
              node.frontmatter.slug == "index"
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
        <MobileTableOfContentsItem
          key={operationsGuide[0].frontmatter.slug}
          link={`/docs/guide/`}
          uniqueKey={operationsGuide[0].frontmatter.slug}
          title={operationsGuide[0].frontmatter.title}
          location={location}
          className="font-medium uppercase pl-3 text-xs flex items-center  h-10"
        />
        {operationsGuide.slice(1).map((node) => (
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
        <MobileTableOfContentsItem
          key="api-reference"
          link="/docs/api/"
          uniqueKey="api-reference"
          title="API Reference"
          location={location}
          className="font-medium uppercase pl-3 text-xs flex items-center  h-10"
        />
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
        <MobileTableOfContentsItem
          key="command-reference"
          link="/docs/command/"
          uniqueKey="command-reference"
          title="Command Reference"
          location={location}
          className="font-medium uppercase pl-3 text-xs flex items-center  h-10"
        />
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
  const [gettingStarted, operationsGuide, apiNodes, commandNodes] =
    prepareTocData({
      data,
    });

  return (
    <>
      <nav>
        <ul>
          <TableOfContentsItem
            key={gettingStarted[0].frontmatter.slug}
            link="/docs/"
            uniqueKey={gettingStarted[0].frontmatter.slug}
            title={gettingStarted[0].frontmatter.title}
            location={location}
            className="tracking-wide font-semibold text-xs uppercase"
          />
          {gettingStarted.slice(1).map((node) => (
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
        <ul>
          <TableOfContentsItem
            key={operationsGuide[0].frontmatter.slug}
            link={`/docs/guide/`}
            uniqueKey={operationsGuide[0].frontmatter.slug}
            title={operationsGuide[0].frontmatter.title}
            location={location}
            className="tracking-wide font-semibold text-xs uppercase"
          />
          {operationsGuide.slice(1).map((node) => (
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
        <ul>
          <TableOfContentsItem
            key="docs-index"
            link="/docs/api/"
            uniqueKey="docs-index"
            title="API Reference"
            location={location}
            className="tracking-wide font-semibold text-xs uppercase"
          />
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
        <ul>
          <TableOfContentsItem
            key="command-index"
            link="/docs/command/"
            uniqueKey="command-index"
            title="Command Reference"
            location={location}
            className="tracking-wide font-semibold text-xs uppercase"
          />
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
