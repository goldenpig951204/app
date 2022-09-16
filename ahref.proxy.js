require("dotenv-safe").config();
const config = require("./utils/config");

const express = require("express");
const cheerio = require("cheerio");

const {
  countTime: siteExplorerLimit$count,
} = require("./models/ahref_siteExplorerLimit");

const {
  countTime: keywordExplorerLimit$count,
} = require("./models/ahref_keywordExplorerLimit");
const {
  createProxyMiddleware,
  responseInterceptor,
} = require("http-proxy-middleware");
const {
  onlyMemberMiddleware,
  sessionMapper,
} = require("./utils/sessionValidator");
const { connect: db$connect, config$sync } = require("./models");
const { ahrefLog } = require("./utils/logger");
const {
  siteExplorerLimitMiddleware,
  keywordExplorerLimitMiddleware,
  batchAnalysisLimitMiddleware,
} = require("./utils/ahrefValidator");

const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

const app = express();

app.use(cookieParser());
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    req.headers["x-real-ip"] = "203.205.53.56"; // FAKE IP when develop the application in development mode only
    next();
  });
}
app.get("/api/sync-config", async (req, res) => {
  await config$sync();
  res.send("ok");
});

app.post("/api/sync-session", bodyParser.json(), async (req, res) => {
  const { key, value } = req.body;
  sessionMapper.set(key, value);
  res.send("ok");
});
app.use(
  "/",
  onlyMemberMiddleware,
  siteExplorerLimitMiddleware,
  keywordExplorerLimitMiddleware,
  batchAnalysisLimitMiddleware,
  createProxyMiddleware({
    target: "https://app.ahrefs.com/",
    secure: false,
    changeOrigin: true,
    selfHandleResponse: false,
    onProxyReq: (proxyReq, req, res) => {
      // intercept proxy request and set UserAgent and cookie of first session
      proxyReq.setHeader("user-agent", config.getConfig().userAgent);
      proxyReq.setHeader("Cookie", config.getConfig().ahref_cookie);
      // intercept proxy request and set UserAgent and cookie of first session
    },
    selfHandleResponse: true,
    onProxyRes: responseInterceptor(
      async (responseBuffer, proxyRes, req, res) => {
        if (req.url.match(/\.(css|json|js|text|png|jpg|map|ico|svg)/)) {
          // ignore static file
          return responseBuffer;
        }

        ahrefLog.info(
          `${req.user.username} ${req.wpSite} ${req.headers["user-agent"]} ${req.url} ${proxyRes.statusCode}`
        ); // log the activity

        // rewrite the location to our domain

        // rewrite the location to our domain
        if (req.url.includes("/v4/asGetWorkspaces")) {
          return JSON.stringify({
            workspaces: [
              {
                name: "",
                id: "",
                numMembers: 1,
              },
            ],
          });
        }
        if (
          proxyRes.headers["content-type"] &&
          proxyRes.headers["content-type"].includes("text/html")
        ) {
          const response = responseBuffer.toString("utf-8");
          const $ = cheerio.load(response);
          // remove unnecessary html from semrush
          if (!req.user.isAdmin) {
            $(".navbar--nav-right").remove();
            $("head").append(`<style>
            .history {

                display: none;
                opacity: 0;
            }
          </style>`);
          }

          if (
            req.url.includes("/site-explorer/overview/v2") &&
            !req.user.isAdmin
          ) {
            // check if user has reach today limit
            const total = await siteExplorerLimit$count(
              req.user.id,
              req.user.username,
              req.wpSite
            );

            if (
              total > config.getConfig().ahref_siteExplorerLimit &&
              !req.user.isAdmin
            ) {
              $(".overview-a").html(`<div style ="padding: 50px">
                you have reached today limit
                </div>`);
            }
          }

          if (req.url.includes("/keywords-explorer/") && !req.user.isAdmin) {
            // check if user has reach today limit
            const total = await keywordExplorerLimit$count(
              req.user.id,
              req.user.username,
              req.wpSite
            );

            if (
              total > config.getConfig().ahref_keywordExplorerLimit &&
              !req.user.isAdmin
            ) {
              $("head").append(`
                <script>
                window.addEventListener('load', function() {
                  setInterval(() => {
                    $('.page-content').html('you have reached limit')
                  }, 100)
                })
                </script>
              `);
            }
          }
          $(".helpMenu").remove();
          return $.html()
            .replace(/(?<=email:).+(?=,)/g, "''")
            .replace(/(?<="email":).+(?=,)/g, "''")
            .replace(/(?<=user_id:).+(?=,)/g, "''")
            .replace(/(?<="user_id":).+(?=,)/g, "''")
            .replace(/(?<=name:).+(?=,)/g, "''")
            .replace(/(?<="name":).+(?=,)/g, "''");
        }
        return responseBuffer;
      }
    ),
    ws: true,
    headers: {
      host: "https://app.ahrefs.com",
      referer: "https://app.ahrefs.com",
      origin: "https://app.ahrefs.com",
    },
  })
);

const boot = async () => {
  await Promise.all([db$connect(), config$sync()]);
  app.listen(process.env.AHREF_PORT, () => {
    console.log(`ahref proxy's running on port ${process.env.AHREF_PORT}`);
  });
};

boot();
