var plotNoiseGraph = function() {
	$('#noise-history').empty();
	var margin = {
		top: 20,
		right: 20,
		bottom: 30,
		left: 30
	};
	var width = $('#noise-history').width();
	var height = width / 1.61;

	 var t = -1;
    var n = 40;
    var v = 0;
    var data = d3.range(n).map(next);
	
    function next () {
        return {
            time: ++t,
            value: v = Math.floor(Math.random()*20)
        };
    };
	 
    var x = d3.scale.linear()
        .domain([0, n - 1])
        .range([0, width]);
	 
    var y = d3.scale.linear()
        .domain([0, 20])
        .range([height, 0]);
	 
    var line = d3.svg.line()
        .x(function(d, i) { console.log(d.time); return x(d.time); })
        .y(function(d, i) { return y(d.value); });
		 
    var svg = d3.select("#noise-history").append("svg")
        .attr("width", width - margin.left - margin.right)
        .attr("height", height + margin.top + margin.bottom);
	
    var g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
		
    var graph = g.append("svg")
        .attr("width", width - margin.left - margin.right)
        .attr("height", height + margin.top + margin.bottom);	
	 
    var xAxis = d3.svg.axis().scale(x).orient("bottom");
    var axis = graph.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);
	 
    g.append("g")
        .attr("class", "y axis")
        .call(d3.svg.axis().scale(y).orient("left"));
	 
	var path = graph.append("g")
		.append("path")
		.data([data])
		.attr("class", "realTimeLine")
		.attr("d", line);
		
    tick();
		 
    function tick() 
	{ 
        // push a new data point onto the back
        data.push(next());

        // update domain
        x.domain([t - n, t]);
	
        // redraw path, shift path left
        path
            .attr("d", line)
            .attr("transform", null)
            .transition()
            .duration(500)
            .ease("linear")
            .attr("transform", "translate(" + t - 1 + ")")
            .each("end", tick);
	
        // shift axis left
        axis
            .transition()
            .duration(500)
            .ease("linear")
            .call(d3.svg.axis().scale(x).orient("bottom"));
	 
        // pop the old data point off the front
        data.shift();	 
    };
};

$(document).ready(function() {
	var noiseData = [];
	var socket = io();
	socket.emit('clientConnected', $.cookie("_eun"));
	socket.on('snapshot', function(data) {
		noiseData = data;
		console.info("snapshot noise Data : " + JSON.stringify(noiseData));
		plotNoiseGraph();
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