import { graphql } from "gatsby";
import * as React from "react";
import Header from "../components/Header";
import Main from "../components/Main";
import SidebarLayout from "../components/SidebarLayout";
import HtmlWithCode from "../components/Code";
import _ from "lodash";
import Footer from "../components/Footer";

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
  let html = data.markdownRemark.html;

  // @ts-ignore
  html = html.replaceAll(/<a/gm, `<a class="text-purple-600" `);

  html = html.replace(/<h1>(.*?)<\/h1>/gm, (match, $1) => {
    let id = _.kebabCase($1);
    return `<h2 class="text-2xl font-bold mt-10 font-display" id="${id}"><a href="#${id}">${$1}</a></h2>`;
  });
  html = html.replace(/<h2>(.*?)<\/h2>/gm, (match, $1) => {
    let id = _.kebabCase($1);
    return `<h3 class="text-2xl font-bold mt-10 font-display" id="${id}"><a href="#${id}">${$1}</a></h3>`;
  });

  html = html.replace(/<ul>/gm, `<ul class="list-disc list-inside">`);
  html = html.replace(/<li>/gm, `<li class="py-1">`);

  return (
    <>
      <Header
        title={data.markdownRemark.frontmatter.title}
        canonical={"/docs/api/" + data.markdownRemark.frontmatter.slug}
      />
      <Main>
        <h1 className="font-display text-4xl font-bold flex items-center">
          {data.markdownRemark.frontmatter.title}
        </h1>
        <HtmlWithCode className="space-y-6 leading-7" html={html} />
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
