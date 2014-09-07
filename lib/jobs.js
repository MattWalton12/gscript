var mongoose = require("mongoose"),
	mongooseAI = require("mongoose-auto-increment");

var users = require("./user.js"),
	notify = require("./notify.js"),
	feedback = require("./feedback.js"),
	http = require("http");

exports.ACCEPTING_APPLICATIONS = 1
exports.IN_PROGRESS = 2
exports.AWAITING_PAYMENT = 4
exports.COMPLETED = 8

exports.schema = new mongoose.Schema({
	created: Date,
	user: mongoose.Schema.Types.ObjectId,
	title: String,
	description: String,
	price: String,
	description: String,
	status: Number,
	expires: Date
});

exports.schema.plugin(mongooseAI.plugin, {model: "Job", field: "id"});

exports.Job = mongoose.model("job", exports.schema);

var Job = exports.Job;

exports.Application = mongoose.model("application", {
	job: mongoose.Schema.Types.ObjectId,
	user: mongoose.Schema.Types.ObjectId,
	date: Date,
	quote: Number,
	comment: String,
	accepted: Boolean,
	completed: Boolean
});

exports.create = function(user, title, price, description, expires, callback) {
	Job.find({
		user: user,
		status: {"$not": exports.COMPLETED}
	
	}).sort({created: -1}).exec(function(err, jobs) {
		jobs = jobs || [];

		if (jobs.length >= 10) {
			return callback(new Error("You can only have upto 10 jobs active at once."));
		}

		if (jobs[0] && jobs[0].getMinutesBetween(new Date()) < 3) {
			return callback(new Error("Please wait a bit longer before creating another job."));
		}

		if (user.access < 1) {
			return callback(new Error("You do not have permission to create a new job!"));
		}

		var job = new Job({
			user: user,
			title: title,
			price: price.toFixed(2), 
			description: description,
			expires: expires,
			created: new Date(),
			status: exports.ACCEPTING_APPLICATIONS
		});

		job.save(function() {
			notify.user(user, "You have created a <a href='/job/" + job.id + "'>new job</a>")
			callback(null, job.id);
		});
	});
}

exports.apply = function(id, user, quote, comment, callback) {
	Job.findOne({
		id: id

	}, function(err, job) {
		if (job.user.toString() == user._id.toString())
			return callback(new Error("You cannot apply for your own job!"));

		if (job.status != exports.ACCEPTING_APPLICATIONS)
			return callback(new Error("You cannot apply for this job"));

		exports.getApplications(job, function(err, applications) {
			var found = false;

			for (i=0; i<applications.length; i++) {
				if (applications[i].user.toString() == user._id.toString()) {
					found = true;
					break;
				}
			}

			if (found)
				return callback(new Error("You have already applied for this job"));

			var application = new exports.Application({
				job: job,
				user: user,
				date: new Date(),
				quote: quote.toFixed(2),
				comment: comment,
				accepted: false,
				compltete: false
			});

			notify.user(job.user, user.steam.name + " applied for your <a href='/job/" + job.id + "'>Job</a>");

			application.save();

			job.save(function() {
				callback(null);
			});
		});
	});
}

exports.acceptApplication = function(job, id, callback) {
	if (job.status != exports.ACCEPTING_APPLICATIONS)
		return callback(new Error("You cannot accept another application!"));

	exports.getApplications(job, function(err, applications) {
		var found = false;

		for (i=0; i<applications.length; i++) {
			if (applications[i]._id.toString() == id.toString()) {
				applications[i].accepted = true;
				applications[i].save();

				job.status = exports.IN_PROGRESS;
				job.save();

				found = true;
				callback(null, applications[i]);

				users.User.findById(job.user, function(err, user) {
					notify.user(applications[i].user, user.steam.name + " accepted your application for <a href='/job/" + job.id + "'>" + job.title + "</a>");
				});

				break;
			}
		}

		if (!found)
			callback(new Error("Application not found"));
	});
}

exports.removeApplication = function(job, user, callback) {
	for (i=0; i<job.applications.length; i++) {
		if (job.applications[i].user.toString() == user._id.toString()) {
			job.applications.splice(i, 1);
			job.save();
			break;
		}
	}

	callback();
}

exports.finishedScript = function(job) {
	job.status = exports.AWAITING_PAYMENT;
	job.save();
}

exports.getApplications = function(job, callback) {
	exports.Application.find({job: job}, callback);
}

exports.getAcceptedApplication = function (job, callback) {
	exports.Application.findOne({job: job, accepted: true}, callback);
}

exports.getHomeJobs = function(page, callback) {
	page = page || 1;

	var skip = (page - 1) * 25

	exports.Job.count({status: exports.ACCEPTING_APPLICATIONS}, function(err, count) {
		exports.Job.find({status: exports.ACCEPTING_APPLICATIONS}).skip(skip).limit(25).exec(function(err, jobs) {
			function appendUserInfo(i) {
				if (jobs[i]) {
					jobs[i] = jobs[i].toObject();

					users.getStats(jobs[i].user, function(err, user) {
						jobs[i].user = user;
						appendUserInfo(i + 1);
					});
				
				} else {
					callback(null, jobs, count);
				}
			}

			appendUserInfo(0);
		});
	});
}

exports.remove = function(user, id, callback) {
	exports.Job.findOne({user: user, id: id, status: {"$lte": exports.AWAITING_PAYMENT}}, function(err, job) {
		if (job) {
			job.remove();
			callback();

		} else {
			callback(new Error("Job not found"));
		}

	});
}


