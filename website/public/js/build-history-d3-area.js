// var data = d3.range(40).map(function(i) {
//   return {x: i / 39, y: i % 5 ? (Math.sin(i / 3) + 2) / 4 : null};
// });

example_data = function() {
    //Building a random growing trend
    var data = [
        [new Date(2014, 2, 4, 8, 0, 0, 0), 58],
        [new Date(2014, 2, 5, 8, 0, 0, 0), 44],
        [new Date(2014, 2, 6, 8, 0, 0, 0), 50],
        [new Date(2014, 2, 7, 8, 0, 0, 0), 49],
        null,
        null, [new Date(2014, 2, 10, 8, 0, 0, 0), 45],
        [new Date(2014, 2, 11, 8, 0, 0, 0), 53],
        [new Date(2014, 2, 12, 8, 0, 0, 0), 60],
        [new Date(2014, 2, 13, 8, 0, 0, 0), 59],
        [new Date(2014, 2, 14, 8, 0, 0, 0), 47],
        null,
        null, [new Date(2014, 2, 17, 8, 0, 0, 0), 40],
        [new Date(2014, 2, 18, 8, 0, 0, 0), 5],
        [new Date(2014, 2, 19, 8, 0, 0, 0), 0],
        [new Date(2014, 2, 20, 8, 0, 0, 0), 0],
        [new Date(2014, 2, 21, 8, 0, 0, 0), 10],
        null,
        null, [new Date(2014, 2, 24, 8, 0, 0, 0), 49],
        [new Date(2014, 2, 25, 8, 0, 0, 0), 50],
        [new Date(2014, 2, 26, 8, 0, 0, 0), 56],
        [new Date(2014, 2, 27, 8, 0, 0, 0), 59],
        [new Date(2014, 2, 28, 8, 0, 0, 0), 50],
        null,
        null, [new Date(2014, 2, 31, 8, 0, 0, 0), 55],
        [new Date(2014, 3, 1, 8, 0, 0, 0), 36],
        [new Date(2014, 3, 2, 8, 0, 0, 0), 48],
        [new Date(2014, 3, 3, 8, 0, 0, 0), 33],
        [new Date(2014, 3, 4, 8, 0, 0, 0), 18]
    ];
    return data;
}

var data = example_data();

var margin = {
    top: 20,
    right: 20,
    bottom: 30,
    left: 40
},
    width = $("#build-history").width() * .9;
height = width / 1.61;

// var x = d3.scale.linear()
//     .range([0, width]);

// var y = d3.scale.linear()
//     .range([height, 0]);

var x = d3.time.scale().range([0, width]);
var y = d3.scale.linear().range([height, 0]);

var xDomain = x.domain(d3.extent(data, function(d) {
    if (d == null) {
        return null;
    }
    return d[0];
}));
y.domain([0, d3.max(data, function(d) {
    if (d == null) {
        return null;
    }

    return d[1];
})]);

var xAxis = d3.svg.axis()
    .scale(x)
    .tickFormat(d3.time.format('%d/%m'))
    .ticks(d3.time.weeks, 1)
    .orient("bottom");

var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left");

var line = d3.svg.line()
    .defined(function(d) {
        return d != null;
    })
    .x(function(d) {
        if (d == null) {
            return null;
        }

        return x(d[0]);
    })

.y(function(d) {
    if (d == null) {
        return null;
    }

    return y(d[1]);
});

var area = d3.svg.area()
    .defined(line.defined())
    .x(line.x())
    .y1(line.y())
    .y0(y(0));

var svg = d3.select("#build-history").append("svg")
    .datum(data)
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

svg.append("path")
    .attr("class", "area")
    .attr("d", area)
    .style("fill", "#1e91cf");

svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

svg.append("g")
    .attr("class", "y axis")
    .call(yAxis);

svg.append("path")
//.attr("class", "line")
.attr("d", line)
    .style("fill", "none")
    .style("stroke", "#3da9e3")
    .style("stroke-width", 2);


svg.selectAll(".dot")
    .data(data.filter(function(d) {
        if (d == null) {
            return null;
        }
        return d[1];
    }))
    .enter().append("circle")
    .attr("class", "dot")
    .attr("cx", line.x())
    .attr("cy", line.y())
    .attr("r", 1.5)
    .style("stroke", "none")
    .style("fill", "rgba(249, 117, 0, 1");