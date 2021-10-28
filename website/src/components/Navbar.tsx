import React, { useEffect, useContext, Fragment } from "react";
import { Context } from "./Store";
import { Disclosure } from "@headlessui/react";
import { SearchIcon } from "@heroicons/react/solid";
import { MenuIcon, XIcon } from "@heroicons/react/outline";
import { Link } from "gatsby";
import { ChevronDownIcon } from "@heroicons/react/solid";
// @ts-ignore
import logoText from "../images/logo-text.svg";
// @ts-ignore
import logo from "../images/logo.svg";
import { Menu, Transition } from "@headlessui/react";
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

import Cookies from "js-cookie";

function DesktopItem(props: { title: string; active: boolean; to: string }) {
  let active = "bg-gray-200 text-gray-900";
  let inactive = "text-gray-900 hover:bg-gray-100";
  let className = `${
    props.active ? active : inactive
  } px-3 py-2 rounded-md text-sm font-medium`;

  return (
    <Link to={props.to} className={className}>
      {props.title}
    </Link>
  );
}

function MobileItem(props: { title: string; active: boolean; to: string }) {
  let active = "bg-blue-50 border-blue-600 text-blue-700";
  let inactive =
    "border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800";
  let className = `${
    props.active ? active : inactive
  } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`;

  return (
    <Link to={props.to} className={className}>
      {props.title}
    </Link>
  );
}

export default function Navbar({ pathname, showLanguage = false }) {
  return (
    <Disclosure as="nav" className="border-b bg-white sticky top-0 z-50">
      {({ open }) => (
        <>
          <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center px-2 lg:px-0">
                <div className="flex-shrink-0 flex items-center">
                  <Link to="/">
                    <img
                      className="block sm:hidden h-8 w-auto"
                      src={logo}
                      alt="cloudcamp"
                    />
                    <img
                      className="hidden sm:block h-8 w-auto"
                      src={logoText}
                      alt="cloudcamp"
                    />
                  </Link>
                </div>
                <div className="hidden lg:ml-6 lg:flex lg:space-x-8">
                  <DesktopItem title="Home" to="/" active={pathname == "/"} />
                  <DesktopItem
                    title="Documentation"
                    to="/docs"
                    active={pathname.startsWith("/docs")}
                  />
                </div>
                <div className="lg:ml-8 ml-3">
                  {showLanguage && <LanguageMenu />}
                </div>
              </div>
              <div className="flex-1 flex items-center justify-center px-2 lg:ml-6 lg:justify-end">
                <div className="max-w-lg w-full lg:max-w-xs group">
                  <label htmlFor="search" className="sr-only">
                    Search
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <SearchIcon
                        className="h-5 w-5 text-gray-400 group-hover:text-gray-700"
                        aria-hidden="true"
                      />
                    </div>
                    <button className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white text-gray-700 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm shadow-sm hover:bg-gray-50 font-medium">
                      Search Documentation
                    </button>
                  </div>
                </div>
              </div>
              <div className="hidden sm:ml-6 sm:flex items-center">
                <div className="flex items-center">
                  <a
                    href="https://github.com/cloudcamphq/cloudcamp"
                    className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 mr-2"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="currentColor"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                  </a>
                  <a
                    href="https://twitter.com/cloudcamphq"
                    className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 mr-2"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="currentColor"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                    >
                      <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                    </svg>
                  </a>
                </div>
              </div>
              <div className="flex items-center lg:hidden">
                {/* Mobile menu button */}
                <Disclosure.Button className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500">
                  <span className="sr-only">Open main menu</span>
                  {open ? (
                    <XIcon className="block h-6 w-6" aria-hidden="true" />
                  ) : (
                    <MenuIcon className="block h-6 w-6" aria-hidden="true" />
                  )}
                </Disclosure.Button>
              </div>
            </div>
          </div>

          <Disclosure.Panel className="lg:hidden">
            <div className="pt-2 pb-1 space-y-1">
              <MobileItem title="Home" to="/" active={pathname == "/"} />
              <MobileItem
                title="Documentation"
                to="/docs"
                active={pathname.startsWith("/docs")}
              />
              <MobileItem
                title="GitHub"
                to="https://github.com/cloudcamphq/cloudcamp"
                active={false}
              />
              <MobileItem
                title="Twitter"
                to="https://twitter.com/cloudcamphq"
                active={false}
              />
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
}

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

function LanguageMenu() {
  // @ts-ignore
  const [state, _] = useContext(Context);
  let code = state.language;
  let [language, logo] = nameAndLogo(code);
  return (
    <Menu
      as="div"
      className="relative inline-block text-left ml-auto w-40 group"
    >
      <div>
        <Menu.Button className="inline-flex justify-left w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500">
          <img src={logo} className="h-5 mr-2" />
          {language}
          <ChevronDownIcon
            className="-mr-1 h-5 w-5 ml-auto text-gray-400 group-hover:text-gray-700"
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
