var liveworld = function() {
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

    debugger;
    if (window.addEventListener) { // hack for IE to attach event handler
        addEventListener("message", handleIFrameReferrer, false);
    } else {
        attachEvent("onmessage", handleIFrameReferrer);
    }

    var liveDurationMins = parseInt($('#world-time-select').find(":selected").val());
    var selectedLanguage = $('#world-language-select').find(":selected").val();
    var selectedEventType = $('#world-event-select').find(":selected").val();
    var transformedEvents = [];
    $("#world-time-select").change(function() {
        liveDurationMins = $(this).find(":selected").val();
        loadData();
    });

    $("#world-language-select").change(function() {
        selectedLanguage = $(this).find(":selected").val();
        loadData();
    });

    $("#world-event-select").change(function() {
        selectedEventType = $(this).find(":selected").val();
        loadData();
    });

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

    //d3.select(self.frameElement).style("height", height + "px");

    var getEventType = function(eventFromServer) {
        return _.contains(eventFromServer.actionTags, "Build") ? "Build" : "wtf";
    };

    var url = function() {
        return (location.hostname == "app-staging.1self.co") ?
            "https://app-staging.1self.co/live/devbuild/" :
            "https://app.1self.co/live/devbuild/";
    };

    var getLiveEventsUrl = function() {
        var liveDevBuildUrl = url() + liveDurationMins;

        var langQuery = (selectedLanguage !== "all") ? "lang=" + selectedLanguage : "";
        var eventQuery = (selectedEventType !== "all") ? "eventType=" + selectedEventType : "";

        if (langQuery && eventQuery) {
            liveDevBuildUrl += "?" + langQuery + "&" + eventQuery;
        } else if (langQuery) {
            liveDevBuildUrl += "?" + langQuery;
        } else if (eventQuery) {
            liveDevBuildUrl += "?" + eventQuery;
        };

        return liveDevBuildUrl;
    }

    var loadData = function() {
        var liveDevBuildUrl = getLiveEventsUrl();

        d3.json(liveDevBuildUrl, function(error, events) {
            var data = events;
            transformedEvents = [];
            var createLocations = [];
            var buildLocations = [];
            var wtfLocations = [];

            var isBuildLocationUnique = function(singleEvent) {
                return singleEvent.type === "create" && !(_.findWhere(createLocations, singleEvent.location))
            }
            var isBuildLocationUnique = function(singleEvent) {
                return singleEvent.type === "Build" && !(_.findWhere(buildLocations, singleEvent.location))
            }
            var isWtfLocationUnique = function(singleEvent) {
                return singleEvent.type === "wtf" && !(_.findWhere(wtfLocations, singleEvent.location))
            }
            for (var i = events.length - 1; i >= 0; i--) {
                var eventFromServer = events[i].payload;
                if(eventFromServer.location === undefined){
                    continue;
                }

                var singleEvent = {
                    id: i,
                    location: {
                        lon: eventFromServer.location.long,
                        lat: eventFromServer.location.lat
                    },
                    type: getEventType(eventFromServer), // "wtf" or "Build"
                    language: eventFromServer.properties.Language != undefined ? eventFromServer.properties.Language[0] : ""
                
                }
                if (isBuildLocationUnique(singleEvent)) {
                    transformedEvents.push(singleEvent);
                    createLocations.push(singleEvent.location);
                }
                if (isBuildLocationUnique(singleEvent)) {
                    transformedEvents.push(singleEvent);
                    buildLocations.push(singleEvent.location);
                }
                if (isWtfLocationUnique(singleEvent)) {
                    transformedEvents.push(singleEvent);
                    wtfLocations.push(singleEvent.location);
                }
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
                context.fillStyle = transformedEvent.type === "Build" ? "rgba(0, 0, 255, .5)" : "rgba(255, 0, 0, .5)";
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
                context.strokeStyle = "#000";
                context.stroke();
                context.fillStyle = "#fff";
                context.fill();

                context.save();
                context.translate(width / 2, 0);
                context.scale(-1, 1);
                context.translate(-width / 2, 0);
                projection.rotate([λ + 180, -φ]);

                context.beginPath();
                path(land);
                context.fillStyle = "#dadac4";
                context.fill();

                context.beginPath();
                path(grid);
                context.lineWidth = .5;
                context.strokeStyle = "rgba(0,0,119,.2)";
                context.stroke();

                context.restore();
                projection.rotate([λ, φ]);

                context.beginPath();
                path(grid);
                context.lineWidth = .5;
                context.strokeStyle = "rgba(0,119,119,.2)";
                context.stroke();

                context.beginPath();
                path(land);
                context.fillStyle = "rgba(0,100,0,.5)";
                context.fill();
                context.lineWidth = .5;
                context.strokeStyle = "#060";
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
$(document).ready(liveworld);
