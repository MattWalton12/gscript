var express = require("express"),
	flash = require("express-flash"),
	cookieParser = require("cookie-parser"),
	bodyParser = require("body-parser"),
	session = require("express-session"),
	passport = require("passport"),
	dateUtils = require("date-utils"),
	env = require("node-env-file");

env(__dirname + "/.env");

var app = express();

var db = require("./lib/database.js"),
	users = require("./lib/user.js"),
	notify = require("./lib/notify.js");

var routes = require("./routes");

app.use("/static", express.static(__dirname + "/static"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(session({secret: process.env.SESSION_SECRET}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

app.use(function(req, res, next) {
    res.locals.login = req.isAuthenticated();
    res.locals.user = req.user;
 
    if (req.user && !req.user.email && req.path != "/profile/welcome" && req.path != "/profile/update") {
    	console.log(req.user);
    	return res.redirect("/profile/welcome");
    }

    next();
});

app.use(notify.middleware);

app.get("/", routes.home.render);

app.get("/login", routes.auth.renderLogin);
app.get("/auth/steam", function(req, res, next) {
	var ref = req.header('Referer');

	if (ref) {
		req.session.loginReturn = ref;
	}

	next();

}, passport.authenticate("steam"));

app.get("/auth/steam/return", passport.authenticate("steam"), routes.auth.loginReturn);
app.get("/auth/logout", users.checkAuthentication, routes.auth.logout);

app.get("/profile", users.checkAuthentication, routes.profile.getCurrent);
app.get("/profile/notifications", users.checkAuthentication, routes.profile.renderNotifications)
app.get("/profile/edit", users.checkAuthentication, routes.profile.renderEdit)
app.get("/profile/:id", routes.profile.renderProfile);
app.get("/profile/welcome", users.checkAuthentication, routes.profile.renderWelcome);
app.post("/profile/update", users.checkAuthentication, routes.profile.update);
app.get("/profile/coderhireImport", users.checkAuthentication, routes.profile.coderhireImport);

app.post("/jobs/create", users.checkAuthentication, routes.jobs.create);
app.post("/jobs/apply", users.checkAuthentication, routes.jobs.apply);
app.get("/jobs/removeApplication", users.checkAuthentication, routes.jobs.removeApplication);
app.get("/jobs/removeJob", users.checkAuthentication, routes.jobs.removeJob);
app.get("/jobs/acceptApplication", users.checkAuthentication, routes.jobs.acceptApplication);
app.get("/jobs/markFinished", users.checkAuthentication, routes.jobs.markFinished);
app.get("/jobs/markCompleted", users.checkAuthentication, routes.jobs.markCompleted);
app.get("/jobs/leaveFeedback/:id", users.checkAuthentication, routes.jobs.renderLeaveFeedback);
app.post("/jobs/leaveFeedback", users.checkAuthentication, routes.jobs.leaveFeedback);

app.get("/jobs", routes.home.render);
app.get("/job/:id", routes.jobs.render);

app.get("/api/getUserInfo", routes.api.getUserInfo);
app.get("/api/getFeedback", routes.api.getFeedback);

app.get("/legal/terms", routes.legal.renderTerms);

app.listen(13371);