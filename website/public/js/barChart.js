window.charts = window.charts || {};

var baseColor = '#2089AB';

var addUnits = function(svg, units, graphHeight) {
    if (units !== undefined) {
        svg.append("text")
            .attr("text-anchor", "end")
            .attr("x", 55)
            .attr("y", 4)
            .attr('class', 'overlay')
            .text(units);
    }
}


var addYaxis = function(svg, yAxis){
    svg.append('g')
            .attr('class', 'y axis')
            .call(yAxis)
            .style("filter", "url(#overlay-shadow)");
}

var createOverlayDropshadow = function(svg){
    var filter = svg.append("svg:defs")
            .append("filter")
            .attr("x", "-10%")
            .attr("y", "-100%")
            .attr("id", "overlay-shadow")
            .attr("height", "200%")
            .attr("width", "180%");

        var comptransf = filter.append("feComponentTransfer");
        comptransf.append("feFuncA")
            .attr("type", "linear")
            .attr("slope", "0.5")
        comptransf.append("feFuncR")
            .attr("type", "linear")
            .attr("slope", "0")
        comptransf.append("feFuncG")
            .attr("type", "linear")
            .attr("slope", "0")
        comptransf.append("feFuncB")
            .attr("type", "linear")
            .attr("slope", "0")

        var blur = filter.append("feGaussianBlur")
            .attr("stdDeviation", 0);
        blur.transition().delay(5000).attr("stdDeviation", 4);

        var feMerge = filter.append("feMerge");

        feMerge.append("feMergeNode");
        feMerge.append("feMergeNode")
            .attr("in", "SourceGraphic");
}

var addNowLine = function(svg, x, graphHeight) {
    var lineFunction = d3.svg.line()
        .x(function(d) {
            return d.x;
        })
        .y(function(d) {
            return d.y;
        })
        .interpolate('linear');

    var now = Date.now();
    var xGraphNowLocation = x(now);
    console.log(xGraphNowLocation);

    var lineData = [{
        x: xGraphNowLocation,
        y: 5
    }, {
        x: xGraphNowLocation,
        y: graphHeight - 5
    }];

    var lineGraph = svg.append('path')
        .attr('d', lineFunction(lineData))
        .attr('stroke', 'rgba(255, 255, 255, 0.8')
        .attr('stroke-dasharray', [5, 5])
        .attr('stroke-width', 1)
        .attr('fill', 'none')
        .style("filter", "url(#overlay-shadow)");

    var nowLabel = svg.append('text')
        .attr('text-anchor', 'end')
        .attr('x', xGraphNowLocation - 3)
        .attr('y', 12)
        .attr('class', 'overlay')
        .text('now');
};

var addGradients = function(svg){
    var gradient = svg.append("svg:defs")
            .append("svg:linearGradient")
            .attr("id", "gradient")
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "80%")
            .attr("y2", "100%")
            .attr("spreadMethod", "reflect");

        gradient.append("svg:stop")
            .attr("offset", "5%")
            .attr("stop-color", "#fff")
            .attr("stop-opacity", 0.8);

        gradient.append("svg:stop")
            .attr("offset", "100%")
            .attr("stop-color", "#fff")
            .attr("stop-opacity", 0.4);

        var gradient_highlight = svg.append("svg:defs")
            .append("svg:linearGradient")
            .attr("id", "gradient_highlight")
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "0%")
            .attr("y2", "100%")
            .attr("spreadMethod", "reflect");

        gradient_highlight.append("svg:stop")
            .attr("offset", "5%")
            .attr("stop-color", "#fff")
            .attr("stop-opacity", 0.9);

        gradient_highlight.append("svg:stop")
            .attr("offset", "100%")
            .attr("stop-color", "#fff")
            .attr("stop-opacity", 0.7);
}

