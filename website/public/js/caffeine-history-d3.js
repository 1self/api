window.qd.plotCaffeineHistory = function() {
    var s = $('#caffeine-history').empty();
    s = d3.select('#caffeine-history');

    var w = $("#caffeine-history").width() * 1;
    var h = w / 1.61;
    var p = [h * 0.05, w * 0.1, h * 0.35, w * 0.05],
        x = d3.scale.ordinal().rangeRoundBands([0, w - p[1] - p[3]]),
        xLinear = d3.scale.linear().range([0, w - p[1] - p[3]]);
    y = d3.scale.linear().range([0, h - p[0] - p[2]]),
    z = d3.scale.ordinal().range(["brown"]),
    parse = d3.time.format("%m/%d/%Y").parse,
    format = d3.time.format("%d");
    formatMonth = d3.time.format("%b");

    var svg = d3.select("#caffeine-history").append("svg:svg")
        .attr("width", w)
        .attr("height", h)
        .append("svg:g")
        .attr("transform", "translate(" + p[3] + "," + (h - p[2]) + ")");

    caffeineHistory = window.qd.caffeineEvents;

    // Transpose the data into layers by cause.
    var caffeinesByResult = d3.layout.stack()(["caffeineCount"].map(function(cause) {
        return caffeineHistory.map(function(d) {
            return {
                x: parse(d.date),
                y: +d[cause]
            };
        });
    }));

    // Compute the x-domain (by date) and y-domain (by top).        
    x.domain(caffeinesByResult[0].map(function(d) {
        return d.x;
    }));
    xLinear.domain([0, caffeinesByResult[0].length]);
    y.domain([0, d3.max(caffeinesByResult[caffeinesByResult.length - 1], function(d) {
        return d.y0 + d.y;
    })]);

    // Add a group for each cause.
    var cause = svg.selectAll("g.cause")
        .data(caffeinesByResult)
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
        .attr("x", function(d) {
            return x(d.x);
        })
        .attr("y", function(d) {
            return -y(d.y0) - y(d.y);
        })
        .attr("height", function(d) {
            return y(d.y);
        })
        .attr("width", x.rangeBand());

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
        .attr("x", -12)
        .attr("dy", ".35em")
        .text(d3.format(",d"));

    // caffeine Average:
    var caffeineMovingAverage = d3.svg.line()
        .x(function(d, i) {
            return xLinear(i);
        })
        .y(function(d, i) {
            var filteredData = caffeineHistory.filter(function(rangeDay, fi) {
                var extent = 5;
                var end = 0;
                var begin = 5;

                if (day == 0) {
                    end += 2;
                    begin += 2;
                }
                if (day == 6) {
                    end += 1;
                    begin += 1;
                }
                var day = new Date(rangeDay.date).getDay();
                if (fi > i - 7 && fi <= i) {
                    return rangeDay;
                }
            });

            var curval = d3.mean(filteredData, function(d) {
                return +d.caffeineCount;
            });
            return -y(curval); // going up in height so need to go negative
        })
        .interpolate("basis");

    svg.append("path")
        .attr("class", "average")
        .attr("d", caffeineMovingAverage(caffeineHistory))
        .style("fill", "none")
        .style("stroke", "black")
        .style("stroke-width", 2);

    var weekDays = caffeineHistory.filter(function(day, fi) {
        var dayOfWeek = new Date(day.date).getDay();
        if (dayOfWeek != 0 && dayOfWeek != 6) {
            return day;
        }
    });

    // add legend
    var legendSvg = d3.select("#caffeine-history").append("svg:svg")
        .attr("width", w)
        .attr("height", 70)
        .append("svg:g")
        .attr("transform", "translate(" + p[3] + "," + (0 - p[3]) + ")");

    var legend = svg.append("g")
        .attr("class", "legend")
        .attr("x", w - 65)
        .attr("y", 25)
        .attr("height", 100)
        .attr("width", 100);

    var legendColours = [
        ["caffeine", "black"]
    ]

    legend.selectAll("g").data(legendColours)
        .enter()
        .append("g")
        .each(function(d, i) {
            var g = d3.select(this);
            var xOffset = i * 70;
            g.append("rect")
                .attr("x", xOffset)
                .attr("y", 40)
                .attr("width", 10)
                .attr("height", 10)
                .style("fill", legendColours[i][1]);

            g.append("text")
                .attr("x", xOffset + 20)
                .attr("y", 40 + 8)
                .attr("height", 30)
                .attr("width", 100)
                .style("fill", "black")
                .text(legendColours[i][0]);
        });
};