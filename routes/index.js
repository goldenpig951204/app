const semrushRouter = require("./semrush");
const adminRouter = require("./admin");
const authorizeRouter = require("./authorize");
const apiRouter = require("./api");
module.exports = {
  route$semrush: semrushRouter,
  route$admin: adminRouter,
  route$authorize: authorizeRouter,
  route$api: apiRouter,
};
