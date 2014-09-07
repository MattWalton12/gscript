var validator = require("validator"),
	moment = require("moment"),
	date = require("date-utils");

var jobs = require("./../lib/jobs.js"),
	notify = require("./../lib/notify.js"),
	users = require("./../lib/user.js"),
	feedback = require("./../lib/feedback.js");

exports.create = function(req, res) {
	var title = req.param("title"),
		price = req.param("price"),
		expires = req.param("expires"),
		description = req.param("description");

	title = validator.trim(title);
	price = parseFloat(price);
	expires = new Date(expires);
	description = validator.trim(description);

	if (!title || title.length < 5 || title.length > 50) {
		return res.json({
			status: "error",
			error: "Please enter a valid title length"
		});
	}

	if (!price || price < 2 || price > 1000) {
		return res.json({
			status: "error",
			error: "Please enter a valid budget"
		});
	}

	if (!expires || expires.isBefore(new Date().addHours(1))) {
		return res.json({
			status: "error",
			error: "Please enter a valid expiry date"
		});
	}

	if (!description || description.length < 50 || description.length > 1000) {
		return res.json({
			status: "error",
			error: "Please enter a valid description"
		});
	}

	jobs.create(req.user, title, price, description, expires, function(err, id) {
		if (err)
			return res.json({
				status: "error",
				error: err.message
			});

		res.json({
			status: "success",
			id: id
		});
	});
}

exports.render = function(req, res, next) {
	var id = req.params.id;

	jobs.Job.findOne({id: id}, function(err, job) {
		if (job) {
			job = job.toObject();

			var applied = false;
			var accepted = false;
			var acceptee = false;

			var coderFeedback = false;
			var hirerFeedback = false;

			jobs.getApplications(job, function(err, applications) {
				if (req.user) {
					for (i=0; i<applications.length; i++) {
						if (applications[i].user.toString() == req.user._id.toString()) {
							applied = true;

							if (job.status == jobs.IN_PROGRESS && applications[i].accepted) {
								accepted = true;
								req.flash("info", "You have been accepted for this job. Please complete it before the due date.")
							
							} else if (job.status == jobs.ACCEPTING_APPLICATIONS) {
								req.flash("info", "You have applied for this job");
							}

							break;
						}
					}
				
				}

				if (job.status != jobs.ACCEPTING_APPLICATIONS) {
					for (i=0; i<applications.length; i++) {
						if (applications[i].accepted) {
							acceptee = applications[i].user;
							break;
						}
					}
				}

				
				feedback.Feedback.find({job: job}, function(err, feedbacks) {
					for (i=0; i<feedbacks.length; i++) {
						if (feedbacks[i].state == "Coder")
							coderFeedback = true;

						if (feedbacks[i].state == "Hirer")
							hirerFeedback = true;
					}

					var owned = false;

					if (req.user)
						owned = req.user._id.toString() == job.user.toString();

					if (job.status == jobs.IN_PROGRESS) {
						users.getStats(acceptee, function(err, acceptee) {
							if (owned) 
								req.flash("info", "Your job is in progress by " + acceptee.steam.name);
						
							users.getStats(job.user, function(err, user) {
								job.user = user;
								res.render("job", {title: job.title, job: job, applications: applications, moment: moment, applied: applied, owned: owned, accepted: accepted, acceptee: acceptee, coderFeedback: coderFeedback, hirerFeedback: hirerFeedback});
							});
						});

					} else if (job.status == jobs.AWAITING_PAYMENT) {
						users.getStats(acceptee, function(err, acceptee) {
							if (owned)
								req.flash("info", "Your job has been marked as finished by the coder. Please arrange payment and the recipt/installation of your script.");

							users.getStats(job.user, function(err, user) {
								job.user = user;
								res.render("job", {title: job.title, job: job, applications: applications, moment: moment, applied: applied, owned: owned, accepted: accepted, acceptee: acceptee, coderFeedback: coderFeedback, hirerFeedback: hirerFeedback});
							});
						});

					} else if (job.status == jobs.COMPLETED) {
						users.getStats(acceptee, function(err, acceptee) {
							if (owned || accepted)
								req.flash("info", "Job completed. Please leave feedback.");

							users.getStats(job.user, function(err, user) {
								job.user = user;
								res.render("job", {title: job.title, job: job, applications: applications, moment: moment, applied: applied, owned: owned, accepted: accepted, acceptee: acceptee, coderFeedback: coderFeedback, hirerFeedback: hirerFeedback});
							});
						});

					} else {
						users.getStats(job.user, function(err, user) {
							job.user = user;
							res.render("job", {title: job.title, job: job, applications: applications, moment: moment, applied: applied, owned: owned, accepted: accepted, coderFeedback: coderFeedback, hirerFeedback: hirerFeedback});
						});
					}
				});
			});
		
		} else {
			next();
		}
	});
}

exports.apply = function(req, res) {
	var quote = req.param("quote"),
		comment = req.param("comment"),
		id = req.param("id");

	quote = parseFloat(quote);
	comment = validator.trim(comment);

	if (quote < 2 || quote > 1000) {
		return res.json({
			status: "error",
			error: "Please enter a valid quote"
		});
	}

	if (comment.length < 10 || comment > 500) {
		return res.json({
			status: "error",
			error: "Please enter a valid comment"
		});
	}

	jobs.apply(id, req.user, quote, comment, function(err) {
		if (err) {
			return res.json({
				status: "error",
				error: err.message
			});
		}

		res.json({
			status: "success"
		});
	});
}

