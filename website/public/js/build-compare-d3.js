window.qd.plotComparison = function(divId, myBuildEvents, withBuildEvents) {
	var s = $(divId).empty();
	s = d3.select(divId);

	var w = $(divId).width() * 1;
	var h = w / 1.61;
	if (h < 200) {
		h = 210;
	}
	var p = [h * 0.05, w * 0.1, h * 0.35, w * 0.05],
		x = d3.scale.ordinal().rangeRoundBands([0, w - p[1] - p[3]]),
		xLinear = d3.scale.linear().range([0, w - p[1] - p[3]]),
		xTicks = d3.scale.linear().range([0, w - p[1] - p[3]]);
	var y = d3.scale.linear().range([0, h - p[0] - p[2]]),
		parse = d3.time.format("%m/%d/%Y").parse,
		format = d3.time.format("%d");
	formatMonth = d3.time.format("%b");
	var xOriginOfSVG = p[3] + 9;

	var svg = d3.select(divId).append("svg:svg")
		.attr("width", w)
		.attr("height", h)
		.append("svg:g")
		.attr("transform", "translate(" + xOriginOfSVG + "," + (h - p[2]) + ")");
	var tip = d3.tip()
		.attr('class', 'd3-tip')
		.offset([-10, 0])
		.html(function(d) {
			return "<strong>" + d.y + (d.y === 1 ? " event" : " events") + "</strong> <span style='color:lightgrey'> on " + moment(d.x).format("ddd MMM DD") + "</span>";
		});
	svg.call(tip);

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
		svg.selectAll("dot")
			.data(dataArray)
			.enter().append("circle")
			.attr("class", "dot-line")
			.attr("r", 4)
			.attr("cx", function(d, i) {
				return xLinear(i);
			})
			.attr("cy", function(d, i) {
				var curval = +d.y;
				return -y(curval);
			})
			.attr("fill", color)
			.on("click", tip.show)
			.on("mouseover", tip.show)
			.on("mouseout", tip.hide);

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
			.attr("x", -2)
			.attr("dy", ".35em")
			.style("text-anchor", "end")
			.text(d3.format(",d"));
		rule.append("svg:text")
			.attr("x", (h - p[2] - p[0] - 58))
			.attr("y", 8)
			.attr("dy", ".35em")
			.attr("transform", "rotate(-90)")
			.style("font-size", "12px")
			.text(function(d) {
				return d !== 0 ? "" : "Build Count";
			});

		var ruleForX = svg.selectAll("g.ruleForX")
			.data(xTicks.ticks(30))
			.enter().append("svg:g")
			.attr("class", "ruleForX")
			.attr("transform", function(d) {
				var xValue = (x.rangeBand() * d);
				return "translate(" + xValue + ",0)";
			});

		ruleForX.append("svg:line")
			.attr("x1", function(d) {
				return d;
			})
			.attr("x2", function(d) {
				return d;
			})
			.attr("y1", function(d) {
				return 0;
			})
			.attr("y2", -(h - p[2] - p[0] + 10))
			.style("stroke", function(d) {
				return d !== 0 ? "#fff" : "#000";
			})
			.style("stroke-opacity", function(d) {
				return d !== 0 ? 0 : .7;
			});

		ruleForX.append("svg:text")
			.attr("x", w - p[3] - p[1] - 30)
			.attr("y", -10)
			.attr("dy", ".35em")
			.style("font-size", "12px")
			.text(function(d) {
				return d !== 0 ? "" : "Date";
			});
	};
	var myBuildEventsGroupByStatus = _groupByStatus(myBuildEvents);
	var myFailedBuildEvents = myBuildEventsGroupByStatus[0];
	if (myFailedBuildEvents.length > 0) {
		x.domain(myFailedBuildEvents.map(function(d) {
			return d.x;
		}));
		xLinear.domain([0, myFailedBuildEvents.length]);
	}
	var myPassedBuildEvents = myBuildEventsGroupByStatus[1];
	var withBuildEventsGroupByStatus = _groupByStatus(withBuildEvents);
	var withFailedBuildEvents = withBuildEventsGroupByStatus[0];
	var withPassedBuildEvents = withBuildEventsGroupByStatus[1];
	if (withFailedBuildEvents.length > 0) {
		x.domain(withFailedBuildEvents.map(function(d) {
			return d.x;
		}));
		xLinear.domain([0, withFailedBuildEvents.length]);
	}

	y.domain([0, _yMax([myPassedBuildEvents, myFailedBuildEvents, withPassedBuildEvents, withFailedBuildEvents])]);

	var _createLegends = function(legendConfig) {
		var legend = svg.append("g")
			.attr("class", "legend")
			.attr("x", w - 65)
			.attr("y", 25)
			.attr("height", 100)
			.attr("width", 100);


		var yOffset = 40;
		var xOffset = 0;
		legend.selectAll("g").data(legendConfig)
			.enter()
			.append("g")
			.each(function(d, i) {
				var g = d3.select(this);
				if (i === 2) {
					xOffset = 0;
					yOffset = yOffset * 2;
				}
				g.append("rect")
					.attr("x", xOffset)
					.attr("y", yOffset)
					.attr("width", 10)
					.attr("height", 10)
					.style("fill", legendConfig[i][1]);

				g.append("text")
					.attr("x", xOffset + 20)
					.attr("y", yOffset + 8)
					.attr("height", 30)
					.attr("width", 100)
					.style("fill", "black")
					.text(legendConfig[i][0]);

				xOffset = xOffset + 110;
			});
	}

	_createAxesAndLabels();

	if (myPassedBuildEvents.length > 0) {
		//My Successful Builds:
		_plotLineGraph("#2e4174", false, myPassedBuildEvents);
	}
	if (myFailedBuildEvents.length > 0) {
		//My Failed Builds:
		_plotLineGraph("#ED1C25", false, myFailedBuildEvents);
	}
	if (withPassedBuildEvents.length > 0) {
		//With Successful Builds:
		_plotLineGraph("#73b9e6", true, withPassedBuildEvents);
	}
	if (withFailedBuildEvents.length > 0) {
		//With Failed Builds:
		_plotLineGraph("#F2555C", true, withFailedBuildEvents);
	}
	_createLegends([
		["My Passed", "#2e4174"],
		["My Failed", "#ED1C25"],
		["Their Passed", "#73b9e6"],
		["Their Failed", "#F2555C"]
	]);
};