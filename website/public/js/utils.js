window.utils = {};

window.utils.rotateArray = function(a, inc) {
    for (var l = a.length, inc = (Math.abs(inc) >= l && (inc %= l), inc < 0 && (inc += l), inc), i, x; inc; inc = (Math.ceil(l / inc) - 1) * inc - l + (l = inc))
        for (i = l; i > inc; x = a[--i], a[i] = a[i - inc], a[i - inc] = x);
    return a;
};

var setTimezoneDifferenceInHours = function() {
    var timezoneOffset = new Date().getTimezoneOffset();
    window.utils.timezoneDifferenceInHours = Math.round(timezoneOffset / 60);
}();