sessionStorage = sessionStorage || window.sessionStorage;

$(document).ready(function() {

	if (sessionStorage.getItem("description-as") && sessionStorage.getItem("description-as") != "null") {
		$("#job-add-description").val(sessionStorage.getItem("description-as"));
	}

	function jobAddError(err) {
		var error = $("<div class='alert alert-danger'>" + err + "</div>");
		$(error).appendTo($("#job-add-errors"));
		setTimeout(function() {
			$(error).fadeOut();
		}, 6000);
	}

	$("#job-add-date-container").datetimepicker();
	$("#job-add-date-container").data("DateTimePicker").setMinDate(moment(new Date()).add(1, "hours"));
	$("#job-add-date-container").data("DateTimePicker").setMaxDate(moment(new Date()).add(1, "years"));

	$("#job-add-description").change(function() {
		sessionStorage.setItem("description-as", $(this).val());
	});

	$("#job-add-form").submit(function(e) {
		e.preventDefault();
		$(".form-group").removeClass("has-error");
		$(".input-group").removeClass("has-error");

		var title = validator.trim($("#job-add-title").val());

		var budget = parseFloat($("#job-add-budget").val().replace("$", ""));
		var date = $("#job-add-date-container").data("DateTimePicker").getDate();
		var description = $("#job-add-description").val();

		var failed = false;
		var failedIDs = [];

		if (!date) {
			failed = true;
			failedIDs.push("#job-add-date");
			jobAddError("Please enter a valid date!");
		}

		if (title.length < 5) {
			failed = true;
			failedIDs.push("#job-add-title");
			jobAddError("Please enter a longer title");
		}

		if (!budget) {
			failed = true;
			failedIDs.push("#job-add-budget");
			jobAddError("Please enter a valid budget");
		}

		if (budget < 2 || budget > 1000) {
			failed = true;
			failedIDs.push("#job-add-budget");
			jobAddError("Please enter a budget between $2 and $1000");
		}

		if (description.length < 50) {
			failed = true;
			failedIDs.push("#job-add-description");
			jobAddError("Please make your description at least 50 characters");
		}


		if (failed) {
			for (i=0; i<failedIDs.length; i++) {
				$(failedIDs[i]).parent().addClass("has-error");
			}
		
		} else {
			$(this).children("button").button("loading");
			$.post("/jobs/create", {
				title: title,
				price: budget,
				expires: new Date(date).toISOString(),
				description: description
			
			}, function(res) {
				$(this).children("button").button("reset");

				if (res.status == "success") {
					sessionStorage.setItem("description-as", null);
					window.location.href = "/job/" + res.id;

				} else {
					jobAddError(res.error)
				}
			});

		}
	});
});