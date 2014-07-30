var iframeWidth = $("#qd-globe").parent().width();

function resizeIframe(obj) {
	obj.style.height = obj.contentWindow.document.body.scrollHeight - 25 + 'px';
	obj.style.width = iframeWidth + 'px';
}