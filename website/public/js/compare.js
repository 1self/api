$(function() {

	var updateLocalStorage = function() {
		window.localStorage.theirUsername = $('#their-username').val();
	};

	$('#auth-save-compare').click(function() {
		updateLocalStorage();
		window.qd.plotComparisonGraphs(window.localStorage.theirUsername);
	});
	$('#compare-btn').click(function() {
		$("#compare-modal").modal("show")
	});

	$(document).ready(function() {
		var theirUsernameIsAvailable = function() {
			return window.localStorage.theirUsername;
		};
		/*var populateTheirUsername = function() {
		$('#their-username').val(window.localStorage.theirUsername);
	};
	*/
		/*if (theirUsernameIsAvailable()) {
		populateTheirUsername();
	}*/
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
		var yourUsername = $(".hidden-xs").text().trim();

		$("#request-comparison").hide();
		$("#comparison-email").show();
		$("#your-name").val(yourUsername);
		if (friendsUsername !== undefined) {
			$("#friend-name2").val(friendsUsername);
		} else {
			$("#friend-name2").val(friendsEmail);
		}
		var emailMessage = $("#email-message").text();
		emailMessage = emailMessage.replace("friend-name", friendsUsername);
		emailMessage = emailMessage.replace("your-name", yourUsername);
		$("#email-message").html(emailMessage)
	});

	var emailSuccessCallback = function() {
		alert("success :) ")
	}

	$('#send-email').on('click', function(e) {
		var friendsUsername=$("#friend-name1").val();
		var friendsEmail=$("#friend-email").val();
		var data ;
		if ( friendsUsername!== "") {
			data = {
				'friendsUsername': friendsUsername
			}
			postAjaxWithData("request_to_compare_with_username", data, emailSuccessCallback);
		} else if( friendsEmail!== ""){
			data = {
				'friendsEmail': friendsEmail
			}
			postAjaxWithData("request_to_compare_with_email", data, emailSuccessCallback);
		}

	});

})(jQuery)