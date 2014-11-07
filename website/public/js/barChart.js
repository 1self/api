window.charts = window.charts || {};

charts.plotBarChart = function (divId, events, fromTime, tillTime) {
    setTimeout(function () {
        $(divId).empty();
        var margin = {
            top: 20,
            right: 30,
            bottom: 0,
            left: 0
        };
        var width = window.innerWidth;
        var height = window.innerHeight * 0.8;
        var twoWeeksAgo = new Date(moment().subtract("days", 13).format("MM/DD/YYYY"));
        var tomorrow = new Date(moment().add('day', 1).format("MM/DD/YYYY"));
        var dateRange = d3.range(15);
        var xWidth = d3.scale.ordinal()
            .domain(dateRange)
            .rangeRoundBands([0, width - margin.left - margin.right]);
        var x = d3.time.scale()
            .domain([twoWeeksAgo , tomorrow])
            .rangeRound([width - margin.left - margin.right, 0])
            .nice();

        var maxDataValue = d3.max(events, function (d) {
            return d.value;
        });
        var y = d3.scale.linear()
            .domain([0, maxDataValue])
            .range([height - margin.top - margin.bottom, 0])
            .nice(4);
        var yTicks = d3.min([5, maxDataValue]);

        var xAxis = d3.svg.axis()
            .scale(x)
            .tickFormat('');

        var yAxis = d3.svg.axis()
            .scale(y)
            .orient('right')
            .ticks(yTicks)
            .tickPadding(8);

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
            .attr("y2", "0%")
            .attr("y1", "100%")
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
            .attr('x', function (d) {
                return x(new Date(d.date));
            })
            .attr('y', function (d) {
                return height - margin.top - margin.bottom - (height - margin.top - margin.bottom - y(d.value))
            })
            .attr('width', xWidth.rangeBand())
            .attr('height', function (d) {
                return height - margin.top - margin.bottom - y(d.value)
            })
            .on("click", function (d) {
                svg.selectAll('.bar')
                    .style("stroke", function (data) {
                        if (d === data) {
                            return "#38A0BA";
                        }
                    })
                    .style("stroke-width", function (data) {
                        if (d === data) {
                            return 3;
                        }
                    });
                $(".addCommentButton").show();
                $("#date").html(moment(d.date).format("dddd, Do MMMM"));
                $("#eventValue").html(d.value);
                var day = moment(d.date).format("DD");
                var month = moment(d.date).format("MM");
                var year = moment(d.date).format("YYYY");
                charts.graphUrl = window.location.href.split(window.location.origin)[1].split("?")[0] + "/" + year + "/" + month + "/" + day;
                charts.showComments();
            });
            /*.on("mouseover", function (d) {
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
                        .style("opacity", 0);
                }
            });*/

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

        var showDetailsForDate = function (date) {
            var eventValue;
            svg.selectAll('.bar')
                .style("stroke", function (data) {
                    if (moment(date).format("DD MM YYYY") == moment(data.date).format("DD MM YYYY")) {
                        eventValue = data.value;
                        return "#38A0BA";
                    }
                })
                .style("stroke-width", function (data) {
                    if (moment(date).format("DD MM YYYY") == moment(data.date).format("DD MM YYYY")) {
                        return 3;
                    }
                });
            $(".addCommentButton").show();
            $("#date").html(moment(date).format("dddd, Do MMMM"));
            $("#eventValue").html(eventValue);
            var day = moment(date).format("DD");
            var month = moment(date).format("MM");
            var year = moment(date).format("YYYY");
            charts.graphUrl = window.location.href.split(window.location.origin)[1].split("?")[0] + "/" + year + "/" + month + "/" + day;
            charts.showComments();
        };

        var highlightLatestDataPointDate = function () {
            var date = getLatestDataPointDate();
            charts.date = date;
            showDetailsForDate(date);
        };

        highlightLatestDataPointDate();

    }, 1000);
};

