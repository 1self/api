window.qd.plotDailyComparison = function(divId) {
  var data = [{
    "Name": "Mon",
    "Month": "Devika",
    "ExamCount": 15
  }, {
    "Month": "Devika",
    "Name": "Tue",
    "ExamCount": 35
  }, {
    "Month": "Devika",
    "Name": "Wed",
    "ExamCount": 40
  }, {
    "Month": "Devika",
    "Name": "Thu",
    "ExamCount": 20
  }, {
    "Month": "Devika",
    "Name": "Fri",
    "ExamCount": 23
  }, {
    "Month": "Devika",
    "Name": "Sat",
    "ExamCount": 0
  }, {
    "Month": "Devika",
    "Name": "Sun",
    "ExamCount": 0
  }, {
    "Month": "Chinmay",
    "Name": "Mon",
    "ExamCount": 53
  }, {
    "Month": "Chinmay",
    "Name": "Tue",
    "ExamCount": 25
  }, {
    "Month": "Chinmay",
    "Name": "Wed",
    "ExamCount": 21
  }, {
    "Month": "Chinmay",
    "Name": "Thu",
    "ExamCount": 52
  }, {
    "Month": "Chinmay",
    "Name": "Fri",
    "ExamCount": 23
  }, {
    "Month": "Chinmay",
    "Name": "Sat",
    "ExamCount": 1
  }, {
    "Month": "Chinmay",
    "Name": "Sun",
    "ExamCount": 0
  }];
  $(divId).html("");
  var margin = {
      top: 50,
      right: 0,
      bottom: 100,
      left: 28
    },
    width = $(divId).width() - 10,
    height = width / 2.5;

  var x0 = d3.scale.ordinal()
    .rangeRoundBands([0, width], .1);

  var x1 = d3.scale.ordinal();

  var y = d3.scale.linear()
    .range([height, 0]);

  var color = d3.scale.ordinal()
    .range(["rgba(11,94,215,.8)", "rgba(245, 143, 8, 0.8)"]);

  var xAxis = d3.svg.axis()
    .scale(x0)
    .orient("bottom");

  var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .tickFormat(d3.format(".2s"));

  var svg = d3.select(divId).append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var months = d3.set(data.map(function(line) {
    return line.Month;
  })).values();
  console.log(months);
  x0.domain(data.map(function(d) {
    return d.Name;
  }));
  x1.domain(months).rangeRoundBands([0, x0.rangeBand()]);
  y.domain([0, d3.max(data, function(d) {
    return d.ExamCount;
  })]);

  svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

  svg.append("g")
    .attr("class", "y axis")
    .call(yAxis)
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 6)
    .attr("dy", ".71em")
    .style("text-anchor", "end")
    .text("Push Count");

  svg.selectAll("rect")
    .data(data)
    .enter().append("rect")
    .attr("width", x1.rangeBand())
    .attr("x", function(d) {
      return x0(d.Name) + x1(d.Month);
    })
    .attr("y", function(d) {
      return y(+d.ExamCount);
    })
    .attr("height", function(d) {
      return height - y(+d.ExamCount);
    })
    .style("fill", function(d) {
      return color(d.Month);
    });

  var legend = svg.selectAll(".legend")
    .data(months.slice().reverse())
    .enter().append("g")
    .attr("class", "legend")
    .attr("transform", function(d, i) {
      return "translate(0," + i * 20 + ")";
    });

  legend.append("rect")
    .attr("x", width - 18)
    .attr("width", 18)
    .attr("height", 18)
    .style("fill", color);

  legend.append("text")
    .attr("x", width - 24)
    .attr("y", 9)
    .attr("dy", ".35em")
    .style("text-anchor", "end")
    .text(function(d) {
      return d;
    });
};