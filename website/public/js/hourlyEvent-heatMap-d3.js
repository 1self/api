window.qd.plotHourlyEventMap = function (divId, hourlyEvents, tooltipText) {
    setTimeout(function () {
        $(divId).html("");
        var baseColor = "#EEEEEE";
        var margin = {
                top: 50,
                right: 0,
                bottom: 100,
                left: 28
            },
            width = $(divId).width() - 10,
            height = width / 2.5,
            p = [height * 0.05, width * 0.1, height * 0.35, width * 0.05],
            gridSize = Math.floor(width / 24),
            legendElementWidth = 12,
            buckets = 9,
            colors = ["#F1DADD", "#EDC3CA", "#F0A3B0", "#F46A80", "#EC0027"], // alternatively colorbrewer.YlGnBu[9]
            days = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
            times = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24"];
        var segmentData = new Uint8Array(24 * 7);

        _.map(hourlyEvents, function (e) {
            var date = e.date.split(" ");
            var day = date[0];
            var hour = date[1];
            var index = (24 * (day-1)) + (hour - 1);
            index = index === -1 ? 167 : index;
            segmentData[index] = e.value;
        });

        var daywiseHourlyBuildCountsSundayToMonday = _.toArray(_.groupBy(segmentData, function (element, index) {
            return Math.floor(index / 24);
        }));

        var hourlyBuildCountsMondayToSunday = _.flatten(daywiseHourlyBuildCountsSundayToMonday);

        var hourlyBuildCountsData = window.utils.rotateArray(hourlyBuildCountsMondayToSunday.slice(), -1 * window.utils.timezoneDifferenceInHours);

        var _generateHeatMap = function (data) {
            var legendXCood;
            var legendYCood;

            var maximumEventValue = d3.max([1, d3.max(data, function (d) {
                return d.value;
            })]);
            var colorScale = d3.scale.quantile()
                .domain([1, maximumEventValue])
                .range(colors);
            var createSvg = function (width, height) {
                d3.select(divId).selectAll("svg").remove();
                return d3.select(divId).append("svg")
                    .attr("width", width)
                    .attr("height", height)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
            };
            var createDayLabels = function (svg, constantAxis, changingAxis, changingAxisAdjustment, gridSize, transformAttribute) {
                return svg.selectAll(".dayLabel")
                    .data(days)
                    .enter().append("text")
                    .text(function (d) {
                        return d;
                    })
                    .attr(constantAxis, 0)
                    .attr(changingAxis, function (d, i) {
                        return (i * gridSize) - changingAxisAdjustment;
                    })
                    .style("text-anchor", "end")
                    .attr("transform", transformAttribute)
                    .attr("class", function (d, i) {
                        return ((i >= 0 && i <= 4) ? "dayLabel mono axis axis-workweek" : "dayLabel mono axis");
                    });
            };
            var createTimeLabels = function (svg, constantAxis, changingAxis, constantAxisAdjustment, gridSize, transformAttribute) {
                return svg.selectAll(".timeLabel")
                    .data(times)
                    .enter().append("text")
                    .text(function (d) {
                        return d;
                    })
                    .attr(constantAxis, constantAxisAdjustment)
                    .attr(changingAxis, function (d, i) {
                        return (i * gridSize);
                    })
                    .attr("font-size", "10px")
                    .style("text-anchor", "middle")
                    .attr("transform", transformAttribute)
                    .attr("class", function (d, i) {
                        return ((i >= 7 && i <= 16) ? "timeLabel mono axis axis-worktime" : "timeLabel mono axis");
                    });
            };
            var createHeatMap = function (svg, timeAxis, dayAxis, timeAxisAdjustment, dayAxisAdjustment, gridDaySize, gridTimeSize) {
                var div = d3.select("body").append("div")
                    .attr("class", "tooltip")
                    .style("opacity", 0);
                return svg.selectAll(".hour")
                    .data(data)
                    .enter().append("rect")
                    .attr(timeAxis, function (d) {
                        return ((d.hour) * gridTimeSize) - timeAxisAdjustment;
                    })
                    .attr(dayAxis, function (d) {
                        return ((d.day) * gridDaySize) - dayAxisAdjustment;
                    })
                    .attr("stroke", "white")
                    .attr("rx", 4)
                    .attr("ry", 4)
                    .attr("class", "heatMapRect")
                    .attr("width", gridDaySize)
                    .attr("height", gridTimeSize)
                    .style("fill", baseColor)
                    .on("click", function (d) {
                        var toolTip = tooltipText.replace("{{value}}", d.value);
                        if ($(window).width() < 768) {
                            div.transition()
                                .duration(200)
                                .style("opacity", .9);
                            div.html("<strong>" + toolTip + "</strong> <span style='color:lightgrey'> on " + moment().days(d.day + 1).format('ddd') + " at " + moment().hours(d.hour + 1).format('h a') + "</span>")
                                .style("left", (d3.event.pageX) + "px")
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
            };
            var fillDataIntoTheGraph = function () {
                heatMap.transition().duration(1000)
                    .style("fill", function (d) {
                        if (d.value === 0) {
                            return baseColor;
                        } else {
                            return colorScale(d.value);
                        }
                    });

            };
            if ($(window).width() < 480) {
                var svgWidth = 300;
                var svgHeight = 450;
                gridDaySize = Math.floor(190 / 7);
                gridTimeSize = Math.floor(400 / 24);
                legendXCood = (gridDaySize * 7) - 5;
                legendYCood = svgHeight - 150;

                var svg = createSvg(svgWidth, svgHeight);
                var tip = d3.tip()
                    .attr('class', 'd3-tip')
                    .offset([-10, 0])
                    .html(function (d) {
                        var toolTip = tooltipText.replace("{{value}}", d.value);
                        return "<strong>" + toolTip + "</strong> <span style='color:lightgrey'> on " + moment().days(d.day + 1).format('ddd') + " at " + moment().hours(d.hour + 1).format('h a') + "</span>";
                    });
                svg.call(tip);
                var dayLabels = createDayLabels(svg, "y", "x", 10, gridDaySize, "translate(" + gridDaySize / 1.5 + ",-6)");
                var timeLabels = createTimeLabels(svg, "x", "y", -15, gridTimeSize, "translate( -6," + (gridTimeSize) / 2.5 + ")");
                var heatMap = createHeatMap(svg, "y", "x", 2.5, 10, gridDaySize, gridTimeSize);
                fillDataIntoTheGraph(heatMap);
                verticalColors = colors.reverse();
                window.utils.createVerticalLegend(svg, width, verticalColors, legendXCood, legendYCood);
            } else {
                legendXCood = width - 120;
                legendYCood = width / 2.7;
                var svg = createSvg(width + 50, height + 50);

                var tip = d3.tip()
                    .attr('class', 'd3-tip')
                    .offset([-10, 0])
                    .html(function (d) {
                        var toolTip = tooltipText.replace("{{value}}", d.value);
                        return "<strong>" + toolTip + "</strong> <span style='color:lightgrey'> on " + moment().days(d.day + 1).format('ddd') + " at " + moment().hours(d.hour + 1).format('h a') + "</span>";
                    });
                svg.call(tip);
                var dayLabels = createDayLabels(svg, "x", "y", 0, gridSize, "translate(-6," + gridSize / 1.5 + ")");
                var timeLabels = createTimeLabels(svg, "y", "x", 0, gridSize, "translate(" + gridSize / 2.5 + ", -6)");
                var heatMap = createHeatMap(svg, "x", "y", 0, 0, gridSize, gridSize);
                fillDataIntoTheGraph(heatMap);
                window.utils.createHorizontalLegend(svg, width, colors, legendXCood, legendYCood);

            }

        };

        var _generateHourlyBuildEventsData = function () {
            var index = 0;
            var data = [];
            for (var day = 0; day < 7; day++) {
                for (var timeOfDay = 0; timeOfDay < 24; timeOfDay++) {
                    var tempData = [];
                    tempData.day = day;
                    tempData.hour = timeOfDay;
                    tempData.value = hourlyBuildCountsData[index];
                    data[index++] = tempData;
                }
            }
            return data;
        };

        var buildEventData = _generateHourlyBuildEventsData();
        _generateHeatMap(buildEventData);
    }, 1000);
};