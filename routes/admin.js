const AdminRouter = require("express").Router();
const {
  onlyAdminMiddleware: middleware$onlyAdmin,
} = require("../utils/sessionValidator");
AdminRouter.use(middleware$onlyAdmin);

AdminRouter.get("/", (req, res) => {
  res.render("admin");
});

module.exports = AdminRouter;
