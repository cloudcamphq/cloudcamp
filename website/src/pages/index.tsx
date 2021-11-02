import * as React from "react";
import { Link } from "gatsby";
// @ts-ignore
import logoText from "../images/logo-text.svg";
import { DuplicateIcon } from "@heroicons/react/outline";
import Header from "../components/Header";
import Main from "../components/Main";

export default function Index({}) {
  let installCommand = "npm install cloudcamp";
  return (
    <>
      <Header title="CloudCamp - Launch faster" canonical="/" />
      <Main>
        <div className="xl:max-w-5xl m-auto">
          <Link to="/">
            <img
              className="lg:mt-10 h-10 w-auto flex-shrink-0"
              src={logoText}
              alt="cloudcamp"
            />
          </Link>
          <h1 className="mt-10 mb-32 text-5xl sm:text-6xl lg:text-7xl leading-none font-extrabold tracking-tight text-gray-900">
            Launch faster by building scalable infrastructure in few lines of
            code.
          </h1>
          <div className="flex flex-wrap space-y-4 sm:space-y-0 sm:space-x-4 text-center">
            <Link
              className={
                "w-full sm:w-auto flex-none bg-blue-600 " +
                "text-white text-lg leading-6 font-semibold py-3 px-6 border border-transparent rounded-xl " +
                "focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:outline-none " +
                "transition-all duration-200 "
              }
              to="/docs/tutorial"
            >
              Get started
            </Link>
            <button
              type="button"
              className={
                "w-full sm:w-auto flex-none bg-gray-50 text-gray-400 hover:text-gray-900 " +
                "font-mono leading-6 py-3 sm:px-6 border border-gray-200 rounded-xl flex " +
                "items-center justify-center space-x-2 sm:space-x-4 focus:ring-2 focus:ring-offset-2" +
                "focus:ring-offset-white focus:ring-offset-2 focus:ring-indigo-500 focus:outline-none transition-colors duration-200"
              }
              onClick={() =>
                navigator.clipboard
                  ? navigator.clipboard.writeText(installCommand)
                  : // @ts-ignore
                    window.clipboardData.setData("Text", installCommand)
              }
            >
              <span className="text-gray-900">
                <span
                  className="hidden sm:inline text-gray-500"
                  aria-hidden="true"
                >
                  ${" "}
                </span>
                {installCommand}
              </span>
              <span className="sr-only">(click to copy to clipboard)</span>
              <DuplicateIcon className="block h-6 w-6" aria-hidden="true" />
            </button>
          </div>
        </div>
      </Main>
    </>
  );
}
