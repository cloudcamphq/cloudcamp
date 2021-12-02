require("ts-node").register({
  transpileOnly: true,
});

const api = require("./src/data/api");
const command = require("./src/data/command");
const docs = require("./src/data/docs");

exports.createPages = async ({ graphql, actions }) => {
  let { createPage } = actions;
  await api.createPages(createPage, graphql);
  await command.createPages(createPage, graphql);
  await docs.createPages(createPage, graphql);
};
