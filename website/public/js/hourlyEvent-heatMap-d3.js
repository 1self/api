window.qd.plotHourlyEventMap = function(divId) {
	var margin = {
			top: 50,
			right: 0,
			bottom: 100,
			left: 28
		},
		width = $(divId).width(),
    	height = width,
    	p = [height * 0.05, width * 0.1, height * 0.35, width * 0.05],
		gridSize = Math.floor(width / 24),
		buckets = 9,
		colors = ["#ffffd9", "#edf8b1", "#c7e9b4", "#7fcdbb", "#41b6c4", "#1d91c0", "#225ea8", "#253494", "#081d58"], // alternatively colorbrewer.YlGnBu[9]
		days = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
		times = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24"];

	var segmentData = [];
	for (var hour = 0; hour < 24 * 7; hour++) {
		var buildCountForAnHour = window.qd.hourlyBuildEvents[hour].hourlyBuildCount;
		var segmentDay = window.qd.hourlyBuildEvents[hour].day;

		segmentData[hour] = buildCountForAnHour;
	};

	var daywiseHourlyBuildCountsSundayToMonday = _.toArray(_.groupBy(segmentData, function(element, index) {
		return Math.floor(index / 24);
	}));

	var hourlyBuildCountsMondayToSunday = _.flatten(daywiseHourlyBuildCountsSundayToMonday);
	
	var _generateHeatMap = function(data) {
		var colorScale = d3.scale.quantile()
			.domain([0, buckets - 1, d3.max(data, function(d) {
				return d.value;
			})])
			.range(colors);

		var svg = d3.select(divId).append("svg")
			.attr("width", width+50)
			.attr("height", height+50)
			.append("g")
			.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

		var dayLabels = svg.selectAll(".dayLabel")
			.data(days)
			.enter().append("text")
			.text(function(d) {
				return d;
			})
			.attr("x", 0)
			.attr("y", function(d, i) {
				return i * gridSize;
			})
			.style("text-anchor", "end")
			.attr("transform", "translate(-6," + gridSize / 1.5 + ")")
			.attr("class", function(d, i) {
				return ((i >= 0 && i <= 4) ? "dayLabel mono axis axis-workweek" : "dayLabel mono axis");
			});

		var timeLabels = svg.selectAll(".timeLabel")
			.data(times)
			.enter().append("text")
			.text(function(d) {
				return d;
			})
			.attr("x", function(d, i) {
				return i * gridSize;
			})
			.attr("y", 0)
			.attr("font-size","10px")
			.style("text-anchor", "middle")
			.attr("transform", "translate(" + gridSize / 2.5 + ", -6)")
			.attr("class", function(d, i) {
				return ((i >= 7 && i <= 16) ? "timeLabel mono axis axis-worktime" : "timeLabel mono axis");
			});

		var heatMap = svg.selectAll(".hour")
			.data(data)
			.enter().append("rect")
			.attr("x", function(d) {
				return (d.hour) * gridSize;
			})
			.attr("y", function(d) {
				return (d.day) * gridSize;
			})
			.attr("stroke","lightgrey")
			.attr("rx", 4)
			.attr("ry", 4)
			.attr("class", "hour bordered")
			.attr("width", gridSize)
			.attr("height", gridSize)
			.style("fill", colors[0]);

		heatMap.transition().duration(1000)
			.style("fill", function(d) {
				return colorScale(d.value);
			});

		heatMap.append("title").text(function(d) {
			return d.value;
		});
	};

	var _generateHourlyBuildEventsData = function() {
		var index = 0;
		var data = [];
		for (var day = 0; day < 7; day++) {
			for (var timeOfDay = 0; timeOfDay < 24; timeOfDay++) {
				var tempData = [];
				tempData.day = day;
				tempData.hour = timeOfDay;
				tempData.value = hourlyBuildCountsMondayToSunday[index];
				data[index++] = tempData;
			}
		}
		return data;
	};
 
	var buildEventData = _generateHourlyBuildEventsData();
	_generateHeatMap(buildEventData);

};