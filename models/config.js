const mongoose = require("mongoose");

const { Schema } = mongoose;
const config = require("../utils/config");

const ConfigSchema = new Schema({
  lid_required: [Number],
  domainOverviewLimit: {
    type: Number,
    default: 5,
  },
  keywordOverviewLimit: {
    type: Number,
    default: 5,
  },
  userAgent: String,
  cookie: String,
  ahref_cookie: String,
  ahref_siteExplorerLimit: {
    type: Number,

    default: 5,
  },
  ahref_keywordExplorerLimit: {
    type: Number,

    default: 5,
  },
  ahref_batchAnalysisLimit: {
    type: Number,
    default: 5,
  },
});

const Config = mongoose.model("config", ConfigSchema, "config");

/**
 * Auto Create default config when application start
 */
const autoSyncConfig = async () => {
  const dt = await Config.findOne();
  if (!dt) {
    const result = await Config.create({
      lid_required: [2, 3],
      domainOverviewLimit: 5,
      keywordOverviewLimit: 5,

      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36",
      cookie: "",
      ahref_cookie: "",
      ahref_siteExplorerLimit: 5,
      ahref_keywordExplorerLimit: 5,
      ahref_batchAnalysisLimit: 5,
    });
    config.setConfig(result);
    return result;
  } else {
    config.setConfig(dt);
    return dt;
  }
};

const getConfig = async () => {
  const dt = await Config.findOne();
  return dt;
};

const updateConfig = async (data) => {
  const dt = await Config.updateOne(null, data);
  return data;
};

module.exports = {
  Config,
  autoSyncConfig,
  getConfig,
  updateConfig,
};
