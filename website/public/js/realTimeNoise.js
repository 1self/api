var socket = io();
var plotNoiseGraph = function(noiseData) {
	$('#noise-history').empty();
	var dataset = _.map(noiseData, function(d, i) {
		return {
			date: d.payload.dateTime,
			value: d.payload.properties.dbspl
		}
	});
	var margin = {
		top: 20,
		right: 30,
		bottom: 30,
		left: 37
	};
	var width = $('#noise-history').width();
	var height = width / 1.61;

	var fiveMinAgo = new Date(moment().subtract("minutes", 20));
	var now = new Date();
	var x = d3.time.scale()
		.domain([fiveMinAgo, now])
		.rangeRound([0, width - margin.left - margin.right])
		.nice(4);
	var maxDataValue = d3.max(dataset, function(d) {
		return d.value;
	});
	var y = d3.scale.linear()
		.domain([0, maxDataValue])
		.range([height - margin.top - margin.bottom, 0]).nice();
	var yTicks = d3.min([5, maxDataValue]);
	var xAxis = d3.svg.axis()
		.scale(x)
		.orient('bottom')
		.ticks(d3.time.minutes, 5)
		.tickFormat(d3.time.format('%M'))
		.tickPadding(8);

	var yAxis = d3.svg.axis()
		.scale(y)
		.orient('left')
		.ticks(yTicks)
		.tickPadding(8);

	var svg = d3.select('#noise-history').append('svg')
		.attr('class', 'chart')
		.attr('width', width)
		.attr('height', height)
		.append('g')
		.attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');
	var tipText = function(d) {
		return "<strong>" + d.value + (d.value === 1 ? " min" : " mins") +
			"</strong> <span style='color:lightgrey'> on " + moment(d.date).format("ddd MMM DD HH mm ss") + "</span>";
	};
	var tooltipDivForMobile = d3.select("body").append("div")
		.attr("class", "tooltip")
		.style("opacity", 0);
	var tip = d3.tip()
		.attr('class', 'd3-tip')
		.offset([-10, 0])
		.html(function(d) {
			return tipText(d);
		});
	svg.call(tip);
	svg.selectAll('.chart')
		.data(dataset)
		.enter().append('rect')
		.attr('class', 'bar')
		.style("fill", "lightblue")
		.style("stroke", d3.rgb("lightblue").darker())
		.attr('x', function(d) {
			return x(new Date(d.date));
		})
		.attr('y', function(d) {
			return height - margin.top - margin.bottom - (height - margin.top - margin.bottom - y(d.value))
		})
		.attr('width', 10)
		.attr('height', function(d) {
			return height - margin.top - margin.bottom - y(d.value)
		})
		.on("click", function(d) {
			if ($(window).width() < 768) {
				tooltipDivForMobile.transition()
					.duration(200)
					.style("opacity", .9);
				tooltipDivForMobile.html(tipText(d))
					.style("left", (d3.event.pageX) - 50 + "px")
					.style("top", (d3.event.pageY) + "px");
			}
		})
		.on("mouseover", function(d) {
			if ($(window).width() > 767) {
				tip.show(d)
			}
		})
		.on("mouseout", function() {
			if ($(window).width() > 767) {
				tip.hide();
			} else {
				tooltipDivForMobile.transition()
					.duration(100)
					.style("opacity", 0)
			}
		});

	svg.append('g')
		.attr('class', 'x axis')
		.attr('transform', 'translate(0, ' + (height - margin.top - margin.bottom) + ')')
		.call(xAxis)
		.append("text")
		.attr("class", "label")
		.attr("x", width - margin.left - margin.right)
		.attr("y", -10)
		.attr("dy", ".71em")
		.style("text-anchor", "end")
		.text("Date");

	svg.append('g')
		.attr('class', 'y axis')
		.call(yAxis)
		.append("text")
		.attr("class", "label")
		.attr("transform", "rotate(-90)")
		.attr("y", 6)
		.attr("dy", ".71em")
		.style("text-anchor", "end")
		.text("Activity Duration(mins)");

	socket.on('realTimeData', function(data) {
		console.info("real time data ", JSON.stringify(data));
		var lastKeyValue = dataset[dataset.length - 1].key;
		dataset.push({
			date: data.payload.dateTime,
			//date: ++lastKeyValue,
			value: data.payload.properties.dbspl
		});
		if (dataset.length > 120) {
			dataset.shift(); //Remove one value from dataset
		}
		//Update scale domains
		y.domain([0, d3.max(dataset, function(d) {
			return d.value;
		})]);

		//Select…
		var bars = svg.selectAll("rect")
			.data(dataset);

		//Enter…
		bars.enter()
			.append('rect')
			.attr('class', 'bar')
			.style("fill", "lightblue")
			.style("stroke", d3.rgb("lightblue").darker())
			.attr('x', function(d) {
				return x(new Date(d.date));
			})
			.attr('y', function(d) {
				return height - margin.top - margin.bottom - (height - margin.top - margin.bottom - y(d.value))
			})
			.attr('width', 10)
			.attr('height', function(d) {
				return height - margin.top - margin.bottom - y(d.value)
			})
			.on("click", function(d) {
				if ($(window).width() < 768) {
					tooltipDivForMobile.transition()
						.duration(200)
						.style("opacity", .9);
					tooltipDivForMobile.html(tipText(d))
						.style("left", (d3.event.pageX) - 50 + "px")
						.style("top", (d3.event.pageY) + "px");
				}
			})
			.on("mouseover", function(d) {
				if ($(window).width() > 767) {
					tip.show(d)
				}
			})
			.on("mouseout", function() {
				if ($(window).width() > 767) {
					tip.hide();
				} else {
					tooltipDivForMobile.transition()
						.duration(100)
						.style("opacity", 0)
				}
			});

		//Update…
		bars.transition()
			.duration(500)
			.attr("x", function(d, i) {
				return x(new Date(d.date));
			})
			.attr("y", function(d) {
				return height - margin.top - margin.bottom - (height - margin.top - margin.bottom - y(d.value));
			})
			.attr("width", 10)
			.attr("height", function(d) {
				return height - margin.top - margin.bottom - y(d.value);
			});

		//Exit…
		bars.exit()
			.transition()
			.duration(500)
			.attr("x", -10)
			.remove();
	});
};

$(document).ready(function() {
	var noiseData = [];
	var socket = io();
	socket.emit('clientConnected', $.cookie("_eun"));
	socket.on('snapshot', function(data) {
		noiseData = data;
		console.info("snapshot noise Data : " + JSON.stringify(noiseData));
		plotNoiseGraph(noiseData);
	});


});