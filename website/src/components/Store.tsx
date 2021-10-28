import React, { createContext, useReducer } from "react";
import Cookies from "js-cookie";

const Reducer = (
  state: { language: string },
  action: { type: string; payload: string }
) => {
  switch (action.type) {
    case "SET_LANGUAGE":
      return {
        ...state,
        language: action.payload,
      };
    case "SET_SEARCHBOX_VISIBLE":
      return {
        ...state,
        searchboxVisible: action.payload,
      };
    default:
      return state;
  }
};

function getLanguage() {
  const isBrowser = typeof window !== "undefined";
  if (isBrowser) {
    return Cookies.get("code-language") || "ts";
  }
  return "ts";
}

const initialState = {
  language: getLanguage(),
  searchboxVisible: false,
};

export const Context = createContext(initialState);

export const Store = ({ children }) => {
  const [state, dispatch] = useReducer(Reducer, initialState);
  let css = "";

  if (state.language !== "ts") {
    css += `
    *[data-language=ts] {
      display: none;
    }
    `;
  }
  if (state.language !== "javascript") {
    css += `
    *[data-language=javascript] {
      display: none;
    }
    `;
  }
  if (state.language !== "python") {
    css += `
    *[data-language=python] {
      display: none;
    }
    `;
  }
  if (state.language !== "csharp") {
    css += `
    *[data-language=csharp] {
      display: none;
    }
    `;
  }
  if (state.language !== "java") {
    css += `
    *[data-language=java] {
      display: none;
    }
    `;
  }

  return (
    // @ts-ignore
    <Context.Provider value={[state, dispatch]}>
      <style>{css}</style>
      {children}
    </Context.Provider>
  );
};
