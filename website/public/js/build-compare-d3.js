window.qd.plotComparison = function(divId, myBuildEvents, withBuildEvents) {
	var s = $(divId).empty();
	s = d3.select(divId);

	var w = $(divId).width() * 1;
	var h = w / 1.61;
	var p = [h * 0.05, w * 0.1, h * 0.35, w * 0.05],
		x = d3.scale.ordinal().rangeRoundBands([0, w - p[1] - p[3]]),
		xLinear = d3.scale.linear().range([0, w - p[1] - p[3]]);
	var y = d3.scale.linear().range([0, h - p[0] - p[2]]),
		parse = d3.time.format("%m/%d/%Y").parse,
		format = d3.time.format("%d");
	formatMonth = d3.time.format("%b");

	var svg = d3.select(divId).append("svg:svg")
		.attr("width", w)
		.attr("height", h)
		.append("svg:g")
		.attr("transform", "translate(" + p[3] + "," + (h - p[2]) + ")");


	var _groupByStatus = function(eventsMap) {
		return ["failed", "passed"].map(function(status) {
			return eventsMap.map(function(d) {
				return {
					x: parse(d.date),
					y: +d[status]
				};
			});
		});
	};

	var _yMax = function(arrayOfArrays) {
		return d3.max(arrayOfArrays, function(array) {
			return d3.max(array, function(d) {
				return d.y;
			});
		});
	};
	var _plotLineGraph = function(color, isDashedLine, dataArray) {
		var dashArrayValue = isDashedLine === true ? "2,2" : "0,0";

		var lineGraph = d3.svg.line()
			.x(function(d, i) {
				return xLinear(i);
			})
			.y(function(d, i) {
				var curval = +d.y;
				return -y(curval);
			})
			.interpolate("monotone");

		svg.append("path")
			.attr("class", "average")
			.attr("d", lineGraph(dataArray))
			.style("fill", "none")
			.style("stroke", color)
			.style("stroke-dasharray", dashArrayValue)
			.style("stroke-width", 2);

	};
	var _createAxesAndLabels = function() {
		//    Add a label per date
		var label = svg.selectAll("text.month")
			.data(x.domain())
			.enter().append("svg:text")
			.attr("x", function(d) {
				return x(d) + x.rangeBand() / 2;
			})
			.attr("y", 6)
			.attr("text-anchor", "middle")
			.attr("dy", ".71em")
			.text(function(d, i) {
				return (i % 7) ? null : formatMonth(d);
			});

		var filterFormat = format;
		if (w < 800) {
			filterFormat = function(d, i) {
				return (i % 7) ? null : format(d);
			};
		}

		var label = svg.selectAll("text.day")
			.data(x.domain())
			.enter().append("svg:text")
			.attr("x", function(d) {
				return x(d) + x.rangeBand() / 2;
			})
			.attr("y", 19)
			.attr("text-anchor", "middle")
			.attr("dy", ".71em")
			.text(filterFormat);

		// Add y-axis rules.
		var rule = svg.selectAll("g.rule")
			.data(y.ticks(5))
			.enter().append("svg:g")
			.attr("class", "rule")
			.attr("transform", function(d) {
				return "translate(0," + -y(d) + ")";
			});

		rule.append("svg:line")
			.attr("x2", w - p[1] - p[3])
			.style("stroke", function(d) {
				return d ? "#fff" : "#000";
			})
			.style("stroke-opacity", function(d) {
				return d ? .7 : null;
			});

		rule.append("svg:text")
			.attr("x", w - p[1] - p[3] + 6)
			.attr("dy", ".35em")
			.text(d3.format(",d"));
	};
	var myBuildEventsGroupByStatus = _groupByStatus(myBuildEvents);
	var myFailedBuildEvents = myBuildEventsGroupByStatus[0];

	x.domain(myFailedBuildEvents.map(function(d) {
		return d.x;
	}));
	xLinear.domain([0, myFailedBuildEvents.length]);
	var myPassedBuildEvents = myBuildEventsGroupByStatus[1];
	var withBuildEventsGroupByStatus = _groupByStatus(withBuildEvents);
	var withFailedBuildEvents = withBuildEventsGroupByStatus[0];
	var withPassedBuildEvents = withBuildEventsGroupByStatus[1];
	y.domain([0, _yMax([myPassedBuildEvents, myFailedBuildEvents, withPassedBuildEvents, withFailedBuildEvents])]);

	_createAxesAndLabels();

	//My Successful Builds:
	_plotLineGraph("#2e4174", false, myPassedBuildEvents);

	//My Failed Builds:
	_plotLineGraph("#ED1C25", false, myFailedBuildEvents);

	//With Successful Builds:
	_plotLineGraph("#73b9e6", true, withPassedBuildEvents);

	//With Failed Builds:
	_plotLineGraph("#F2555C", true, withFailedBuildEvents);

};