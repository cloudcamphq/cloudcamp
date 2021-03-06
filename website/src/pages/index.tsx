import * as React from "react";
import { Link } from "gatsby";
// @ts-ignore
import logoText from "../images/logo-text-alt.svg";
import { DuplicateIcon } from "@heroicons/react/outline";
import Header from "../components/Header";
import Main from "../components/Main";
import SearchButton from "../components/SearchButton";
import { Store } from "../components/Store";
import Social from "../components/Social";

export default function Index({}) {
  let installCommand = "npm install cloudcamp";

  return (
    <>
      <Store>
        <Header title="infrastructure as few lines of code" canonical="/" />

        <div className="h-16 border-b bg-white items-center flex flex-none max-w-screen-lg mx-auto">
          <SearchButton noml={false} />
          <Social classname="flex" />
        </div>

        <div className="flex max-w-screen-lg mx-auto items-center px-4">
          <img
            className="h-18 w-auto mx-auto mt-14"
            src={logoText}
            alt="CloudCamp"
          />
        </div>
        <div className="flex max-w-screen-lg mx-auto">
          <div
            className="mx-auto text-center mt-20 text-4xl md:text-6xl lg:text-8xl  md:leading-[1]"
            style={{
              fontFamily: '"Helvetica Neue", Arial, sans-serif',

              // lineHeight: "70px",
              color: "#433636",
              fontWeight: 400,
            }}
          >
            Infrastructure as <br />
            <span style={{ color: "#D63201", fontWeight: 500 }}>
              few lines
            </span>{" "}
            of code.
          </div>
        </div>
        <div className="flex flex-wrap space-y-4 sm:space-y-0 sm:space-x-4 justify-center max-w-screen-lg mx-auto mt-14 sm:mt-20 p-4">
          <Link
            className={
              "w-full sm:w-auto flex-none text-center " +
              "text-white text-xl leading-6 font-bold py-3 px-12 border border-transparent rounded-xl " +
              "focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:outline-none hover:scale-105 " +
              "transition-all duration-200 "
            }
            style={{ backgroundColor: "#2C80FF" }}
            to="/docs/"
          >
            Get Started
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
      </Store>
    </>
  );
}
