window.qd.plotComparisonForHourlyEvents = function(divId, myHourlyEvents, theirHourlyEvents) {
	$(divId).html("");
	var baseColor = "#EEEEEE"
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
		legendElementWidth = gridSize * 2,
		buckets = 9,
		myColors = ["#DBEDFF", "#A8D4FF", "#8FC7FF", "#75BAFF", "#5CADFF",
			"#42A1FF", "#2994FF", "#007AF5", "#0054A8"
		],
		/*theirColors = ["#FFCCE5", "#FF99CC", "#FF66B2", "#FF3399", "#FF007F",
			"#CC0066", "#99004C", "#660033", "#330019"
		],*/
		theirColors = myColors, // alternatively colorbrewer.YlGnBu[9]
		days = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
		times = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24"];

	var segmentDataForMyEvents = [];
	var segmentDataForTheirEvents = [];

	for (var hour = 0; hour < 24 * 7; hour++) {
		var myEventCountForAnHour = myHourlyEvents[hour].hourlyEventCount;
		segmentDataForMyEvents[hour] = myEventCountForAnHour;
		var theirEventCountForAnHour = theirHourlyEvents[hour].hourlyEventCount;
		segmentDataForTheirEvents[hour] = theirEventCountForAnHour;
	};

	var daywiseMyHourlyBuildCountsSundayToMonday = _.toArray(_.groupBy(segmentDataForMyEvents, function(element, index) {
		return Math.floor(index / 24);
	}));

	var daywiseTheirHourlyBuildCountsSundayToMonday = _.toArray(_.groupBy(segmentDataForTheirEvents, function(element, index) {
		return Math.floor(index / 24);
	}));

	var myHourlyBuildCountsMondayToSunday = _.flatten(daywiseMyHourlyBuildCountsSundayToMonday);
	var theirHourlyBuildCountsMondayToSunday = _.flatten(daywiseTheirHourlyBuildCountsSundayToMonday);

	var rotateArray = function(a, inc) {
		for (var l = a.length, inc = (Math.abs(inc) >= l && (inc %= l), inc < 0 && (inc += l), inc), i, x; inc; inc = (Math.ceil(l / inc) - 1) * inc - l + (l = inc))
			for (i = l; i > inc; x = a[--i], a[i] = a[i - inc], a[i - inc] = x);
		return a;
	};

	var myHourlyBuildCountsData = rotateArray(myHourlyBuildCountsMondayToSunday.slice(), -1 * window.qd.timezoneDifferenceInHours);
	var theirHourlyBuildCountsData = rotateArray(theirHourlyBuildCountsMondayToSunday.slice(), -1 * window.qd.timezoneDifferenceInHours);

	var _generateHeatMap = function(data) {
		var maximumEventValue = d3.max([1, d3.max(data, function(d, i) {
			return d.value;
		})]);
		var myColorScale = d3.scale.quantile()
			.domain([1, maximumEventValue])
			.range(myColors);
		var theirColorScale = d3.scale.quantile()
			.domain([1, maximumEventValue])
			.range(theirColors);
		var createSvg = function(width, height) {
			d3.select(divId).selectAll("svg").remove();
			return d3.select(divId).append("svg")
				.attr("width", width)
				.attr("height", height)
				.append("g")
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
		};
		var createDayLabels = function(svg, constantAxis, changingAxis, changingAxisAdjustment, gridSize, transformAttribute) {
			return svg.selectAll(".dayLabel")
				.data(days)
				.enter().append("text")
				.text(function(d) {
					return d;
				})
				.attr(constantAxis, 0)
				.attr(changingAxis, function(d, i) {
					return (i * gridSize) - changingAxisAdjustment;
				})
				.style("text-anchor", "end")
				.attr("transform", transformAttribute)
				.attr("class", function(d, i) {
					return ((i >= 0 && i <= 4) ? "dayLabel mono axis axis-workweek" : "dayLabel mono axis");
				});
		};
		var createTimeLabels = function(svg, constantAxis, changingAxis, constantAxisAdjustment, gridSize, transformAttribute) {
			return svg.selectAll(".timeLabel")
				.data(times)
				.enter().append("text")
				.text(function(d) {
					return d;
				})
				.attr(constantAxis, constantAxisAdjustment)
				.attr(changingAxis, function(d, i) {
					return (i * gridSize);
				})
				.attr("font-size", "10px")
				.style("text-anchor", "middle")
				.attr("transform", transformAttribute)
				.attr("class", function(d, i) {
					return ((i >= 7 && i <= 16) ? "timeLabel mono axis axis-worktime" : "timeLabel mono axis");
				});
		};

		var createLegend = function(id, colorScale) {
			return svg.selectAll(id)
				.data([1].concat(colorScale.quantiles()), function(d) {
					return d;
				})
				.enter().append("g")
				.attr("class", "legend");
		};

		if ($(window).width() < 480) {
			var svgWidth = 300;
			var svgHeight = 450;
			gridDaySize = Math.floor(190 / 7);
			gridTimeSize = Math.floor(400 / 24);
			var svg = createSvg(svgWidth, svgHeight);
			var dayLabels = createDayLabels(svg, "y", "x", 10, gridDaySize, "translate(" + gridDaySize / 1.5 + ",-6)");
			var timeLabels = createTimeLabels(svg, "x", "y", -15, gridTimeSize, "translate( -6," + (gridTimeSize) / 2.5 + ")");
			var heatMap = svg.selectAll(".hour")
				.data(data)
				.enter().append("rect")
				.attr("y", function(d, i) {
					if (i % 2 == 0) {
						return ((d.hour) * gridTimeSize + 7) - 2.5;
					} else {
						return ((d.hour) * gridTimeSize) - 2.5;
					}
				})
				.attr("x", function(d) {
					return ((d.day) * gridDaySize) - 10;
				})
				.attr("width", gridDaySize)
				.attr("height", gridTimeSize / 2)
				.style("fill", baseColor);
			heatMap.transition().duration(1000)
				.style("fill", function(d, i) {
					if (d.value === 0) {
						return baseColor;
					} else {
						if (i % 2 != 0) {
							return myColorScale(d.value);
						} else {
							return theirColorScale(d.value);
						}
					}
				});
			heatMap.append("title").text(function(d) {
				return d.value;
			});
			var myLegend = createLegend(".myLegend",myColorScale);
			var legendRectXaxis = (gridDaySize * 7) - 5;
			var legendTextXaxis = legendRectXaxis + (gridSize / 2) + 2;
			myLegend.append("rect")
				.attr("y", function(d, i) {
					return legendElementWidth * i;
				})
				.attr("x", legendRectXaxis)
				.attr("height", legendElementWidth + 10)
				.attr("width", gridSize / 2)
				.style("fill", function(d, i) {
					return myColors[i];
				});
			/*var theirLegend = createLegend(".theirLegend",theirColorScale);
			var legendRectXaxis = (gridDaySize * 7) - 5;
			var legendTextXaxis = legendRectXaxis + (gridSize / 2) + 2;
			theirLegend.append("rect")
				.attr("y", function(d, i) {
					return legendElementWidth * i;
				})
				.attr("x", legendRectXaxis)
				.attr("height", legendElementWidth + 10)
				.attr("width", gridSize / 2)
				.style("fill", function(d, i) {
					return myColors[i];
				});*/

			myLegend.append("text")
				.attr("class", "mono")
				.text(function(d) {
					return "≥ " + Math.round(d * 10) / 10;
				})
				.attr("font-size", "10px")
				.attr("y", function(d, i) {
					return legendElementWidth * i;
				})
				.attr("x", legendTextXaxis);
		} else {
			var svg = createSvg(width + 50, height + 50);
			var dayLabels = createDayLabels(svg, "x", "y", 0, gridSize, "translate(-6," + gridSize / 1.5 + ")");
			var timeLabels = createTimeLabels(svg, "y", "x", 0, gridSize, "translate(" + gridSize / 2.5 + ", -6)");
			var heatMap = svg.selectAll(".hour")
				.data(data)
				.enter().append("rect")
				.attr("x", function(d, i) {
					if (i % 2 == 0) {
						return ((d.hour) * gridSize + 9);
					} else {
						return ((d.hour) * gridSize + 2);
					}
				})
				.attr("y", function(d) {
					return ((d.day) * gridSize);
				})
				.attr("width", gridSize / 2 - 2)
				.attr("height", gridSize - 2)
				.style("fill", baseColor);

			heatMap.transition().duration(1000)
				.style("fill", function(d, i) {
					if (d.value === 0) {
						return baseColor;
					} else {
						if (i % 2 != 0) {
							return myColorScale(d.value);
						} else {
							return theirColorScale(d.value);
						}
					}
				});

			heatMap.append("title").text(function(d) {
				return d.value;
			});
			var myLegend = createLegend(".myLegend",myColorScale);
			var legendRectYaxis = (gridSize * 7) + 5;
			var legendTextYaxis = legendRectYaxis + 20;
			myLegend.append("rect")
				.attr("x", function(d, i) {
					return legendElementWidth * i;
				})
				.attr("y", legendRectYaxis)
				.attr("width", legendElementWidth)
				.attr("height", gridSize / 2)
				.style("fill", function(d, i) {
					return myColors[i];
				});
			/*var theirLegend = createLegend(".theirLegend",theirColorScale);
			var legendRectYaxis = legendRectYaxis + 9 ;
			var legendTextYaxis = legendRectYaxis + 20;
			theirLegend.append("rect")
				.attr("x", function(d, i) {
					return legendElementWidth * i;
				})
				.attr("y", legendRectYaxis)
				.attr("width", legendElementWidth)
				.attr("height", gridSize / 2)
				.style("fill", function(d, i) {
					return theirColors[i];
				});*/

			myLegend.append("text")
				.attr("class", "mono")
				.text(function(d) {
					return "≥ " + Math.round(d * 10) / 10;
				})
				.attr("font-size", "10px")
				.attr("x", function(d, i) {
					return legendElementWidth * i;
				})
				.attr("y", legendTextYaxis);
		}

	};

	var _generateHourlyBuildEventsData = function(myHourlyBuildCountsData, theirHourlyBuildCountsData) {
		var indexOfData = 0;
		var data = [];
		var index = 0;
		for (var day = 0; day < 7; day++) {
			for (var timeOfDay = 0; timeOfDay < 24; timeOfDay++) {
				var tempData = [];
				tempData.day = day;
				tempData.hour = timeOfDay;
				tempData.value = myHourlyBuildCountsData[index];
				data[indexOfData++] = tempData;
				tempData = [];
				tempData.day = day;
				tempData.hour = timeOfDay;
				tempData.value = theirHourlyBuildCountsData[index];
				data[indexOfData++] = tempData;
				index++;
			}
		}
		return data;
	};

	var buildEventData = _generateHourlyBuildEventsData(myHourlyBuildCountsData, theirHourlyBuildCountsData);
	_generateHeatMap(buildEventData);

};