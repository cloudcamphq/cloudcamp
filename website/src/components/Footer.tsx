import { Link } from "gatsby";
import * as React from "react";

export default function Footer({
  links,
}: {
  links: {
    prev?: { link: string; title: string };
    next?: { link: string; title: string };
  };
}) {
  return (
    <div className="!mt-12">
      <div className="flex flex-row w-full mt-5 leading-6 font-medium pb-10 border-b">
        <div className="flex-1 text-gray-500 pl-4">
          {links.prev && (
            <Link
              className="transition-colors duration-200 hover:text-gray-900"
              to={links.prev.link}
            >
              ← {links.prev.title}
            </Link>
          )}
        </div>
        <div className="flex-1 text-gray-500 text-right transition-colors duration-200 hover:text-gray-900 pr-4">
          {links.next && (
            <Link
              className="transition-colors duration-200 hover:text-gray-900"
              to={links.next.link}
            >
              {links.next.title} →
            </Link>
          )}
        </div>
      </div>
      <div className="h-20 flex justify-center items-end text-gray-400 text-xs"></div>
    </div>
  );
}
