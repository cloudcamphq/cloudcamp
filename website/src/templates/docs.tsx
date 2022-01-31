import { graphql, Link } from "gatsby";
import * as React from "react";
import Header from "../components/Header";
import Main from "../components/Main";
import SidebarLayout from "../components/SidebarLayout";
import HtmlWithCode from "../components/Code";
import _ from "lodash";
import Footer from "../components/Footer";
import { prepareTocData } from "../components/TableOfContents";

export default function Docs({
  data,
  pageContext,
}: {
  data: {
    markdownRemark: {
      html: string;
      frontmatter: { slug: string; title: string };
      headings: { value: string }[];
    };
  };
  pageContext: any;
}) {
  const [gettingStarted, operationsGuide, apiNodes, commandNodes] =
    prepareTocData({ data } as any);
  let html = data.markdownRemark.html;

  // @ts-ignore
  html = html.replaceAll(/<a/gm, `<a style="color: #d63200;" `);

  html = html.replace(/<h1>(.*?)<\/h1>/gm, (match, $1) => {
    const id = _.kebabCase($1);
    return `<h2 class="text-2xl font-bold mt-10 font-display" id="${id}"><a href="#${id}">${$1}</a></h2>`;
  });
  html = html.replace(/<h2>(.*?)<\/h2>/gm, (match, $1) => {
    const id = _.kebabCase($1);
    return `<h3 class="text-2xl font-bold mt-10 font-display" id="${id}"><a href="#${id}">${$1}</a></h3>`;
  });

  html = html.replace(/<ul>/gm, `<ul class="list-disc list-inside">`);
  html = html.replace(/<li>/gm, `<li class="py-1">`);

  const lvl0 = data.markdownRemark.frontmatter.slug.startsWith("/guide")
    ? "Using CloudCamp"
    : "Getting Started";

  return (
    <>
      <Header
        title={data.markdownRemark.frontmatter.title}
        canonical={"/docs/" + data.markdownRemark.frontmatter.slug}
      />
      <Main>
        <div id="algolia-lvl0">{lvl0}</div>
        <h1 className="font-display text-4xl font-bold flex items-center">
          {data.markdownRemark.frontmatter.title}
        </h1>
        <HtmlWithCode className="space-y-6 leading-7" html={html} />
        {data.markdownRemark.frontmatter.slug == "index" && (
          <>
            <h2
              className="text-2xl font-bold pt-7 font-display"
              id="table-of-contents"
            >
              <a href="#table-of-contents">Table of contents</a>
            </h2>
            <ul className="pt-2 ml-4">
              <li className="mb-8 font-medium">
                <Link style={{ color: "#d63200" }} to="/docs/">
                  {gettingStarted[0].frontmatter.title}
                </Link>
                <ul className="ml-4 text-base normal-case font-normal">
                  {gettingStarted.slice(1).map((node) => (
                    <li key={node.frontmatter.slug} className="mt-2">
                      <Link
                        style={{ color: "#d63200" }}
                        to={
                          node.frontmatter.slug == "index"
                            ? "/docs/"
                            : `/docs/${node.frontmatter.slug}`
                        }
                      >
                        {node.frontmatter.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
              <li className="mb-8 font-medium">
                <Link style={{ color: "#d63200" }} to={`/docs/guide/`}>
                  {operationsGuide[0].frontmatter.title}
                </Link>
                <ul className="ml-4 text-base normal-case font-normal">
                  {operationsGuide.slice(1).map((node) => (
                    <li key={node.frontmatter.slug} className="mt-2">
                      <Link
                        style={{ color: "#d63200" }}
                        to={`/docs/${node.frontmatter.slug}`}
                      >
                        {node.frontmatter.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
              <li className="mb-8 font-medium">
                <Link style={{ color: "#d63200" }} to={`/docs/api/`}>
                  API Reference
                </Link>
                <ul className="ml-4 text-base normal-case font-normal">
                  {apiNodes.map((node) => (
                    <li key={node.name} className="mt-2">
                      <Link
                        style={{ color: "#d63200" }}
                        to={`/docs/api/${_.kebabCase(node.name)}`}
                      >
                        {node.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
              <li className="mb-8 font-medium">
                <Link style={{ color: "#d63200" }} to={`/docs/command/`}>
                  Command Reference
                </Link>
                <ul className="ml-4 text-base normal-case font-normal">
                  {commandNodes.map((node) => (
                    <li key={node.name} className="mt-2">
                      <Link
                        style={{ color: "#d63200" }}
                        to={`/docs/command/${_.kebabCase(node.name)}`}
                      >
                        {node.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            </ul>
          </>
        )}
        {data.markdownRemark.frontmatter.slug == "guide/index" && (
          <>
            <h2 className="text-2xl font-bold pt-7 font-display" id="guide-toc">
              <a href="#table-of-contents">Table of contents</a>
            </h2>
            <ul className="pt-2 ml-4">
              <li className="mb-8 font-medium">
                <Link style={{ color: "#d63200" }} to={`/docs/guide/`}>
                  {operationsGuide[0].frontmatter.title}
                </Link>
                <ul className="ml-4 text-base normal-case font-normal">
                  {operationsGuide.slice(1).map((node) => (
                    <li key={node.frontmatter.slug} className="mt-2">
                      <Link
                        style={{ color: "#d63200" }}
                        to={`/docs/${node.frontmatter.slug}`}
                      >
                        {node.frontmatter.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            </ul>
          </>
        )}
        {data.markdownRemark.frontmatter.slug == "api/index" && (
          <>
            <h2
              className="text-2xl font-bold pt-7 font-display"
              id="table-of-contents"
            >
              <a href="#table-of-contents">Table of contents</a>
            </h2>
            <ul className="pt-2 ml-4">
              <li className="mb-8 font-medium">
                <Link style={{ color: "#d63200" }} to={`/docs/api/`}>
                  API Reference
                </Link>
                <ul className="ml-4 text-base normal-case font-normal">
                  {apiNodes.map((node) => (
                    <li key={node.name} className="mt-2">
                      <Link
                        style={{ color: "#d63200" }}
                        to={`/docs/api/${_.kebabCase(node.name)}`}
                      >
                        {node.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            </ul>
          </>
        )}
        {data.markdownRemark.frontmatter.slug == "command/index" && (
          <>
            <h2
              className="text-2xl font-bold pt-7 font-display"
              id="table-of-contents"
            >
              <a href="#table-of-contents">Table of contents</a>
            </h2>
            <ul className="pt-2 ml-4">
              <li className="mb-8 font-medium">
                <Link style={{ color: "#d63200" }} to={`/docs/command/`}>
                  Command Reference
                </Link>
                <ul className="ml-4 text-base normal-case font-normal">
                  {commandNodes.map((node) => (
                    <li key={node.name} className="mt-2">
                      <Link
                        style={{ color: "#d63200" }}
                        to={`/docs/command/${_.kebabCase(node.name)}`}
                      >
                        {node.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            </ul>
          </>
        )}
        <Footer links={pageContext.links} />
      </Main>
    </>
  );
}

Docs.Layout = SidebarLayout;

export const query = graphql`
  query DocsQuery($slug: String) {
    allApiDocs {
      nodes {
        ...tocApiDocsFields
      }
    }

    allCommandDocs {
      nodes {
        ...tocCommandDocsFields
      }
    }

    allMarkdownRemark {
      nodes {
        ...tocMarkdownFields
      }
    }

    markdownRemark(frontmatter: { slug: { eq: $slug } }) {
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
`;
