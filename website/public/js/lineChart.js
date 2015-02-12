window.charts = window.charts || {};

d3.selection.prototype.first = function () {
    return d3.select(this[0][0]);
};

d3.selection.prototype.last = function () {
    var last = this.size() - 1;
    return d3.select(this[0][last]);
};

var animate = function (path, duration) {
    var totalLength = path.node().getTotalLength();

    path.attr('stroke-dasharray', totalLength + ' ' + totalLength)
        .attr('stroke-dashoffset', totalLength)
        .transition()
            .duration(duration)
            .ease('cubic-in-out')
            .attr('stroke-dashoffset', 0);

    return path;
};

var generateColors = function (targetSelector) {
    var defaultBackgroundColor = 'rgb(36, 155, 186)';

    // traverse up the DOM until we find an element with an explict background color set
    var targetElementBackgroundColor = (function () {
        var $element = $(targetSelector),
            $parents = $element.parents(),
            $parent,
            len = $parents.length,
            i = 0;

        var isTransparent = function (color) {
            return color === 'transparent' || color === 'rgba(0, 0, 0, 0)';
        };

        if (!isTransparent($element.css('background-color'))) {
            return d3.rgb($element.css('background-color'));
        }

        for (i; i < len; i++) {
            $parent = $($parents[i]);

            if (!isTransparent($parent.css('background-color'))) {
                return d3.rgb($parent.css('background-color'));
            }
        }

        // return a default color if the graph is being added to tree that has no background color
        $element.css('background-color', defaultBackgroundColor);
        return d3.rgb(defaultBackgroundColor);
    }());

    var colors = {
        background: targetElementBackgroundColor
    };

    // some colors are already 100% "bright" according to this d3 method, so we might need to darken instead to create contrast
    if (colors.background.brighter(1).toString() !== colors.background.toString()) {
        colors.accent = colors.background.brighter(1);
    } else {
        colors.accent = colors.background.darker(0.5);
    }

    return colors;
};

