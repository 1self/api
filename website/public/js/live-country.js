var liveCountry = function() {
    var liveDurationMins = parseInt($('#country-time-select').find(":selected").val());
    var selectedLanguage = $('#country-language-select').find(":selected").val();
    var selectedEventType = $('#country-event-select').find(":selected").val();
    var transformedEvents = [];

    $("#country-time-select").change(function() {
        liveDurationMins = $(this).find(":selected").val();
        loadData();
    });

    $("#country-language-select").change(function() {
        selectedLanguage = $(this).find(":selected").val();
        loadData();
    });

    $("#country-event-select").change(function() {
        selectedEventType = $(this).find(":selected").val();
        loadData();
    });

    // Bit hacky to ge the width and height
    var width = $("#live-country").parent().parent().width();
    var height = width;
    var graticule = d3.geo.graticule();
    var canvas = d3.select("#live-country").append("canvas")
        .attr("width", width)
        .attr("height", height);
    var context = canvas.node().getContext("2d");
    var path;

    var getEventType = function(eventFromServer) {
        return _.contains(eventFromServer.actionTags, "Build") ? "Build" : "wtf";
    };

    var url = function() {
        return (location.hostname == "localhost") ?
            "http://localhost:5000/" :
            "http://app.quantifieddev.org/";
    }

    var plotGraph = function() {
        $.getJSON("http://jsonip.com?callback=?", function(ipDetails) {
            $.ajax({
                url: url() + ipDetails.ip,
                success: function(locationInfo) {
                    locationInfo = $.parseJSON(locationInfo);
                    var centerLatitude = locationInfo.latitude;
                    var centerLongitude = locationInfo.longitude;
                    var countryName = locationInfo.country_name;

                    $("#country").text(countryName + "'s Events");

                    var projection = d3.geo.mercator()
                        .scale(width * 2)
                        // .clipAngle(90)
                        .translate([width / 2, height / 2])
                        .center([centerLongitude, centerLatitude]);

                    path = d3.geo.path()
                        .projection(projection)
                        .context(context);

                    d3.select(self.frameElement).style("height", height + "px");

                    loadData();
                },
                error: function(err) {
                    console.log("error is " + JSON.stringify(err));
                }
            })
        });
    };

    plotGraph();

    var getLiveEventsUrl = function() {
        var liveDevBuildUrl = url() + "live/devbuild/" + liveDurationMins;

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
            var buildLocations = [];
            var wtfLocations = [];
            var isBuildLocationUnique = function(singleEvent) {
                return singleEvent.type === "Build" && !(_.findWhere(buildLocations, singleEvent.location))
            }
            var isWtfLocationUnique = function(singleEvent) {
                return singleEvent.type === "wtf" && !(_.findWhere(wtfLocations, singleEvent.location))
            }
            for (var i = events.length - 1; i >= 0; i--) {
                var eventFromServer = events[i].payload;
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

    setInterval(function() {
        loadData()
    }, 60000);

    function CircleSize(transformedEvent) {
        var size = Math.random(1, 0.7) * 0.7;

        return function() {
            size += 0.01;
            if (size > 0.7) {
                size = 0.1;
            }
            return size;
        }
    };

    var eventsToDraw;

    function createCircles() {
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
                context.fillStyle = transformedEvent.type === "Build" ? "rgba(0, 0, 255, .3)" : "rgba(255, 0, 0, .3)";
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

            var redrawCountry = function() {
                context.clearRect(0, 0, width, height);

                context.beginPath();
                var sphere = {
                    type: "Sphere"
                };
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

                context.beginPath();
                path(grid);
                context.lineWidth = .5;
                context.strokeStyle = "rgba(0,0,119,.2)";
                context.stroke();

                context.restore();

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
                setTimeout(redrawCountry, 1000);
            };
            redrawCountry();
        });
    }

}();