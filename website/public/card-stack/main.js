function cardOne() {
    $(".container").toggleClass("nav-open");
}

function cardTwo() {
    $(".lastcontainer").toggleClass("nav-open");
}

function removeCard() {
    $(".container").fadeOut();
}
$(document).ready(function() {
    var n = $(".menu > img"),
        a = $(".arrow > img"),
        o = $(".heart > img"),
        e = $(".share > img"),
        i = $(".download > img"),
        t = $(".trash > img"),
        c = $(".more-icon > img");
    $(".toggle").on("click", function() {
        $.each([n, a], function() {
            this.toggleClass("out")
        }), $.each([o, e, i, t], function() {
            this.toggleClass("hide")
        }), $(this).addClass("anim").delay(800).queue(function(n) {
            $(this).removeClass("anim"), n()
        })
    })
}), $(document).ready(function() {
});
