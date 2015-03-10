function InitChart() {

    var weekAgo = new Date(moment().subtract('days', 6).format("MM/DD/YYYY"));
    var today = new Date(moment().format("MM/DD/YYYY"));

    var chart = d3.select("#chart");
        width = 1000,
        height = 500,
        margin = {
            top: 50,
            right: 50,
            bottom: 50,
            left: 50
        },

        xRange = d3.time.scale()
            .range([margin.left, width - margin.right])
            .domain([weekAgo, today]);
        
        yRange = d3.scale.linear()
            .range([height - margin.top, margin.bottom])
            .domain([0, d3.max(events, function(d) {
                return d.value;
            })]);

        xAxis = d3.svg.axis().scale(xRange).tickFormat(d3.time.format('%A')).ticks(5);;

        yAxis = d3.svg.axis().scale(yRange).orient('left');

        chart.append('svg:g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0,' + (height - margin.bottom) + ')')
            .call(xAxis);

        chart.append('svg:g')
            .attr('class', 'y axis')
            .attr('transform', 'translate(' + (margin.left) + ',0)')
            .call(yAxis);

}