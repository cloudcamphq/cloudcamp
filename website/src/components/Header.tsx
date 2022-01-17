import * as React from "react";
import { Helmet } from "react-helmet";

export default function Header({
  title,
  canonical,
}: {
  title: string;
  canonical?: string;
}) {
  return (
    // @ts-ignore
    <Helmet>
      <meta charSet="utf-8" />
      <meta name="theme-color" content="#ffffff" />
      <title>{"CloudCamp - " + title}</title>
      {canonical && (
        <link rel="canonical" href={"{https://cloudcamphq.com" + canonical} />
      )}
      {/* <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/@docsearch/js@alpha/dist/cdn/docsearch.min.css"
      />
      <script src="https://cdn.jsdelivr.net/npm/@docsearch/js@alpha"></script>
      <script type="text/javascript">
        {`
        window.docsearch && docsearch(
        {
          appId: "EQFJK7W42N",
          apiKey: "e5a0500d315666c971300f4d8d9f3609",
          indexName: "cloudcamphq",
          container: "div",
          debug: false,
        }
        );`}
      </script> */}
    </Helmet>
  );
}
