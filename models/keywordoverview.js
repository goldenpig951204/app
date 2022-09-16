const mongoose = require("mongoose");
const moment = require("moment");
const { Schema } = mongoose;

const KeywordOverViewSchema = new Schema({
  username: String,
  userId: Number,
  site: String,
  phases: [String],
  time: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

const KeywordOverview = mongoose.model(
  "keywordoverview",
  KeywordOverViewSchema,
  "keywordoverview"
);
/**
 * count keywordoverview usage per user
 */
const countTime = async (userId, username, site) => {
  const todayEnd = moment().endOf("d").utc();
  const todayStart = moment().startOf("d").utc();
  const dt = await KeywordOverview.count({
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
  KeywordOverview,
  countTime,
};
