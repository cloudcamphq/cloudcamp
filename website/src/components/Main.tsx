import React from "react";

export default function Main({ children }) {
  return (
    <div
      className="h-full min-w-0 flex-shrink pt-10 overflow-auto space-y-6 relative z-10 px-6 lg:px-8 pb-10"
      id="main"
    >
      {children}
    </div>
  );
}
