var mongoose = require("mongoose"),
	passport = require("passport"),
	SteamStrategy = require("passport-steam").Strategy,
	mongooseAI = require("mongoose-auto-increment"),
	steam = require("steam-community")(),
	validator = require("validator"),
	http = require("http");

var feedback = require("./feedback.js"),
	jobs = require("./jobs.js");

exports.schema = new mongoose.Schema({
	description: String,
	email: String,
	verified: String,
	paypal: String,

	newUser: {
		default: true,
		type: Boolean
	},

	join: Date,

	steam: {
		id: String,
		name: String,
		avatar: String
	},

	feedback: Array,

	access: {
		default: 1,
		type: Number
	},

	comments: Array,
	imported: {
		type: Boolean,
		default: false
	},

	settings: {
		notificationEmail: Boolean
	}
});

exports.schema.plugin(mongooseAI.plugin, {model: "User", field: "id"});

exports.User = mongoose.model("user", exports.schema);

exports.create = function(steamid, name, avatar, callback) {
	exports.User.findOne({"steam.id": steamid}, function(err, existing) {
		if (existing)
			return callback(new Error("You already have an account!"));

		var user = new exports.User({
			steam: {
				id: steamid,
				name: name,
				avatar: avatar
			},

			join: new Date()
		});

		user.save(function() {
			callback(null, user);
		});
	});
}

exports.updateSteamProfile = function(steamid, callback) {
	steam.user(steamid, function(err, info) {
		if (err && callback)
			return callback(err);

		if (callback) {
			callback(null, info.steamID, info.avatarMedium);
		
		} else {
			exports.User.findOne({"steam.id": steamid}, function(err, user) {
				if (user) {
					user.steam.name = info.name;
					user.steam.avatar = info.avatarMedium;

					user.save();
				}
			});
		}
	});
}

exports.handleLogin = function(steamid, name, avatar, callback) {
	name = validator.escape(name)
	avatar = avatar.replace("http://media.steampowered.com", "https://steamcdn-a.akamaihd.net");

	exports.User.findOne({"steam.id": steamid}, function(err, user) {

		if (user) {
			// we've got a user so we can do stuff like update last online and stuff
			user.steam.name = name;
			user.steam.avatar = avatar;
			user.save();

			callback(null, user);

		} else {
			// No user, let's create one
			exports.create(steamid, name, avatar, callback);
		}

	});
}

passport.serializeUser(function(user, done) {
	done(null, user._id);
});

passport.deserializeUser(function(obj, done) {
	exports.User.findById(obj, done);
});

console.log(process.env);

passport.use(new SteamStrategy({
	returnURL: (process.env.NODE_ENV == "production" && "http://gscript.net/auth/steam/return" || "http://localhost:13371/auth/steam/return"),
	realm: (process.env.NODE_ENV == "production" && "http://gscript.net" || "http://localhost:13371"),
	apiKey: process.env.STEAM_KEY

}, function(identifier, profile, done) {

	exports.handleLogin(profile._json.steamid, profile._json.personaname, profile._json.avatarmedium, function(err, user) {
		return done(err, user);
	});

}));

exports.checkAuthentication = function(req, res, next) {
	if (req.isAuthenticated()) {
		next();
	
	} else {
		req.flash("error", "Login required for that action");
		res.redirect("/login");
	}
}

exports.getStats = function(user, callback) {
	exports.User.findById(user, function(err, user) {
		if (user) {
			user = user.toObject();
			feedback.Feedback.find({user: user}, function(err, docs) {
				var score = 0;

				for (i=0; i<docs.length; i++) {
					score = score + docs[i].rating;
				}

				user.stats = {};

				user.stats.feedback = score;
				
				jobs.Job.count({user: user, status: jobs.COMPLETED}, function(err, count) {
					user.stats.jobsHirer = count;

					jobs.Application.count({user: user, completed: true}, function(err, count) {
						user.stats.jobsCoder = count || 0;
						callback(err, user);
					});
				});
			});

		} else {
			callback(new Error("No user found"));
		}
	});
}

exports.getFeedback = function(user, page, callback) {
	var skip = (page - 1) * 25

	feedback.Feedback.count({user: user}, function(err, count) {
		feedback.Feedback.find({user: user}).skip(skip).limit(25).sort({date: -1}).exec(function(err, data) {
			function appendUserAvatar(i) {
				if (data[i]) {
					data[i] = data[i].toObject();
					
					if (data[i].reviewer && data[i].job) {
						jobs.Job.findById(data[i].job, function(err, job) {
							exports.User.findById(data[i].reviewer, function(err, reviewer) {
								reviewer = reviewer.toObject();
								var obj = {};
								obj.id = reviewer.id;
								obj.steam = reviewer.steam;

								data[i].reviewer = obj;
								data[i].job = job;

								appendUserAvatar(i + 1);
							});
						});

					} else {
						if (data[i].reviewer && data[i].imported) {
							exports.User.findById(data[i].reviewer, function(err, reviewer) {
								reviewer = reviewer.toObject();
								var obj = {};
								obj.id = reviewer.id;
								obj.steam = reviewer.steam;

								data[i].reviewer = obj;

								appendUserAvatar(i + 1);
							});

						} else {
							appendUserAvatar(i + 1);
						}
					}
				
				} else {
					callback(null, data, count);
				}
			}

			appendUserAvatar(0);
		});
	});
}

exports.coderhireImport = function(user, callback) {
	if (user.imported)
		return callback("Your profile has already been imported!");

	http.get("http://coderhire.com/api/reputations/user/" + user.steam.id, function(res) {
		var body = "";
		
		res.on("data", function(chunk) {
			body += chunk;
		});

		res.on("end", function() {
			var res = JSON.parse(body);

			if (res.status == "error")
				return callback(res.error);

			var reps = res.success.reputations;

			function processRep(i) {
				if (reps[i]) {
					exports.User.findOne({"steam.id": reps[i].from.steamid64}, function(err, reviewer) {
						var rep = new feedback.Feedback({
							user: user,
							reviewer: reviewer,
							state: reps[i].role,
							rating: reps[i].reputation,
							text: reps[i].message,
							imported: true
						});

						rep.save();

						processRep(i + 1);
					});
				
				} else {
					user.imported = true;
					user.save();

					callback(null);
				}
			}

			processRep(0);
		});
	});
}