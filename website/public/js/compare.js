var updateLocalStorage = function() {
	window.localStorage.streamId = $('#my-stream-id').val();
	window.localStorage.readToken = $('#my-read-token').val();
	window.localStorage.theirStreamId = $('#their-stream-id').val();
	window.localStorage.theirReadToken = $('#their-read-token').val();
};

$('#auth-save-compare').click(function() {
	updateLocalStorage();
	window.qd.plotComparisonGraphs();
});

$(document).ready(function() {
	var myDetailsAreAvailable = function() {
		return window.localStorage.streamId && window.localStorage.readToken;
	}
	var populateMyTextboxes = function() {
		$('#my-stream-id').val(window.localStorage.streamId);
		$('#my-read-token').val(window.localStorage.readToken);
	}
	var theirDetailsAreAvailable = function() {
		return window.localStorage.theirStreamId && window.localStorage.theirReadToken;
	}
	var populateTheirTextboxes = function() {
		$('#their-stream-id').val(window.localStorage.myReadToken);
		$('#their-read-token').val(window.localStorage.theirReadToken);
	}

	if (myDetailsAreAvailable()) {
		populateMyTextboxes();
	}
	if (theirDetailsAreAvailable()) {
		populateTheirTextboxes();
	}
	if (myDetailsAreAvailable() && theirDetailsAreAvailable()) {
		window.qd.plotComparisonGraphs();
	}
});