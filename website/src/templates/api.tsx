import { graphql, Link } from "gatsby";
import React, { useContext } from "react";
import SidebarLayout from "../components/SidebarLayout";
import HtmlWithCode from "../components/Code";
import {
  JsiiDefinition,
  JsiiMethod,
  JsiiProperty,
  JsiiParameter,
} from "../../plugins/gatsby-api-source/api-source";
import _ from "lodash";
import Header from "../components/Header";
import Main from "../components/Main";
import Footer from "../components/Footer";
import { Context } from "../components/Store";

function sortedPropsAndMethods(
  type: JsiiDefinition
): (JsiiMethod | JsiiProperty)[] {
  let propsAndMethods = [
    ...(type.initializer ? [type.initializer] : []),
    ...(type.properties || []),
    ...(type.methods || []),
  ];
  propsAndMethods.sort((a, b) =>
    a.locationInModule.line > b.locationInModule.line ? 1 : -1
  );
  return propsAndMethods;
}

export default function Api({
  data,
  pageContext,
}: {
  data: {
    apiDocs: JsiiDefinition;
  };
  pageContext: any;
}) {
  return (
    <>
      <Header
        title={data.apiDocs.name + " API docs"}
        canonical={"/docs/api/" + _.kebabCase(data.apiDocs.name)}
      />
      <Main>
        <div className="space-y-6 leading-7">
          <ApiType type={data.apiDocs} key={data.apiDocs.name} />
        </div>
        <Footer links={pageContext.links} />
      </Main>
    </>
  );
}

Api.Layout = SidebarLayout;

function ApiType(props: { type: JsiiDefinition }) {
  let propsAndMethods = sortedPropsAndMethods(props.type);

  return (
    <div className="space-y-6 relative api">
      <H1Link title={props.type.name}>
        <span>{props.type.name}</span>
        <div className="text-white bg-blue-500 inline-block ml-4 text-base font-bold font-mono p-0.5 rounded-md pr-2 pl-2 uppercase">
          {props.type.kind}
        </div>
      </H1Link>

      {props.type.docs.summary && (
        <p
          className="border-b pb-5 border-gray-200"
          dangerouslySetInnerHTML={{ __html: props.type.docs.summary }}
        />
      )}

      <div className="space-y-6">
        <H2Link title="Usage">Usage</H2Link>
      </div>
      <HtmlWithCode html={props.type.docs.usage} />

      {props.type.docs.summary && (
        <div className="space-y-6">
          <H2Link title="Overview">Overview</H2Link>
        </div>
      )}
      {props.type.docs.remarks && (
        <HtmlWithCode className="space-y-6" html={props.type.docs.remarks} />
      )}
      {propsAndMethods.map((item) =>
        item["parameters"] === undefined ? (
          <ApiProperty
            key={props.type.name + "-" + item.name}
            klass={props.type.name}
            property={item as JsiiProperty}
          />
        ) : (
          <ApiMethod
            key={props.type.name + "-" + item.name}
            className={props.type.name}
            meth={item as JsiiMethod}
          />
        )
      )}
    </div>
  );
}

function H1Link(props: { title: string; children: any }) {
  let id = _.kebabCase(props.title);
  return (
    <h1 className="font-display text-4xl font-bold flex items-center" id={id}>
      <Link to={`#${id}`}>{props.children}</Link>
    </h1>
  );
}

function H2Link(props: { title: string; children: any }) {
  let id = _.kebabCase(props.title);
  return (
    <h2 className="text-2xl font-bold mt-10 font-display" id={id}>
      <Link to={`#${id}`}>{props.children}</Link>
    </h2>
  );
}

function ApiProperty(props: { klass: string; property: JsiiProperty }) {
  if (props.property.docs.custom.ignore) {
    return null;
  }
  return (
    <div className="space-y-6">
      {props.property.docs.custom.topic && (
        <H2Link title={props.property.docs.custom.topic}>
          {props.property.docs.custom.topic}
        </H2Link>
      )}
      {props.property.docs.custom.topic &&
        props.property.docs.custom.remarks && (
          <HtmlWithCode
            className="space-y-6 border-b pb-5 border-gray-200"
            html={props.property.docs.custom.remarks}
          />
        )}
      <div className="font-mono flex items-center">
        <h3 id={_.kebabCase(props.property.name)}>
          <a
            href={`#${_.kebabCase(props.property.name)}`}
            className="inline-flex"
          >
            <span className="table w-6 h-6 flex-none text-center rounded-md mr-3 text-white bg-green-500">
              <span className="table-cell align-middle font-bold">P</span>
            </span>
            <HtmlWithCode
              className="inline text-purple-900 font-bold"
              html={props.property.docs.signature}
            />
          </a>
        </h3>
      </div>
      {props.property.docs.summary && (
        <HtmlWithCode
          className="space-y-6"
          html={props.property.docs.summary}
        />
      )}
      {props.property.docs.remarks && (
        <HtmlWithCode
          className="space-y-6"
          html={props.property.docs.remarks}
        />
      )}
    </div>
  );
}

