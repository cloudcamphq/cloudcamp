import React, { useEffect, useRef, useState } from "react";
import { globalHistory } from "@reach/router";
import { Link } from "gatsby";

import _ from "lodash";

const useIntersectionObserver = (setActiveId) => {
  const headingElementsRef = useRef({});
  const observerRef = useRef({ observer: undefined });
  const selector = "#main h2, #main h3";
  useEffect(() => {
    const callback = (headings) => {
      headingElementsRef.current = headings.reduce((map, headingElement) => {
        map[headingElement.target.id] = headingElement;
        return map;
      }, headingElementsRef.current);

      const visibleHeadings = [];
      Object.keys(headingElementsRef.current).forEach((key) => {
        const headingElement = headingElementsRef.current[key];
        if (headingElement.isIntersecting) visibleHeadings.push(headingElement);
      });

      const getIndexFromId = (id) =>
        Array.from(document.querySelectorAll(selector)).findIndex(
          (heading) => heading.id === id
        );

      if (visibleHeadings.length === 1) {
        setActiveId(visibleHeadings[0].target.id);
      } else if (visibleHeadings.length > 1) {
        const sortedVisibleHeadings = visibleHeadings.sort((a, b) =>
          getIndexFromId(a.target.id) > getIndexFromId(b.target.id) ? 1 : 0
        );
        setActiveId(sortedVisibleHeadings[0].target.id);
      }
    };

    const setupObserver = () => {
      setActiveId(undefined);
      if (observerRef.current.observer) {
        observerRef.current.observer.disconnect();
      }
      const observer = new IntersectionObserver(callback, {
        rootMargin: "0px 0px -40% 0px",
      });

      observerRef.current.observer = observer;

      Array.from(document.querySelectorAll(selector)).forEach((element) =>
        observer.observe(element)
      );
    };

    setupObserver();
    globalHistory.listen(({ action }) => {
      window.setTimeout(() => setupObserver(), 100);
    });

    return () =>
      observerRef.current.observer && observerRef.current.observer.disconnect();
  }, [setActiveId]);
};

export default function OnThisPage({ onThisPage }: { onThisPage: any }) {
  const [activeId, setActiveId] = useState();
  useIntersectionObserver(setActiveId);

  return (
    <>
      <nav>
        <h1 className="tracking-wide font-semibold text-xs uppercase py-2 px-4">
          On this page
        </h1>
        <ul>
          {onThisPage.map((item, ix) => {
            let className = "text-sm rounded-md text-gray-700 ";
            let link = `#${item.id}`;

            return (
              <li className={className} key={item.id}>
                <Link
                  className={
                    "text-sm rounded-md block py-2 px-4 " +
                    (activeId == item.id || (activeId === undefined && ix == 0)
                      ? "text-purple-600 font-semibold"
                      : "text-gray-700 hover:bg-gray-100")
                  }
                  to={link}
                  // activeClassName="bg-red-500"
                >
                  {item.title}
                </Link>
                {item.children.length != 0 && (
                  <ul>
                    {item.children.map((child: any) => {
                      if (child.type === "F") {
                        return (
                          <li className="relative" key={child.id}>
                            <Link
                              to={`#${child.id}`}
                              className={
                                "text-sm rounded-md block " +
                                (activeId == child.id
                                  ? "bg-indigo-50 text-indigo-800 font-medium"
                                  : "text-gray-700 hover:bg-gray-100")
                              }
                            >
                              <div className="py-2 pr-4 pl-7 font-mono whitespace-nowrap text-sm text-purple-900">
                                {child.title}
                              </div>
                            </Link>
                          </li>
                        );
                      }
                      let color: string = "";
                      if (child.type === "P") {
                        color = "bg-green-500";
                      } else if (child.type === "M") {
                        color = "bg-purple-500";
                      } else if (child.type === "C") {
                        color = "bg-blue-500";
                      }
                      return (
                        <li className="relative" key={child.id}>
                          <span
                            className="absolute left-5"
                            style={{ marginTop: "10px" }}
                          >
                            <span
                              className={
                                "table w-4 h-4 text-center rounded-md text-white " +
                                color
                              }
                            >
                              <span className="table-cell align-middle font-bold text-xs font-mono">
                                {child.type}
                              </span>
                            </span>
                          </span>
                          <Link
                            to={`#${child.id}`}
                            className={
                              "text-sm rounded-md block " +
                              (activeId == child.id
                                ? "text-indigo-800 font-semibold"
                                : "text-gray-700 hover:bg-gray-100")
                            }
                          >
                            <div
                              className="py-2 pr-4 pl-11 font-mono whitespace-nowrap text-sm text-purple-900"
                              dangerouslySetInnerHTML={{
                                __html: child.title,
                              }}
                            />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
