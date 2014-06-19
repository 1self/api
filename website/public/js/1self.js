var oneSelf = (function() {

    var barUnicodes = ['\u2581', '\u2582','\u2583', '\u2584', '\u2585', '\u2586', '\u2587', '\u2588'];

    var toSparkBars = function(array) {
        var max = Math.max.apply(Math, array);
        var min = Math.min.apply(Math, array) ;
        var div = (max - min) / (barUnicodes.length - 1);
        return array.map(function(dataPoint) {
            var translated = div === 0? 0 : Math.floor((dataPoint - min) / div);
            var value = 0x2581 + translated;
            return String.fromCharCode(value);
        }).join('');
    };

    return {
        toSparkBars: toSparkBars
    };
})();

window.oneSelf = oneSelf;
