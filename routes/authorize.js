const AuthorizeRouter = require("express").Router();
const { authMiddleware } = require("../utils/sessionValidator");
AuthorizeRouter.use(authMiddleware);
AuthorizeRouter.use("/", (req, res) => {
  if (req.query.redirect === "admin") {
    return res.status(301).redirect("/admin");
  }
  if (req.query.redirect === "sr") {
    return res.status(301).redirect("/projects");
  }
  return res.status(404).end("not found");
});

module.exports = AuthorizeRouter;
