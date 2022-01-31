import React from "react";
import { detect } from "detect-browser";
import { DocSearch } from "@docsearch/react";

export default function SearchButton(props?: { noml?: boolean }) {
  const browser = detect();

  let shortcut: string | undefined = undefined;

  switch (browser.os) {
    case "iOS":
    case "android":
    case "Android OS":
      break;

    case "Mac OS":
      shortcut = "⌘K";
      break;

    default:
      shortcut = "Ctrl K";
      break;
  }

  let ml = "ml-3";
  if (props?.noml === false) {
    ml = "";
  }

  return (
    <div className={ml + " flex-1 flex"}>
      <DocSearch
        appId="EQFJK7W42N"
        indexName="cloudcamphq"
        apiKey="e5a0500d315666c971300f4d8d9f3609"
        placeholder="Search Documentation"
      />
    </div>
  );
}
