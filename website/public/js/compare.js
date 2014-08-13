var updateLocalStorage = function() {
	window.localStorage.theirUsername = $('#their-username').val();
};

$('#auth-save-compare').click(function() {
	updateLocalStorage();
	window.qd.plotComparisonGraphs(window.localStorage.theirUsername);
});


$(document).ready(function() {
	var theirUsernameIsAvailable = function() {
		return window.localStorage.theirUsername;
	};
	var populateTheirUsername = function() {
		$('#their-username').val(window.localStorage.theirUsername);
	};

	if (theirUsernameIsAvailable()) {
		populateTheirUsername();
	}
	window.qd.plotComparisonGraphs(window.localStorage.theirUsername);
});