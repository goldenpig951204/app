const express = require("express");
const cheerio = require("cheerio");
const {
  createProxyMiddleware,
  responseInterceptor,
} = require("http-proxy-middleware");

const SemrushRouter = express.Router();
const querystring = require("querystring");
const {
  countTime: keywordOverView$count,
} = require("../models/keywordoverview");
const { countTime: domainOverView$count } = require("../models/domainoverview");
const {
  onlyMemberMiddleware: middleware$onlyMember,
} = require("../utils/sessionValidator");

const {
  domainOverViewMiddleware,
  keywordOverviewMiddleware,
} = require("../utils/semrushValidator");
const { semrushLog } = require("../utils/logger");
const config = require("../utils/config");

const SemrushProxy = createProxyMiddleware({
  target: `https://www.semrush.com/`,
  selfHandleResponse: true,
  changeOrigin: true,
  onProxyReq: (proxyReq, req, res) => {
    // intercept proxy request and set UserAgent and cookie of first session
    proxyReq.setHeader("user-agent", config.getConfig().userAgent);
    proxyReq.setHeader("Cookie", config.getConfig().cookie);
    // intercept proxy request and set UserAgent and cookie of first session

    // Fix the body-parser module
    if (["POST", "PATCH", "PUT"].includes(req.method)) {
      const contentType = proxyReq.getHeader("Content-Type");
      const writeBody = (bodyData) => {
        proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      };

      if (contentType && contentType.includes("application/json")) {
        writeBody(JSON.stringify(req.body));
      }

      if (
        contentType &&
        contentType.includes("application/x-www-form-urlencoded")
      ) {
        writeBody(querystring.stringify(req.body));
      }
    }
    // Fix the body-parser module
  },
  onProxyRes: responseInterceptor(
    async (responseBuffer, proxyRes, req, res) => {
      if (req.url.match(/\.(css|json|js|text|png|jpg|map|ico|svg)/)) {
        // ignore static file
        return responseBuffer;
      }

      semrushLog.info(
        `${req.user.username} ${req.wpSite} ${req.headers["user-agent"]} ${req.url} ${proxyRes.statusCode}`
      ); // log the activity

      // rewrite the location to our domain
      if (proxyRes.headers["location"]) {
        proxyRes.headers["location"] = proxyRes.headers["location"].replace(
          "https://www.semrush.com",
          process.env.DOMAIN
        );
        res.setHeader(
          "location",
          proxyRes.headers["location"].replace(
            "https://www.semrush.com",
            process.env.DOMAIN
          )
        );
      }

      // rewrite the location to our domain

      if (
        proxyRes.headers["content-type"] &&
        proxyRes.headers["content-type"].includes("text/html")
      ) {
        const response = responseBuffer.toString("utf-8");
        const $ = cheerio.load(response);
        // remove unnecessary html from semrush
        $(".srf-footer .s-col-2 .srf-menu").remove();
        $(".srf-dropdown.srf-switch-locale-trigger").remove();
        // remove unnecessary html from semrush

        if (req.url.includes("/analytics/overview") && !req.user.isAdmin) {
          // check if user has reach today limit
          const total = await domainOverView$count(
            req.user.id,
            req.user.username,
            req.wpSite
          );
          if (total > config.getConfig().domainOverviewLimit) {
            $("#domain-overview-app").remove();
            $(".srf-layout__body").append(`<div style ="padding: 50px">
              you have reached today limit
              </div>`);
          }
        }

        if (
          req.url.includes("/analytics/keywordoverview") &&
          !req.user.isAdmin
        ) {
          // check if user has reach today limit
          const total = await keywordOverView$count(
            req.user.id,
            req.user.username,
            req.wpSite
          );
          if (total > config.getConfig().keywordOverviewLimit) {
            $(".srf-layout__body").html(`<div style ="padding: 50px">
              you have reached today limit
              </div>`);
          }
        }

        if (req.user.isAdmin) {
          return $.html();
        } else {
          // remove the account information if client is normal user
          $(".srf-navbar__right").remove();
          return $.html();
        }
      }
      return responseBuffer;
    }
  ),
  prependPath: true,
  secure: false,
  hostRewrite: true,
  headers: {
    referer: "https://www.semrush.com",
    origin: "https://www.semrush.com",
  },
  autoRewrite: true,

  ws: true,
});
SemrushRouter.use(
  "/",
  middleware$onlyMember,
  (req, res, next) => {
    if (!config.getConfig().cookie || !config.getConfig().userAgent) {
      res.status(500).end(`Semrush session isn't started`); // check if first session is started
    } else {
      next();
    }
  },
  domainOverViewMiddleware,
  keywordOverviewMiddleware,
  SemrushProxy
);

module.exports = SemrushRouter;
