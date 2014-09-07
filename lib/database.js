var mongoose = require("mongoose"),
	mongooseAI = require("mongoose-auto-increment");

mongoose.connect("mongodb://localhost/gscript");

mongoose.connection.on("error", function(err) {
	// to-do add custom error handler
	console.log("Database Error: ", err);
});

mongooseAI.initialize(mongoose.connection);