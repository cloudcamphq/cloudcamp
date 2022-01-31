module.exports = {
  siteMetadata: {
    siteUrl: "https://cloudcamphq.com",
    title: "CloudCamp",
  },
  plugins: [
    "gatsby-plugin-react-helmet",
    {
      resolve: "gatsby-plugin-manifest",
      options: {
        name: "CloudCamp",
        short_name: "CloudCamp",
        start_url: "/",
        background_color: "#FFFFFF",
        theme_color: "#2DA2FF",
        display: "standalone",
        icon: "src/images/icon.png",
      },
    },
    "gatsby-plugin-postcss",
    {
      resolve: "gatsby-source-filesystem",
      options: {
        name: "api",
        path: `${__dirname}/content/api/`,
      },
    },
    {
      resolve: "gatsby-source-filesystem",
      options: {
        name: "docs",
        path: `${__dirname}/content/docs/`,
      },
    },
    {
      resolve: "gatsby-source-filesystem",
      options: {
        name: "commands",
        path: `${__dirname}/../cli/src/commands`,
      },
    },
    "gatsby-api-source",
    "gatsby-plugin-sharp",
    {
      resolve: `gatsby-transformer-remark`,
      options: {
        plugins: [
          {
            resolve: `gatsby-remark-prismjs`,
          },
          {
            resolve: `gatsby-remark-images`,
            options: {
              maxWidth: 590,
              linkImagesToOriginal: false,
              backgroundColor: "transparent",
            },
          },
        ],
      },
    },

    "gatsby-plugin-catch-links",
    "gatsby-plugin-sitemap",
  ],
};
