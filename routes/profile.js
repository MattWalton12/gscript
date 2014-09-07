var validator = require("validator"),
	moment = require("moment");

var users = require("./../lib/user.js"),
	notify = require("./../lib/notify.js");

exports.renderWelcome = function(req, res) {
	if (!req.user.newUser)
		return res.redirect("/");

	res.render("profile/welcome", {title: "Welcome to gscript!"});
}

exports.update = function(req, res) {
	var email = req.param("email"),
		paypal = req.param("paypal"),
		description = req.param("description");

	if (req.user.newUser) {
		if (!email || !validator.isEmail(email)) {
			req.flash("error", "You must enter a valid email address!");
			return res.redirect("/profile/welcome");
		}

		req.user.email = email;
		req.user.paypal = email;
		req.user.newUser = false;

		req.user.save();
		
		return res.redirect("/profile");
	}

	if (email && validator.isEmail(email))
		req.user.email = email;

	if (paypal && validator.isEmail(paypal))
		req.user.paypal = paypal;

	if (description && description.length <= 1000)
		req.user.description = description;

	req.user.save();
	req.flash("info", "Successfully updated profile");
	res.redirect("/profile");
}

exports.getCurrent = function(req, res) {
	res.redirect("/profile/" + req.user.id);
}

exports.renderProfile = function(req, res, next) {
	var id = req.params.id;
	var page = Math.max(parseInt(req.param("page")), 1);

	page = page || 1;

	if (!id || !parseInt(id))
		return next();

	users.User.findOne({id: id}, function(err, user) {
		if (!user)
			return next();

		users.getStats(user._id, function(err, user) {
			if (user) {
				users.getFeedback(user, page, function(err, feedback, count) {
					res.render("profile/profile", {title: user.steam.name, profile: user, current: (req.user && user._id == req.user._id || false), feedback: feedback, count: count, page: page});
				});
			} else {
				next();
			}
		});
	});
}

exports.renderEdit = function(req, res) {
	res.render("profile/edit", {title: "Edit profile"})
}

exports.renderNotifications = function(req, res) {
	notify.Notification.find({user: req.user}).sort({date: -1}).exec(function(err, notifications) {
		res.render("profile/notifications", {title: "Notifications", notifications: notifications, moment: moment});

		for (i=0; i<notifications.length; i++) {
			notifications[i].read = true;
			notifications[i].save();
		}
	});
}

exports.coderhireImport = function(req, res) {
	users.coderhireImport(req.user, function(err) {
		if (err) {
			if (err == "The resource was not found.")
				return res.json({
					status: "error",
					error: "CoderHire account not found"
				});

			else
				return res.json({
					status: "error",
					error: err
				});
		}

		res.json({
			status: "success"
		});
	});
}