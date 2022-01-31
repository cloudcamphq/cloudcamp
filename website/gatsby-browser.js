import "./src/styles/global.css";
import "@fontsource/karla/variable.css";
import "@fontsource/inter/variable.css";
import "@fontsource/roboto-mono";
import "prism-themes/themes/prism-ghcolors.css";
import "@docsearch/css";

import React from "react";

export function wrapPageElement({ element, props }) {
  if (element.type.Layout) {
    return <element.type.Layout {...props}>{element}</element.type.Layout>;
  } else {
    return <React.Fragment>{element}</React.Fragment>;
  }
}
