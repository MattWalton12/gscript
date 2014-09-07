gscript = {}

gscript.infoMessage = function(message) {
	$(".messages").append("<div class='alert alert-info'>" + message + "</div>");
}

gscript.successMessage = function(message) {
	$(".messages").append("<div class='alert alert-success'>" + message + "</div>");
}

gscript.errorMessage = function(message) {
	$(".messages").append("<div class='alert alert-danger'>" + message + "</div>");
}