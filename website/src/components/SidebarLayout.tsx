import React, { useState } from "react";
import LanguageMenu from "./LanguageMenu";
import { Store } from "./Store";
import SearchButton from "./SearchButton";
import Social from "./Social";
import Search from "./Search";
// @ts-ignore
import logoText from "../images/logo-text.svg";
// @ts-ignore
import logo from "../images/logo.svg";
import TableOfContents from "./TableOfContents";
import { Link } from "gatsby";
import OnThisPage from "./OnThisPage";
import { MenuIcon } from "@heroicons/react/solid";
import Cookies from "js-cookie";

function getShowOnThisPage(): boolean {
  const isBrowser = typeof window !== "undefined";
  if (isBrowser) {
    let showOnThisPage = Cookies.get("show-on-this-page");
    return showOnThisPage == "true" ? true : false;
  }
  return false;
}

export default function SidebarLayout({
  children,
  location,
  data,
  pageContext,
}: {
  children: any;
  location: any;
  data: any;
  pageContext: any;
}) {
  let leftBarWidth = "w-64";
  let leftBarPadding = "px-8";
  let rightBarWidth = "w-64";
  let rightBarPadding = "px-4";

  const [showOnThisPage, setShowOnThisPage] = useState(getShowOnThisPage());

  return (
    <Store>
      <Search />
      <div className="h-screen overflow-y-hidden flex justify-center">
        {/* Table of Contents */}

        <div className="h-full min-w-max hidden lg:flex flex-col">
          <div className="h-16 bg-white items-center flex flex-none justify-end flex-shrink-0">
            <div className={`${leftBarWidth} ${leftBarPadding}`}>
              <Link to="/">
                <img
                  className="hidden sm:block h-8 w-auto flex-shrink-0"
                  src={logoText}
                  alt="CloudCamp"
                />
              </Link>
            </div>
          </div>

          <div className="h-full flex overflow-hidden justify-end relative">
            <div className="hidden lg:block h-12 pointer-events-none absolute inset-x-0 z-10 bg-gradient-to-b from-white"></div>

            <div
              className={`${leftBarWidth} ${leftBarPadding} h-full overflow-auto min-w-0 flex flex-col pt-12 space-y-6 pb-12`}
            >
              <TableOfContents
                data={data}
                location={location}
                onThisPage={pageContext.onThisPage}
              />
            </div>
          </div>
        </div>

        {/* Main */}

        <div className="flex h-full flex-grow overflow-y-hidden max-w-5xl flex-col">
          <div className="h-16 border-b bg-white items-center flex flex-none">
            <Link to="/">
              <img
                className="block lg:hidden h-8 w-auto flex-shrink-0 ml-6"
                src={logo}
                alt="CloudCamp"
              />
            </Link>
            <SearchButton />
            <LanguageMenu />

            <Social classname="flex" />
          </div>
          <div className="h-full overflow-hidden min-w-0 flex flex-col">
            {children}
          </div>
        </div>

        {/* On this page */}
        <div className="h-full min-w-max hidden xl:flex flex-col">
          <div className="h-16 bg-white flex items-center flex-shrink-0">
            <button
              className="border border-indigo-300 w-7 h-7 rounded-full flex items-center justify-center ml-7 mr-5"
              style={{
                backgroundImage: "linear-gradient(#FBFDFF, #E2FFF9)",
                color: "#92A2D4",
              }}
              onClick={(e) => {
                e.preventDefault();
                Cookies.set(
                  "show-on-this-page",
                  showOnThisPage ? "false" : "true",
                  { expires: 365 }
                );
                setShowOnThisPage(!showOnThisPage);
              }}
            >
              <MenuIcon className="w-[18px] h-[18px]" />
            </button>
          </div>

          {showOnThisPage && (
            <div className="h-full flex overflow-hidden justify-start relative">
              <div className="hidden lg:block h-12 pointer-events-none absolute inset-x-0 z-10 bg-gradient-to-b from-white"></div>

              <div
                className={`${rightBarWidth} ${rightBarPadding} h-full overflow-auto min-w-0 flex flex-col pt-12 space-y-6 pb-12`}
              >
                <OnThisPage onThisPage={pageContext.onThisPage} />
              </div>
            </div>
          )}
        </div>
      </div>
    </Store>
  );
}
