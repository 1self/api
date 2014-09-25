$(document).ready(function() {
	
    if ($(window).width() > 1699) {
        $(".menuLink").click(function() {
           $("#sidebar").toggleClass("apply-left");
        });

    }

});
