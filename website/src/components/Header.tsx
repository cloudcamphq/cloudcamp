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
      <title>{title + " - CloudCamp"}</title>
      {canonical && (
        <link rel="canonical" href={"{https://cloudcamphq.com" + canonical} />
      )}
      <link
        rel="preconnect"
        href="https://EQFJK7W42N-dsn.algolia.net"
        crossOrigin="true"
      />
    </Helmet>
  );
}