var addFilter = function(svg){
    var filter = svg.append("svg:defs")
            .append("filter")
            .attr("x", "-70%")
            .attr("y", "-300%")
            .attr("id", "drop-shadow")
            .attr("height", "500%")
            .attr("width", "380%");

        var comptransf = filter.append("feComponentTransfer");
        comptransf.append("feFuncA")
            .attr("type", "linear")
            .attr("slope", "10.7")
        comptransf.append("feFuncR")
            .attr("type", "linear")
            .attr("slope", "-10.7")
        comptransf.append("feFuncG")
            .attr("type", "linear")
            .attr("slope", "0")
        comptransf.append("feFuncB")
            .attr("type", "linear")
            .attr("slope", "0")

        var blur = filter.append("feGaussianBlur")
            .attr("stdDeviation", 0);
        blur.transition().delay(1500).attr("stdDeviation", 5);

        var feMerge = filter.append("feMerge");

        feMerge.append("feMergeNode");
        feMerge.append("feMergeNode")
            .attr("in", "SourceGraphic");
}

var setStartToCollapsed = function(chart, xScale, height){
    chart.attr('x', function(d) {
            return xScale(new Date(d.fromDate));
        })
    .attr('y', height)
    .attr('width', function(d){
        var width = xScale(new Date(d.toDate)) - xScale(new Date(d.fromDate));
        return width;
    })
    .attr('height', 0);
}

var addAnimation = function(bars){
    var result  = bars.transition('grow-in')
            .delay(
                function(d, i) {
                    return i * 130 + 30;
                })
            .ease('cubic')
            .duration(240);
    return result;
}

var addAnimationEnter = function(existingBars, newBars){
    var result  = newBars.transition('grow-in')
            .delay(
                function(d, i) {
                    return (i - existingBars.length) * 130 + 30;
                })
            .ease('cubic')
            .duration(240);
    return result;
}

var setBarHeightUsingData = function(bars, yScale, innerGraphHeight){
    bars.attr('height', function(dataPoint) {
        return innerGraphHeight - yScale(dataPoint.value);
    })
    .attr('y', function(dataPoint) {
        return innerGraphHeight - (innerGraphHeight - yScale(dataPoint.value));
    });
}

var addXaxis = function(svg, xAxis, innerGraphHeight){
    svg.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0, ' + (innerGraphHeight) + ')')
            .call(xAxis);
}

var calculateBarWidth = function(x){
    var now = new Date(moment());
    var oneDayAgo = new Date(moment().subtract('days', 1));
    var from = x(oneDayAgo);
    var to = x(now);
    var result = to - from;
    return result;
}

d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};

var selectedBar;
var revertSelected = function(){
};

var renderSelected = function(bar){
    var highlightColour = d3.rgb(baseColor).brighter(2);
    var yPos = bar.attr('y');
    var width = parseInt(bar.attr('width'));

    bar.moveToFront();
    bar.style('fill', baseColor)
       .transition('selection')
       .attr('y',  yPos - 10)
       .attr('width', width + 4)
       .style('filter', 'url(#drop-shadow)')
       .style("stroke", 'solid')
       .style('stroke-width', '3px')
       .style('fill', highlightColour)
       .style('background-color', 'rgba(0, 0, 0, 0.22)');
    selectedBar = bar;

    revertSelected = function() {
        bar.transition()
        .attr('y', yPos)
        .attr('width', width)
        .style('filter', 'none')
        //.style('stroke', null)
        .style('stroke-width', '0px')
        .style('fill', 'url(#gradient)');
    }
}