charts.plotLineChart = function (targetSelector, data, options) {

    var colors = generateColors(targetSelector);

    var addNowLine = function (xRange) {
        var nowX = xRange(Date.now());

        var lineData = [{
            x: nowX,
            y: 0
        }, {
            x: nowX,
            y: innerHeight
        }];

        var lineFunction = d3.svg.line()        
            .x(function(d) {
                return d.x;
            })
            .y(function(d) {
                return d.y;
            })
            .interpolate('linear');

        var lineGraph = graph.append('path')
            .attr('d', lineFunction(lineData))
            .attr('stroke', 'rgba(255, 255, 255, 0.5)')
            .attr('stroke-dasharray', [5, 5])
            .attr('stroke-width', 1)
            .attr('fill', 'none')
            .attr('transform', 'translate(0, ' + margin.top + ')');

        graph.append('text')
            .attr('text-anchor', 'end')
            .attr('x', nowX - 3)
            .attr('y', margin.top + 4)
            .text('now');
    };

    var width, height, innerWidth, innerHeight;

    var setGraphSize = function () {
        // the graph needs to be either as wide or as tall as the window, but not greater than one/other
        var windowWidth = window.innerWidth,
            windowHeight = window.innerHeight;

        // our target ratio
        var aspectRatio = 1.61;

        // now set the width and height of the graph to be as big as possible within the constrains
        width = windowWidth;
        height = windowWidth / aspectRatio;

        if (height > windowHeight) {
            height = windowHeight;
            width = height * aspectRatio;
        }

        // sans margins
        innerWidth = width - margin.left - margin.right;
        innerHeight = height - margin.top - margin.bottom;

        // set graph size
        $graph.css({
            width: width,
            height: height
        });
    };
    
    var margin = {
        top: 30,
        left: 10
    };

    // the other margins are likely desired to be the same
    margin.bottom = margin.top;
    margin.right = margin.left;

    // sort by x
    data = _.sortBy(data, function (e) {
        return e[options.x];
    });

    // add svg and store jquery obj for use later
    var graph = d3.select(targetSelector).append('svg');
    var $graph = $(graph[0]);

    var drawGraph = function (duration) {
        graph.selectAll("*").remove();

        setGraphSize();

        // confine the date range on x to be the last week, with tomorrow's date to accomodate the now line
        var weekAgo = new Date(moment().subtract('days', 6).format("MM/DD/YYYY"));
        var tomorrow = new Date(moment().add('days', 1).format("MM/DD/YYYY"));

        var xRange =
            d3.time.scale()
            .domain([weekAgo, tomorrow])
            .rangeRound([0, innerWidth])
            .nice();

        var yRange =
            d3.scale.linear()
            .domain([0, d3.max(data, function(d) {
              return d[options.y];
            })])
            .range([height - margin.top, margin.bottom])
            .nice(10);

        // create the axes and bind to the ranges
        var xAxis =
            d3.svg.axis()
            .scale(xRange)
            .ticks(data.length)
            .tickFormat(d3.time.format('%a %d'));

        var yAxis =
            d3.svg.axis()
            .scale(yRange)
            .orient('right')
            .ticks(5);

        // add the axes to the graph and position
        graph.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(' + margin.left + ',' + (height - margin.bottom) + ')')
            .call(xAxis);

        // correct the positioning of the text in the first and last labels of x axis
        graph.selectAll('.x.axis .tick').first().select('text').attr('style', 'text-anchor: start');
        graph.selectAll('.x.axis .tick').last().select('text').attr('style', 'text-anchor: end');

        graph.append('g')
            .attr('class', 'y axis')
            .attr('transform', 'translate(' + (margin.left) + ',0)')
            .call(yAxis);

        if (options.units) {
            graph.append('text')
                .attr('text-anchor', 'end')
                .attr('x', margin.left + 55)
                .attr('y', margin.top + 4)
                .text(options.units);
        }

        // hide the 0 label of y axis
        graph.selectAll('.y.axis .tick').first().attr('style', 'display: none');

        // add the line
        var lineFunction =
            d3.svg.line()
            .interpolate('cardinal')
            .x(function(d) { return xRange(d[options.x]); })
            .y(function(d) { return yRange(d[options.y]); });

        var path = graph.append('path')
            .attr('d', lineFunction(data))
            .attr('stroke', colors.accent)
            .attr('stroke-width', 3)
            .attr('fill', 'none')
            .attr('transform', 'translate(' + (margin.left) + ',0)');

        // animate the line
        animate(path, duration);

        // add now line
        addNowLine(xRange);

        // add the points once the line has finished displaying
        setTimeout(function () {
            graph.selectAll('circle')
                .data(data)
                .enter()
                .append('circle')
                .attr('class', 'point')
                .attr('cx', function(d) {
                    return margin.left + xRange(d[options.x]);
                })
                .attr('cy', function(d) {
                    return yRange(d[options.y]);
                })
                .attr('title', function (d) {
                    return d[options.y] + (options.units ? ' ' + options.units + ' ' : '') + 'on ' + d3.time.format('%a %d')(d[options.x])
                })
                .attr('r', 5)
                .attr('fill', 'rgba(255, 255, 255, 0.5)')
                .attr('style', 'opacity: 0').transition().duration(1000).attr('style', 'opacity: 1');
        }, duration);
    };

    drawGraph(options.duration);

    // display a simple alert confirm the point data
    $graph.on('click', '.point', function () {
        alert($(this).attr('title'));
    });

    // on resize or orientation change, change the graph size
    // we debounce so the function isn't called too regularly during these sorts of actions
    $(window).on('resize', _.debounce(function () {
        // don't put them through the animation again
        drawGraph(0);
    }, 500));
    $(window).on('orientationchange', _.debounce(function () {
        // don't put them through the animation again
        drawGraph(0);
    }, 500));
};