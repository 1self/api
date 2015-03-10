function InitChart() {

    var sizeGraph = function () {
        var windowWidth = window.innerWidth,
            windowHeight = window.innerHeight;
            margin = {
                top: 50,
                right: 50,
                bottom: 50,
                left: 50
            },

        width = windowWidth;
        height = windowHeight;

        innerWidth = width - margin.left - margin.right;
        innerHeight = height - margin.top - margin.bottom;

    };

    sizeGraph();

    var weekAgo = new Date(moment().subtract('days', 6).format("MM/DD/YYYY"));
    var today = new Date(moment().format("MM/DD/YYYY"));

    var chart = d3.select("#chart");

        xRange = d3.time.scale()
            .range([margin.left, width - margin.right])
            .domain([weekAgo, today]);
        
        yRange = d3.scale.linear()
            .range([height - margin.top, margin.bottom])
            .domain([0, d3.max(events, function(d) {
                return d.value;
            })])
            .nice();

        xAxis = d3.svg.axis()
            .scale(xRange)
            .tickFormat(d3.time.format('%A'))
            .ticks(5)
            .tickSubdivide(true);

        yAxis = d3.svg.axis()
            .scale(yRange)
            .orient('left')
            .ticks(5)
            .tickSubdivide(true);

        lineFunc = d3.svg.line()
        .x(function(d) {
            return xRange(d.date);
        })
        .y(function(d) {
            return yRange(d.value);
        })
        .interpolate('linear');

        areaFunc = d3.svg.area()
            .x(function(d) { 
                return xRange(d.date); 
            })
            .y0(height)
            .y1(function(d) { 
                return yRange(d.value); 
            })
            .interpolate('linear');

        chart.append("clipPath")
            .attr("id", "rectClip")
            .append("rect")
            .attr("width", width)
            .attr("height", height - 50);

        chart.append('svg:path')
            .attr('d', lineFunc(events))
            .attr("class", "line")
            .attr("clip-path", "url(#rectClip)");

        chart.append('svg:path')
            .attr('d', areaFunc(events))
            .attr("class", "area")
            .attr("clip-path", "url(#rectClip)");

        chart.append('svg:g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0,' + (height - margin.bottom) + ')')
            .call(xAxis);

        chart.append('svg:g')
            .attr('class', 'y axis')
            .attr('transform', 'translate(' + (margin.left) + ',0)')
            .call(yAxis);

}