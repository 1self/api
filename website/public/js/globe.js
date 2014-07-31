// var iframeWidth = $("#qd-globe").parent().width();
function resizeIframe(iFrame) {
	iFrame.style.height = iFrame.contentWindow.document.body.scrollHeight - 25 + 'px';
	iFrame.style.width = $(iFrame).parent().width() + 'px';
}