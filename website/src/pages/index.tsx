import * as React from "react";
import { Link } from "gatsby";
// @ts-ignore
import logoText from "../images/logo-text.svg";
import { DuplicateIcon } from "@heroicons/react/outline";
import Header from "../components/Header";
import Main from "../components/Main";

export default function Index({}) {
  let installCommand = "npm install cloudcamp";

  let code = `
  <div class="gatsby-highlight" data-language="ts"><pre class="ts language-ts" style="font-size: 16px !important; margin-top: 40px; margin-bottom: 40px; overflow-y: hidden !important; background-color: white !important; padding-left: 0px !important; font-weight: 400 !important; -webkit-font-smoothing: initial !important; -moz-osx-font-smoothing: initial !important;"><code class="ts language-ts"><span class="token comment">// Launch faster by building</span>
<span class="token comment">// scalable infrastructure</span>
<span class="token comment">// in few lines of code.</span>



<span class="token keyword">import</span> <span class="token punctuation">{</span> App<span class="token punctuation">,</span> WebService <span class="token punctuation">}</span> <span class="token keyword">from</span> <span class="token string">"@cloudcamp/aws-runtime"</span><span class="token punctuation">;</span>

<span class="token keyword">const</span> app <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">App</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token keyword">const</span> web <span class="token operator">=</span> <span class="token keyword">new</span> <span class="token class-name">WebService</span><span class="token punctuation">(</span>app<span class="token punctuation">.</span>production<span class="token punctuation">,</span> <span class="token string">"prod-web"</span><span class="token punctuation">,</span> <span class="token punctuation">{</span>
  dockerfile<span class="token operator">:</span> <span class="token string">"../Dockerfile"</span>
<span class="token punctuation">}</span><span class="token punctuation">)</span><span class="token punctuation">;</span>

web<span class="token punctuation">.</span><span class="token function">scaleOnMetric</span><span class="token punctuation">(</span><span class="token punctuation">{</span>
  cpu<span class="token operator">:</span> <span class="token number">80</span><span class="token punctuation">,</span>
  max<span class="token operator">:</span> <span class="token number">5</span><span class="token punctuation">,</span>
<span class="token punctuation">}</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
</code></pre></div>
`;
  return (
    <>
      <Header
        title="Launch faster by building scalable infrastructure in few lines of code"
        canonical="/"
      />
      <Main>
        <div className="md:max-w-2xl flex flex-col mx-auto">
          <Link to="/">
            <img
              className=" h-12 w-auto flex-shrink-0"
              src={logoText}
              alt="CloudCamp"
            />
          </Link>
          <div dangerouslySetInnerHTML={{ __html: code }} />

          <div className="flex flex-wrap space-y-4 sm:space-y-0 sm:space-x-4 text-center">
            <Link
              className={
                "w-full sm:w-auto flex-none " +
                "text-white text-xl leading-6 font-bold py-3 px-12 border border-transparent rounded-xl " +
                "focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:outline-none hover:scale-105 " +
                "transition-all duration-200 "
              }
              style={{ backgroundColor: "#2C80FF" }}
              to="/docs/tutorial"
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
        </div>
      </Main>
    </>
  );
}
