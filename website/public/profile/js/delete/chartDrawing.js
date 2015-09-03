/*

Functions for drawing elements on charts.

Depends on d3 so ensure that that is linked to before this file in your main file.

 */

function addXAxis(xAxis, appendTo, height, removeOverlaps, axisLabel, width, bottomMargin) {

    // Add the X Axis
    var dateTicks = appendTo.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
    .selectAll('.tick');

    if (removeOverlaps) {
        for (var j = 0; j < dateTicks[0].length; j++) {
            var c = dateTicks[0][j],
                n = dateTicks[0][j+1];

            if (!c || !n || !c.getBoundingClientRect || !n.getBoundingClientRect)
                continue;

            while (c.getBoundingClientRect().right > n.getBoundingClientRect().left) {
                d3.select(n).remove();
                j++;
                n = dateTicks[0][j+1];
                if (!n)
                break;
            }
        }
    }

    if (axisLabel) {
        // Add the text label for the x axis
        appendTo.append("text")
            .attr("transform", "translate(" + (width) + " ," + (height + margin.bottom) + ")")
            .style("text-anchor", "middle")
            .attr("class", "axis-label x-axis-label")
            .text("Date");
    }
}

function addYAxis(yAxis, appendTo, width, leftMargin, axisLabel) {

    // console.log('ticks', yAxis.scale().ticks(yAxis.ticks()[0]));
    // console.log('ticks', yAxis.scale().ticks());

    var maxLabelLength = 0;

    // Add the Y Axis
    var gy = appendTo.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .selectAll('.tick')
        .each(function(data) {
            var tick = d3.select(this);
            // console.log(tick, tick.text());
            // console.log(tick.select('text')[0][0].getComputedTextLength());
            if (tick.select('text')[0][0].getComputedTextLength() > maxLabelLength)
                maxLabelLength = tick.select('text')[0][0].getComputedTextLength();
        });

    gy.selectAll("g").filter(function(d) { return d; })
        .classed("minor", true);

    gy.selectAll("text")
        .attr("x", maxLabelLength - 6)
        .attr("dy", -4);

        // Add the text label for the Y axis
    if (axisLabel !== "") {
        appendTo.append("text")
            .attr("y", 0 - leftMargin)
            .attr("x", 0)
            .attr("dy", "1em")
            .attr("class", "axis-label y-axis-label")
            .text(axisLabel);
    
        appendTo.select(".y-axis-label")
            .attr("transform", function() { return "rotate(-90) translate(" + (0 - this.getComputedTextLength()) + ", 0)"; } );
    }
}

function drawLollySticks(appendTo, data, height, width, xMap, yMap, lineColour, doTransitions, highlightCondition) {

    var y1;
    if (highlightCondition === "top10") {
        y1 = height;
    } else if (highlightCondition === "bottom10") {
        y1 = 0;
    }

    // add vertical lines down from scatter points
    if (doTransitions) {
        appendTo.selectAll(".lolly-stick")
            .data(data)
            .enter().append("line")
            .attr("class", "lolly-stick")
            .style("stroke", function(d) { return d.highlight ? lineColour : '#999999'; } ) //'#a9b2bd'
            .attr("y1", y1)
            .attr("y2", y1)
            .attr("x1", xMap)
            .attr("x2", xMap)
            .transition()
            .duration(1200)
            .ease('elastic')
            .attr("y2", yMap); //function(d) { return height - y(d.value); });

        // draw dots
        appendTo.selectAll(".dot")
            .data(data)
            .enter().append("ellipse")
            .attr("class", "dot")
            .attr("rx", 3.5)
            .attr("ry", 3.5)
            .attr("cx", xMap)
            .attr("cy", y1)
            .style("display", function(d) { return d.highlight === "date" ? "none" : "block" ; } )
            .style("fill", function(d) { return d.highlight ? lineColour : '#999999'; } )
            .transition()
            .duration(1200)
            .ease('elastic')
            .attr("cy", yMap); //function(d) { return height - y(d.value); });

    } else {
        appendTo.selectAll(".lolly-stick")
            .data(data)
            .enter().append("line")
            .attr("class", "lolly-stick")
            .style("stroke", function(d) { return d.highlight ? lineColour : '#999999'; } )
            .attr("y1", y1)
            .attr("y2", yMap)
            .attr("x1", xMap)
            .attr("x2", xMap);

        // draw dots
        appendTo.selectAll(".dot")
            .data(data)
            .enter().append("ellipse")
            .attr("class", "dot")
            .attr("rx", 3.5)
            .attr("ry", 3.5)
            .attr("cx", xMap)
            .attr("cy", yMap)
            .style("display", function(d) { return d.highlight === "date" ? "none" : "block" ; } )
            .style("fill", function(d) { return d.highlight ? lineColour : '#999999'; } );
    }
}