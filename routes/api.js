const express = require("express");
const crypto = require("crypto");
const apiRouter = express.Router();
const glob = require("glob");
const config = require("../utils/config");
const { get } = require("lodash");
const path = require("path");
const { Site } = require("../models/sites");
const DeverRequest = require("devergroup-request").default;
const dvAxios = new DeverRequest({
  axiosOpt: {
    timeout: 30 * 1000,
  },
});
const {
  getConfig: db$getConfig,
  updateConfig: db$updateConfig,
} = require("../models/config");
const { serverLog } = require("../utils/logger");

apiRouter.post("/ahref-login", async (req, res) => {
  const client = new DeverRequest({
    axiosOpt: {
      timeout: 30 * 1000,
    },
  });
  const { email, password } = req.body;
  try {
    const body = {
      remember_me: true,
      auth: {
        login: email,
        password,
      },
    };
    await client.instance.post(
      "https://auth.ahrefs.com/auth/login",
      JSON.stringify(body),
      {
        headers: {
          "user-agent": config.getConfig().userAgent,
          accept: "application/json, text/plain, */*",
          "content-type": "text/plain;charset=UTF-8",
          referer: "https://app.ahrefs.com",
          origin: "https://app.ahrefs.com",
        },
      }
    );
    const cookie = client.cookieJar.getCookieStringSync(
      "https://app.ahrefs.com"
    );
    await db$updateConfig({
      ahref_cookie: cookie,
    });
    const cifg = await db$getConfig();
    config.setConfig(cifg);
    await client.instance.get(`${process.env.AHREF_DOMAIN}/api/sync-config`);
    serverLog.info(`start session with ${email} successfully`);
    res.send("Login successfully");
  } catch (err) {
    serverLog.error(
      `start session with ${email} failed: ${
        get(err, "response.data.error") || err.toString()
      }`
    );
    res.status(500).send(get(err, "response.data.error") || err.toString());
  }
});
apiRouter.post("/semrush-login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const body = {
      email: email,
      locale: "en",
      source: "semrush",
      "g-recaptcha-response": "",
      "user-agent-hash": crypto
        .createHash("sha1")
        .update(email)
        .digest("hex")
        .substr(0, 32),
      password: password,
    };
    await dvAxios.instance.post(
      "https://www.semrush.com/sso/authorize",
      JSON.stringify(body),
      {
        headers: {
          "user-agent": config.getConfig().userAgent,
          accept: "application/json, text/plain, */*",
          "content-type": "application/json;charset=UTF-8",
          "content-length": Buffer.from(JSON.stringify(body), "utf-8"),
        },
      }
    );
    const cookie = dvAxios.cookieJar.getCookieStringSync(
      "https://www.semrush.com"
    );
    await db$updateConfig({
      cookie,
    });
    const cifg = await db$getConfig();
    config.setConfig(cifg);
    serverLog.info(`start session with ${email} successfully`);
    res.send("Login successfully");
  } catch (err) {
    serverLog.error(
      `start session with ${email} failed: ${
        get(err, "response.data.message") || err.toString()
      }`
    );
    res.status(500).send(get(err, "response.data.message") || err.toString());
  }
});

apiRouter.post("/semrush-config", async (req, res) => {
  const {
    userAgent,
    cookie,
    keywordOverviewLimit,
    domainOverviewLimit,
    lid_required,
    ahref_siteExplorerLimit,
    ahref_keywordExplorerLimit,
    ahref_batchAnalysisLimit,
    ahref_cookie,
  } = req.body;

  const dt = await db$updateConfig({
    userAgent,
    cookie,
    keywordOverviewLimit: Number(keywordOverviewLimit),
    domainOverviewLimit: Number(domainOverviewLimit),
    lid_required: lid_required.split(",").map((t) => Number(t)),
    ahref_cookie,
    ahref_siteExplorerLimit: Number(ahref_siteExplorerLimit),
    ahref_keywordExplorerLimit: Number(ahref_keywordExplorerLimit),
    ahref_batchAnalysisLimit: Number(ahref_batchAnalysisLimit),
  });
  await dvAxios.instance.get(`${process.env.AHREF_DOMAIN}/api/sync-config`);
  config.setConfig(dt);
  res.json(dt);
});

apiRouter.get("/semrush-config", async (req, res) => {
  try {
    const config = await db$getConfig();
    res.json(config);
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

apiRouter.get("/sites", async (req, res) => {
  try {
    const sites = await Site.find();
    res.json(sites);
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

apiRouter.post("/site", async (req, res) => {
  try {
    const { uuid, url, membershipApiKey } = req.body;
    const dt = await Site.findOneAndUpdate(
      {
        uuid,
      },
      { uuid, url, membershipApiKey },
      {
        upsert: true,
      }
    );
    res.json(dt);
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

apiRouter.delete("/site/:uuid", async (req, res) => {
  try {
    const { uuid } = req.params;
    await Site.findOneAndDelete({
      uuid,
    });
    res.send(`delete ${uuid} successfully`);
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

apiRouter.get("/sites", async (req, res) => {
  try {
    const sites = await Site.find({});
    res.json(sites);
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

apiRouter.get("/logs", async (req, res) => {
  try {
    const logs = glob.sync(path.join(__dirname, "../logs/*.*"));

    res.json(logs.map((log) => path.basename(log)));
  } catch (err) {
    res.status(500).send(err.toString());
  }
});
module.exports = apiRouter;
