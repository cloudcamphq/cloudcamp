import * as React from "react";
import Layout from "../../components/Layout";

export default function Index({ location }) {
  return <Layout pathname={location.pathname}>Doc Index</Layout>;
}
