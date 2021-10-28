import React, { useContext } from "react";
import { Context } from "./Store";
import { SearchIcon } from "@heroicons/react/solid";
import { detect } from "detect-browser";

export default function SearchButton() {
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

  return (
    <button
      className="flex-1 flex border border-gray-300 rounded-md shadow-sm items-center bg-white hover:bg-gray-50 justify-center overflow-hidden ml-6 mr-6 group focus:ring-indigo-500 focus:ring-2 focus:ring-offset-2 focus:outline-none"
      onClick={() => dispatch({ type: "SET_SEARCHBOX_VISIBLE", payload: true })}
      id="global-search-button"
      tabIndex={0}
    >
      <div className="inset-y-0 pl-3 flex items-center pointer-events-none">
        <SearchIcon
          className="h-5 w-5 text-gray-400 group-hover:text-gray-700"
          aria-hidden="true"
        />
      </div>
      <div className="block text-sm w-full py-2 px-2 text-gray-700  font-medium overflow-ellipsis overflow-hidden whitespace-nowrap">
        Search Documentation{" "}
        {shortcut && (
          <span className="text-gray-400 border rounded-md px-1 py-1 border-gray-300 ml-1 text-xs min-w-max inline-flex">
            {shortcut}
          </span>
        )}
      </div>
    </button>
  );
}
