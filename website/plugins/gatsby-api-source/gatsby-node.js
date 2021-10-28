require("ts-node").register({
  transpileOnly: true,
});

let fs = require("fs");
let path = require("path");
let _ = require("lodash");
const ApiSource = require("./api-source").default;
const CommandSource = require("./command-source").default;

exports.onCreateNode = async function onCreateNode({
  node,
  actions,
  createNodeId,
  createContentDigest,
}) {
  if (node.base === "api.json") {
    return apiDocs(node, actions, createNodeId, createContentDigest);
  } else if (
    node.internal.type === "MarkdownRemark" ||
    node.internal.type === "Mdx"
  ) {
    return remark(node);
  } else if (node.internal.type === "File" && node.ext === ".ts") {
    return commandDocs(node, actions, createNodeId, createContentDigest);
  }
};

function commandDocs(node, actions, createNodeId, createContentDigest) {
  const { createNode } = actions;
  let commandSource = new CommandSource(node.absolutePath);

  const nodeContent = JSON.stringify(commandSource.definition);
  const nodeMeta = {
    id: createNodeId(commandSource.definition.name),
    parent: null,
    children: [],
    internal: {
      type: `CommandDocs`,
      mediaType: `application/json`,
      content: nodeContent,
      contentDigest: createContentDigest(commandSource.definition),
    },
  };
  const newNode = Object.assign({}, commandSource.definition, nodeMeta);
  createNode(newNode);
}

function remark(node) {
  let project = JSON.parse(
    fs
      .readFileSync(
        path.join(__dirname, "..", "..", "content", "api", "api.json")
      )
      .toString()
  );
  let apiSource = new ApiSource(project);
  node.internal.content = apiSource.translateCode(node.internal.content, true);
}

function apiDocs(node, actions, createNodeId, createContentDigest) {
  const { createNode } = actions;
  let project = JSON.parse(fs.readFileSync(node.absolutePath).toString());
  let apiSource = new ApiSource(project);
  apiSource.generateApi();

  let sortedTypes = _.sortBy(
    Object.values(apiSource.api.types),
    (item) => item.name
  );

  for (let type of sortedTypes) {
    const nodeContent = JSON.stringify(type);
    const nodeMeta = {
      id: createNodeId(type.name),
      parent: null,
      children: [],
      internal: {
        type: `ApiDocs`,
        mediaType: `application/json`,
        content: nodeContent,
        contentDigest: createContentDigest(type),
      },
    };
    const newNode = Object.assign({}, type, nodeMeta);
    createNode(newNode);
  }
}
