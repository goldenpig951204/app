const config = require("../utils/config");
const {
  DomainOverview,
  countTime: domainOverview$count,
} = require("../models/domainoverview");

const {
  KeywordOverview,
  countTime: keywordOverview$count,
} = require("../models/keywordoverview");

/**
 * restrict user access module domainoverview when reached daily limit
 */
const domainOverViewMiddleware = async (req, res, next) => {
  if (
    req.method === "POST" &&
    !Array.isArray(req.body) &&
    req.body.method === "dpa.IsRootDomain" &&
    req.body.params.report === "domain.overview"
  ) {
    const total = await domainOverview$count(
      req.user.id,
      req.user.username,
      req.wpSite
    );
    if (total > config.getConfig().domainOverviewLimit) {
      return res.json({
        error: {
          code: "-1",
          message: "reached limit",
        },
      });
    } else {
      await DomainOverview.create({
        userId: req.user.id,
        username: req.user.username,
        site: req.wpSite,
        domain: req.body.params.args.searchItem,
      });
      next();
    }
  } else {
    next();
  }
};

/**
 * restrict user access module keywordorverview when reached daily limit
 */
const keywordOverviewMiddleware = async (req, res, next) => {
  if (
    req.method === "POST" &&
    req.url.includes("/kmt/rpc") &&
    req.body.method === "keywords.GetInfoOverviewN" &&
    req.body.id !== 1
  ) {
    const total = await keywordOverview$count(
      req.user.id,
      req.user.username,
      req.wpSite
    );
    if (total > config.getConfig().keywordOverviewLimit) {
      return res.json({
        jsonrpc: "2.0",
        error: { code: -32004, message: "daily limit exceed", data: null },
        id: 3,
      });
    } else {
      await KeywordOverview.create({
        userId: req.user.id,
        username: req.user.username,
        site: req.wpSite,
        phases: req.body.params.phrases,
      });
      next();
    }
  } else {
    next();
  }
};

module.exports = {
  domainOverViewMiddleware,
  keywordOverviewMiddleware,
};
