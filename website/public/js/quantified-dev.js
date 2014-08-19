var qd = function() {
    var result = {};
    var modelUpdateCallbacks = [];

    var compare = function(todaysEvents, yesterdayEvents) {
        var difference = todaysEvents - yesterdayEvents;
        var percentChange = (difference / yesterdayEvents) * 100;
        return Math.ceil(percentChange);
    }
    var myDevSuccessCallback = function(buildEvents) {
        result.plotGraphWith('buildEvents', buildEvents, "#build-history-parent");
        populateBuildTilesData(buildEvents);
        modelUpdateCallbacks.forEach(function(c) {
            c();
        });
    }
    var failureCallbackForComparison = function(divId, msg) {
        return function() {
            if ($("#friendList").length > 0)
                $(divId).text(msg);
        }
    }
    var populateBuildTilesData = function(buildEvents) {
        if (buildEvents.length > 0) {
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
    }
    result.updateBuildModel = function() {
        postAjax("mydev", myDevSuccessCallback)
    }
    var charts = {
        buildEvents: function() {
            result.plotBuildHistory();
        },
        wtfEvents: function() {
            result.plotWTFHistory();
        },
        hydrationEvents: function() {
            result.plotHydrationHistory();
        },
        caffeineEvents: function() {
            result.plotCaffeineHistory();
        },
        buildDurationEvents: function() {
            result.plotBuildDurationHistory();
        },
        activeEvents: function() {
            result.plotActiveEvents();
        }
    };
    result.plotGraphWith = function(eventType, graphData, graphParentTileId) {
        result[eventType] = graphData;
        if (graphData.length > 0) {
            $(graphParentTileId).show();
            charts[eventType]();
        }
    };
    result.plotHeatmapWith = function(graphParentTileId, graphTileId, graphData) {
        if (graphData.length > 0) {
            $(graphParentTileId).show();
            result.plotHourlyEventMap(graphTileId, graphData);
        }
    };
    var myWtfSuccessCallback = function(wtfEvents) {
        result.plotGraphWith('wtfEvents', wtfEvents, "#wtf-history-parent")
    }
    result.updateWTFModel = function() {
        postAjax("mywtf", myWtfSuccessCallback)
    };
    var myHydrationSuccessCallback = function(hydrationEvents) {
        result.plotGraphWith('hydrationEvents', hydrationEvents, "#hydration-history-parent");
    }
    result.updateHydrationModel = function() {
        postAjax("myhydration", myHydrationSuccessCallback)
    };
    var myCaffeineSuccessCallback = function(caffeineEvents) {
        result.plotGraphWith('caffeineEvents', caffeineEvents, "#caffeine-history-parent");
    };
    result.updateCaffeineModel = function() {
        postAjax("mycaffeine", myCaffeineSuccessCallback)
    };
    var buildDurationSuccessCallback = function(buildDurationEvents) {
        result.plotGraphWith('buildDurationEvents', buildDurationEvents, "#buildDuration-history-parent");
    };
    result.updateBuildDurationModel = function() {
        postAjax("buildDuration", buildDurationSuccessCallback)
    };
    var hourlyBuildSuccessCallback = function(hourlyBuildEvents) {
        setTimezoneDifferenceInHours();
        result.plotHeatmapWith("#hourlyBuild-heat-map-parent", '#hourlyBuild-heat-map', hourlyBuildEvents);
    }
    result.updateHourlyBuildHeatMap = function() {
        postAjax("hourlyBuildCount", hourlyBuildSuccessCallback)
    };
    var hourlyWtfSuccessCallback = function(hourlyWtfEvents) {
        setTimezoneDifferenceInHours();
        result.plotHeatmapWith("#hourlyWtf-heat-map-parent", '#hourlyWtf-heat-map', hourlyWtfEvents);
    }
    result.updateHourlyWtfHeatMap = function() {
        postAjax("hourlyWtfCount", hourlyWtfSuccessCallback)
    };
    var hourlyHydrationSuccessCallback = function(hourlyHydrationEvents) {
        setTimezoneDifferenceInHours();
        result.plotHeatmapWith("#hourlyHydration-heat-map-parent", '#hourlyHydration-heat-map', hourlyHydrationEvents);
    };
    result.updateHourlyHydrationHeatMap = function() {
        postAjax("hourlyHydrationCount", hourlyHydrationSuccessCallback)
    };
    var hourlyCaffeineSuccessCallback = function(hourlyCaffeineEvents) {
        setTimezoneDifferenceInHours();
        result.hourlyCaffeineEvents = hourlyCaffeineEvents;
        result.plotHeatmapWith('#hourlyCaffeine-heat-map-parent', '#hourlyCaffeine-heat-map', hourlyCaffeineEvents);
    };
    result.updateHourlyCaffeineHeatMap = function() {
        postAjax("hourlyCaffeineCount", hourlyCaffeineSuccessCallback)
    };
    var activitySuccessCallback = function(activeEvents) {
        result.plotGraphWith('activeEvents', activeEvents, "#active-event-history-parent");
    }
    result.updateActiveEvents = function() {
        postAjax("myActiveEvents", activitySuccessCallback)
    };

    var hourlyGithubErrorCallback = function() {
        $("#connect_to_github_btn").show();
    };
    var hourlyGithubSuccessCallback = function(hourlyGithubPushEvents) {
        result.hourlyGithubPushEvents = hourlyGithubPushEvents;
        result.plotHeatmapWith('#hourlyGithubPush-heat-map-parent', '#hourlyGithubPush-heat-map', hourlyGithubPushEvents);
    };
    result.updateHourlyGithubPushHeatMap = function() {
        postAjax("hourlyGithubPushEvents", hourlyGithubSuccessCallback, hourlyGithubErrorCallback);
    };
    var correlateSuccess = function(correlationData) {
        result.plotScatterPlot('#correlate-events', correlationData);
    }
    result.updateCorrelationData = function() {
        postAjax("correlate?firstEvent=Develop&secondEvent=Push", correlateSuccess);
    };
    result.plotGraphs = function(graphs) {
        graphs.forEach(function(graph) {
            result[graph]();
        })
    };

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
        var tweetText = sparkBar + " my+%23programming+activity+over+the+last+2+weeks.+See+yours+at+quantifieddev.org";
        var hashTags = 'coding';
        var url = "https://twitter.com/intent/tweet?text=" + tweetText + "&hashtags=" + hashTags;
        $('#tweetMyActiveDuration').attr('href', url);
    };
    result.getEventsFor = function(encodedUsername, resource) {
        return $.ajax({
            url: url("quantifieddev", resource),
            headers: {
                "Accept": "application/json",
                "Authorization": encodedUsername
            }
        });
    };
    result.getTheirEventsFor = function(encodedUsername, forUsername, resource) {
        return $.ajax({
            data: {
                forUsername: forUsername
            },
            url: url("quantifieddev", resource),
            headers: {
                "Accept": "application/json",
                "Authorization": encodedUsername
            }
        });
    };
    var eventsExist = function(events) {
        return events.length > 0;
    };

    result.compareBuildHistories = function(myBuildEvents, theirBuildEvents) {
        if (eventsExist(myBuildEvents[0]) || eventsExist(theirBuildEvents[0])) {
            result.plotComparison("#compare-build-history", myBuildEvents[0], theirBuildEvents[0])
        }
    };
    result.compareActiveEvents = function(myActiveEvents, theirActiveEvents) {
        if (eventsExist(myActiveEvents[0]) || eventsExist(theirActiveEvents[0])) {
            result.plotComparisonForActiveEvents("#compare-active-events", myActiveEvents[0], theirActiveEvents[0])
        }

    };
    result.compareGithubPushCount = function(myHourlyGithubPushCount, theirHourlyGithubPushCount) {
        if (eventsExist(myHourlyGithubPushCount[0]) || eventsExist(theirHourlyGithubPushCount[0])) {
            result.plotHourlyEventDiff('#diff-hourly-github-events', myHourlyGithubPushCount[0], theirHourlyGithubPushCount[0]);
        }
    };
    result.compareDailyGithubPushCount = function(myDailyGithubPushCount, theirDailyGithubPushCount) {
        if (eventsExist(myDailyGithubPushCount[0]) || eventsExist(theirDailyGithubPushCount[0])) {
            result.plotDailyComparison('#daily-github-event-compare', myDailyGithubPushCount[0], theirDailyGithubPushCount[0]);
        }
    }
    var compareIdeActivityEventsSuccessCallback = function(ideActivityEventForCompare) {
        result.plotComparisonAgainstAvgOfRestOfTheWorld("#compare-ide-activity", ideActivityEventForCompare);
    };
    result.updateIdeActivityEventForCompare = function() {
        postAjax("compare/ideActivity", compareIdeActivityEventsSuccessCallback);
    };

    var compareGithubEventsSuccessCallback = function(githubPushEventForCompare) {
        result.plotComparisonAgainstAvgOfRestOfTheWorld("#compare-github-events", githubPushEventForCompare);
    };
    result.updateCompareGithubEvents = function() {
        postAjax("githubPushEventForCompare", compareGithubEventsSuccessCallback);
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
        if (theirUsername !== undefined) {
            $.when(result.getEventsFor(myUsername, "mydev"), result.getTheirEventsFor(myUsername, theirUsername, "mydev"))
                .done(handlePlotComparisonGraphsSuccess)
                .fail(failureCallbackForComparison("#compare-username-errors", "No data for user!"));
            $.when(result.getEventsFor(myUsername, "myActiveEvents"), result.getTheirEventsFor(myUsername, theirUsername, "myActiveEvents"))
                .done(result.compareActiveEvents)
                .fail("Error getting active events!");
            $.when(result.getEventsFor(myUsername, "hourlyGithubPushEvents"), result.getTheirEventsFor(myUsername, theirUsername, "hourlyGithubPushEvents"))
                .done(result.compareGithubPushCount)
                .fail("Error in comparison of hourly github push events");
            $.when(result.getEventsFor(myUsername, "dailyGithubPushEvents"), result.getTheirEventsFor(myUsername, theirUsername, "dailyGithubPushEvents"))
                .done(result.compareDailyGithubPushCount)
                .fail("Error in comparison of hourly github push events");
        }
        result.updateCompareGithubEvents();
        result.updateIdeActivityEventForCompare();
    };

    return result;
}

window.qd = qd();