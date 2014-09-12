var plotNoiseGraph = function(noiseData) {
	$('#noise-history').empty();
	var margin = {
		top: 20,
		right: 0,
		bottom: 30,
		left: 30
	};
	var w = $('#noise-history').width();
	var h = w / 1.61;

	var dataset = [{
		key: 0,
		value: 5
	}, {
		key: 1,
		value: 10
	}, {
		key: 2,
		value: 13
	}, {
		key: 3,
		value: 19
	}, {
		key: 4,
		value: 21
	}, {
		key: 5,
		value: 25
	}];

	var xScale = d3.scale.ordinal()
		.domain(d3.range(dataset.length))
		.rangeRoundBands([0, w], 0.05);

	var yScale = d3.scale.linear()
		.domain([0, d3.max(dataset, function(d) {
			return d.value;
		})])
		.range([0, h]);

	//Define key function, to be used when binding data
	var key = function(d) {
		return d.key;
	};

	//Create SVG element
	var svg = d3.select("#noise-history")
		.append("svg")
		.attr("width", w)
		.attr("height", h);

	//Create bars
	svg.selectAll("rect")
		.data(dataset, key)
		.enter()
		.append("rect")
		.attr("x", function(d, i) {
			return xScale(i);
		})
		.attr("y", function(d) {
			return h - yScale(d.value);
		})
		.attr("width", xScale.rangeBand())
		.attr("height", function(d) {
			return yScale(d.value);
		})
		.attr("fill", function(d) {
			return "rgb(0, 0, " + (d.value * 10) + ")";
		});

	//On click, update with new data			
	setInterval(function() {
		var maxValue = 25;
		var newNumber = Math.floor(Math.random() * maxValue);
		var lastKeyValue = dataset[dataset.length - 1].key;
		console.log(lastKeyValue);
		dataset.push({
			key: lastKeyValue + 1,
			value: newNumber
		});
		dataset.shift(); //Remove one value from dataset

		//Update scale domains
		xScale.domain(d3.range(dataset.length));
		yScale.domain([0, d3.max(dataset, function(d) {
			return d.value;
		})]);

		//Select…
		var bars = svg.selectAll("rect")
			.data(dataset, key);

		//Enter…
		bars.enter()
			.append("rect")
			.attr("x", w)
			.attr("y", function(d) {
				return h - yScale(d.value);
			})
			.attr("width", xScale.rangeBand())
			.attr("height", function(d) {
				return yScale(d.value);
			})
			.attr("fill", function(d) {
				return "rgb(0, 0, " + (d.value * 10) + ")";
			});

		//Update…
		bars.transition()
			.duration(500)
			.attr("x", function(d, i) {
				return xScale(i);
			})
			.attr("y", function(d) {
				return h - yScale(d.value);
			})
			.attr("width", xScale.rangeBand())
			.attr("height", function(d) {
				return yScale(d.value);
			});

		//Exit…
		bars.exit()
			.transition()
			.duration(500)
			.attr("x", -xScale.rangeBand())
			.remove();
	}, 1000);
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

	socket.on('realTimeData', function(data) {
		console.info("real time data ", JSON.stringify(data));
		if (noiseData.length === 120) {
			noiseData.shift();
		}
		noiseData.push(data);
		console.info("noise Data after receiving real time data : " + JSON.stringify(noiseData));
		// plotNoiseGraph(data);
	});
});