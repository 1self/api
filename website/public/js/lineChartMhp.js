var nullEvents = [];

nullEvents.push({
    date: new Date(moment().subtract("days", 0).format("MM/DD/YYYY")),
    value: 0
});
nullEvents.push({
    date: new Date(moment().subtract("days", 1).format("MM/DD/YYYY")),
    value: 0
});
nullEvents.push({
    date: new Date(moment().subtract("days", 2).format("MM/DD/YYYY")),
    value: 0
});
nullEvents.push({
    date: new Date(moment().subtract("days", 3).format("MM/DD/YYYY")),
    value: 0
});
nullEvents.push({
    date: new Date(moment().subtract("days", 4).format("MM/DD/YYYY")),
    value: 0
});
nullEvents.push({
    date: new Date(moment().subtract("days", 5).format("MM/DD/YYYY")),
    value: 0
});
nullEvents.push({
    date: new Date(moment().subtract("days", 6).format("MM/DD/YYYY")),
    value: 0
});

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
            .orient('bottom')
            .tickFormat(d3.time.format('%a'))
            .ticks(5)
            .tickSubdivide(true)
            .outerTickSize(0);

        yAxis = d3.svg.axis()
            .scale(yRange)
            .orient('right')
            .ticks(5)
            .tickSubdivide(true);

        lineFunc = d3.svg.line()
        .x(function(d) {
            return xRange(d.date);
        })
        .y(function(d) {
            return yRange(d.value);
        })
        .interpolate('cardinal');

        areaFunc = d3.svg.area()
            .x(function(d) { 
                return xRange(d.date); 
            })
            .y0(height)
            .y1(function(d) { 
                return yRange(d.value); 
            })
            .interpolate('cardinal');

        chart.append("clipPath")
            .attr("id", "rectClip")
            .append("rect")
            .attr("width", width)
            .attr("height", height - 50);

        chart.append('svg:path')
            .attr('d', lineFunc(nullEvents))
            .attr("class", "line")
            .attr("clip-path", "url(#rectClip)")
            .transition()
                .duration(2000)
            .attr('d', lineFunc(events));

        chart.append('svg:path')
            .attr('d', areaFunc(nullEvents))
            .attr("class", "area")
            .attr("clip-path", "url(#rectClip)")
            .transition()
                .duration(2000)
            .attr('d', areaFunc(events));

        chart.append('svg:g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0,' + (height - margin.bottom) + ')')
            .call(xAxis);

        chart.append('svg:g')
            .attr('class', 'y axis')
            .attr('transform', 'translate(' + (margin.left) + ',0)')
            .call(yAxis);

        chart.append('text')
            .attr('text-anchor', 'start');

    var formatTime = d3.time.format("%e %B");

    var div = d3.select("body").append("div")   
        .attr("class", "tooltip")               
        .style("opacity", 0);

    chart.selectAll("dot")    
        .data(events) 

    .enter().append("circle")                               

        .attr("cx", function(d) { 
            return xRange(d.date); 
        })       
        .attr("cy", function(d) { 
            return yRange(d.value); 
        })

        .on("mousedown", function(d) {      
            div.transition()        
                .duration(200)      
                .style("opacity", 1);      
            div .html(formatTime(d.date) + "<br/>"  + d.value);    
            })    

        .on("mouseup", function(d) {
            div.transition()
                .delay(2000)      
                .duration(2000)      
                .style("opacity", 0);   
        })

        .attr("r", 0)
        .transition()
            .duration(1000)
            .delay(2000)
        .attr("r", 4);

}