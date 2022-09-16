const mongoose = require("mongoose");
const moment = require("moment");
const { Schema } = mongoose;

const ahref_siteExplorerLimitSchema = new Schema({
  username: String,
  userId: Number,
  site: String,
  domain: String,
  time: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

const ahref_siteExplorerLimit = mongoose.model(
  "ahref_siteExplorerLimit",
  ahref_siteExplorerLimitSchema,
  "ahref_siteExplorerLimit"
);

/**
 * count batchAnalysisLimit usage per user
 */
const countTime = async (userId, username, site) => {
  const todayEnd = moment().endOf("d").utc();
  const todayStart = moment().startOf("d").utc();
  const dt = await ahref_siteExplorerLimit.count({
    userId: userId,
    username: username,
    site: site,
    time: {
      $gte: todayStart,
      $lte: todayEnd,
    },
  });
  return dt;
};
module.exports = {
  ahref_siteExplorerLimit,
  countTime,
};
