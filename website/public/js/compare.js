$('#auth-save-compare').click(function() {
	var myStreamId = $('#my-stream-id').val();
	var myReadToken = $('#my-read-token').val();
	var theirStreamId = $('#their-stream-id').val();
	var theirReadToken = $('#their-read-token').val();
	window.qd.saveStreamIds(myStreamId, myReadToken, theirStreamId, theirReadToken);
});

$(document).ready(function() {
	var myStreamId = $('#my-stream-id').val();
	var myReadToken = $('#my-read-token').val();
	var theirStreamId = $('#their-stream-id').val();
	var theirReadToken = $('#their-read-token').val();
	if (myStreamId && myReadToken && theirStreamId && theirReadToken) {
		window.qd.saveStreamIds(myStreamId, myReadToken, theirStreamId, theirReadToken);
	} else {
		if (window.qd.myStreamId && window.qd.myReadToken && window.qd.theirStreamId && window.qd.theirReadToken) {
			$('#my-stream-id').val(window.qd.myStreamId);
			$('#my-read-token').val(window.qd.myReadToken);
			$('#their-stream-id').val(window.qd.theirStreamId);
			$('#their-read-token').val(window.qd.theirReadToken);
			window.qd.saveStreamIds(window.qd.myStreamId, window.qd.myReadToken, window.qd.theirStreamId, window.qd.theirReadToken);
		}
	}
});
