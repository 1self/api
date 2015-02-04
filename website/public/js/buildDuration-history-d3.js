window.qd.plotBuildDurationHistory = function () {
    setTimeout(function () {
        $('#buildDuration-history').empty();
        var convertMillisToSeconds = function (data) {
            return _.each(data, function (d) {
                d.value = d.value / 1000;
            });
        };
        var data = convertMillisToSeconds(window.qd.buildDurationEvents);
        var margin = {
            top: 20,
            right: 30,
            bottom: 30,
            left: 30
        };
        var width = $('#buildDuration-history').width();
        var height = width / 1.61;
        if ($(window).width() > 645 && $(window).width() < 1030) {
            height = (width / 2.5);
        }
        if ($(window).width() < 345) {
            height = (width / 1);
        }
        var oneMonthAgo = new Date(moment().subtract("month", 1).format("MM/DD/YYYY"));
        var tomorrow = new Date(moment().add('day', 1).format("MM/DD/YYYY"));
        var x = d3.time.scale()
            .domain([oneMonthAgo , tomorrow])
            .rangeRound([0, width - margin.left - margin.right])
            .nice(4);
        var maxDataValue = d3.max(data, function (d) {
            return d.value;
        });
        var y = d3.scale.linear()
            .domain([0, maxDataValue])
            .range([height - margin.top - margin.bottom, 0]).nice();
        var yTicks = d3.min([5, maxDataValue]);
        var xAxis = d3.svg.axis()
            .scale(x)
            .orient('bottom')
            .ticks(d3.time.weeks, 1)
            .tickFormat(d3.time.format('%b %d'))
            .tickPadding(8);

        var yAxis = d3.svg.axis()
            .scale(y)
            .orient('left')
            .ticks(yTicks)
            .tickPadding(8);

        var svg = d3.select('#buildDuration-history').append('svg')
            .attr('class', 'chart')
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');
        var tipText = function (d) {
            return "<strong>" + d.value + (d.value === 1 ? " sec" : " secs") +
                "</strong> <span style='color:lightgrey'> on " + moment(d.date).format("ddd MMM DD") + "</span>";
        };
        var tooltipDivForMobile = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);
        var tip = d3.tip()
            .attr('class', 'd3-tip')
            .offset([-10, 0])
            .html(function (d) {
                return tipText(d);
            });
        svg.call(tip);
        svg.selectAll('.chart')
            .data(data)
            .enter().append('rect')
            .attr('class', 'bar')
            .style("fill", "#e93e5a")
            .style("stroke", d3.rgb("#e93e5a").darker())
            .attr('x', function (d) {
                return x(new Date(d.date));
            })
            .attr('y', function (d) {
                return height - margin.top - margin.bottom - (height - margin.top - margin.bottom - y(d.value))
            })
            .attr('width', 10)
            .attr('height', function (d) {
                return height - margin.top - margin.bottom - y(d.value)
            })
            .on("click", function (d) {
                if ($(window).width() < 768) {
                    tooltipDivForMobile.transition()
                        .duration(200)
                        .style("opacity", .9);
                    tooltipDivForMobile.html(tipText(d))
                        .style("left", (d3.event.pageX) - 50 + "px")
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
            .attr("font-size", "2px")
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
            .text("Build Duration(seconds)");
    }, 1000);
};