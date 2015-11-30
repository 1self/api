var liveworld = function (dataUrl) {
    // when a tab is in the background we don't want to do any work at all. It's more respectful for power and battery.
    var hidden, visibilityChange; 
    if (typeof document.hidden !== "undefined") { // Opera 12.10 and Firefox 18 and later support 
        hidden = "hidden";
        visibilityChange = "visibilitychange";
    } else if (typeof document.mozHidden !== "undefined") {
        hidden = "mozHidden";
        visibilityChange = "mozvisibilitychange";
    } else if (typeof document.msHidden !== "undefined") {
        hidden = "msHidden";
        visibilityChange = "msvisibilitychange";
    } else if (typeof document.webkitHidden !== "undefined") {
        hidden = "webkitHidden";
        visibilityChange = "webkitvisibilitychange";
    }
    var pageIsHidden = false;
    function handleVisibilityChange() {
        if (document[hidden]) {
            console.log('page hidden event fired, page hidden');
            pageIsHidden = true;
        } else {
            console.log('page hidden event fired, page shown');
            pageIsHidden = false;
        }
    }

    $("body").css("background-color", frameBodyColor);
    $(function () {
        $("#embed-globe").popover({
            container: "body"
        });
    });

    document.addEventListener(visibilityChange, handleVisibilityChange, false);

    var isUrl = function (str) {
        return str.match("^http");
    };

    var handleIFrameReferrer = function (event) {
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

    var loadData = function (callback) {
        if(pageIsHidden){
            console.log('page is hidden, not getting data');
        }

        var page = 0;
        var getData = function (error, events) {
            var data = events;
            transformedEvents = [];

            for (var i = events.length - 1; i >= 0; i--) {
                var eventFromServer = events[i];
                if (eventFromServer.location === undefined || eventFromServer.dateTime === undefined) {
                    continue;
                }

                var singleEvent = {
                    id: i,
                    location: {
                        lon: eventFromServer.location.long,
                        lat: eventFromServer.location.lat
                    },
                    dateTime: eventFromServer.dateTime

                };
                transformedEvents.push(singleEvent);
            }
            if(callback !== undefined){
                callback();
            }

            if(events.length === 100){
                page += 1;
            
                if(page < 20){
                    setTimeout(function(){
                        d3.json(dataUrl + '&page=' + page, getData);
                    }, 10000);
                }
            }
        };

        d3.json(dataUrl + '&page=' + page, getData);
    };

    var animate = function(){
        createCircles();
    };

    loadData(animate);

    var CircleSize = function (transformedEvent) {
        var now = new Date();
        var eventTime = new Date(transformedEvent.dateTime);
        var diff = Math.abs(now - eventTime);
        diff = diff / 1000; // seconds
        diffDays = 1 + (diff / 60 / 60 / 24);
        var size = (1 / diffDays) * 1;

        return function () {
            return size;
        };
    };

    var eventsToDraw;

    var iteration = 0;
    var createCircles = function () {
        eventsToDraw = transformedEvents.map(function (transformedEvent, i) {
            var circleSize = new CircleSize(transformedEvent);

            var draw = function (context) {
                var circle = d3.geo.circle().angle(circleSize()).origin([transformedEvent.location.lon, transformedEvent.location.lat]);
                circlePoints = [circle()];
                context.beginPath();
                path({
                    type: "GeometryCollection",
                    geometries: circlePoints
                });
                context.fillStyle = circleColor;
                context.fill();
            };

            return draw;
        });
        animateCircles();
    };
    



    var animateCircles = function () {
        d3.json("/topo/world-110m.json", function (error, topo) {
            var land = topojson.feature(topo, topo.objects.land),
                grid = graticule();

            var interpolation = eventsToDraw.length / 50;

            var redrawGlobe = function () {
                if(pageIsHidden === true){
                    console.log('page is hidden, animation is off');
                }

                console.log(new Date().toString + ': redrawing');
                var λ = (speed * (Date.now() - start) * 2),
                    φ = -15;

                context.clearRect(0, 0, width, height);

                context.beginPath();
                path(sphere);
                context.lineWidth = 2;
                context.strokeStyle = "rgba(255,255,255,1)";
                context.stroke();
                context.fillStyle = "rgba(255, 255, 255, 0)";
                context.fill();

                context.save();
                context.translate(width / 2, 0);
                context.scale(-1, 1);
                context.translate(-width / 2, 0);
                projection.rotate([λ + 180, -φ]);

                context.beginPath();
                path(land);
                context.fillStyle = "rgba(255, 255, 255, 0.3)";
                context.fill();

                context.beginPath();
                path(grid);
                context.lineWidth = 0.5;
                context.strokeStyle = "rgba(255,255,255,0.1)";
                context.stroke();

                context.restore();
                projection.rotate([λ, φ]);

                context.beginPath();
                path(grid);
                context.lineWidth = 0.5;
                context.strokeStyle = "rgba(255,255,255,0.1)";
                context.stroke();

                context.beginPath();
                path(land);
                context.fillStyle = "rgba(255,255,255,1)";
                context.fill();
                context.lineWidth = 0.5;
                context.strokeStyle = "rgba(255,255,255,1";
                context.stroke();

                if (eventsToDraw !== undefined) {
                    var sparseDraw = eventsToDraw.length / 50;
                    eventsToDraw.forEach(function (drawCompile, i) {
                        drawCompile(context);
                    });
                }

                iteration++;

                // returning true finishes the animation
                return false;
            };

            // using d3 timer function ensures that an animation frame is requested,
            // improving the performance. This performs much better than calling
            var animationOn = true;
            var animationScheduled = false;
            var doGlobeAnim = function(){
                return function(){
                    animationScheduled = false;
                    if(animationOn){
                        redrawGlobe();
                        d3.timer(doGlobeAnim(), 5000);
                        animationScheduled = true;
                    }

                    return true;
                };
            };

            var handleVisibilityChangeForAnimation = function(){
                if(document[hidden]){
                    animationOn = false;
                }
                else {
                    if(animationOn === false && !animationScheduled){
                        d3.timer(doGlobeAnim(), 5000);
                        animationSceduled = true;
                    }
                    animationOn = true;
                }
            };

            document.addEventListener(visibilityChange, handleVisibilityChangeForAnimation, false);

            if(animationOn){
                d3.timer(doGlobeAnim(), 0);
                animationScheduled = true;
            }
        });
    };

};


