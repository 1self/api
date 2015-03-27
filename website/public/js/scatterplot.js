window.charts = window.charts || {};

charts.plotScatterPlot = function (divId, events, xAxisLabel, yAxisLabel) {
    setTimeout(function () {
        $(divId).empty();
        var margin = {
            top: 20,
            right: 50,
            bottom: 30,
            left: 50
        };
        var width = window.innerWidth - margin.left - margin.right;
        var height = width / 1.61;

        var _groupCorrelateEvents = function (events) {
            return _.map(events, function (event) {
                return {
                    x: event.value1 || 0,
                    y: event.value2 || 0,
                    date: event.date
                };
            });
        };
        var xValue = function (d) {
                return d.x;
            },
            xScale = d3.scale.linear().range([0, width]),
            xMap = function (d) {
                return xScale(xValue(d));
            },
            xAxis = d3.svg.axis().scale(xScale).orient("bottom").ticks(5);

        var yValue = function (d) {
                return d.y;
            },
            yScale = d3.scale.linear().range([height, 0]),
            yMap = function (d) {
                return yScale(yValue(d));
            },
            yAxis = d3.svg.axis().scale(yScale).orient("left").ticks(5);

        var svg = d3.select(divId).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        var tip = d3.tip()
            .attr('class', 'd3-tip')
            .offset([-10, 0])
            .html(function (d) {
                return xValue(d) + "<span style='color:lightgrey'> vs " + yValue(d) + "<br> on " + moment(d.date).format("ddd MMM DD") + "</span>";
            });
        svg.call(tip);
        var _plotGraph = function () {
            var data = _groupCorrelateEvents(events);
            // don't want dots overlapping axis, so add in buffer to data domain
            var minXVal = Math.max(0, d3.min(data, xValue) - 1);
            var minYVal = Math.max(0, d3.min(data, yValue) - 1);
            xScale.domain([minXVal, d3.max(data, xValue) + 1]);
            yScale.domain([minYVal, d3.max(data, yValue) + 1]);

            // draw dots
            var div = d3.select("body").append("div")
                .attr("class", "tooltip")
                .style("opacity", 0);
            svg.selectAll(".dot")
                .data(data)
                .enter().append("circle")
                .attr("class", "dot")
                .attr("r", 7.5)
                .attr("cx", xMap)
                .attr("cy", yMap)
                .style("fill", function (d) {
                    return (d.x === 0 || d.y === 0) ? "rgba(196, 196, 196, 0.5)" : "rgba(61, 61, 61, 0.2)";
                })
                .on("click", function (d) {
                    if ($(window).width() < 768) {
                        div.transition()
                            .duration(200)
                            .style("opacity", .9);
                        div.html("<strong>" + xValue(d) + " vs " + yValue(d) + "</strong><br/> <span style='color:lightgrey'> on " + moment(d.date).format("ddd MMM DD") + "</span>")
                            .style("left", (d3.event.pageX) - 80 + "px")
                            .style("top", (d3.event.pageY) + "px");
                    }

                })
                .on("mouseover", function (d) {
                    if ($(window).width() > 767) {
                        tip.show(d)
                    }
                })
                .on("mouseout", function () {
                    if ($(window).width() > 767) {
                        tip.hide();
                    } else {
                        div.transition()
                            .duration(100)
                            .style("opacity", 0)
                    }
                });

            // x-axis
            svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height + ")")
                .call(xAxis)
                .append("text")
                .attr("class", "label")
                .attr("x", width)
                .attr("y", -6)
                .style("text-anchor", "end")
                .text(xAxisLabel);

            // y-axis
            svg.append("g")
                .attr("class", "y axis")
                .call(yAxis)
                .append("text")
                .attr("class", "label")
                .attr("transform", "rotate(-90)")
                .attr("y", 6)
                .attr("dy", ".71em")
                .style("text-anchor", "end")
                .text(yAxisLabel);
        };
        _plotGraph();
    }, 1000);
};