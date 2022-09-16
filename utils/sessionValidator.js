const crypto = require("crypto");
const { get } = require("lodash");
const base64 = require("base-64");
const axios = require("axios");
const config = require("./config");
const { serverLog } = require("./logger");
const { Site } = require("../models/sites");

const sessionMapper = new Map(); // Uses to check mutil browsers

/**
 * Sign the session with user-agent and ip
 */
const sign = (timeSignedBuffer, dataBuffer, userAgent, ip) => {
  const signature = crypto
    .createHmac("sha1", process.env.PRIVATE_KEY)
    .update(`${userAgent}\n${ip}`)
    .update(timeSignedBuffer)
    .update(dataBuffer)
    .digest("base64");
  return signature;
};

/**
 *  Check membership base on site, user id and lid
 */
const _getMembership = async (uid, lid, site) => {
  const siteInfo = await Site.findOne({
    url: site,
  });
  if (!siteInfo || !siteInfo.membershipApiKey) {
    serverLog.error(`Missing config for ${site}`);
    return 0;
  }
  const { data } = await axios.get(
    `${site}/wp-content/plugins/indeed-membership-pro/apigate.php?ihch=${siteInfo.membershipApiKey}&action=verify_user_level&uid=${uid}&lid=${lid}`
  );
  return data.response;
};

const isAccessAble = async (uid, site) => {
  const check = await Promise.all(
    config.getConfig().lid_required.map((lid) => _getMembership(uid, lid, site))
  );
  return check.includes(1); // If user has one of plans then passed
};

/**
 * get encode Data from session string
 */
const _decodeSsess = (ssess) => {
  const [signature, timeBase64, dataBase64] = ssess.split("#");
  const timeBuffer = Buffer.from(timeBase64, "base64");
  const dataBuffer = Buffer.from(dataBase64, "base64");
  return {
    signature,
    timeBuffer,
    dataBuffer,
    data: JSON.parse(base64.decode(dataBase64)),
  };
};

/**
 * check if session is valid with private Key
 */
const _isValidSsess = (ssess, userAgent, ip) => {
  const { timeBuffer, dataBuffer, signature } = _decodeSsess(ssess);
  const sig = sign(timeBuffer, dataBuffer, userAgent, ip);
  return sig === signature;
};

/**
 * generate session
 */
const _generateSess = (dataBuffer, userAgent, ip) => {
  let now = new Date().getTime();
  let timeSignedBuffer = Buffer.alloc(4);
  timeSignedBuffer.writeUInt32LE(parseInt(now / 1000), 0);
  const signature = sign(timeSignedBuffer, dataBuffer, userAgent, ip);
  return `${signature}#${timeSignedBuffer.toString(
    "base64"
  )}#${dataBuffer.toString("base64")}`;
};

/**
 * middleware check session for router /authorize
 */
const authMiddleware = async (req, res, next) => {
  const userAgent = req.headers["user-agent"];
  const ip = req.headers["x-real-ip"];
  const ssess = get(req, "body.ssess");
  const site = get(req, "body.site");
  if (!ssess || !site) {
    return res.status(400).end("Bad Request, please try again");
  }
  if (!_isValidSsess(ssess, userAgent, ip)) {
    return res.status(400).end("session is invalid");
  }

  const { dataBuffer, data } = _decodeSsess(ssess);
  const newSess = _generateSess(dataBuffer, userAgent, ip);
  const user = {
    id: data[0],
    isAdmin: Number(data[3]),
    username: data[1].split("=")[1].split("|")[0],
    accessAble: Number(data[3]) ? true : await isAccessAble(data[0], site),
  };
  sessionMapper.set(`${site}-${user.id}`, newSess);
  await axios.default.post(
    `${process.env.AHREF_DOMAIN}/api/sync-session`,
    JSON.stringify({
      key: `${site}-${user.id}`,
      value: newSess,
    }),
    {
      headers: {
        "Content-type": "application/json",
      },
    }
  );
  console.log(process.env.NODE_ENV);
  res.cookie("ssess", newSess, {
    path: "/",
    domain: process.env.NODE_ENV === "development" ? undefined : ".nubeta.club",
  });
  res.cookie(
    "wp-info",
    base64.encode(
      JSON.stringify({
        user: user,
        site,
      })
    ),
    {
      path: "/",
      domain:
        process.env.NODE_ENV === "development" ? undefined : ".nubeta.club",
    }
  );
  next();
};

/**
 * Middleware only user which bought membership can access the site
 */
const onlyMemberMiddleware = async (req, res, next) => {
  if (req.url.match(/\.(css|json|js|text|png|jpg|map|ico|svg)/)) {
    //skip static file
    return next();
  }
  const wpInfo = get(req, "cookies.wp-info");
  const ssess = get(req, "cookies.ssess");
  if (!wpInfo || !ssess) {
    return res.status(400).end("Access Denined");
  }
  const userAgent = req.headers["user-agent"];
  const ip = req.headers["x-real-ip"];
  if (!_isValidSsess(ssess, userAgent, ip)) {
    return res.status(400).end("Session is invalid");
  }
  const wpInfoDecoded = JSON.parse(base64.decode(wpInfo));
  if (!wpInfoDecoded.user.accessAble) {
    return res.status(400).end("Membership required");
  }
  if (!sessionMapper.get(`${wpInfoDecoded.site}-${wpInfoDecoded.user.id}`)) {
    sessionMapper.set(`${wpInfoDecoded.site}-${wpInfoDecoded.user.id}`, ssess);
  }
  if (
    sessionMapper.get(`${wpInfoDecoded.site}-${wpInfoDecoded.user.id}`) !==
    ssess
  ) {
    return res.status(400).end("Multiple Browsers is not allowed");
  }
  req.user = wpInfoDecoded.user;
  req.wpSite = wpInfoDecoded.site;
  next();
};

/**
 * Middleware only administrator can access the router
 */

const onlyAdminMiddleware = async (req, res, next) => {
  const wpInfo = get(req, "cookies.wp-info");
  const ssess = get(req, "cookies.ssess");
  if (!wpInfo || !ssess) {
    return res.status(400).end("Access Denined");
  }
  const userAgent = req.headers["user-agent"];
  const ip = req.headers["x-real-ip"];
  if (!_isValidSsess(ssess, userAgent, ip)) {
    return res.status(400).end("Session is invalid");
  }
  const wpInfoDecoded = JSON.parse(base64.decode(wpInfo));
  if (!wpInfoDecoded.user.isAdmin) {
    return res.status(400).end("Restriced Access");
  }
  if (!sessionMapper.get(`${wpInfoDecoded.site}-${wpInfoDecoded.user.id}`)) {
    sessionMapper.set(`${wpInfoDecoded.site}-${wpInfoDecoded.user.id}`, ssess);
  }
  if (
    sessionMapper.get(`${wpInfoDecoded.site}-${wpInfoDecoded.user.id}`) !==
    ssess
  ) {
    return res.status(400).end("Multiple Browsers is not allowed");
  }
  next();
};

module.exports = {
  onlyMemberMiddleware,
  authMiddleware,
  onlyAdminMiddleware,
  sessionMapper,
};
