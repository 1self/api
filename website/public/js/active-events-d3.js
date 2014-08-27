window.qd.plotActiveEvents = function() {
    setTimeout(function() {
        var s = $('#active-event-history').empty();
        s = d3.select('#active-event-history');

        var w = $("#active-event-history").width() * 1;
        var h = w / 1.61;
        var p = [h * 0.05, w * 0.1, h * 0.35, w * 0.05],
            x = d3.scale.ordinal().rangeRoundBands([0, w - p[1] - p[3]]),
            xLinear = d3.scale.linear().range([0, w - p[1] - p[3]]);
        xTicks = d3.scale.linear().range([0, w - p[1] - p[3]]),
        y = d3.scale.linear().range([0, h - p[0] - p[2]]),
        z = d3.scale.ordinal().range(["lightblue"]),
        parse = d3.time.format("%m/%d/%Y").parse,
        format = d3.time.format("%d");
        formatMonth = d3.time.format("%b");
        var xOriginOfSVG = p[3] + 7;


        var svg = d3.select("#active-event-history").append("svg:svg")
            .attr("width", w)
            .attr("height", h)
            .append("svg:g")
            .attr("transform", "translate(" + xOriginOfSVG + "," + (h - p[2]) + ")");

        activeEvents = window.qd.activeEvents;

        // Transpose the data into layers by cause.
        var activeEventsByResult = d3.layout.stack()(["totalActiveDuration"].map(function(cause) {
            return activeEvents.map(function(d) {
                return {
                    x: parse(d.date),
                    y: +d[cause]
                };
            });
        }));

        var tip = d3.tip()
            .attr('class', 'd3-tip')
            .offset([-10, 0])
            .html(function(d) {
                return "<strong>" + Math.round(d.y) + "mins</strong> <span style='color:lightgrey'> on " + moment(d.x).format("ddd MMM DD") + "</span>";
            });
        svg.call(tip);
        // Compute the x-domain (by date) and y-domain (by top).        
        x.domain(activeEventsByResult[0].map(function(d) {
            return d.x;
        }));
        xLinear.domain([0, activeEventsByResult[0].length]);
        y.domain([0, d3.max(activeEventsByResult[activeEventsByResult.length - 1], function(d) {
            return d.y0 + d.y;
        })]);


        // Add a group for each cause.
        var cause = svg.selectAll("g.cause")
            .data(activeEventsByResult)
            .enter().append("svg:g")
            .attr("class", "cause")
            .style("fill", function(d, i) {
                return z(i);
            })
            .style("stroke", function(d, i) {
                return d3.rgb(z(i)).darker();
            });
        // Add a rect for each date.
        var rect = cause.selectAll("rect")
            .data(Object)
            .enter().append("svg:rect")
            .attr("class", "bar")
            .attr("x", function(d) {
                return x(d.x);
            })
            .attr("y", function(d) {
                return -y(d.y0) - y(d.y);
            })
            .attr("height", function(d) {
                return y(d.y);
            })
            .attr("width", x.rangeBand())
            .on("click", tip.show)
            .on("mouseover", tip.show)
            .on("mouseout", tip.hide);

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
            .attr("x", -20)
            .attr("dy", ".35em")
            .text(d3.format(",d"));
        rule.append("svg:text")
            .attr("x", (h - p[2] - p[0] - 76))
            .attr("y", 8)
            .attr("dy", ".35em")
            .attr("transform", "rotate(-90)")
            .style("font-size", "12px")
            .text(function(d) {
                return d !== 0 ? "" : "Duration(mins)";
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
    }, 1000);
};