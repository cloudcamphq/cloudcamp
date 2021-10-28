import React from "react";
import { Link } from "gatsby";

function NavItem(props: { title: string; active: boolean; to: string }) {
  let active = "bg-gray-200 text-gray-900";
  let inactive = "text-gray-900 hover:bg-gray-100";
  let className = `${
    props.active ? active : inactive
  } px-3 py-2 rounded-md text-sm font-medium focus:ring-indigo-500 focus:ring-2 focus:ring-offset-2 focus:outline-none`;

  return (
    <Link to={props.to} className={className} tabIndex={0}>
      {props.title}
    </Link>
  );
}

export default function PillsNav({ pathname }: { pathname: string }) {
  return (
    <div className="h-full items-center hidden md:ml-6 md:flex md:space-x-8">
      <NavItem title="Home" to="/" active={pathname == "/"} />
      <NavItem
        title="Documentation"
        to="/docs"
        active={pathname.startsWith("/docs")}
      />
      {/* <NavItem title="Blog" to="/blog" active={pathname.startsWith("/blog")} /> */}
    </div>
  );
}