exports.removeApplication = function(req, res, next) {
	var id = req.param("id");

	jobs.Job.findOne({id: id}, function(err, job) {

		if (!job)
			return next();

		if (job.status != jobs.ACCEPTING_APPLICATIONS) {
			req.flash("error", "You cannot withdraw your application now!");
			res.redirect("/job/" + id);
			return;
		}

		jobs.removeApplication(job, req.user, function(err) {
			if (err) {
				req.flash("error", err.message);
				return res.redirect("/");
			}

			res.redirect("/job/" + id);
		});
	});
}

exports.acceptApplication = function(req, res, next) {
	var job = req.param("job"),
		id = req.param("application");

	if (job && id) {

		jobs.Job.findOne({id: job}, function(err, job) {
			if (!job)
				return next();

			jobs.acceptApplication(job, id, function(err, app) {
				if (err) {
					req.flash("error", err.message);
					return res.redirect("/job/" + job.id);
				}

				users.User.findById(app.user, function(err, user) {
					req.flash("info", "You accepted " + user.steam.name + "'s application");
					res.redirect("/job/" + job.id);
				});
			});
		});
	}
}

exports.markFinished = function(req, res, next) {
	var id = req.param("id");

	jobs.Job.findOne({id: id}, function(err, job) {
		if (job && job.status == jobs.IN_PROGRESS) {
			jobs.getAcceptedApplication(job, function(err, application) {
				if (application.user.toString() == req.user._id.toString()) {
					job.status = jobs.AWAITING_PAYMENT;
					job.save();

					users.User.findById(application.user, function(err, user) {
						notify.user(job.user, user.steam.name + " marked <a href='/job/" + job.id + "'>" + job.title + "</a> as finished. Please arrange payment.");
					});

					res.redirect("/job/" + job.id);

				} else {
					res.status(403);
					next();
				}
			});

		} else {
			next();
		}
	});
}

exports.markCompleted = function(req, res, next) {
	var id = req.param("id");

	jobs.Job.findOne({id: id}, function(err, job) {
		if (job && job.status == jobs.AWAITING_PAYMENT) {
			jobs.getAcceptedApplication(job, function(err, application) {
				if (job.user.toString() == req.user._id.toString()) {
					job.status = jobs.COMPLETED;
					job.save();

					application.completed = true;
					application.save();

					users.User.findById(job.user, function(err, user) {
						notify.user(application.user, user.steam.name + " marked <a href='/job/" + job.id + "'>" + job.title + "</a> as completed.");
					});

					res.redirect("/job/" + job.id);

				} else {
					res.status(403);
					next();
				}
			});

		} else {
			next();
		}
	});
}

exports.renderLeaveFeedback = function(req, res, next) {
	var id = req.params.id;

	if (!id)
		return next();

	jobs.Job.findOne({id: id}, function(err, job) {
		if (job && job.status > jobs.IN_PROGRESS) {
			jobs.getAcceptedApplication(job, function(err, application) {
				if (req.user._id.toString() != job.user.toString() && req.user._id.toString() != application.user.toString()) {
					return next()
				}

				res.render("feedback", {title: "Feedback for " + job.title, id: id});
			});
		
		} else {
			next();
		}
	});
}

exports.leaveFeedback = function(req, res, next) {
	var id = req.param("id"),
		rating = req.param("rating"),
		comment = req.param("comment");

	rating = Math.max(Math.min(parseInt(rating), 1), -1);
	comment = validator.trim(comment);

	if (!rating) {
		req.flash("error", "Please enter a valid rating");
		return res.redirect("/jobs/leaveFeedback/" + id);
	}

	if (!id) {
		req.flash("error", "Please enter a job");
		return res.redirect("/jobs/leaveFeedback/" + id);
	}
	
	if (!comment || comment.length < 2)
		comment = "No comment left";

	comment = comment.substring(0, 200);

	jobs.Job.findOne({id: id}, function(err, job) {
		if (job && job.status > jobs.IN_PROGRESS) {
			jobs.getAcceptedApplication(job, function(err, application) {
				if (req.user._id.toString() != job.user.toString() && req.user._id.toString() != application.user.toString()) {
					return next()
				}

				var target = application.user;

				if (req.user._id.toString() == application.user.toString()) {
					target = job.user;
				}

				users.User.findById(target, function(err, target) {
					feedback.add(req.user, target, job, rating, comment, function(err) {
						if (err) {
							req.flash("error", err.message);
							return res.redirect("/jobs/leaveFeedback/" + id);
						}

						req.flash("info", "Thank you for leaving feedback");
						res.redirect("/job/" + id);
					});
				});

			});
		}
	});
}

exports.removeJob = function(req, res, next) {
	var id = req.param("id");

	if (!id)
		return next();

	jobs.remove(req.user, id, function(err) {
		if (err) {
			req.flash("error", err.message);
		
		} else {
			req.flash("info", "You removed job #" + id);
		}

		res.redirect("/");
	});
}