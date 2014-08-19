$(function() {

	var updateLocalStorage = function() {
		window.localStorage.theirUsername = $('#friendList').val();
	};

	$('#auth-save-compare').click(function() {
		updateLocalStorage();
		window.qd.plotComparisonGraphs(window.localStorage.theirUsername);
	});

	$('#compare-btn').click(function() {
		$("#compare-modal").modal("show");
		$("#request-comparison").show();
		$("#comparison-email").hide();
		$("#request-comparision-form")[0].reset();
		$("#comparision-email-form")[0].reset();
		$(".compare_error_message").hide();
	});

	$(document).ready(function() {
		var theirUsernameIsAvailable = function() {
			return window.localStorage.theirUsername;
		};
		updateLocalStorage();
		window.qd.plotComparisonGraphs(window.localStorage.theirUsername);
	});


	$('#submit-compare-details').on('click', function(e) {
		var friendsEmail;

		var friendsUsername;
		if ($("#friend-name1").val() !== "") {
			friendsUsername = $("#friend-name1").val()
		} else if ($("#friend-email").val() !== "") {
			friendsEmail = $("#friend-email").val()
		}

		if ((_.isEmpty(friendsUsername) && (_.isEmpty(friendsEmail)))) {
			$(".compare_error_message").show();
			return false;
		}

		var yourUsername = $(".hidden-xs").text().trim().split(' ')[0];
		var emailMessage = $("#email-message").text();
		$("#request-comparison").hide();
		$("#comparison-email").show();
		$("#your-name").val(yourUsername);

		if (friendsUsername !== undefined) {
			$("#friend-name2").val(friendsUsername);
			emailMessage = emailMessage.replace("friend-name", friendsUsername);
		} else {
			$("#friend-name2").val(friendsEmail);
			emailMessage = emailMessage.replace("friend-name", friendsEmail);
		}
		emailMessage = emailMessage.replace("your-name", yourUsername);
		$("#email-message").html(emailMessage)
	});

	var emailSuccessCallback = function() {
		$("#send-compare-request-email").attr("disabled", "false");
		alert("Successfully sent compare request.")
		$("#compare-modal").modal("hide");
	};

	$('#send-compare-request-email').on('click', function(e) {
		$("#send-compare-request-email").attr("disabled", "true");
		var friendsUsername = $("#friend-name1").val();
		var friendsEmail = $("#friend-email").val();
		var data;
		if (!(_.isEmpty(friendsUsername))) {
			data = {
				'friendsUsername': friendsUsername
			};
			postAjaxWithData("request_to_compare_with_username", data, emailSuccessCallback);
		} else if (!(_.isEmpty(friendsEmail))) {
			data = {
				'friendsEmail': friendsEmail
			};
			postAjaxWithData("request_to_compare_with_email", data, emailSuccessCallback);
		}
	});

});