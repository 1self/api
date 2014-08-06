window.qd.plotActiveEventsFor = function(activeEvents, divId) {
    var s = $(divId).empty();
    s = d3.select(divId);

    var w = $(divId).width() * 1;
    var h = w / 1.61;
    var p = [h * 0.05, w * 0.1, h * 0.35, w * 0.05],
        x = d3.scale.ordinal().rangeRoundBands([0, w - p[1] - p[3]]),
        xLinear = d3.scale.linear().range([0, w - p[1] - p[3]]);
    y = d3.scale.linear().range([0, h - p[0] - p[2]]),
    z = d3.scale.ordinal().range(["lightpink", "lightblue"]),
    parse = d3.time.format("%m/%d/%Y").parse,
    format = d3.time.format("%d");
    formatMonth = d3.time.format("%b");

    var svg = d3.select(divId).append("svg:svg")
        .attr("width", w)
        .attr("height", h)
        .append("svg:g")
        .attr("transform", "translate(" + p[3] + "," + (h - p[2]) + ")");

   // Transpose the data into layers by cause.
    var activeEventsByResult = d3.layout.stack()(["totalActiveDuration"].map(function(cause) {
        return activeEvents.map(function(d) {
            return {
                x: parse(d.date),
                y: +d[cause]
            };
        });
    }));

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
        .attr("x", w - p[1] - p[3] + 6)
        .attr("dy", ".35em")
        .text(d3.format(",d"));
};