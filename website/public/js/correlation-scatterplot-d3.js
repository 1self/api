window.qd.plotScatterPlot = function (divId, correlateEvents, xAxisLabel, yAxisLabel, toolTipText) {
    setTimeout(function () {
        var s = $(divId).empty();
        s = d3.select(divId);
        var margin = {
                top: 20,
                right: 20,
                bottom: 30,
                left: 40
            },
            width = $(divId).width() - margin.left - margin.right,
            height = (width / 1.61) - margin.top - margin.bottom;
        if ($(window).width() > 650 && $(window).width() < 1030) {
            height = (width / 2.7) - margin.top - margin.bottom;
        }
        if ($(window).width() < 345) {
            height = (width / 1) - margin.top - margin.bottom;
        }

        var _groupCorrelateEvents = function (events) {
            return _.map(events, function (event) {
                return {
                    x: event.value1 || 0,
                    y: event.value2 || 0,
                    date: event.date
                };
            });
        };
        var heightnew = height - 10;
        var xValue = function (d) {
                return d.x;
            },
            xScale = d3.scale.linear().range([0, width]),
            xMap = function (d) {
                return xScale(xValue(d));
            },
            xAxis = d3.svg.axis().scale(xScale).orient("bottom");

        var yValue = function (d) {
                return d.y;
            },
            yScale = d3.scale.linear().range([heightnew, 0]),
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
                var toolTip = toolTipText.replace("{{xValue}}", xValue(d));
                toolTip = toolTip.replace("{{yValue}}", yValue(d));
                return "<strong>" + toolTip + "</strong> <span style='color:lightgrey'> on " + moment(d.date).format("ddd MMM DD") + "</span>";
            });
        svg.call(tip);
        var _plotGraph = function () {
            var data = _groupCorrelateEvents(correlateEvents);
            var minXVal = Math.max(0, d3.min(data, xValue) - 1);
            var minYVal = Math.max(0, d3.min(data, yValue) - 1);
            // don't want dots overlapping axis, so add in buffer to data domain
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
                .attr("r", 3.5)
                .attr("cx", xMap)
                .attr("cy", yMap)
                .style("fill", function (d) {
                    return (d.x === 0 || d.y === 0) ? "lightgrey" : "#e93e5a";
                })
                .on("click", function (d) {
                    if ($(window).width() < 768) {
                        div.transition()
                            .duration(200)
                            .style("opacity", .9);
                        div.html("<strong>Active programming duration of " + xValue(d) + " mins with " + yValue(d) + " github" + (yValue(d) === 1 ? " push" : " pushes") + "</strong> <span style='color:lightgrey'> on " + moment(d.date).format("ddd MMM DD") + "</span>")
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