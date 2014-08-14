
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
var friendsDetails
$('#submit-compare-details').on('click', function(e) {
	friendsDetails = $("#friend-name1").val() ?
		$("#friend-name1").val() : $("#friend-email").val()
	var yourUsername = $(".hidden-xs").text().trim();

	$("#request-comparison").hide();
	$("#comparison-email").show();
	$("#your-name").val(yourUsername);
	$("#friend-name2").val(friendsDetails);
	var emailMessage = $("#email-message").text();
	emailMessage = emailMessage.replace("friend-name", friendsDetails);
	emailMessage = emailMessage.replace("your-name", yourUsername);
	$("#email-message").html(emailMessage)
});
var emailSuccessCallback = function() {
	alert("success :) ")
}

$('#send-email').on('click', function(e) {
	var data = {'friendsUsername': friendsDetails}
	postAjaxWithData("request_to_compare", data, emailSuccessCallback);
});
