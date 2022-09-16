require("dotenv-safe").config();
const express = require("express");
const { connect: db$connect, config$sync } = require("./models");
const {
  route$semrush,
  route$admin,
  route$authorize,
  route$api,
} = require("./routes");
const bodyParser = require("body-parser");
const { onlyAdminMiddleware } = require("./utils/sessionValidator");
const path = require("path");
const cookieParser = require("cookie-parser");
const app = express();

//**Global configuration */
app.use(cookieParser());

app.set("views", path.join(__dirname, "./views"));

app.set("view engine", "pug");

app.use("/public", express.static(path.join(__dirname, "./public")));

app.use(
  "/server-logs/",
  express.static(path.join(__dirname, "./logs"), {
    setHeaders: (res) => {
      res.setHeader("Content-Type", "text/plain; charset=UTF-8");
    },
  })
);

if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    req.headers["x-real-ip"] = "203.205.53.56"; // FAKE IP when develop the application in development mode only
    next();
  });
}
//**Global configuration */

/** Global Middleware */
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
/** Global Middleware */

/** Routes */

app.use("/authorize", route$authorize);
app.use("/admin", route$admin);
app.use("/api", onlyAdminMiddleware, route$api);

app.use("/", route$semrush);
/** Routes */

/** Boot Application */

const boot = async () => {
  await Promise.all([db$connect(), config$sync()]);
  app.listen(process.env.PORT, () =>
    console.log(`Application is running on PORT: ${process.env.PORT}`)
  );
};

boot();

/** Boot Application */
