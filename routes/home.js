var moment = require("moment");
var jobs = require("./../lib/jobs.js"),
	users = require("./../lib/user.js");

exports.render = function(req, res) {
	var page = parseInt(req.param("page")) || 1;
	page = Math.max(page, 1);

	jobs.getHomeJobs(page, function(err, jobList, count) {
		if (req.user) {
			jobs.Job.find({user: req.user, status: {"$gt": jobs.ACCEPTING_APPLICATIONS, "$lt": jobs.COMPLETED}}, function(err, userJobs) {
				jobs.Application.find({user: req.user, accepted: true, completed: false}, function(err, coderJobs) {
	
					userJobs = userJobs.concat(coderJobs);

					function appendJobUser(i) {
						if (userJobs[i]) {
							userJobs[i] = userJobs[i].toObject();

							users.getStats(userJobs[i].user, function(err, user) {
								userJobs[i].user = user;
								appendJobUser(i + 1);
							});
						
						} else {
							res.render("index", {title: "Home", jobs: jobList, moment: moment, count: count, page: page, userJobs: userJobs});
						}
					}

					appendJobUser(0);

				});
			});

		} else {
			res.render("index", {title: "Home", jobs: jobList, moment: moment, count: count, page: page, userJobs: []});
		}
	});
}