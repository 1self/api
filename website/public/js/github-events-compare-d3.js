window.qd.plotGithubComparison = function(divId, githubPushEventsForCompare) {
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

	var _groupMyGithubEvents = function(eventsMap) {
		return ["myGithubPushEventCount"].map(function(cause) {
			return eventsMap.map(function(d) {
				return {
					x: parse(d.date),
					y: +d[cause]
				};
			});
		});
	};

	var _groupTheirGithubEvents = function(eventsMap) {
		return ["theirGithubPushEventCount"].map(function(cause) {
			return eventsMap.map(function(d) {
				return {
					x: parse(d.date),
					y: +d[cause]
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
	var myGithubPushEvents = _groupMyGithubEvents(githubPushEventsForCompare);
	myGithubPushEvents = myGithubPushEvents[0];
	if (myGithubPushEvents.length > 0) {
		x.domain(myGithubPushEvents.map(function(d) {
			return d.x;
		}));
		xLinear.domain([0, myGithubPushEvents.length]);
	}
	var theirGithubPushEvents = _groupTheirGithubEvents(githubPushEventsForCompare);
	theirGithubPushEvents = theirGithubPushEvents[0];
	if (theirGithubPushEvents.length > 0) {
		x.domain(theirGithubPushEvents.map(function(d) {
			return d.x;
		}));
		xLinear.domain([0, theirGithubPushEvents.length]);
	}
	y.domain([0, _yMax([myGithubPushEvents, theirGithubPushEvents])]);

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
	};

	_createAxesAndLabels();

	//My Active Events:
	if (myGithubPushEvents.length > 0) {
		_plotLineGraph("#2e4174", false, myGithubPushEvents);
	}
	//Their Active Events:
	if (theirGithubPushEvents.length > 0) {
		_plotLineGraph("#F2555C", true, theirGithubPushEvents);
	}
	_createLegends([
		["My Github Push Events", "#2e4174"],
		["Average Github Push Events", "#F2555C"]
	]);
};