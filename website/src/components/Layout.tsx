import React from "react";
import Navbar from "./Navbar";
import { Store } from "./Store";

export default function Layout({ children, pathname, showLanguage = false }) {
  return (
    <Store>
      <div className="h-screen overflow-y-hidden flex flex-col">
        <Navbar pathname={pathname} showLanguage={showLanguage} />
        <div className="flex flex-row flex-1 overflow-hidden">
          <div className="flex-grow"></div>
          <div className="max-w-6xl min-w-0 flex flex-col">{children}</div>
          <div className="flex-grow"></div>
        </div>
      </div>
    </Store>
  );
}
