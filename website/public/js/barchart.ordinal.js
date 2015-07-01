window.charts = window.charts || {};

charts.barchartOrdinal = {};

charts.barchartOrdinal.plot = function(divId, events, units, options, series) {
    var baseColor = '#2089AB';
    var animationDelay = 1500;

    var barChartBrighter = function(d3rgb, points){
        d3rgb.r += points;
        d3rgb.g += points;
        d3rgb.b += points;
    }

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

        // var lineGraph = svg.append('path')
        //     .attr('d', lineFunction(lineData))
        //     .attr('stroke', 'rgba(255, 255, 255, 0.8')
        //     .attr('stroke-dasharray', [5, 5])
        //      .attr('stroke-width', 1)
        //     .attr('fill', 'none')
        //     .style("filter", "url(#overlay-shadow)");

        // var nowLabel = svg.append('text')
        //     .attr('text-anchor', 'end')
        //     .attr('x', xGraphNowLocation - 3)
        //     .attr('y', 12)
        //     .attr('class', 'overlay')
        //     .text('now');
    };
        




    var addAnimation = function(bars){
        var result  = bars.selectAll('rect').transition('grow-in')
                .delay(
                    function(d, i, j) {
                        return j * (animationDelay / bars[0]    .length) + 30;
                    })
                .ease('cubic')
                .duration(240);
        return result;
    }

    var addAnimationEnter = function(existingBars, newBars){
        var result  = newBars.selectAll('rect').transition('grow-in')
                .delay(
                    function(d, i, j) {
                        return (j - existingBars.length) * 130 + 30;
                    })
                .ease('cubic')
                .duration(240);
        return result;
    }

    var setBarHeightUsingData = function(bars, yScale, innerGraphHeight){
        bars.attr('height', function(dataPoint) {
            return innerGraphHeight - yScale(dataPoint[series]);
        })
        .attr('y', function(dataPoint) {
            return innerGraphHeight - (innerGraphHeight - yScale(dataPoint[series]));
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

    var dataDrivenColour = function(d){
        if(d.color){
            return d3.rgb(d.color);
        }

        return "rgba(200, 200, 200, 0.5)";
    }

    options = options || {};
    charts.options = options;

    options.barGap = options.barGap || "5%";
    options.barGradientOpacity =  options.barGradientOpacity || "0.2";
    options.barShadowStrength = options.barShadowStrength || "0.2";
    options.barShadowSize = options.barShadowSize || "1";
    options.barSelectedShadowStrength = options.barSelectedShadowStrength || "0.8";
    options.barSelectedShadowSize = options.barSelectedShadowSize || "5";
    options.mixBlendMode = options.mixBlendMode || "normal";
    options.barSelectionMovement = options.barSelectionMovement || "25%";
    options.selectionBrightening = options.selectionBrightening || 20;


    var getProperty = function(property){
        var result = 0;
        if(new RegExp("\%$").test(property)){
            var percentage = parseFloat(property.substring(0, property.length -1));
            result = charts.x(1) * (percentage / 100);
        }
        else{
            result = parseFloat(options.property);
        }
        return result;
    }
    // TODO - implement use
    charts.getBarGap = function(){
        return getProperty(options.barGap)
    }

    // TODO - implement use
    charts.getBarGradientOpacity = function(){
        return options.barGradientOpacity;
    }

    // TODO - implement use
    charts.getBarShadowStrength = function(){
        return options.barShadowStrength;
    }

    // TODO - implement use
    charts.getBarShadowSize = function() {
        return options.barShadowSize;
    }

    // TODO - implement use
    charts.getBarSelectedShadowStrength = function(){
        return options.barSelectedShadowStrength;
    }

    // TODO - implement use
    charts.getBarSelectedShadowSize = function() {
        return options.barSelectedShadowSize;
    }

    // TODO - implement use
    charts.getMixBlendMode = function(){
        return options.mixBlendMode;
    }

    // TODO - implement use
    charts.getBarSelectionMovement = function(){
        return getProperty(options.selectionMovement);
    }

    charts.getSelectionBrightening = function(){
        return options.selectionBrightening;
    }

    var setStartToCollapsed = function(barGroups, xScale, height){
        barGroups.selectAll('rect').attr('x', function(d, i, j) {
                return xScale(j);
            })
        .attr('y', height)
        .attr('width', xScale(1) - charts.getBarGap())
        .attr('height', 0)
        .attr('filter', 'url(#light-drop-shadow)');
    }

    events = _.sortBy(events, function(e) {
        return e.fromDate;
    })

    var renderSelected = function(oldBars, newBars, innerGraphHeight, chart, delay){
        var xMove = charts.getBarSelectionMovement();      
        if(oldBars){
            var backgroundBarOld = oldBars.filter('.barBackground');
            var gradientBarOld = oldBars.filter('.barGradient');

            backgroundBarOld
            .transition()
            .delay(function(d, i, j){
               return delay;
            })
            .attr('y', function(dataPoint) {
                // watch out if you put a breakpoint in here, it disturbs the animation and causes
                // 0 y
                return (innerGraphHeight - (innerGraphHeight - chart.y(dataPoint[series])));
            })
            .attr('x', function(){
                return parseFloat(d3.select(this).attr('x')) + xMove;
            })
           .style('filter', 'url(#light-drop-shadow)')
           .style('fill', dataDrivenColour(backgroundBarOld.datum()));
         
            var originalHeight = innerGraphHeight - chart.y(gradientBarOld.datum()[series]);
            gradientBarOld
           .transition()
           .delay(50)
           .style('opacity', '0')
           .transition()
           .delay(function(d, i, j){
               return delay;
           })
            .attr('y', function(dataPoint) {
                return (innerGraphHeight - (innerGraphHeight - chart.y(dataPoint[series])));
           })
           .attr('x', function(){
                return parseFloat(d3.select(this).attr('x')) + xMove;
           })
           .style('fill', 'url(#gradient)')
           .style('opacity', charts.getBarGradientOpacity());
        }

        var backgroundBar = newBars.filter('.barBackground');
        var gradientBar = newBars.filter('.barGradient');

        var originalColour = backgroundBar.style('fill');
        var highlightColour = d3.rgb(backgroundBar.style('fill'));
        barChartBrighter(highlightColour, 15);
        var yPos = backgroundBar.attr('y');
        var width = parseInt(backgroundBar.attr('width'));

        backgroundBar.moveToFront();
        gradientBar.moveToFront();

        backgroundBar
           .transition()
            .delay(function(d, i, j){
               return delay;
            })
            .attr('y', function(dataPoint) {
                // watch out if you put a breakpoint in here, it disturbs the animation and causes
                // 0 y
                return (innerGraphHeight - (innerGraphHeight - chart.y(dataPoint[series]))) - xMove;
            })
            .attr('x', function(){
                return parseFloat(d3.select(this).attr('x')) - xMove;
            })
            .style('filter', 'url(#drop-shadow)')
            .style("stroke", 'solid')
            .style('stroke-width', '30px')
            .style('fill', highlightColour);
         
            var originalHeight = innerGraphHeight - chart.y(gradientBar.datum()[series]);
            gradientBar
           .attr('height', originalHeight)
           .transition()
           .delay(50)
           .style('opacity', '0')
           .transition()
           .delay(function(d, i, j){
               return delay;
           })
            .attr('y', function(dataPoint) {
                // watch out if you put a breakpoint in here, it disturbs the animation and causes
                // 0 y
                return (innerGraphHeight - (innerGraphHeight - chart.y(dataPoint[series]))) - xMove;
           })
           .attr('x', function(){
                return parseFloat(d3.select(this).attr('x')) - xMove;
           })
           .style('fill', 'url(#gradient_highlight)')
           .style('opacity', 0);

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


    var addGradients = function(svg){
    var gradient = svg.append("svg:defs")
            .append("svg:linearGradient")
            .attr("id", "gradient")
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "100%")
            .attr("y2", "100%")
            .attr("spreadMethod", "reflect")
            .style("opacity", charts.getBarGradientOpacity())

        gradient.append("svg:stop")
            .attr("offset", "3%")
            .attr("stop-color", "#fff")
            .attr("stop-opacity", 0.8);

        gradient.append("svg:stop")
            .attr("offset", "100%")
            .attr("stop-color", "333")
            .attr("stop-opacity", 0.2);

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

    var addFilter = function(svg, name, stddev, opacity){
        var filter = svg.append("svg:defs")
                .append("filter")
                .attr("x", "-70%")
                .attr("y", "-300%")
                .attr("id", name)
                .attr("height", "500%")
                .attr("width", "380%");

            var comptransf = filter.append("feComponentTransfer");
            comptransf.append("feFuncA")
                .attr("type", "linear")
                .attr("slope", opacity)
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
            blur.transition().delay(animationDelay).attr("stdDeviation", stddev);

            var feMerge = filter.append("feMerge");

            feMerge.append("feMergeNode");
            feMerge.append("feMergeNode")
                .attr("in", "SourceGraphic");
    }



    var addFilters = function(svg){
        addFilter(svg, "drop-shadow", charts.getBarShadowSize(), charts.getBarShadowStrength());
        addFilter(svg, "light-drop-shadow", charts.getBarSelectedShadowStrength(), charts.getBarSelectedShadowStrength());
    }

    setTimeout(function() {
        $(divId).empty();
        var margin = {
            top: 20,
            right: 0,
            bottom: 0,
            left: 0
        };
        var width = window.innerWidth;
        var height = window.innerHeight;

        charts.domainSize = events.length + 1;
        charts.rangeSize = width - margin.left - margin.right;
        charts.x = d3.scale.ordinal()
            .domain(d3.range(charts.domainSize))
            .rangePoints([0, charts.rangeSize]);
            
        var maxDataValue = d3.max(events, function(d) {
            return d[series];
        });

        var innerGraphHeight = height - margin.top - margin.bottom;

        var clickBar = function(data) {
            // when an item is selected the class selected is set on the g svg element
            var oldSelectedBar = d3.selectAll('.barGroup.selected');
            var clickedBar = d3.select(this);
            if(oldSelectedBar[0][0] === clickedBar[0][0]){
                return;
            }
            
            oldSelectedBar.classed('selected', false);
            var oldSelection = oldSelectedBar.selectAll('rect');

            var clickedBar = d3.select(this);
            clickedBar.classed('selected', true);
            var newSelection = clickedBar.selectAll('rect');
            renderSelected(oldSelection, newSelection, innerGraphHeight, charts, 200);
         }

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


            
            svg.append('g')
            .attr('id', 'bars')
            .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');
        
        addGradients(svg);
        addFilters(svg);

        var bars = svg.selectAll('.bar')
            .data(events)
            .enter()
            .append('g')
            .attr('class', 'barGroup')
            .on("click", clickBar);

        bars.append('rect')
            .attr('class', 'barBackground')
            .style('fill', dataDrivenColour)
            .style('mix-blend-mode', charts.getMixBlendMode());

        bars.append('rect')
            .attr('class', 'barGradient')
            .style("fill", "url(#gradient)")
            .style('opacity', "0.3");   

         setStartToCollapsed(bars, charts.x, height);
         bars = addAnimation(bars);
         setBarHeightUsingData(bars, charts.y, innerGraphHeight);


        var lastBar = bars[bars.length - 1];
        d3.selectAll('.barGroup:last-of-type').classed('selected', true);
        renderSelected(null, d3.selectAll(lastBar), innerGraphHeight, charts, animationDelay + 200);
        
        addYaxis(svg, charts.yAxis);
        addXaxis(svg, charts.xAxis, innerGraphHeight);
        
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