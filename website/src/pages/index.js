import * as React from "react";
import { Link } from "gatsby";
import Layout from "../components/Layout";
import { DuplicateIcon } from "@heroicons/react/outline";
import Header from "../components/Header";
import Main from "../components/Main";

export default function Index({ location }) {
  return (
    <>
      <Header title="TODO" canonical="/" />
      <Main>TODO</Main>
    </>
  );
}
