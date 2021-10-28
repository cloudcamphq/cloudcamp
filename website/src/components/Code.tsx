import React, { useState } from "react";
import { ClipboardIcon, ClipboardCheckIcon } from "@heroicons/react/outline";

function hashCode(text: string) {
  var hash = 0,
    i,
    chr;
  if (text.length === 0) return hash;
  for (i = 0; i < text.length; i++) {
    chr = text.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

export function Code({ html, language }: { html: string; language: string }) {
  // @ts-ignore
  const element = document.createElement("div");
  element.innerHTML = html;
  let codeEl = element.getElementsByTagName("code")[0];
  let code = codeEl.innerText;

  if (code.trim().startsWith("$")) {
    let parts = code.trim().split("\n");
    code = "";
    for (let line of parts) {
      if (line.trim().startsWith("$")) {
        code += line.slice(1).trim() + "\n";
      }
    }
    code = code.trim();
  }

  const [didCopy, setDidCopy] = useState(false);

  function fallbackCopyTextToClipboard() {
    var textArea = document.createElement("textarea");
    textArea.value = code;

    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      var successful = document.execCommand("copy");
      var msg = successful ? "successful" : "unsuccessful";
      console.log("Fallback: Copying text command was " + msg);
    } catch (err) {
      console.error("Fallback: Oops, unable to copy", err);
    }

    document.body.removeChild(textArea);
  }

  function copyTextToClipboard() {
    setDidCopy(true);
    if (!navigator.clipboard) {
      fallbackCopyTextToClipboard();
      return;
    }
    navigator.clipboard.writeText(code);
  }

  return (
    <div
      data-language={language}
      className="relative group"
      tabIndex={0}
      onMouseLeave={() => setDidCopy(false)}
    >
      <button
        className="w-6 h-6 group absolute top-3 right-3 border border-gray-300 bg-gray-100 hover:bg-gray-200 rounded-md cursor-pointer group-hover:flex hidden items-center justify-center focus:border-2 focus:border-indigo-500"
        title="Copy"
        onClick={copyTextToClipboard}
      >
        {didCopy ? (
          <div className="w-4 h-4">
            <div
              className="absolute right-7 text-xs bg-gray-600 text-white p-0.5 pl-1 pr-1 rounded"
              style={{ top: "0px" }}
            >
              {" copied! "}
            </div>
            <ClipboardCheckIcon className="w-4 h-4 text-indigo-700" />
          </div>
        ) : (
          <ClipboardIcon className="w-4 h-4 text-gray-700 " />
        )}
      </button>
      <div dangerouslySetInnerHTML={{ __html: html }} className=""></div>
    </div>
  );
}

function injectCopyButton(html: string) {
  const element = document.createElement("div");
  element.innerHTML = html;
  return Array.from(element.childNodes).map((child) => {
    if (child instanceof Text) {
      return child.data;
    }
    let el = child as HTMLElement;
    let key = hashCode(el.innerText + (el.dataset?.language || "")).toString();
    if (el.className?.includes("gatsby-highlight")) {
      return (
        <Code html={el.outerHTML} language={el.dataset.language} key={key} />
      );
    } else {
      return (
        <div dangerouslySetInnerHTML={{ __html: el.outerHTML }} key={key} />
      );
    }
  });
}

export default function HtmlWithCode({
  html,
  className,
  style,
}: {
  html: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={className} style={style}>
      {injectCopyButton(html)}
    </div>
  );
}
