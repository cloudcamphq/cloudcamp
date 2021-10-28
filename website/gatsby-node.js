require("ts-node").register({
  transpileOnly: true,
});

const api = require("./src/data/api");
const command = require("./src/data/command");
const docs = require("./src/data/docs");

// console.log(api);

// const { createApiPages } = require("./src/helpers/apiIndex");
// const { createDocsPages } = require("./src/helpers/docsIndex");
// const { createCommandPages } = require("./src/helpers/commandsIndex");

exports.createPages = async ({ graphql, actions }) => {
  let { createPage } = actions;
  await api.createPages(createPage, graphql);
  await command.createPages(createPage, graphql);
  await docs.createPages(createPage, graphql);

  // await createApiPages(createPage, graphql);
  // await createDocsPages(createPage, graphql);
  // await createCommandPages(createPage, graphql);
};
