$(document).ready(function() {
	$("#profile-import").click(function(e) {
		e.preventDefault();

		$(this).button("loading");
		var button = $(this);

		$.getJSON("/profile/coderhireImport", function(res) {
			if (res.status == "success") {
				$(button).button("reset");
				$(button).parent().parent().fadeOut();
				gscript.successMessage("Successfully imported CoderHire feedback");
			
			} else {
				$(button).button("reset");
				gscript.errorMessage(res.error);
			} 
		});
	});
});