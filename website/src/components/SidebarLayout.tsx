import React from "react";
import LanguageMenu from "./LanguageMenu";
import { Store } from "./Store";
import PillsNav from "./PillsNav";
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
import PreserveScroll from "./PreserveScroll";

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

  return (
    <Store>
      <Search />
      <div className="h-screen overflow-y-hidden flex">
        <div className="flex-1 h-full min-w-max hidden lg:flex flex-col">
          <div className="h-16 border-b bg-white items-center flex flex-none justify-end flex-shrink-0">
            <div className={`${leftBarWidth} ${leftBarPadding}`}>
              <Link to="/">
                <img
                  className="hidden sm:block h-8 w-auto flex-shrink-0"
                  src={logoText}
                  alt="cloudcamp"
                />
              </Link>
            </div>
          </div>

          <div className="h-full flex overflow-hidden justify-end">
            <div
              className={`${leftBarWidth} ${leftBarPadding} h-full overflow-auto min-w-0 flex flex-col pt-12 space-y-6 pb-12`}
            >
              <TableOfContents data={data} location={location} />
            </div>
          </div>
        </div>

        <div className="flex h-full flex-grow overflow-y-hidden xl:max-w-4xl flex-col">
          <div className="h-16 border-b bg-white items-center flex flex-none">
            <Link to="/">
              <img
                className="block lg:hidden h-8 w-auto flex-shrink-0 ml-6"
                src={logo}
                alt="cloudcamp"
              />
            </Link>
            <PillsNav pathname={location.pathname} />
            <LanguageMenu />
            <SearchButton />
            <Social classname="hidden md:flex xl:hidden" />
          </div>
          <div className="h-full overflow-hidden min-w-0 flex flex-col">
            {children}
          </div>
        </div>
        <div className="flex-1 h-full min-w-max hidden xl:flex flex-col">
          <div className="h-16 border-b bg-white flex items-center flex-shrink-0">
            <Social />
          </div>

          <div className="h-full flex overflow-hidden justify-start">
            <div
              className={`${rightBarWidth} ${rightBarPadding} h-full overflow-auto min-w-0 flex flex-col pt-12 space-y-6 pb-12`}
            >
              <OnThisPage onThisPage={pageContext.onThisPage} />
            </div>
          </div>
        </div>
      </div>
    </Store>
  );
}
