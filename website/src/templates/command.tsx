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
    commandDocs: {
      nodes: CommandDefinition[];
    };
  };
  pageContext: any;
}) {
  let nodes = _.sortBy(data.commandDocs.nodes, (node) =>
    node.suborder ? parseInt(node.suborder) : 1000
  );
  nodes = _.filter(nodes, (node) => !node.ignore);

  return (
    <>
      <Header
        title={pageContext.name + " command"}
        canonical={"/docs/" + _.kebabCase(pageContext.name)}
      />
      <Main>
        <div className="space-y-20 leading-7">
          {nodes.map((node) => (
            <CommandItem command={node} key={node.name} />
          ))}
        </div>
        <Footer links={pageContext.links} />
      </Main>
    </>
  );
}

Command.Layout = SidebarLayout;

function CommandItem(props: { command: CommandDefinition }) {
  let command = props.command;
  console.log(command);
  let name = command.name;
  if (name.includes(":") && name.split(":")[1] == "index") {
    name = name.split(":")[0];
  }
  let id = _.kebabCase(name);
  let usage = `
    <div class="gatsby-highlight" data-language="bash">
      <pre class="language-bash"><code class="language-bash">$ <span class="token function">camp</span> ${name}${
    command.args && " " + command.args.map((a) => a.name).join(" ")
  }</code></pre>
    </div>
  `;
  let html = command.description;

  if (html) {
    // @ts-ignore
    html = html.replaceAll(/<a/gm, `<a class="text-purple-900 underline" `);

    html = html.replace(/<h2(.*?)>(.*?)<\/h2>/gm, (match, $1, $2) => {
      let locid = id + "-" + _.kebabCase($2);
      return `<h3 class="text-2xl font-bold mt-10 font-display" id="${locid}"><a href="#${locid}">${$2}</a></h3>`;
    });

    html = html.replace(/<h1(.*?)>(.*?)<\/h1>/gm, (match, $1, $2) => {
      let locid = id + "-" + _.kebabCase($2);
      return `<h2 class="text-2xl font-bold mt-10 font-display" id="${locid}"><a href="#${locid}">${$2}</a></h2>`;
    });

    html = html.replace(
      /<pre>/g,
      `<div class="gatsby-highlight" data-language="bash"><pre class="language-bash">`
    );
    html = html.replace(/<\/pre>/g, "</pre></div>");
  }
  return (
    <div className="space-y-6 leading-7">
      <h2 className="font-display text-4xl font-bold flex items-center" id={id}>
        <Link to={`#${id}`}>camp {name}</Link>
      </h2>
      <p className="border-b pb-5 border-gray-200">{command.summary}</p>
      <div className="space-y-6">
        <H2Link title="Usage" id={id + "-usage"}>
          Usage
        </H2Link>
      </div>
      <HtmlWithCode html={usage} />
      <div className="space-y-6">
        <H2Link title="Arguments" id={id + "-arguments"}>
          Arguments
        </H2Link>
      </div>
      {command.flags.length === 0 && command.args.length === 0 && (
        <p>This command takes no arguments</p>
      )}

      {command.args.length !== 0 && (
        <div className="space-y-6">
          {command.args.map((arg) => (
            <div key={arg.name} className="space-y-6">
              <h2 id={id + "-" + _.kebabCase(arg.name)}>
                <a href={"#" + id + "-" + _.kebabCase(arg.name)}>
                  <div className="flex items-center mb-1">
                    <div
                      className="rounded-md text-sm font-mono font-semibold whitespace-nowrap mr-3"
                      style={{
                        color: "rgb(214, 50, 0)",
                      }}
                    >
                      {arg.name}
                    </div>
                  </div>
                </a>
                {arg.description && <div className="">{arg.description}</div>}
                {/* {flag.overview && (
                    <HtmlWithCode
                      html={flag.overview}
                      className="space-y-6 mt-1 "
                    />
                  )} */}
              </h2>
            </div>
          ))}
          {command.flags
            .filter((f) => f.name != "help")
            .map((flag) => (
              <div key={flag.name} className="space-y-6">
                <h2 id={id + "-" + _.kebabCase(flag.name)}>
                  <a href={"#" + id + "-" + _.kebabCase(flag.name)}>
                    <div className="flex items-center mb-1">
                      {flag.char && (
                        <div
                          className="rounded-md text-sm font-mono font-semibold whitespace-nowrap mr-3"
                          style={{
                            color: "rgb(214, 50, 0)",
                          }}
                        >
                          {"-" + flag.char + ", "}
                        </div>
                      )}
                      <div
                        className="rounded-md text-sm font-mono font-semibold whitespace-nowrap mr-3"
                        style={{
                          color: "rgb(214, 50, 0)",
                        }}
                      >
                        --{flag.name}
                        {flag.type == "string" && "=" + flag.name}
                      </div>
                    </div>
                  </a>
                  {flag.description && (
                    <div className="">{flag.description}</div>
                  )}
                  {flag.overview && (
                    <HtmlWithCode
                      html={flag.overview}
                      className="space-y-6 mt-1 "
                    />
                  )}
                </h2>
              </div>
            ))}
        </div>
      )}
      {html && <HtmlWithCode html={html} className="space-y-6" />}
    </div>
  );
}

function H2Link(props: { title: string; id?: string; children: any }) {
  let id = props.id || _.kebabCase(props.title);
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

    allMarkdownRemark {
      nodes {
        ...tocMarkdownFields
      }
    }

    allCommandDocs {
      nodes {
        ...tocCommandDocsFields
      }
    }

    commandDocs: allCommandDocs(filter: { group: { eq: $name } }) {
      nodes {
        name
        order
        suborder
        ignore
        summary
        description
        args {
          name
          description
        }
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
  }
`;
