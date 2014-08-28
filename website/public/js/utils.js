window.utils = {};

window.utils.rotateArray = function(a, inc) {
	for (var l = a.length, inc = (Math.abs(inc) >= l && (inc %= l), inc < 0 && (inc += l), inc), i, x; inc; inc = (Math.ceil(l / inc) - 1) * inc - l + (l = inc))
		for (i = l; i > inc; x = a[--i], a[i] = a[i - inc], a[i - inc] = x);
	return a;
};
window.utils.createLegend = function(svg, width, colors, legendXCood, legendYCood) {

	legendElementWidth = 12;
	var text = svg.selectAll(".text")
		.data([{
			x: legendXCood - 34,
			text: "Less"
		}, {
			x: legendXCood + (legendElementWidth * 5) + 3,
			text: "More"
		}])
		.enter()
		.append("text");
	text
		.attr("x", function(d) {
			return d.x
		})
		.attr("y", legendYCood)
		.text(function(d) {
			return d.text;
		})
		.attr("font-family", "sans-serif")
		.attr("font-size", "11px")
		.attr("fill", "grey");

	var legend = svg
		.append("g")
		.attr("class", "legend")
		.attr("stroke", "white");
	return legend
		.selectAll(".legend")
		.data(colors)
		.enter()
		.append("rect")
		.attr("x", function(d, i) {
			return legendXCood + legendElementWidth * i;
		})
		.attr("y", legendYCood - 10)
		.attr("width", legendElementWidth)
		.attr("height", legendElementWidth)
		.style("fill", function(d, i) {
			return colors[i];
		});
}
var setTimezoneDifferenceInHours = function() {
	var timezoneOffset = new Date().getTimezoneOffset();
	window.utils.timezoneDifferenceInHours = Math.round(timezoneOffset / 60);
}();