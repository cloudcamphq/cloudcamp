import React, { useContext } from "react";
import { Context } from "./Store";
import { SearchIcon } from "@heroicons/react/solid";
import { detect } from "detect-browser";

export default function SearchButton(props?: { noml?: boolean }) {
  // @ts-ignore
  const [, dispatch] = useContext(Context);

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

  let ml = "ml-6";
  if (props?.noml === false) {
    ml = "";
  }

  return (
    <button
      className={
        ml +
        " flex-1 flex rounded-md items-center bg-white py-2 overflow-hidden mr-6 group focus:ring-indigo-500 focus:ring-2 focus:ring-offset-2 focus:outline-none"
      }
      onClick={() => dispatch({ type: "SET_SEARCHBOX_VISIBLE", payload: true })}
      id="global-search-button"
      tabIndex={0}
    >
      <div className="inset-y-0 pl-3 flex items-center pointer-events-none">
        <SearchIcon
          className="h-6 w-6 text-gray-400 group-hover:text-gray-500"
          aria-hidden="true"
        />
      </div>
      <div className="block text-md ml-4 w-full text-gray-600 font-medium overflow-ellipsis overflow-hidden whitespace-nowrap text-left">
        Search Documentation{" "}
        {shortcut && (
          <span className="text-gray-400 border rounded-md px-2 py-1 border-gray-300 ml-4 text-sm min-w-max inline-flex">
            {shortcut}
          </span>
        )}
      </div>
    </button>
  );
}
