import React, { useContext, Fragment } from "react";
import { Context } from "./Store";
import { ChevronDownIcon } from "@heroicons/react/solid";
import { Menu, Transition } from "@headlessui/react";
import Cookies from "js-cookie";
// @ts-ignore
import javaLogo from "@programming-languages-logos/java/java.svg";
// @ts-ignore
import typeScriptLogo from "@programming-languages-logos/typescript/typescript.svg";
// @ts-ignore
import javaScriptLogo from "@programming-languages-logos/javascript/javascript.svg";
// @ts-ignore
import pythonLogo from "@programming-languages-logos/python/python.svg";
// @ts-ignore
import csharpLogo from "@programming-languages-logos/csharp/csharp.svg";

function nameAndLogo(code: string) {
  switch (code) {
    case "ts":
      return ["TypeScript", typeScriptLogo];
    case "javascript":
      return ["JavaScript", javaScriptLogo];
    case "python":
      return ["Python", pythonLogo];
    case "java":
      return ["Java", javaLogo];
    case "csharp":
      return ["C#", csharpLogo];
  }
}

function LanguageMenuItem({ code }) {
  let [language, logo] = nameAndLogo(code);

  // @ts-ignore
  const [, dispatch] = useContext(Context);

  return (
    <Menu.Item>
      {({ active }) => (
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            Cookies.set("code-language", code, { expires: 365 });

            // document.cookie = `language=${code}; expires=Fri, 31 Dec 9999 23:59:59 GMT`;
            dispatch({ type: "SET_LANGUAGE", payload: code });
          }}
          className={
            active
              ? "bg-gray-100 text-gray-900 group flex items-center px-4 py-2 text-sm"
              : "text-gray-700 group flex items-center px-4 py-2 text-sm"
          }
        >
          <img src={logo} className="h-5 mr-2" />
          {language}
        </a>
      )}
    </Menu.Item>
  );
}
export default function LanguageMenu() {
  // @ts-ignore
  const [state, _] = useContext(Context);
  let code = state.language;
  let [language, logo] = nameAndLogo(code);
  return (
    <Menu
      as="div"
      className="relative inline-block text-left lg:ml-8 ml-6 w-40 group min-w-max"
      tabIndex={0}
    >
      <div>
        <Menu.Button className="inline-flex justify-left w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500">
          <img src={logo} className="h-5 mr-2 flex-shrink-0 flex-none" />
          {language}
          <ChevronDownIcon
            className="-mr-1 h-5 w-5 ml-auto text-gray-400 group-hover:text-gray-700 flex-shrink-0 flex-none"
            aria-hidden="true"
          />
        </Menu.Button>
      </div>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="origin-top-right absolute left-0 mt-2 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 focus:outline-none z-20">
          <div className="py-1">
            <LanguageMenuItem code="ts" />
            <LanguageMenuItem code="javascript" />
            <LanguageMenuItem code="python" />
            <LanguageMenuItem code="csharp" />
            <LanguageMenuItem code="java" />
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