charts.plotBarChart = function(divId, events, units) {
    events = _.sortBy(events, function(e) {
        return e.fromDate;
    })
    setTimeout(function() {
        $(divId).empty();
        var margin = {
            top: 20,
            right: 0,
            bottom: 0,
            left: 0
        };
        var width = window.innerWidth;
        var height = width / 1.61;

        charts.x = d3.time.scale()
            .domain([events[0].fromDate, events[events.length - 1].toDate])
            .rangeRound([0, width - margin.left - margin.right]);
            
        var maxDataValue = d3.max(events, function(d) {
            return d.value;
        });

        var innerGraphHeight = height - margin.top - margin.bottom;

        charts.y = d3.scale.linear()
            .domain([0, maxDataValue])
            .range([innerGraphHeight, 0])
            .nice(4);

        charts.xAxis = d3.svg.axis()
            .scale(charts.x)
            .orient('top')
            .ticks(10);

        charts.yAxis = d3.svg.axis()
            .scale(charts.y)
            .orient('right')
            .ticks(5);

        var svg = d3.select(divId).append('svg')
            .attr('class', 'chart')
            .attr('width', width)
            .attr('height', height);


            addYaxis(svg, charts.yAxis);
            addXaxis(svg, charts.xAxis, innerGraphHeight);
            
            svg.append('g')
            .attr('id', 'bars')
            .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');
        
        addGradients(svg);
        addFilter(svg);

        var bars = svg.selectAll('.bar')
            .data(events)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .on("click", function(clickedBar) {
                revertSelected();
                selectedBar = d3.select(this);
                renderSelected(selectedBar);
            });

        bars.style("fill", "url(#gradient)");
        setStartToCollapsed(bars, charts.x, height);
        bars = addAnimation(bars);
        setBarHeightUsingData(bars, charts.y, innerGraphHeight);
        
        var lastBar = bars.filter(':last-of-type');
        lastBar.each('end', function(d){
            renderSelected(d3.select(this));
        })
        
        
        
        createOverlayDropshadow(svg);
        addNowLine(svg, charts.x, innerGraphHeight);
        addUnits(svg, units, innerGraphHeight);

        var getDatesForEvents = function() {
            return _.map(events, function(event) {
                return moment(event.date);
            });
        };

        var getLatestDataPointDate = function() {
            var datesForDataPoints = getDatesForEvents();
            return new Date(Math.max.apply(null, datesForDataPoints));
        };

        var getDataPointDescription = function(eventValue) {
            //get the operation
            var operation_string = operation.split('('),
                operation_type = operation_string[0],
                value_unit = "";

            if ("count" !== operation_type) {
                value_unit = operation_string[1].slice(0, -1).replace(/-/g, " ");
            }

            if ("duration" === value_unit) {
                var str = humanizeDuration(eventValue * 1000, {
                    units: ["hours", "minutes", "seconds"]
                })
                var ind = str.length;
                if (str.search("milli") > 0 && str.lastIndexOf(',') > 0) {
                    ind = str.lastIndexOf(',');
                }
                return str.substring(0, ind);
            } else {
                return parseFloat(eventValue).toFixed(1) + "  " + value_unit;
            }
        };

        charts.update = function(divId, events){
            var svg = d3.select('.chart');

            charts.x.domain([events[0].fromDate, events[events.length - 1].toDate]);
            svg.select(".x.axis").call(charts.xAxis);

                var bars = svg.selectAll('.bar')
                    .data(events);

                bars.attr('x', function(d) {
                        return charts.x(new Date(d.fromDate));
                    })
                    .attr('width', function(d){
                        var width = charts.x(new Date(d.toDate)) - charts.x(new Date(d.fromDate));
                        return width;
                    });

                newBars = svg.selectAll('.bar')
                    .data(events)
                    .enter()
                    .append('rect')
                    .attr('class', 'bar')
                    .on("click", function(clickedBar) {
                        revertSelected();
                        selectedBar = d3.select(this);
                        renderSelected(selectedBar);
                    });

                newBars.style("fill", "url(#gradient)");
                setStartToCollapsed(newBars, charts.x, height);
                newBars = addAnimationEnter(bars,   newBars);
                setBarHeightUsingData(newBars, charts.y, innerGraphHeight);
                
                var lastBar = newBars.filter(':last-of-type');
                lastBar.each('end', function(d){
                    renderSelected(d3.select(this));
                })
                
                
                
                createOverlayDropshadow(svg);
                addNowLine(svg, charts.x, innerGraphHeight);
                addUnits(svg, units, innerGraphHeight);
            
            
            
            createOverlayDropshadow(svg);

            
        };

    }, 1000);
};