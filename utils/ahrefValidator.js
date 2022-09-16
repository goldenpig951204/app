const config = require("../utils/config");
const {
  countTime: siteExplorer$count,
  ahref_siteExplorerLimit,
} = require("../models/ahref_siteExplorerLimit");

const {
  countTime: keywordExplorer$count,
  ahref_keywordExplorerLimit,
} = require("../models/ahref_keywordExplorerLimit");

const {
  countTime: batchAnalysisLimit$count,
  ahref_batchAnalysisLimit,
} = require("../models/ahref_batchAnalysisLimit");

const siteExplorerLimitMiddleware = async (req, res, next) => {
  if (req.url.includes("/site-explorer/overview/v2/")) {
    const total = await siteExplorer$count(
      req.user.id,
      req.user.username,
      req.wpSite
    );
    if (total > config.getConfig().ahref_siteExplorerLimit) {
      next(); // skip
    } else {
      await ahref_siteExplorerLimit.create({
        userId: req.user.id,
        username: req.user.username,
        site: req.wpSite,
        domain: req.query.target,
      });
      next();
    }
  } else {
    next();
  }
};

const keywordExplorerLimitMiddleware = async (req, res, next) => {
  if (req.url.includes("v4/ke") && !req.url.includes("v4/kePlan")) {
    const total = await keywordExplorer$count(
      req.user.id,
      req.user.username,
      req.wpSite
    );
    if (total > config.getConfig().ahref_keywordExplorerLimit) {
      return res.status(200).json(["false"]);
    } else {
      if (req.method === "POST" && req.url.includes(`v4/keKeywordOverview`)) {
        await ahref_keywordExplorerLimit.create({
          userId: req.user.id,
          username: req.user.username,
          site: req.wpSite,
        });
      }
      next();
    }
  } else {
    next();
  }
};

const batchAnalysisLimitMiddleware = async (req, res, next) => {
  if (req.method === "POST" && req.url.includes("/batch-analysis")) {
    const total = await batchAnalysisLimit$count(
      req.user.id,
      req.user.username,
      req.wpSite
    );
    if (total > config.getConfig().ahref_batchAnalysisLimit) {
      if (!req.user.isAdmin) {
        res.send("you have reached limit");
      } else {
        next();
      }
    } else {
      await ahref_batchAnalysisLimit.create({
        userId: req.user.id,
        username: req.user.username,
        site: req.wpSite,
      });
      next();
    }
  } else {
    next();
  }
};

module.exports = {
  siteExplorerLimitMiddleware,
  keywordExplorerLimitMiddleware,
  batchAnalysisLimitMiddleware,
};
