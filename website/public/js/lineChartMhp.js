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
            })]);

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

        chart.append('svg:g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0,' + (height - margin.bottom) + ')')
            .call(xAxis);

        chart.append('svg:g')
            .attr('class', 'y axis')
            .attr('transform', 'translate(' + (margin.left) + ',0)')
            .call(yAxis);

    var lineFunc = d3.svg.line()
        .x(function(d) {
            return xRange(d.date);
        })
        .y(function(d) {
            return yRange(d.value);
        })
        .interpolate('linear');

    chart.append('svg:path')
        .attr('d', lineFunc(events))
        .attr('stroke', 'blue')
        .attr('stroke-width', 2)
        .attr('fill', 'none');

}