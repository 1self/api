var authorization = function(){

	var streamId = "";
	function getStreamId(){
		return streamId;
	};

	var readToken = "";
	function getReadToken(){
		return readToken;
	};

	$("#auth-save").click(function(){
		streamId = $("#stream-id").val();
		readToken = $("#read-token").val();
	});

	return {
		getStreamId: getStreamId,
		getReadToken: getReadToken
	};
};

window.authorization = authorization();