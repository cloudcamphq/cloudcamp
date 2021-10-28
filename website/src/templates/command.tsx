import { graphql, Link } from "gatsby";
import * as React from "react";
import Header from "../components/Header";
import Main from "../components/Main";
import SidebarLayout from "../components/SidebarLayout";
import HtmlWithCode from "../components/Code";
import _ from "lodash";

import { CommandDefinition } from "../../plugins/gatsby-api-source/command-source";
import Footer from "../components/Footer";

export default function Command({
  data,
  pageContext,
}: {
  data: {
    commandDocs: CommandDefinition;
  };
  pageContext: any;
}) {
  let usage = `
    <div class="gatsby-highlight" data-language="bash">
      <pre class="language-bash"><code class="language-bash">$ <span class="token function">camp</span> ${data.commandDocs.name}</code></pre>
    </div>
  `;
  let html = data.commandDocs.description;

  if (html) {
    // @ts-ignore
    html = html.replaceAll(/<a/gm, `<a class="text-purple-900 underline" `);

    html = html.replace(/<h2(.*?)>(.*?)<\/h2>/gm, (match, $1, $2) => {
      let id = _.kebabCase($2);
      return `<h3 class="text-2xl font-bold mt-10 font-display" id="${id}"><a href="#${id}">${$2}</a></h3>`;
    });

    html = html.replace(/<h1(.*?)>(.*?)<\/h1>/gm, (match, $1, $2) => {
      let id = _.kebabCase($2);
      return `<h2 class="text-2xl font-bold mt-10 font-display" id="${id}"><a href="#${id}">${$2}</a></h2>`;
    });
  }
  return (
    <div className="leading-7">
      <Header
        title={data.commandDocs.name + " command"}
        canonical={"/docs/" + _.kebabCase(data.commandDocs.name)}
      />
      <Main>
        <h1 className="font-display text-4xl font-bold flex items-center">
          camp {data.commandDocs.name}
        </h1>
        <p className="border-b pb-5 border-gray-200">
          {data.commandDocs.summary}
        </p>
        <div className="space-y-6">
          <H2Link title="Usage">Usage</H2Link>
        </div>
        <HtmlWithCode html={usage} />
        <div className="space-y-6">
          <H2Link title="Arguments">Arguments</H2Link>
        </div>
        {data.commandDocs.flags.length === 0 && (
          <p>This command takes no arguments</p>
        )}

        {data.commandDocs.flags.length !== 0 && (
          <div className="space-y-6">
            {data.commandDocs.flags.map((flag) => (
              <div key={flag.name} className="space-y-6">
                <h2 id={_.kebabCase(flag.name)}>
                  <a href={"#" + _.kebabCase(flag.name)}>
                    <div className="flex">
                      {flag.char && (
                        <div className="bg-purple-100 rounded-md p-0.5 px-1 border border-purple-200 text-sm font-mono text-purple-900 whitespace-nowrap mr-3">
                          {"-" + flag.char + ", "}
                        </div>
                      )}
                      <div className="bg-purple-100 rounded-md p-0.5 px-1 border border-purple-200 text-sm font-mono text-purple-900 whitespace-nowrap">
                        --{flag.name}
                        {flag.type == "string" && "=" + flag.name}
                      </div>
                    </div>
                  </a>
                </h2>

                {flag.description && <div>{flag.description}</div>}
                {flag.overview && (
                  <HtmlWithCode html={flag.overview} className="space-y-6" />
                )}
              </div>
            ))}
          </div>
        )}
        {html && <HtmlWithCode html={html} className="space-y-6" />}
        <Footer links={pageContext.links} />
      </Main>
    </div>
  );
}

Command.Layout = SidebarLayout;

function H2Link(props: { title: string; children: any }) {
  let id = _.kebabCase(props.title);
  return (
    <h2 className="text-2xl font-bold mt-10 font-display" id={id}>
      <Link to={`#${id}`}>{props.children}</Link>
    </h2>
  );
}

export const query = graphql`
  query CommandQuery($name: String) {
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

    commandDocs(name: { eq: $name }) {
      name
      order
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
`;
