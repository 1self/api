window.utils = {};

window.utils.rotateArray = function(a, inc) {
	for (var l = a.length, inc = (Math.abs(inc) >= l && (inc %= l), inc < 0 && (inc += l), inc), i, x; inc; inc = (Math.ceil(l / inc) - 1) * inc - l + (l = inc))
		for (i = l; i > inc; x = a[--i], a[i] = a[i - inc], a[i - inc] = x);
	return a;
};
var appendText = function(svg, width, colors, data, legendElementWidth) {
	/*svg.selectAll(".text")
		.data(data)
		.enter()
		.append("text");
*/
	var text = svg.append("g")
		.attr("class", "legendText")
	text.selectAll(".legendText")
		.data(data)
		.enter()
		.append("text")
		.attr("x", function(d) {
			return d.x
		})
		.attr("y", function(d) {
			return d.y
		})
		.text(function(d) {
			return d.text;
		})
		.attr("font-family", "sans-serif")
		.attr("font-size", "11px")
		.attr("fill", "grey");
}
var appendRectangles = function(svg, width, colors, legendXCood, legendYCood, legendXCoodFunc, legendYCoodFunc, legendElementWidth) {
	var legend = svg
		.append("g")
		.attr("class", "heatMapLegend")
		.attr("stroke", "white")
		.attr("stroke-width",3);
		
	return legend
		.selectAll(".heatMapLegend")
		.data(colors)
		.enter()
		.append("rect")
		.attr("x", function(d, i) {
			return legendXCoodFunc(i, legendXCood, legendElementWidth)
		})
		.attr("y", function(d, i) {
			return legendYCoodFunc(i, legendYCood, legendElementWidth)
		})
		.attr("width", legendElementWidth)
		.attr("height", legendElementWidth)
		.style("fill", function(d, i) {
			return colors[i];
		});
}
window.utils.createHorizontalLegend = function(svg, width, colors, legendXCood, legendYCood) {
	var legendElementWidth = 12;
	var textData = [{
		x: legendXCood - 34,
		y: legendYCood,
		text: "Less"
	}, {
		x: legendXCood + (legendElementWidth * 5) + 3,
		y: legendYCood,
		text: "More"
	}];
	var legendXCoodFunc = function(i, legendXCood, legendElementWidth) {
		return legendXCood + legendElementWidth * i;
	}
	var legendYCoodFunc = function(i, legendYCood, legendElementWidth) {
		return legendYCood - 10;
	}
	appendText(svg, width, colors, textData, legendElementWidth);
	appendRectangles(svg, width, colors, legendXCood, legendYCood, legendXCoodFunc, legendYCoodFunc, legendElementWidth);

}
window.utils.createVerticalLegend = function(svg, width, colors, legendXCood, legendYCood) {
	var legendElementWidth = 12;
	var textData = [{
		x: legendXCood,
		y: legendYCood - 5,
		text: "More"
	}, {
		x: legendXCood,
		y: legendYCood + (legendElementWidth * (colors.length + 1)) + 2,
		text: "Less"
	}];

	var legendXCoodFunc = function(i, legendXCood, legendElementWidth) {
		return legendXCood;
	}
	var legendYCoodFunc = function(i, legendYCood, legendElementWidth) {
		return legendYCood + legendElementWidth * i;
	}
	appendText(svg, width, colors, textData, legendElementWidth);
	appendRectangles(svg, width, colors, legendXCood, legendYCood, legendXCoodFunc, legendYCoodFunc, legendElementWidth);

}
var setTimezoneDifferenceInHours = function() {
	var timezoneOffset = new Date().getTimezoneOffset();
	window.utils.timezoneDifferenceInHours = Math.round(timezoneOffset / 60);
}();