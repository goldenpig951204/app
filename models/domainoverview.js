const mongoose = require("mongoose");
const moment = require("moment");
const { Schema } = mongoose;

const DomainOverviewSchema = new Schema({
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

const DomainOverview = mongoose.model(
  "domainoverview",
  DomainOverviewSchema,
  "domainoverview"
);

/**
 * count domainOverview usage per user
 */
const countTime = async (userId, username, site) => {
  const todayEnd = moment().endOf("d").utc();
  const todayStart = moment().startOf("d").utc();
  const dt = await DomainOverview.count({
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
  DomainOverview,
  countTime,
};