function ApiMethod(props: { className: string; meth: JsiiMethod }) {
  if (props.meth.docs.custom.ignore) {
    return null;
  }

  let cssMarkerColor = "";
  let markerSymbol = "";
  if (props.meth.name === undefined) {
    cssMarkerColor = "bg-blue-500";
    markerSymbol = "C";
  } else {
    cssMarkerColor = "bg-purple-500";
    markerSymbol = "M";
  }

  // @ts-ignore
  const [context] = useContext(Context);

  return (
    <div className="space-y-6">
      {props.meth.docs.custom.topic && (
        <H2Link title={props.meth.docs.custom.topic}>
          {props.meth.docs.custom.topic}
        </H2Link>
      )}
      {props.meth.docs.custom.topic && props.meth.docs.custom.remarks && (
        <HtmlWithCode
          className="space-y-6 border-b pb-5 border-gray-200"
          html={props.meth.docs.custom.remarks}
        />
      )}
      <div className="font-mono flex items-center">
        <h3 id={_.kebabCase(props.meth.name ? props.meth.name : "constructor")}>
          <a
            href={`#${_.kebabCase(
              props.meth.name ? props.meth.name : "constructor"
            )}`}
            className="inline-flex"
          >
            <span
              className={
                "table w-6 h-6 text-center rounded-md mr-3 flex-none text-white " +
                cssMarkerColor
              }
            >
              <span className="table-cell align-middle font-bold">
                {markerSymbol}
              </span>
            </span>
            <HtmlWithCode
              className="inline text-purple-900 font-bold"
              html={props.meth.docs.signature}
            />
          </a>
        </h3>
      </div>

      {props.meth.docs.summary && (
        <HtmlWithCode className="space-y-6" html={props.meth.docs.summary} />
      )}
      {props.meth.parameters && (
        <ul className="list-disc list-inside leading-7">
          {props.meth.parameters.map((param) => (
            <ApiArgument key={param.name} param={param} />
          ))}
        </ul>
      )}
      {props.meth.docs?.propsTable && (
        <>
          <div
            className="space-y-6"
            dangerouslySetInnerHTML={{ __html: props.meth.docs?.propsTable }}
          />
        </>
      )}
      {props.meth.docs.remarks && (
        <HtmlWithCode className="space-y-6" html={props.meth.docs.remarks} />
      )}
    </div>
  );
}

function ApiArgument(props: { param: JsiiParameter }) {
  // @ts-ignore
  const [context] = useContext(Context);

  return (
    <li>
      <span>
        <span className="font-mono text-sm bg-purple-100 text-purple-900 border border-purple-200 p-0.5 pl-1 pr-1 rounded-md mr-3">
          {props.param.name == "props" && context.language == "python"
            ? "**kwargs"
            : props.param.name}
        </span>
      </span>
      <HtmlWithCode
        className="space-y-6 inline"
        html={props.param.docs.summary}
      />
      {props.param.optional &&
        !_.lowerCase(props.param.docs.summary).includes("optional") && (
          <span className="ml-1 font-mono text-purple-900 text-xs">
            * Optional
          </span>
        )}
    </li>
  );
}

export const query = graphql`
  query ApiDocsQuery($className: String) {
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

    apiDocs(kind: { eq: "class" }, name: { eq: $className }) {
      base
      datatype
      docs {
        custom {
          ignore
        }
        remarks
        stability
        summary
        usage
      }
      fqn
      initializer {
        docs {
          custom {
            remarks
            topic
          }
          remarks
          summary
          signature
          simpleSignature
          propsTable
        }
        locationInModule {
          filename
          line
        }
        parameters {
          docs {
            summary
          }
          name
          optional
          type {
            fqn
            primitive
          }
        }
      }
      kind
      properties {
        docs {
          custom {
            remarks
            topic
            ignore
          }
          remarks
          signature
          simpleSignature
          stability
          summary
        }
        immutable
        locationInModule {
          filename
          line
        }
        name
        static
        type {
          fqn
          primitive
        }
      }
      methods {
        docs {
          custom {
            remarks
            topic
            ignore
          }
          remarks
          signature
          simpleSignature
          stability
          summary
          propsTable
        }
        locationInModule {
          filename
          line
        }
        name
        parameters {
          docs {
            summary
          }
          name
          optional
          type {
            fqn
            primitive
          }
        }
        returns {
          type {
            fqn
          }
        }
        static
      }
      name
    }
  }
`;
