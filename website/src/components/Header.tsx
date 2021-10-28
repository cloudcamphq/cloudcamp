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
      <title>{"cloudcamp - " + title}</title>
      {canonical && (
        <link rel="canonical" href={"{https://cloudcamphq.com" + canonical} />
      )}
    </Helmet>
  );
}
