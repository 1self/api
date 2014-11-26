window.charts = window.charts || {};

charts.plotBarChart = function (divId, events, fromTime, tillTime) {
    setTimeout(function () {
        $(divId).empty();
        var margin = {
            top: 20,
            right: 0,
            bottom: 0,
            left: 0
        };
        var width = window.innerWidth;
        var height = width;
        var weekAgo = new Date(moment().subtract("days", 6).format("MM/DD/YYYY"));
        var tomorrow = new Date(moment().add('day', 1).format("MM/DD/YYYY"));
        var xWidth = width / 7;
        var x = d3.time.scale()
            .domain([weekAgo , tomorrow])
            .rangeRound([0, width - margin.left - margin.right])
            .nice();

        var maxDataValue = d3.max(events, function (d) {
            return d.value;
        });
        var y = d3.scale.linear()
            .domain([0, maxDataValue])
            .range([height - margin.top - margin.bottom, 0])
            .nice(4);

        var xAxis = d3.svg.axis()
            .scale(x);

        var yAxis = d3.svg.axis()
            .scale(y)
            .orient('right')
            .ticks(5);

        var svg = d3.select(divId).append('svg')
            .attr('class', 'chart')
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');
        var tipText = function (d) {
            return "<strong>" + operation + " " + d.value +
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
            .attr("y1", "0%")
            .attr("x2", "0%")
            .attr("y2", "100%")
            .attr("spreadMethod", "reflect");

        gradient.append("svg:stop")
            .attr("offset", "5%")
            .attr("stop-color", "#fff")
            .attr("stop-opacity", 0.9);

        gradient.append("svg:stop")
            .attr("offset", "100%")
            .attr("stop-color", "#DEF2E9")
            .attr("stop-opacity", 0.7);

        var filter = svg.append("svg:defs")
            .append("filter")
            .attr("id", "drop-shadow")
            .attr("height", "130%")
            .attr("width", "170%");

        filter.append("feGaussianBlur")
            .attr("in", "SourceAlpha")
            .attr("stdDeviation", 2)
            .attr("result", "blur");

        filter.append("feOffset")
            .attr("in", "blur")
            .attr("dx", 0)
            .attr("dy", 3   )
            .attr("result", "offsetBlur");

        var feMerge = filter.append("feMerge");

        feMerge.append("feMergeNode")
            .attr("in", "offsetBlur")
        feMerge.append("feMergeNode")
            .attr("in", "SourceGraphic");

        svg.selectAll('.chart')
            .data(events)
            .enter().append('rect')
            .attr('class', 'bar')
            .style("fill", "url(#gradient)")
            .attr('x', function (d) {
                return x(new Date(d.date));
            })
            .attr('y', function (d) {
                return height - margin.top - margin.bottom - (height - margin.top - margin.bottom - y(d.value));
            })
            .attr('width', xWidth)
            .attr('height', function (d) {
                return height - margin.top - margin.bottom - y(d.value);
            })
            .on("click", function (d) {
                svg.selectAll('.bar')
                    .style("stroke", function (data) {
                        if (d === data) {
                            return "rgba(114, 126, 129, 0.5)";
                        }
                    })
                    .style("filter", function (data) {
                        if (d === data) {
                            return "url(#drop-shadow)";
                        }
                    })
                    .style("stroke-width", function (data) {
                        if (d === data) {
                            return 5;
                        }
                    });
                $(".addCommentButton").show();
                $("#date").html(moment(d.date).format("DD/MM/YY dddd"));
                $("#eventValue").html(getDataPointDescription(d.value));
                var day = moment(d.date).format("DD");
                var month = moment(d.date).format("MM");
                var year = moment(d.date).format("YYYY");
                charts.graphUrl = window.location.href.split(window.location.origin)[1].split("?")[0] + "/" + year + "/" + month + "/" + day;
                charts.selectedDate = moment(d.date).format("YYYY-MM-DD");
                charts.showComments();
            });

        svg.append('g')
            .attr('class', 'y axis')
            .call(yAxis);

        svg.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0, ' + (height - margin.top - margin.bottom) + ')')
            .call(xAxis);

        var getDatesForEvents = function () {
            return _.map(events, function (event) {
                return moment(event.date);
            });
        };

        var getLatestDataPointDate = function () {
            var datesForDataPoints = getDatesForEvents();
            return new Date(Math.max.apply(null, datesForDataPoints));
        };

        var getDataPointDescription = function (eventValue) {
            if (measurement === "time") {
                return humanizeDuration(eventValue * 1000)
            } else {
                return eventValue + " " + "decibels";
            }
        };

        var showDetailsForDate = function (date) {
            var eventValue;
            svg.selectAll('.bar')
                .style("stroke", function (data) {
                    if (moment(data.date).isSame(moment(date))) {
                        eventValue = data.value;
                        return "rgba(114, 126, 129, 0.5)";
                    }
                }).style("filter", function (data) {
                    if (moment(data.date).isSame(moment(date))) {
                        return "url(#drop-shadow)";
                    }
                })
                .style("stroke-width", function (data) {
                    if (moment(data.date).isSame(moment(date))) {
                        return 5;
                    }
                });
            $(".addCommentButton").show();
            if (isNaN(date)) {
                $("#date").html('No data logged for this activity');
            } else {
                $("#date").html(moment(date).format("DD/MM/YY dddd"));
            }
            $("#eventValue").html(getDataPointDescription(eventValue));

            var day = moment(date).format("DD");
            var month = moment(date).format("MM");
            var year = moment(date).format("YYYY");
            charts.graphUrl = window.location.href.split(window.location.origin)[1].split("?")[0] + "/" + year + "/" + month + "/" + day;
            charts.showComments();
        };

        var highlightLatestDataPointDate = function () {
            var date = getLatestDataPointDate();
            charts.selectedDate = moment(date).format("YYYY-MM-DD");
            showDetailsForDate(date);
        };

        highlightLatestDataPointDate();

    }, 1000);
};

