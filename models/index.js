const mongoose = require("mongoose");
const { autoSyncConfig } = require("./config");
const connect = async () => {
  return mongoose.connect(process.env.MONGO_URI, {
    logger: process.env.NODE_ENV === "development", //disable log on production
    serverSelectionTimeoutMS: 5000,
    dbName: "production",
  });
};

module.exports = {
  connect,
  config$sync: autoSyncConfig,
};
