exports.loginReturn = function(req, res) {
	if (req.user.newUser) {
		res.redirect("/profile/welcome");
	
	} else {
		if (req.session.loginReturn && req.session.loginReturn.indexOf("login") == -1) {
			res.redirect(req.session.loginReturn)
			req.session.loginReturn = null;

		} else {
			res.redirect("/");
		}
	}
}

exports.logout = function(req, res) {
	req.logout();
	res.redirect("/");
}

exports.renderLogin = function(req, res) {
	res.render("login", {title: "Login"});
}