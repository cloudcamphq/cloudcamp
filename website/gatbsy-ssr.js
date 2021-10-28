import React from "react";

export function wrapPageElement({ element, props }) {
  if (element.type.Layout) {
    return <element.type.Layout {...props}>{element}</element.type.Layout>;
  } else {
    return <React.Fragment>{element}</React.Fragment>;
  }
}
