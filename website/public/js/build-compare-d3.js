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

	var myBuildEventsGroupByStatus = ["failed", "passed"].map(function(status) {
		return myBuildEvents.map(function(d) {
			return {
				x: parse(d.date),
				y: +d[status]
			};
		});
	});
	var myFailedBuildEvents = myBuildEventsGroupByStatus[0];

	x.domain(myFailedBuildEvents.map(function(d) {
		return d.x;
	}));
	xLinear.domain([0, myFailedBuildEvents.length]);

	var maxFailedValue = d3.max(myFailedBuildEvents, function(d) { return d.y; });
	var myPassedBuildEvents = myBuildEventsGroupByStatus[1];
	var maxPassedValue = d3.max(myPassedBuildEvents, function(d) { return d.y; });

	y.domain([0, d3.max([maxFailedValue, maxPassedValue])]);

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

		console.info("Rule: ", rule);

	//My Successful Builds:
	var myPassedBuilds = d3.svg.line()
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
		.attr("d", myPassedBuilds(myPassedBuildEvents))
		.style("fill", "none")
		.style("stroke", "blue")
		.style("stroke-width", 2);

	//My Failed Builds:
	var myFailedBuilds = d3.svg.line()
		.x(function(d, i) {
			return xLinear(i);
		})
		.y(function(d, i) {
			var curval = +d.y;
			console.info("curval = , y(curval) =", curval, -y(curval));
			return -y(curval); 
		})
		.interpolate("monotone");

	svg.append("path")
		.attr("class", "average")
		.attr("d", myFailedBuilds(myFailedBuildEvents))
		.style("fill", "none")
		.style("stroke", "red")
		.style("stroke-width", 2);


};