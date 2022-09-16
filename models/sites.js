const mongoose = require("mongoose");

const { Schema } = mongoose;

const SiteSchema = new Schema({
  uuid: {
    type: String,
    required: true,
    unique: true,
  },
  url: {
    type: String,
    unique: true,
  },
  membershipApiKey: {
    type: String,
    required: true,
  },
});

SiteSchema.index(
  { url: 1, membershipApiKey: 1 },
  {
    unique: true,
  }
);

const Site = mongoose.model("site", SiteSchema);

module.exports = {
  Site,
};
