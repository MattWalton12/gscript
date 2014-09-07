var mongoose = require("mongoose");

var jobs = require("./jobs.js"),
	users = require("./user.js"),
	notify = require("./notify.js");

exports.schema = new mongoose.Schema({
	reviewer: mongoose.Schema.ObjectId,
	user: mongoose.Schema.ObjectId,
	job: mongoose.Schema.ObjectId,
	state: String,

	rating: {
		type: Number,
		min: -1,
		max: 1
	},

	text: String,
	imported: Boolean,
	date: Date
});

exports.Feedback = mongoose.model("feedback", exports.schema);

exports.add = function(user, target, job, rating, text, callback) {
 	exports.Feedback.findOne({user: target, job: job}, function(err, feedback) {
 		if (feedback)
 			return callback(new Error("Feedback already left"));

 		var state = "Coder";

 		if (job.user == user)
 			state = "Hirer";

 		var feedback = new exports.Feedback({
 			reviewer: user,
 			user: target,
 			job: job,
 			rating: rating,
 			text: text,
 			date: new Date(),
 			state: state
 		});

 		users.User.findById(user, function(err, user) {
 			notify.user(target, user.steam.name + " left you feedback for <a href='/job/" + job.id + "'>" + job.title + "</a>.");
 		});

 		feedback.save();

 		callback(null);
 	});
}