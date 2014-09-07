var users = require("./../lib/user.js");

exports.getUserInfo = function(req, res, next) {
	var id = req.param("id");

	users.getStats(id, function(err, user) {

		if (err)
			return next();

		user.email = null;
		user.paypal = null;

		res.json({
			status: "success",
			user: user
		});
	});
}

exports.getFeedback = function(req, res, next) {
	var id = req.param("id");

	if (!id)
		return next();

	users.User.findOne({id: id}, function(err, user) {
		if (user) {
			users.getFeedback(user, function(err, feedback) {
				res.json({
					status: "success",
					feedback: feedback
				})
			});
		}
	});
}