$(document).ready(function() {
	function jobApplyError(err) {
		var error = $("<div class='alert alert-danger'>" + err + "</div>");
		$(error).appendTo($("#job-apply-errors"));
		setTimeout(function() {
			$(error).fadeOut();
		}, 6000);
	}

	$(".description").linkify();

	$("#job-apply-form").submit(function(e) {
		e.preventDefault();

		$(".input-group").removeClass("has-error");

		var quote = parseFloat($("#job-apply-quote").val().replace("$", ""));
		var comment = $("#job-apply-comment").val();
		var id = $(this).data("id");

		var failed = false;

		if (!quote || quote < 2 || quote > 1000) {
			jobApplyError("Please enter a valid quote between $2 and $1000");
			$("#job-apply-quote").parent().addClass("has-error");
			failed = false;
		}

		if (comment.length < 5 || comment.length > 500) {
			jobApplyError("Please enter a valid comment between 5 and 500 characters");
			$("#job-apply-quote").parent().addClass("has-class");
			failed = false;
		}

		if (!failed) {
			$(this).children("button").button("loading");

			$.post("/jobs/apply", {
				id: id,
				quote: quote,
				comment: comment

			}, function(res) {
				$(this).children("button").button("reset");
				if (res.status == "success") {
					location.reload();
				
				} else {
					jobApplyError(res.error);
				}
			});
		}

	});

	$(".application").each(function() {
		var application = $(this);

		$.getJSON("/api/getUserInfo?id=" + $(application).data("id"), function(res) {
			$(application).find(".image img").attr("src", res.user.steam.avatar);
			$(application).find(".steam-name").html(res.user.steam.name);
			$(application).find(".steam-name").attr("href", "/profile/" + res.user.id);
			$(application).find(".label-rep").html(res.user.stats.feedback);

			if (res.user.stats.feedback > 0) {
				$(application).find(".label-rep").removeClass("label-default");
				$(application).find(".label-rep").addClass("label-success");

			} else if (res.user.stats.feedback < 0) {
				$(application).find(".label-rep").removeClass("label-default");
				$(application).find(".label-rep").addClass("label-warning");
			}

		});
	});
})