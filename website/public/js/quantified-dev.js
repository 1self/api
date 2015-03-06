var qd = function () {
    var result = {};

    var compare = function (todaysEvents, yesterdayEvents) {
        var difference = todaysEvents - yesterdayEvents;
        var percentChange = (difference / yesterdayEvents) * 100;
        return Math.ceil(percentChange);
    };
    var plotBuildEvents = function (buildEvents) {
        result.buildEvents = buildEvents;
        result.plotGraphWith('buildEvents', buildEvents, "#build-history-parent");
    };
    /*   var failureCallbackForComparison = function(divId, msg) {
     return function() {
     if ($("#friendList").length > 0)
     $(divId).text(msg);
     }
     }*/
    result.updateBuildModel = function () {
        postAjax("mydev", plotBuildEvents)
    };
    var charts = {
        buildEvents: function () {
            result.plotBuildHistory();
        },
        wtfEvents: function () {
            result.plotWTFHistory();
        },
        noiseEvents: function () {
            result.plotNoiseEventsHistory();
        },
        tweetEvents: function () {
            result.plotTweetEventsHistory();
        },
        songsByDayEvents: function () {
            result.plotSongsByDayEventsHistory();
        },
        stepsEvents: function () {
            result.plotStepsEventsHistory();
        }, 
        hydrationEvents: function () {
            result.plotHydrationHistory();
        },
        caffeineEvents: function () {
            result.plotCaffeineHistory();
        },
        buildDurationEvents: function () {
            result.plotBuildDurationHistory();
        },
        activeEvents: function () {
            result.plotActiveEvents();
        }
    };
    result.plotGraphWith = function (eventType, graphData, graphParentTileId) {
        result[eventType] = graphData;
        if (graphData.length > 0) {
            $(graphParentTileId).show();
            charts[eventType]();
        }
    };
    result.plotHeatmapWith = function (graphParentTileId, graphTileId, graphData) {
        if (graphData.length > 0) {
            $(graphParentTileId).show();
            result.plotHourlyEventMap(graphTileId, graphData);
        }
    };
    var plotWtfEvents = function (wtfEvents) {
        result.wtfEvents = wtfEvents;
        result.plotGraphWith('wtfEvents', wtfEvents, "#wtf-history-parent")
    };
    var plotNoiseEvents = function (noiseEvents) {
        result.noiseEvents = noiseEvents;
        result.plotGraphWith('noiseEvents', noiseEvents, "#noise-graph-parent")
    };

    var plotTweetEvents = function (tweetEvents) {
        result.tweetEvents = tweetEvents;
        result.plotGraphWith('tweetEvents', tweetEvents, "#tweet-graph-parent")
    };

    var plotSongsByDayEvents = function (songsByDayEvents) {
        result.songsByDayEvents = songsByDayEvents;
        result.plotGraphWith('songsByDayEvents', songsByDayEvents, "#songsbyday-graph-parent")
    };

    var plotStepsEvents = function (stepsEvents) {
        result.stepsEvents = stepsEvents;
        result.plotGraphWith('stepsEvents', stepsEvents, "#steps-graph-parent")
    };

    result.updateNoiseModel = function () {
        postV1Ajax("ambient,sound", "sample", "mean(dbspl)", "daily")
            .done(plotNoiseEvents)
            .fail(function (error) {
                console.error("Error is: " + error);
            });
    };

    result.updateTweetModel = function () {
        postV1Ajax("twitter,tweet", "publish", "count", "daily")
            .done(plotTweetEvents)
            .fail(function (error) {
                console.error("Error is: " + error);
            });
    };

    result.updateSongsByDayModel = function () {
        postV1Ajax("music", "listen", "count", "daily")
            .done(plotSongsByDayEvents)
            .fail(function (error) {
                console.error("Error is: " + error);
            });
    };

    result.updateStepsModel = function () {
        postV1Ajax("steps", "walked", "sum(numberOfSteps)", "daily")
            .done(plotStepsEvents)
            .fail(function (error) {
                console.error("Error is: " + error);
            });
    };

    result.updateWTFModel = function () {
        postV1Ajax("Computer,Software", "wtf", "count", "daily")
            .done(plotWtfEvents)
            .fail(function (error) {
                console.error("Error is: " + error);
            });
    };
    var plotHydrationEvents = function (hydrationEvents) {
        result.hydrationEvents = hydrationEvents;
        result.plotGraphWith('hydrationEvents', hydrationEvents, "#hydration-history-parent");
    };
    result.updateHydrationModel = function () {
        postV1Ajax("Drink,Water", "drink", "count", "daily")
            .done(plotHydrationEvents)
            .fail(function (error) {
                console.error("Error is: " + error);
            });
    };
    var plotCaffeineEvents = function (caffeineEvents) {
        result.caffeineEvents = caffeineEvents;
        result.plotGraphWith('caffeineEvents', caffeineEvents, "#caffeine-history-parent");
    };
    result.updateCaffeineModel = function () {
        postV1Ajax("Drink,Coffee", "drink", "count", "daily")
            .done(plotCaffeineEvents)
            .fail(function (error) {
                console.error("Error is: " + error);
            });
    };
    var plotBuildDurationEvents = function (buildDurationEvents) {
        result.buildDurationEvents = buildDurationEvents;
        result.plotGraphWith('buildDurationEvents', buildDurationEvents, "#buildDuration-history-parent");
    };
    result.updateBuildDurationModel = function () {
        postV1Ajax("Computer,Software", "Build,Finish", "mean(BuildDuration)", "daily")
            .done(plotBuildDurationEvents)
            .fail(function (error) {
                console.error("Error is: " + error);
            });
    };
    var plotActivity = function (activeEvents) {
        result.activeEvents = activeEvents;
        result.plotGraphWith('activeEvents', activeEvents, "#active-event-history-parent");
    };
    result.updateActiveEvents = function () {
        postV1Ajax("Computer,Software", "Develop", "sum(duration)", "daily")
            .done(plotActivity)
            .fail(function (error) {
                console.error("Error is: " + error);
            });
    };

    var getEventCountForHourlyEvents = function (events) {
        return _.reduce(_.map(events, function (event) {
            return event.hourlyEventCount;
        }), function (totalEventCount, eventCount) {
            return totalEventCount + eventCount;
        }, 0);
    };

    var plotHourlyBuildEvents = function (hourlyBuildEvents) {
        result.hourlyBuildEvents = hourlyBuildEvents;
        var eventCount = getEventCountForHourlyEvents(hourlyBuildEvents);
        $('#totalBuildCount').html("Total No of Build Events : " + eventCount);
        result.plotHeatmapWith("#hourlyBuild-heat-map-parent", '#hourlyBuild-heat-map', hourlyBuildEvents);
    };

    result.updateHourlyBuildHeatMap = function () {
        postAjax("hourlyBuildCount", plotHourlyBuildEvents)
    };
    var plotHourlyWtfEvents = function (hourlyWtfEvents) {
        result.hourlyWtfEvents = hourlyWtfEvents;
        var eventCount = getEventCountForHourlyEvents(hourlyWtfEvents);
        $('#totalWtfCount').html("Total No of WTF Events : " + eventCount);
        result.plotHeatmapWith("#hourlyWtf-heat-map-parent", '#hourlyWtf-heat-map', hourlyWtfEvents);
    };
    result.updateHourlyWtfHeatMap = function () {
        postAjax("hourlyWtfCount", plotHourlyWtfEvents)
    };
    var plotHourlyHydrationEvents = function (hourlyHydrationEvents) {
        result.hourlyHydrationEvents = hourlyHydrationEvents;
        var eventCount = getEventCountForHourlyEvents(hourlyHydrationEvents);
        $('#totalHydrationCount').html("Total glasses of Water : " + eventCount);
        result.plotHeatmapWith("#hourlyHydration-heat-map-parent", '#hourlyHydration-heat-map', hourlyHydrationEvents);
    };
    result.updateHourlyHydrationHeatMap = function () {
        postAjax("hourlyHydrationCount", plotHourlyHydrationEvents)
    };
    var plotHourlyCaffeineEvents = function (hourlyCaffeineEvents) {
        result.hourlyCaffeineEvents = hourlyCaffeineEvents;
        var eventCount = getEventCountForHourlyEvents(hourlyCaffeineEvents);
        $('#totalCaffeineCount').html("Total cups of Coffee : " + eventCount);
        result.plotHeatmapWith('#hourlyCaffeine-heat-map-parent', '#hourlyCaffeine-heat-map', hourlyCaffeineEvents);
    };
    result.updateHourlyCaffeineHeatMap = function () {
        postAjax("hourlyCaffeineCount", plotHourlyCaffeineEvents)
    };

    var hourlyGithubErrorCallback = function () {
        $("#connect_to_github_btn").show();
    };
    var plotHourlyGithubPushEvents = function (hourlyGithubPushEvents) {
        result.hourlyGithubPushEvents = hourlyGithubPushEvents;
        var eventCount = getEventCountForHourlyEvents(hourlyGithubPushEvents);
        $('#totalPushCount').html("Total No of Push Events : " + eventCount);
        if (eventCount === 0) {
            $("#connect_to_github_btn").show();
        } else {
            result.plotHeatmapWith('#hourlyGithubPush-heat-map-parent', '#hourlyGithubPush-heat-map', hourlyGithubPushEvents);
        }
    };
    result.updateHourlyGithubPushHeatMap = function () {
        postAjax("hourlyGithubPushEvents", plotHourlyGithubPushEvents, hourlyGithubErrorCallback);
    };
    var plotCorrelationData = function (correlationData) {
        result.correlationData = correlationData;
        result.plotScatterPlot('#correlate-events', correlationData);
    };
    result.updateCorrelationData = function () {
        postAjax("correlate?firstEvent=Develop&secondEvent=Push", plotCorrelationData);
    };
    result.plotGraphs = function (graphs) {
        graphs.forEach(function (graph) {
            result[graph]();
        })
    };

    result.tweetBuildSparkline = function () {
        if (!result.buildEvents) {
            return;
        }
        var totalBuilds = [];
        var sparkbarDataForDays = 14;
        result.buildEvents.map(function (buildEvent) {
            totalBuilds.push(buildEvent.passed + buildEvent.failed);
        });
        totalBuilds = totalBuilds.slice(totalBuilds.length - sparkbarDataForDays, totalBuilds.length);
        console.log("sparking builds:", totalBuilds);
        var sparkBar = window.oneSelf.toSparkBars(totalBuilds);
        var tweetText = sparkBar + " my builds over the last 2 weeks. See yours at app.1self.co";
        var hashTags = ['coding'].join(',');
        $('#tweetMyBuilds').attr('href', "https://twitter.com/share?url=''&hashtags=" + hashTags + "&text=" + tweetText);
        ga('send', 'event', 'tweet_click', 'Build History');
    };

    var generateTweetValues = function (events) {
        var sparkbarDataForDays = 14;
        var defaultTweetValues = _.range(0, sparkbarDataForDays)
            .reverse()
            .map(function (d) {
                return {
                    date: moment().subtract('days', d).format("MM/DD/YYYY"),
                    value: 0
                };
            });
        var tweetValues = defaultTweetValues.map(function (d) {
            var e = _.findWhere(events, {"date": d.date});
            if (e) {
                return e.value;
            }
            return d.value;
        });
        return tweetValues;
    };
    result.tweetWtfSparkline = function () {
        if (!result.wtfEvents) {
            return;
        }
        var tweetValues = generateTweetValues(result.wtfEvents);
        var sparkBar = window.oneSelf.toSparkBars(tweetValues);
        var tweetText = sparkBar + " my WTFs over the last 2 weeks. The only measure of code quality. See yours at app.1self.co";
        var hashTags = ['wtf', 'coding'].join(',');
        $('#tweetMyWtfs').attr('href', "https://twitter.com/share?url=''&hashtags=" + hashTags + "&text=" + tweetText);
        ga('send', 'event', 'tweet_click', 'Hourly WTFs');
    };

    result.tweetHydrationSparkline = function () {
        if (!result.hydrationEvents) {
            return;
        }
        var tweetValues = generateTweetValues(result.hydrationEvents);
        var sparkBar = window.oneSelf.toSparkBars(tweetValues);
        var tweetText = sparkBar + " my hydration levels over the last 2 weeks. See yours at app.1self.co";
        var hashTags = ['hydrate', 'coding'].join(',');
        $('#tweetMyHydration').attr('href', "https://twitter.com/share?url=''&hashtags=" + hashTags + "&text=" + tweetText);
        ga('send', 'event', 'tweet_click', 'Water Intake History');
    };

    result.tweetCaffeineSparkline = function () {
        if (!result.caffeineEvents) {
            return;
        }
        var tweetValues = generateTweetValues(result.caffeineEvents);
        var sparkBar = window.oneSelf.toSparkBars(tweetValues);
        var tweetText = sparkBar + " my caffeine levels over the last 2 weeks. See yours at app.1self.co";
        var hashTags = ['coffee', 'coding'].join(',');
        $('#tweetMyCaffeine').attr('href', "https://twitter.com/share?url=''&hashtags=" + hashTags + "&text=" + tweetText);
        ga('send', 'event', 'tweet_click', 'Caffeine Intake History');
    };

    result.tweetBuildDurationSparkline = function () {
        if (!result.buildDurationEvents) {
            return;
        }
        var tweetValues = generateTweetValues(result.buildDurationEvents);
        var sparkBar = window.oneSelf.toSparkBars(tweetValues);
        var tweetText = sparkBar + " my build duration over the last 2 weeks. See yours at app.1self.co";
        var hashTags = ['buildDuration', 'coding'].join(',');
        $('#tweetMyBuildDuration').attr('href', "https://twitter.com/share?url=''&hashtags=" + hashTags + "&text=" + tweetText);
        ga('send', 'event', 'tweet_click', 'Build Duration History');
    };

    result.tweetActiveEventSparkline = function () {
        if (!result.activeEvents) {
            return;
        }
        var tweetValues = generateTweetValues(result.activeEvents);
        var sparkBar = window.oneSelf.toSparkBars(tweetValues);
        var tweetText = sparkBar + " my+%23programming+activity+over+the+last+2+weeks.+See+yours+at+app.1self.co";
        var hashTags = 'coding';
        var url = "https://twitter.com/intent/tweet?text=" + tweetText + "&hashtags=" + hashTags;
        $('#tweetMyActiveDuration').attr('href', url);
        ga('send', 'event', 'tweet_click', 'Active Programming Duration');
    };
    result.getEventsFor = function (encodedUsername, resource) {
        return $.ajax({
            url: "/quantifieddev/" + resource,
            headers: {
                "Accept": "application/json",
                "Authorization": encodedUsername
            }
        });
    };
    result.getTheirEventsFor = function (encodedUsername, forUsername, resource) {
        return $.ajax({
            url: "/quantifieddev/" + resource,
            data: {
                forUsername: forUsername
            },
            headers: {
                "Accept": "application/json",
                "Authorization": encodedUsername
            }
        });
    };
    var eventsExist = function (events) {
        return events.length > 0;
    };

    result.compareBuildHistories = function (myBuildEvents, theirBuildEvents) {
        if (eventsExist(myBuildEvents[0]) || eventsExist(theirBuildEvents[0])) {
            result.plotComparison("#compare-build-history", myBuildEvents[0], theirBuildEvents[0])
        }
    };
    result.compareActiveEvents = function (myActiveEvents, theirActiveEvents) {
        if (eventsExist(myActiveEvents[0]) || eventsExist(theirActiveEvents[0])) {
            result.plotComparisonForActiveEvents("#compare-active-events", myActiveEvents[0], theirActiveEvents[0])
        }

    };
    result.compareGithubPushCount = function (myHourlyGithubPushCount, theirHourlyGithubPushCount) {
        if (eventsExist(myHourlyGithubPushCount[0]) || eventsExist(theirHourlyGithubPushCount[0])) {
            result.plotHourlyEventDiff('#diff-hourly-github-events', myHourlyGithubPushCount[0], theirHourlyGithubPushCount[0]);
        }
    };
    result.compareDailyGithubPushCount = function (myDailyGithubPushCount, theirDailyGithubPushCount) {
        if (eventsExist(myDailyGithubPushCount[0]) || eventsExist(theirDailyGithubPushCount[0])) {
            result.plotDailyComparison('#daily-github-event-compare', myDailyGithubPushCount[0], theirDailyGithubPushCount[0]);
        }
    };
    var compareIdeActivityEventsSuccessCallback = function (ideActivityEventForCompare) {
        result.plotComparisonAgainstAvgOfRestOfTheWorld("#compare-ide-activity", ideActivityEventForCompare);
    };
    result.updateIdeActivityEventForCompare = function () {
        postAjax("compare/ideActivity", compareIdeActivityEventsSuccessCallback);
    };

    var compareGithubEventsSuccessCallback = function (githubPushEventForCompare) {
        result.plotComparisonAgainstAvgOfRestOfTheWorld("#compare-github-events", githubPushEventForCompare);
    };
    result.updateCompareGithubEvents = function () {
        postAjax("githubPushEventForCompare", compareGithubEventsSuccessCallback);
    };
    var handlePlotComparisonGraphsSuccess = function (myBuildEvents, theirBuildEvents) {
        $("#compare-username-errors").text("");
        result.compareBuildHistories(myBuildEvents, theirBuildEvents)
    };
    result.plotComparisonGraphs = function (theirUsername) {
        var myUsername = $.cookie("_eun");
        if (!(_.isEmpty(theirUsername)) && (theirUsername !== 'undefined')) {
            $("#compare-build-history-parent").show();
            $.when(result.getEventsFor(myUsername, "mydev"), result.getTheirEventsFor(myUsername, theirUsername, "mydev"))
                .done(handlePlotComparisonGraphsSuccess)
                .fail("Error getting build events!");
            $("#compare-active-events-parent").show();
            $.when(result.getEventsFor(myUsername, "myActiveEvents"), result.getTheirEventsFor(myUsername, theirUsername, "myActiveEvents"))
                .done(result.compareActiveEvents)
                .fail("Error getting active events!");
            $("#diff-hourly-github-events-parent").show();
            $.when(result.getEventsFor(myUsername, "hourlyGithubPushEvents"), result.getTheirEventsFor(myUsername, theirUsername, "hourlyGithubPushEvents"))
                .done(result.compareGithubPushCount)
                .fail("Error in comparison of hourly github push events");
            $("#daily-github-event-compare-parent").show();
            $.when(result.getEventsFor(myUsername, "dailyGithubPushEvents"), result.getTheirEventsFor(myUsername, theirUsername, "dailyGithubPushEvents"))
                .done(result.compareDailyGithubPushCount)
                .fail("Error in comparison of hourly github push events");
        }
        result.updateCompareGithubEvents();
        result.updateIdeActivityEventForCompare();
    };

    result.replotGraphs = function () {
        plotBuildEvents(result.buildEvents);
        plotActivity(result.activeEvents);
        plotWtfEvents(result.wtfEvents);
        plotHydrationEvents(result.hydrationEvents);
        plotCaffeineEvents(result.caffeineEvents);
        plotBuildDurationEvents(result.buildDurationEvents);
        plotHourlyBuildEvents(result.hourlyBuildEvents);
        plotHourlyWtfEvents(result.hourlyWtfEvents);
        plotHourlyHydrationEvents(result.hourlyHydrationEvents);
        plotHourlyCaffeineEvents(result.hourlyCaffeineEvents);
        plotHourlyGithubPushEvents(result.hourlyGithubPushEvents);
        plotCorrelationData(result.correlationData);
    };

    return result;
};

window.qd = qd();
