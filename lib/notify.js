var mongoose = require("mongoose")
exports.Notification = mongoose.model("notification", {
	user: mongoose.Schema.Types.ObjectId,
	date: Date,
	read: Boolean,
	text: String
});

exports.user = function(user, message) {
	var notification = new exports.Notification({
		user: user,
		date: new Date(),
		read: false,
		text: message
	});

	notification.save();
}

exports.getCount = function(user, callback) {
	exports.Notification.count({
		user: user,
		read: false
	}, callback);
}

exports.markRead = function(id) {
	exports.Notification.findById(id, function(err, notification) {
		notification.read = true;
		notification.save();
	});
}

exports.middleware = function(req, res, next) {
	if (req.isAuthenticated()) {
		res.locals.notify = {}
		exports.getCount(req.user, function(err, count) {
			res.locals.notify.count = count;
			next();
		});
	
	} else {
		next();
	}
}