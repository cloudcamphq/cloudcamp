import "./src/styles/global.css";
import "@fontsource/karla/variable.css";
import "@fontsource/inter/variable.css";
import "prism-themes/themes/prism-ghcolors.css";

import React from "react";

export function wrapPageElement({ element, props }) {
  const Layout = element.type.Layout ?? React.Fragment;
  return <Layout {...props}>{element}</Layout>;
}
