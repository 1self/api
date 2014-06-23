$('#auth-save').click(function() {
	var myStreamId = $('#my-stream-id').val();
	var myReadToken = $('#my-read-token').val();
	var withStreamId = $('#with-stream-id').val();
	var withReadToken = $('#with-read-token').val();
	window.qd.saveStreamIds(myStreamId, myReadToken, withStreamId, withReadToken);
});

$(document).ready(function() {
	var myStreamId = $('#my-stream-id').val();
	var myReadToken = $('#my-read-token').val();
	var withStreamId = $('#with-stream-id').val();
	var withReadToken = $('#with-read-token').val();
	if (myStreamId && myReadToken && withStreamId && withReadToken) {
		window.qd.saveStreamIds(myStreamId, myReadToken, withStreamId, withReadToken);
	} else {
		if (window.qd.myStreamId && window.qd.myReadToken && window.qd.withStreamId && window.qd.withReadToken) {
			$('#my-stream-id').val(window.qd.myStreamId);
			$('#my-read-token').val(window.qd.myReadToken);
			$('#with-stream-id').val(window.qd.withStreamId);
			$('#with-read-token').val(window.qd.withReadToken);
			window.qd.saveStreamIds(window.qd.myStreamId, window.qd.myReadToken, window.qd.withStreamId, window.qd.withReadToken);
		}
	}
});
