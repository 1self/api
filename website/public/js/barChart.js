var plotBarChart = function (divId, events, fromTime, tillTime) {
    setTimeout(function () {
        $(divId).empty();
        var margin = {
            top: 20,
            right: 30,
            bottom: 0,
            left: 0
        };
        var width = window.innerWidth;
        var height = window.innerHeight;
        var oneMonthAgo = new Date(moment().subtract("month", 1).format("MM/DD/YYYY"));
        var tomorrow = new Date(moment().add('day', 1).format("MM/DD/YYYY"));
        var dateRange = d3.range(31);
        var yHeight = d3.scale.ordinal()
            .domain(dateRange)
            .rangeRoundBands([0, height - margin.top - margin.bottom]);
        var y = d3.time.scale()
            .domain([oneMonthAgo , tomorrow])
            .rangeRound([height - margin.top - margin.bottom, 0])
            .nice();

        var maxDataValue = d3.max(events, function (d) {
            return d.value;
        });
        var x = d3.scale.linear()
            .domain([0, maxDataValue])
            .range([0, width - margin.left - margin.right]).nice(4);
        var xTicks = d3.min([5, maxDataValue]);

        var yAxis = d3.svg.axis()
            .scale(y)
            .orient('right')
            .ticks(d3.time.weeks, 1)
            .tickFormat(d3.time.format('%b %d'))
            .tickPadding(8);

        var xAxis = d3.svg.axis()
            .scale(x)
            .orient('top')
            .ticks(xTicks)
            .tickPadding(8);

        var svg = d3.select(divId).append('svg')
            .attr('class', 'chart')
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');
        var tipText = function (d) {
            return "<strong>" + operation+" "+ d.value +
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
        var gradient = svg.append("svg:defs")
            .append("svg:linearGradient")
            .attr("id", "gradient")
            .attr("x1", "0%")
            .attr("x2", "100%")
            .attr("spreadMethod", "pad");


        gradient.append("svg:stop")
            .attr("offset", "0%")
            .attr("stop-color", "#fff")
            .attr("stop-opacity", 0.3);

        gradient.append("svg:stop")
            .attr("offset", "100%")
            .attr("stop-color", "#fff")
            .attr("stop-opacity", 1);
        svg.selectAll('.chart')
            .data(events)
            .enter().append('rect')
            .attr('class', 'bar')
            .style("fill", "url(#gradient)")
            .attr('y', function (d) {
                return y(new Date(d.date));
            })
            .attr('x', 0)
            .attr('height', yHeight.rangeBand())
            .attr('width', function (d) {
                return x(d.value)
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
            .call(xAxis);

        svg.append('g')
            .attr('class', 'y axis')
            .call(yAxis);
    }, 1000);
};

var getEventsFor = function (streamId, objectTags, actionTags, operation, period) {
    return $.ajax({
        url: "/v1/streams/" + streamId + "/events/" + objectTags + "/" + actionTags + "/" + operation + "/" + period + "/" + "type/json",
        headers: {
            "Accept": "application/json"
        }
    });
};

$(document).ready(function () {
    console.log("", streamId);
    $.when(getEventsFor(streamId, objectTags, actionTags, operation, period))
        .done(function(events){
            if(renderType === "barChart"){
                plotBarChart("#barChart", events, null, null)
            }
        })
        .fail();
});
