var liveworld = function(dataUrl) {
    $(function() {
        $("#embed-globe").popover({
            container: "body"
        });
    });

    var isUrl = function(str) {
        return str.match("^http");
    };

    var handleIFrameReferrer = function(event) {
        if (isUrl(event.data)) {
            ga('send', 'event', 'embedded_globe', event.data);
        }
    };

    if (window.addEventListener) { // hack for IE to attach event handler
        addEventListener("message", handleIFrameReferrer, false);
    } else {
        attachEvent("onmessage", handleIFrameReferrer);
    }

    var transformedEvents = [];

    var width = $("#live-world").parent().parent().width();
    var height = width;
    var speed = -1e-3;
    var start = Date.now();

    var sphere = {
        type: "Sphere"
    };

    var projection = d3.geo.orthographic()
        .scale(width / 2.1)
        .clipAngle(90)
        .translate([width / 2, height / 2]);

    var graticule = d3.geo.graticule();

    var canvas = d3.select("#live-world").append("canvas")
        .attr("width", width)
        .attr("height", height);

    var context = canvas.node().getContext("2d");

    var path = d3.geo.path()
        .projection(projection)
        .context(context);

    var loadData = function() {

        d3.json(dataUrl, function(error, events) {
            var data = events;
            transformedEvents = [];

            for (var i = events.length - 1; i >= 0; i--) {
                var eventFromServer = events[i];
                if(eventFromServer.location === undefined){
                    continue;
                }

                var singleEvent = {
                    id: i,
                    location: {
                        lon: eventFromServer.location.long,
                        lat: eventFromServer.location.lat
                    }
                
                }
                    transformedEvents.push(singleEvent);
            };
            createCircles();
        })
    };

    loadData();
    setInterval(function() {
            loadData()
        },
        60000);

    var CircleSize = function(transformedEvent) {
        var size = Math.random(1, 0.7) * 0.7;
        return function() {
            size += 0.03;
            if (size > 2.1) {
                size = 0.3;
            }
            return size;
        }
    };

    var eventsToDraw;

    var createCircles = function() {
        eventsToDraw = transformedEvents.map(function(transformedEvent) {
            var circleSize = new CircleSize(transformedEvent);

            var draw = function(context) {
                var circle = d3.geo.circle().angle(circleSize()).origin([transformedEvent.location.lon, transformedEvent.location.lat]);
                circlePoints = [circle()];
                context.beginPath();
                path({
                    type: "GeometryCollection",
                    geometries: circlePoints
                });
                context.fillStyle = "rgba(255, 255, 255, 1)";
                context.fill();
                context.lineWidth = .2;
                context.strokeStyle = "#FFF";
                context.stroke();
            }

            return draw;
        });
        animateCircles();
    }

    var animateCircles = function() {
        d3.json("/topo/world-110m.json", function(error, topo) {
            var land = topojson.feature(topo, topo.objects.land),
                grid = graticule();

            var redrawGlobe = function() {
                var λ = (speed * (Date.now() - start) * 2),
                    φ = -15;

                context.clearRect(0, 0, width, height);

                context.beginPath();
                path(sphere);
                context.lineWidth = 3;
                context.strokeStyle = "rgba(255,255,255,0.5)";
                context.stroke();
                context.fillStyle = "rgba(255, 255, 255, 0.1)";
                context.fill();

                context.save();
                context.translate(width / 2, 0);
                context.scale(-1, 1);
                context.translate(-width / 2, 0);
                projection.rotate([λ + 180, -φ]);

                context.beginPath();
                path(land);
                context.fillStyle = "rgba(255, 255, 255, 0.5)";
                context.fill();

                context.beginPath();
                path(grid);
                context.lineWidth = .5;
                context.strokeStyle = "rgba(255,255,255,0.2)";
                context.stroke();

                context.restore();
                projection.rotate([λ, φ]);

                context.beginPath();
                path(grid);
                context.lineWidth = .5;
                context.strokeStyle = "rgba(255,255,255,0.2)";
                context.stroke();

                context.beginPath();
                path(land);
                context.fillStyle = "rgba(255,255,255,0.5)";
                context.fill();
                context.lineWidth = .5;
                context.strokeStyle = "rgba(255,255,255,0.8";
                context.stroke();

                if (eventsToDraw != undefined) {
                    eventsToDraw.forEach(function(drawCompile) {
                        drawCompile(context);
                    });
                }
                setTimeout(redrawGlobe, 1000);
            };
            redrawGlobe();
        });
    }

};
