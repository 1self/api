var qd = function() {
    var result = {};
    var modelUpdateCallbacks = [];

    var updateStreamIdAndReadToken = function() {
        result.streamId = window.localStorage.streamId;
        result.readToken = window.localStorage.readToken;
    };

    updateStreamIdAndReadToken();

    var url = function(resource) {
        var result = "";
        if (location.hostname == "localhost") {
            result = "http://" + location.hostname + ":5000/quantifieddev/" + resource + "/" + window.localStorage.streamId;
        } else {
            result = "http://quantifieddev.herokuapp.com/quantifieddev/" + resource + "/" + window.localStorage.streamId;
        }
        return result;
    }

    var compare = function(todaysEvents, yesterdayEvents) {
        var difference = todaysEvents - yesterdayEvents;
        var percentChange = (difference / yesterdayEvents) * 100;
        return Math.ceil(percentChange);
    }

    result.updateBuildModel = function() {
        var populateBuildTilesData = function(buildEvents) {
            var todaysBuild = buildEvents[buildEvents.length - 1]; // last record
            var yesterdaysBuild = buildEvents[buildEvents.length - 2];
            var totalBuildsForToday = todaysBuild.passed + todaysBuild.failed;
            var totalBuildsForYesterday = yesterdaysBuild.passed + yesterdaysBuild.failed;
            result.todaysPassedBuildCount = todaysBuild.passed;
            result.todaysFailedBuildCount = todaysBuild.failed;
            result.todaysTotalBuildCount = totalBuildsForToday;
            result.totalBuildComparison = compare(totalBuildsForToday, totalBuildsForYesterday);
            result.passedBuildComparison = compare(todaysBuild.passed, yesterdaysBuild.passed);
            result.failedBuildComparison = compare(todaysBuild.failed, yesterdaysBuild.failed);
        }
        $.ajax({
            url: url("mydev"),
            headers: {
                "Authorization": result.readToken,
                "Accept": "application/json"
            },
            success: function(buildEvents) {
                $("#stream-id-errors").text("");
                result.buildEvents = buildEvents;
                populateBuildTilesData(buildEvents);
                modelUpdateCallbacks.forEach(function(c) {
                    c();
                });
            },
            error: function(error) {
                $("#stream-id-errors").text("Incorrect streamid or read token!");
            }
        });
    }

    result.updateWTFModel = function() {
        $.ajax({
            url: url("mywtf"),
            headers: {
                "Authorization": result.readToken,
                "Accept": "application/json"
            },
            success: function(wtfEvents) {
                result.wtfEvents = wtfEvents;
                result.plotWTFHistory();
            }
        });
    };

    result.updateHydrationModel = function() {
        $.ajax({
            url: url("myhydration"),
            headers: {
                "Authorization": result.readToken,
                "Accept": "application/json"
            },
            success: function(hydrationEvents) {
                result.hydrationEvents = hydrationEvents;
                result.plotHydrationHistory();
            }
        });
    };

    result.updateCaffeineModel = function() {
        $.ajax({
            url: url("mycaffeine"),
            headers: {
                "Authorization": result.readToken,
                "Accept": "application/json"
            },
            success: function(caffeineEvents) {
                result.caffeineEvents = caffeineEvents;
                result.plotCaffeineHistory();
            }
        });
    };

    result.updateBuildDurationModel = function() {
        $.ajax({
            url: url("buildDuration"),
            headers: {
                "Authorization": result.readToken,
                "Accept": "application/json"
            },
            success: function(buildDurationEvents) {
                result.buildDurationEvents = buildDurationEvents;
                result.plotBuildDurationHistory();
            }
        });
    };
    result.updateHourlyBuildHeatMap = function() {
        $.ajax({
            url: url("hourlyBuildCount"),
            headers: {
                "Authorization": result.readToken,
                "Accept": "application/json"
            },
            success: function(hourlyBuildEvents) {
                var timezoneOffset = new Date().getTimezoneOffset();
                var timezoneDifferenceInHours = Math.round(timezoneOffset / 60);
                result.timezoneDifferenceInHours = timezoneDifferenceInHours;
                result.hourlyBuildEvents = hourlyBuildEvents;
                result.plotHourlyEventMap('#hourlyBuild-heat-map', hourlyBuildEvents);
            }
        });
    };
    result.updateHourlyWtfHeatMap = function() {
        $.ajax({
            url: url("hourlyWtfCount"),
            headers: {
                "Authorization": result.readToken,
                "Accept": "application/json"
            },
            success: function(hourlyWtfEvents) {
                var timezoneOffset = new Date().getTimezoneOffset();
                var timezoneDifferenceInHours = Math.round(timezoneOffset / 60);
                result.timezoneDifferenceInHours = timezoneDifferenceInHours;
                result.hourlyWtfEvents = hourlyWtfEvents;
                result.plotHourlyEventMap('#hourlyWtf-heat-map', hourlyWtfEvents);
            }
        });
    };
    result.updateHourlyHydrationHeatMap = function() {
        $.ajax({
            url: url("hourlyHydrationCount"),
            headers: {
                "Authorization": result.readToken,
                "Accept": "application/json"
            },
            success: function(hourlyHydrationEvents) {
                var timezoneOffset = new Date().getTimezoneOffset();
                var timezoneDifferenceInHours = Math.round(timezoneOffset / 60);
                result.timezoneDifferenceInHours = timezoneDifferenceInHours;
                result.hourlyHydrationEvents = hourlyHydrationEvents;
                result.plotHourlyEventMap('#hourlyHydration-heat-map', hourlyHydrationEvents);
            }
        });
    };
    result.updateHourlyCaffeineHeatMap = function() {
        $.ajax({
            url: url("hourlyCaffeineCount"),
            headers: {
                "Authorization": result.readToken,
                "Accept": "application/json"
            },
            success: function(hourlyCaffeineEvents) {
                var timezoneOffset = new Date().getTimezoneOffset();
                var timezoneDifferenceInHours = Math.round(timezoneOffset / 60);
                result.timezoneDifferenceInHours = timezoneDifferenceInHours;
                result.hourlyCaffeineEvents = hourlyCaffeineEvents;
                result.plotHourlyEventMap('#hourlyCaffeine-heat-map', hourlyCaffeineEvents);
            }
        });
    };
    result.updateActiveEvents = function() {
        $.ajax({
            url: url("myActiveEvents"),
            headers: {
                "Authorization": result.readToken,
                "Accept": "application/json"
            },
            success: function(activeEvents) {
                result.activeEvents = activeEvents;
                result.plotActiveEvents();
            }
        });
    };
    result.save = function(streamId, readToken) {
        window.localStorage.streamId = streamId;
        window.localStorage.readToken = readToken;
        updateStreamIdAndReadToken();
        result.updateBuildModel();
        result.updateWTFModel();
        result.updateHydrationModel();
        result.updateCaffeineModel();
        result.updateBuildDurationModel();
        result.updateHourlyBuildHeatMap();
        result.updateHourlyWtfHeatMap();
        result.updateHourlyHydrationHeatMap();
        result.updateHourlyCaffeineHeatMap();
        result.updateActiveEvents();
    }

    result.registerForBuildModelUpdates = function(callback) {
        modelUpdateCallbacks.push(callback);
    }

    result.tweetBuildSparkline = function() {
        if (result.buildEvents === undefined) {
            return;
        }

        var totalBuilds = [];
        var sparkbarDataForDays = 14;
        result.buildEvents.map(function(buildEvent) {
            totalBuilds.push(buildEvent.passed + buildEvent.failed);
        });
        totalBuilds = totalBuilds.slice(totalBuilds.length - sparkbarDataForDays, totalBuilds.length)
        console.log("sparking builds:", totalBuilds)
        var sparkBar = window.oneSelf.toSparkBars(totalBuilds);
        var tweetText = sparkBar + " my builds over the last 2 weeks. See yours at quantifieddev.org";
        var hashTags = ['coding'].join(',');
        $('#tweetMyBuilds').attr('href', "https://twitter.com/share?url=''&hashtags=" + hashTags + "&text=" + tweetText);
    };

    result.tweetWtfSparkline = function() {
        if (result.wtfEvents === undefined) {
            return;
        }

        var totalWtfs = [];
        var sparkbarDataForDays = 14;
        result.wtfEvents.map(function(wtfEvent) {
            totalWtfs.push(wtfEvent.wtfCount);
        });
        totalWtfs = totalWtfs.slice(totalWtfs.length - sparkbarDataForDays, totalWtfs.length)
        console.log("sparking wtfs:", totalWtfs)
        var sparkBar = window.oneSelf.toSparkBars(totalWtfs);
        var tweetText = sparkBar + " my WTFs over the last 2 weeks. The only measure of code quality. See yours at quantifieddev.org";
        var hashTags = ['wtf', 'coding'].join(',');
        $('#tweetMyWtfs').attr('href', "https://twitter.com/share?url=''&hashtags=" + hashTags + "&text=" + tweetText);
    };

    result.tweetHydrationSparkline = function() {
        if (result.hydrationEvents === undefined) {
            return;
        }

        var totalHydrations = [];
        var sparkbarDataForDays = 14;

        result.hydrationEvents.map(function(hydrationEvent) {
            totalHydrations.push(hydrationEvent.hydrationCount);
        });

        totalHydrations = totalHydrations.slice(totalHydrations.length - sparkbarDataForDays, totalHydrations.length);
        console.log("sparking hydrations:", totalHydrations)
        var sparkBar = window.oneSelf.toSparkBars(totalHydrations);
        var tweetText = sparkBar + " my hydration levels over the last 2 weeks. See yours at quantifieddev.org";
        var hashTags = ['hydrate', 'coding'].join(',');
        $('#tweetMyHydration').attr('href', "https://twitter.com/share?url=''&hashtags=" + hashTags + "&text=" + tweetText);
    };

    result.tweetCaffeineSparkline = function() {
        if (result.caffeineEvents === undefined) {
            return;
        }

        var totalCaffeine = [];
        var sparkbarDataForDays = 14;
        result.caffeineEvents.map(function(caffeineEvent) {
            totalCaffeine.push(caffeineEvent.caffeineCount);
        });

        totalCaffeine = totalCaffeine.slice(totalCaffeine.length - sparkbarDataForDays, totalCaffeine.length);
        console.log("sparking caffeine:", totalCaffeine)
        var sparkBar = window.oneSelf.toSparkBars(totalCaffeine);
        var tweetText = sparkBar + " my caffeine levels over the last 2 weeks. See yours at quantifieddev.org";
        var hashTags = ['coffee', 'coding'].join(',');
        $('#tweetMyCaffeine').attr('href', "https://twitter.com/share?url=''&hashtags=" + hashTags + "&text=" + tweetText);
    };

    result.tweetBuildDurationSparkline = function() {
        if (result.buildDurationEvents === undefined) {
            return;
        }

        var totalBuildDuration = [];
        var sparkbarDataForDays = 14;
        result.buildDurationEvents.map(function(buildDurationEvent) {
            totalBuildDuration.push(buildDurationEvent.avgBuildDuration);
        });

        totalBuildDuration = totalBuildDuration.slice(totalBuildDuration.length - sparkbarDataForDays, totalBuildDuration.length);
        console.log("sparking totalBuildDuration:", totalBuildDuration)
        var sparkBar = window.oneSelf.toSparkBars(totalBuildDuration);
        var tweetText = sparkBar + " my build duration over the last 2 weeks. See yours at quantifieddev.org";
        var hashTags = ['buildDuration', 'coding'].join(',');
        $('#tweetMyBuildDuration').attr('href', "https://twitter.com/share?url=''&hashtags=" + hashTags + "&text=" + tweetText);
    };

    result.tweetActiveEventSparkline = function() {
        if (result.activeEvents === undefined) {
            return;
        }

        var totalActiveDuration = [];
        var sparkbarDataForDays = 14;
        result.activeEvents.map(function(activeEvent) {
            totalActiveDuration.push(activeEvent.totalActiveDuration);
        });

        totalActiveDuration = totalActiveDuration.slice(totalActiveDuration.length - sparkbarDataForDays, totalActiveDuration.length);
        console.log("sparking totalActiveDuration:", totalActiveDuration)
        var sparkBar = window.oneSelf.toSparkBars(totalActiveDuration);
        var tweetText = sparkBar + " my programming activity over the last 2 weeks. See yours at quantifieddev.org";
        var hashTags = ['IntelliJ', 'coding'].join(',');
        $('#tweetMyActiveDuration').attr('href', "https://twitter.com/share?url=''&hashtags=" + hashTags + "&text=" + tweetText);
    };

    var urlForCompare = function(resource, streamId) {
        var result = "";
        if (location.hostname == "localhost") {
            result = "http://" + location.hostname + ":5000/quantifieddev/" + resource + "/" + streamId;
        } else {
            result = "http://quantifieddev.herokuapp.com/quantifieddev/" + resource + "/" + streamId;
        }
        return result;
    };

    var updateStreamIdAndReadTokenForCompare = function() {
        result.myStreamId = window.localStorage.myStreamId;
        result.myReadToken = window.localStorage.myReadToken;
        result.withStreamId = window.localStorage.withStreamId;
        result.withReadToken = window.localStorage.withReadToken;
    };

    updateStreamIdAndReadTokenForCompare();

    result.updateBuildHistoryModelForMyStreamId = function() {
        return $.ajax({
            url: urlForCompare("mydev", window.localStorage.myStreamId),
            headers: {
                "Authorization": result.myReadToken,
                "Accept": "application/json"
            }
        });
    };
    result.updateBuildHistoryModelForWithStreamId = function() {
        return $.ajax({
            url: urlForCompare("mydev", window.localStorage.withStreamId),
            headers: {
                "Authorization": result.withReadToken,
                "Accept": "application/json"
            }
        });
    };
    result.updateActiveEventsModelForMyStreamId = function() {
        return $.ajax({
            url: urlForCompare("myActiveEvents", window.localStorage.myStreamId),
            headers: {
                "Authorization": result.myReadToken,
                "Accept": "application/json"
            }
        });
    };
    result.updateActiveEventsModelForWithStreamId = function() {
        return $.ajax({
            url: urlForCompare("myActiveEvents", window.localStorage.withStreamId),
            headers: {
                "Authorization": result.withReadToken,
                "Accept": "application/json"
            }
        });
    };
    result.compareBuildHistories = function(myBuildEvents, withBuildEvents) {
        result.plotBuildHistory(myBuildEvents[0], "#my-build-history");
        result.plotBuildHistory(withBuildEvents[0], "#with-build-history");
        result.plotComparison("#compare-build-history", myBuildEvents[0], withBuildEvents[0])
    };
    result.compareActiveEvents = function(myActiveEvents, withActiveEvents) {
       result.plotActiveEventsFor(myActiveEvents[0], "#my-active-events");
        result.plotActiveEventsFor(withActiveEvents[0], "#with-active-events");
        result.plotComparisonForActiveEvents("#compare-active-events", myActiveEvents[0], withActiveEvents[0])
    };
    result.saveStreamIds = function(myStreamId, myReadToken, withStreamId, withReadToken) {
        window.localStorage.myStreamId = myStreamId;
        window.localStorage.myReadToken = myReadToken;
        window.localStorage.withStreamId = withStreamId;
        window.localStorage.withReadToken = withReadToken;
        updateStreamIdAndReadTokenForCompare();
        $.when(result.updateBuildHistoryModelForMyStreamId(), result.updateBuildHistoryModelForWithStreamId())
            .done(result.compareBuildHistories).fail("Error getting build data!");
        $.when(result.updateActiveEventsModelForMyStreamId(), result.updateActiveEventsModelForWithStreamId())
           .done(result.compareActiveEvents).fail("Error getting active events!");

    };

    if (result.myStreamId && result.myReadToken) {
        result.updateBuildHistoryModelForMyStreamId();
        result.updateActiveEventsModelForMyStreamId();
    }

    if (result.withStreamId && result.withReadToken) {
        result.updateBuildHistoryModelForWithStreamId();
        result.updateActiveEventsModelForWithStreamId();
    }

    return result;
}

window.qd = qd();