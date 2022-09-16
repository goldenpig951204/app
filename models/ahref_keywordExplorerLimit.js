const mongoose = require("mongoose");
const moment = require("moment");
const { Schema } = mongoose;

const ahref_keywordExplorerLimitSchema = new Schema({
  username: String,
  userId: Number,
  site: String,
  time: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

const ahref_keywordExplorerLimit = mongoose.model(
  "ahref_keywordExplorerLimit",
  ahref_keywordExplorerLimitSchema,
  "ahref_keywordExplorerLimit"
);

/**
 * count batchAnalysisLimit usage per user
 */
const countTime = async (userId, username, site) => {
  const todayEnd = moment().endOf("d").utc();
  const todayStart = moment().startOf("d").utc();
  const dt = await ahref_keywordExplorerLimit.count({
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
  ahref_keywordExplorerLimit,
  countTime,
};
