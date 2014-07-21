var qd = function() {
    var result = {};
    var modelUpdateCallbacks = [];

    //change this to accomodate varying streamids (for compare functionality)
    var url = function(resource) {
        var result = "";
        if (location.hostname == "localhost") {
            result = "http://" + location.hostname + ":5000/quantifieddev/" + resource;
        } else {
            result = "http://quantifieddev.herokuapp.com/quantifieddev/" + resource;
        }
        return result;
    };

    var postAjax = function(urlParam, successCallback, failureCallback) {
        console.log("Cookie is eun: ", $.cookie("_eun"))
        $.ajax({
            url: url(urlParam),
            headers: {
                "Accept": "application/json",
                "Authorization": $.cookie("_eun")
            },
            success: successCallback,
            error: function(error) {
                if (failureCallback)
                    failureCallback(error);
            }
        });

    }
    var compare = function(todaysEvents, yesterdayEvents) {
        var difference = todaysEvents - yesterdayEvents;
        var percentChange = (difference / yesterdayEvents) * 100;
        return Math.ceil(percentChange);
    }
    var myDevSuccessCallback = function(buildEvents) {
        result.buildEvents = buildEvents;
        populateBuildTilesData(buildEvents);
        modelUpdateCallbacks.forEach(function(c) {
            c();
        });

    }
    var failureCallback = function(divId, msg) {
        return function() {
            $(divId).text(msg);
        }
    }
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
    result.updateBuildModel = function() {
        postAjax("mydev", myDevSuccessCallback)
    }
    var myWtfSuccessCallback = function(wtfEvents) {
        result.wtfEvents = wtfEvents;
        result.plotWTFHistory();
    }
    result.updateWTFModel = function() {
        postAjax("mywtf", myWtfSuccessCallback)
    };
    var myHydrationSuccessCallback = function(hydrationEvents) {
        result.hydrationEvents = hydrationEvents;
        result.plotHydrationHistory();
    }
    result.updateHydrationModel = function() {
        postAjax("myhydration", myHydrationSuccessCallback)
    };
    var myCaffeineSuccessCallback = function(caffeineEvents) {
        result.caffeineEvents = caffeineEvents;
        result.plotCaffeineHistory();
    };
    result.updateCaffeineModel = function() {
        postAjax("mycaffeine", myCaffeineSuccessCallback)

    };
    var buildDurationSuccessCallback = function(buildDurationEvents) {
        result.buildDurationEvents = buildDurationEvents;
        result.plotBuildDurationHistory();
    };
    result.updateBuildDurationModel = function() {
        postAjax("buildDuration", buildDurationSuccessCallback)

    };
    var hourlyBuildSuccessCallback = function(hourlyBuildEvents) {
        setTimezoneDifferenceInHours()
        result.hourlyBuildEvents = hourlyBuildEvents;
        result.plotHourlyEventMap('#hourlyBuild-heat-map', hourlyBuildEvents);
    }

    result.updateHourlyBuildHeatMap = function() {
        postAjax("hourlyBuildCount", hourlyBuildSuccessCallback)

    };
    var hourlyWtfSuccessCallback = function(hourlyWtfEvents) {
        setTimezoneDifferenceInHours()
        result.hourlyWtfEvents = hourlyWtfEvents;
        result.plotHourlyEventMap('#hourlyWtf-heat-map', hourlyWtfEvents);
    }


    result.updateHourlyWtfHeatMap = function() {
        postAjax("hourlyWtfCount", hourlyWtfSuccessCallback)
    };

    var hourlyHydrationSuccessCallback = function(hourlyHydrationEvents) {
        setTimezoneDifferenceInHours()
        result.hourlyHydrationEvents = hourlyHydrationEvents;
        result.plotHourlyEventMap('#hourlyHydration-heat-map', hourlyHydrationEvents);
    }
    result.updateHourlyHydrationHeatMap = function() {
        postAjax("hourlyHydrationCount", hourlyHydrationSuccessCallback)

    };
    var hourlyCaffeineSuccessCallback = function(hourlyCaffeineEvents) {
        setTimezoneDifferenceInHours()
        result.hourlyCaffeineEvents = hourlyCaffeineEvents;
        result.plotHourlyEventMap('#hourlyCaffeine-heat-map', hourlyCaffeineEvents);
    }
    result.updateHourlyCaffeineHeatMap = function() {
        postAjax("hourlyCaffeineCount", hourlyCaffeineSuccessCallback)
    };
    var activitySuccessCallback = function(myActiveEvents) {
        result.activeEvents = myActiveEvents;
        result.plotActiveEvents();
    }
    result.updateActiveEvents = function() {
        postAjax("myActiveEvents", activitySuccessCallback)

    };
    result.plotGraphs = function(graphs) {
        graphs.forEach(function(graph) {
            result[graph]();
        })
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
    result.updateBuildHistoryModelFor = function(encodedUsername) {
        return $.ajax({
            url: url("mydev"),
            headers: {
                "Accept": "application/json",
                "Authorization": encodedUsername
            }
        });
    };
    result.updateActiveEventsModelFor = function(encodedUsername) {
        return $.ajax({
            url: url("myActiveEvents"),
            headers: {
                "Accept": "application/json",
                "Authorization": encodedUsername
            }
        });
    };
    result.compareBuildHistories = function(myBuildEvents, theirBuildEvents) {
        result.plotBuildHistory(myBuildEvents[0], "#my-build-history");
        result.plotBuildHistory(theirBuildEvents[0], "#their-build-history");
        result.plotComparison("#compare-build-history", myBuildEvents[0], theirBuildEvents[0])
    };
    result.compareActiveEvents = function(myActiveEvents, theirActiveEvents) {
        result.plotActiveEventsFor(myActiveEvents[0], "#my-active-events");
        result.plotActiveEventsFor(theirActiveEvents[0], "#their-active-events");
        result.plotComparisonForActiveEvents("#compare-active-events", myActiveEvents[0], theirActiveEvents[0])
    };

    var handlePlotComparisonGraphsSuccess = function(myBuildEvents, theirBuildEvents) {
        $("#compare-username-errors").text("");
        result.compareBuildHistories(myBuildEvents, theirBuildEvents)
    }

    var setTimezoneDifferenceInHours = function() {
        var timezoneOffset = new Date().getTimezoneOffset();
        var timezoneDifferenceInHours = Math.round(timezoneOffset / 60);
        result.timezoneDifferenceInHours = timezoneDifferenceInHours;
    }

    result.plotComparisonGraphs = function(theirUsername) {
        var myUsername = $.cookie("_eun");
        $.when(result.updateBuildHistoryModelFor(myUsername), result.updateBuildHistoryModelFor(theirUsername))
            .done(handlePlotComparisonGraphsSuccess)
            .fail(failureCallback("#compare-username-errors", "Username doesn't exist!"));
        $.when(result.updateActiveEventsModelFor(myUsername), result.updateActiveEventsModelFor(theirUsername))
            .done(result.compareActiveEvents)
            .fail("Error getting active events!");
    };

    return result;
}

window.qd = qd();