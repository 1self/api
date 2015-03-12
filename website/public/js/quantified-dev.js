var qd = function () {
    var result = {};

    var compare = function (todaysEvents, yesterdayEvents) {
        var difference = todaysEvents - yesterdayEvents;
        var percentChange = (difference / yesterdayEvents) * 100;
        return Math.ceil(percentChange);
    };
    var plotBuildEvents = function (buildEvents) {
        result.buildEvents = buildEvents;
        if (showParentDiv(buildEvents, "#build-history-parent")) {
            result.plotBuildHistory();
        }
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

    var showParentDiv = function (graphData, graphParentTileId) {
        if (graphData.length > 0) {
            $(graphParentTileId).show();
            return true;
        }
        return false;
    };
    result.plotHeatmapWith = function (graphParentTileId, graphTileId, graphData, toolTipText) {
        if (graphData.length > 0) {
            $(graphParentTileId).show();
            result.plotHourlyEventMap(graphTileId, graphData, toolTipText);
        }
    };
    var plotWtfEvents = function (wtfEvents) {
        result.wtfEvents = wtfEvents;
        if (showParentDiv(wtfEvents, "#wtf-history-parent")) {
            var toolTipText = "{{value}} wtf(s)";
            result.plotDashboardBarChart('#wtf-history', wtfEvents, '#dd2649', 'WTF Count', toolTipText);
        }
    };
    var plotNoiseEvents = function (noiseEvents) {
        result.noiseEvents = noiseEvents;
        if (showParentDiv(noiseEvents, "#noise-graph-parent")) {
            var toolTipText = "{{value}} dbspl";
            result.plotDashboardBarChart('#noise-graph', noiseEvents, '#e93e5a', 'Noise Count', toolTipText);
        }
    };
    var plotTweetEvents = function (tweetEvents) {
        result.tweetEvents = tweetEvents;
        if (showParentDiv(tweetEvents, "#tweet-graph-parent")) {
            var toolTipText = "{{value}} tweets";
            result.plotDashboardBarChart('#tweet-graph', tweetEvents, '#e93e5a', 'Tweet Count', toolTipText);
        }
    };

    var plotSongsByDayEvents = function (songsByDayEvents) {
        result.songsByDayEvents = songsByDayEvents;
        if (showParentDiv(songsByDayEvents, "#songsbyday-graph-parent")) {
            var toolTipText = "{{value}} songs listened";
            result.plotDashboardBarChart('#songsbyday-graph', songsByDayEvents, '#e93e5a', 'Songs listened', toolTipText);
        }
    };

    var plotStepsEvents = function (stepsEvents) {
        result.stepsEvents = stepsEvents;
        if (showParentDiv(stepsEvents, "#steps-graph-parent")) {
            var toolTipText = "{{value}} steps";
            result.plotDashboardBarChart('#steps-graph', stepsEvents, '#e93e5a', 'Steps walked', toolTipText);
        }
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
        if (showParentDiv(hydrationEvents, "#hydration-history-parent")) {
            var toolTipText = "{{value}} glass(es)";
            result.plotDashboardBarChart('#hydration-history', hydrationEvents, '#00a2d4', 'Hydration Count', toolTipText);
        }
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
        if (showParentDiv(caffeineEvents, "#caffeine-history-parent")) {
            var toolTipText = "{{value}} cup(s)";
            result.plotDashboardBarChart('#caffeine-history', caffeineEvents, '#e93d31', 'Caffeine Count', toolTipText);
        }
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
        if (showParentDiv(buildDurationEvents, "#buildDuration-history-parent")) {
            var toolTipText = "{{value}} sec(s)";
            var convertMillisToSeconds = function (data) {
                return _.each(data, function (d) {
                    d.value = d.value / 1000;
                });
            };
            var events = convertMillisToSeconds(buildDurationEvents);
            result.plotDashboardBarChart('#buildDuration-history', events, '#e93e5a', 'Build Duration(seconds)', toolTipText);
        }
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
        if (showParentDiv(activeEvents, "#active-event-history-parent")) {
            var toolTipText = "{{value}} min(s)";
            var convertSecondsToMinutes = function (data) {
                return data.map(function (d) {
                    return {date: d.date, value: (d.value / 60)};
                });
            };
            var events = convertSecondsToMinutes(activeEvents);
            result.plotDashboardBarChart('#active-event-history', events, '#e93e5a', 'Activity Duration(mins)', toolTipText);
        }
    };
    result.updateActiveEvents = function () {
        postV1Ajax("Computer,Software", "Develop", "sum(duration)", "daily")
            .done(plotActivity)
            .fail(function (error) {
                console.error("Error is: " + error);
            });
    };
    var plotTwitterFollowerCount = function (twitterFollowerCountEvents) {
        result.twitterFollowerCountEvents = twitterFollowerCountEvents;
        if (showParentDiv(twitterFollowerCountEvents, '#twitter-follower-count-graph-parent')) {
            result.plotDashboardLineChart('#twitter-follower-count-graph', twitterFollowerCountEvents, "#00a2d4", 'No of Twitter Followers');
        }
    };
    result.updateTwitterFollowerCount = function () {
        postV1Ajax("internet,social-network,twitter,social-graph,inbound,follower", "sample", "max(count)", "daily")
            .done(plotTwitterFollowerCount)
            .fail(function (error) {
                console.error("Error is: " + error);
            });
    };
    var plotTwitterFollowingCount = function (twitterFollowingCountEvents) {
        result.twitterFollowingCountEvents = twitterFollowingCountEvents;
        if (showParentDiv(twitterFollowingCountEvents, '#twitter-following-count-graph-parent')) {
            result.plotDashboardLineChart('#twitter-following-count-graph', twitterFollowingCountEvents, "#00a2d4", 'No of Twitter Followings');
        }
    };
    result.updateTwitterFollowingCount = function () {
        postV1Ajax("internet,social-network,twitter,social-graph,outbound,following", "sample", "max(count)", "daily")
            .done(plotTwitterFollowingCount)
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
        var toolTipText = "{{value}} builds";
        result.plotHeatmapWith("#hourlyBuild-heat-map-parent", '#hourlyBuild-heat-map', hourlyBuildEvents, toolTipText);
    };

    var plotHourlyStepsEvents = function (hourlyStepsEvents) {
        result.hourlyStepsEvents = hourlyStepsEvents;
        var eventCount = getEventCountForHourlyEvents(hourlyStepsEvents);
        $('#totalStepsCount').html("Total No of Steps Events : " + eventCount);
        var toolTipText = "{{value}} steps";
        result.plotHeatmapWith("#hourlySteps-heat-map-parent", '#hourlySteps-heat-map', hourlyStepsEvents, toolTipText);
    };

    var plotHourlyTracksEvents = function (hourlyTracksEvents) {
        result.hourlyTracksEvents = hourlyTracksEvents;
        var eventCount = getEventCountForHourlyEvents(hourlyTracksEvents);
        $('#totalTracksCount').html("Total No of Tracks Events : " + eventCount);
        var toolTipText = "{{value}} tracks";
        result.plotHeatmapWith("#hourlyTracks-heat-map-parent", '#hourlyTracks-heat-map', hourlyTracksEvents, toolTipText);
    };

    result.updateHourlyBuildHeatMap = function () {
        postV1Ajax("Computer,Software", "Build,Finish", "count", "hourOfDay")
            .done(plotHourlyBuildEvents)
            .fail(function (error) {
                console.error("Error is: " + error);
            });
    };

    result.updateHourlyStepsHeatMap = function () {
        postV1Ajax("steps", "walked", "sum(numberOfSteps)", "hourOfDay")
            .done(plotHourlyStepsEvents)
            .fail(function (error) {
                console.log("Error is: " + error);
            })
    };

    result.updateHourlyTracksHeatMap = function () {
        postV1Ajax("music", "listen", "count", "hourOfDay")
            .done(plotHourlyTracksEvents)
            .fail(function (error) {
                console.log("Error is: " + error);
            });
    };

    var plotHourlyWtfEvents = function (hourlyWtfEvents) {
        result.hourlyWtfEvents = hourlyWtfEvents;
        var eventCount = getEventCountForHourlyEvents(hourlyWtfEvents);
        $('#totalWtfCount').html("Total No of WTF Events : " + eventCount);
        var toolTipText = "{{value}} wtfs";
        result.plotHeatmapWith("#hourlyWtf-heat-map-parent", '#hourlyWtf-heat-map', hourlyWtfEvents, toolTipText);
    };
    result.updateHourlyWtfHeatMap = function () {
        postV1Ajax("Computer,Software", "wtf", "count", "hourOfDay")
            .done(plotHourlyWtfEvents)
            .fail(function (error) {
                console.log("Error is: " + error);
            });
    };
    var plotHourlyHydrationEvents = function (hourlyHydrationEvents) {
        result.hourlyHydrationEvents = hourlyHydrationEvents;
        var eventCount = getEventCountForHourlyEvents(hourlyHydrationEvents);
        $('#totalHydrationCount').html("Total glasses of Water : " + eventCount);
        var toolTipText = "{{value}} glasses";
        result.plotHeatmapWith("#hourlyHydration-heat-map-parent", '#hourlyHydration-heat-map', hourlyHydrationEvents, toolTipText);
    };
    result.updateHourlyHydrationHeatMap = function () {
        postV1Ajax("Drink,Water", "drink", "count", "hourOfDay")
            .done(plotHourlyHydrationEvents)
            .fail(function (error) {
                console.error("Error is: " + error);
            });
    };
    var plotHourlyCaffeineEvents = function (hourlyCaffeineEvents) {
        result.hourlyCaffeineEvents = hourlyCaffeineEvents;
        var eventCount = getEventCountForHourlyEvents(hourlyCaffeineEvents);
        $('#totalCaffeineCount').html("Total cups of Coffee : " + eventCount);
        var toolTipText = "{{value}} cups";
        result.plotHeatmapWith('#hourlyCaffeine-heat-map-parent', '#hourlyCaffeine-heat-map', hourlyCaffeineEvents, toolTipText);
    };
    result.updateHourlyCaffeineHeatMap = function () {
        postV1Ajax("Drink,Coffee", "drink", "count", "hourOfDay")
            .done(plotHourlyCaffeineEvents)
            .fail(function (error) {
                console.error("Error is: " + error);
            });
    };
    var plotHourlyGithubPushEvents = function (hourlyGithubPushEvents) {
        result.hourlyGithubPushEvents = hourlyGithubPushEvents;
        var eventCount = getEventCountForHourlyEvents(hourlyGithubPushEvents);
        $('#totalPushCount').html("Total No of Push Events : " + eventCount);
        if (eventCount === 0) {
            $("#connect_to_github_btn").show();
        } else {
            var toolTipText = "{{value}} pushes";
            result.plotHeatmapWith('#hourlyGithubPush-heat-map-parent', '#hourlyGithubPush-heat-map', hourlyGithubPushEvents, toolTipText);
        }
    };
    result.updateHourlyGithubPushHeatMap = function () {
        postV1Ajax("Computer,Software,Source Control", "Push", "count", "hourOfDay")
            .done(plotHourlyGithubPushEvents)
            .fail(function (error) {
                console.error("Error is: " + error);
            });
    };

    var plotIDEActivityVsGithubPushesCorrelationData = function (iDEActivityVsGithubPushesCorrelationData) {
        result.iDEActivityVsGithubPushesCorrelationData = iDEActivityVsGithubPushesCorrelationData;
        var toolTipText = "Active programming duration of {{xValue}} mins with {{yValue}} github push(es)";
        result.plotScatterPlot('#correlate-events', iDEActivityVsGithubPushesCorrelationData, 'activeTimeInMinutes', 'githubPushEventCount', "IDE Activity In Minutes", "Push Count", toolTipText);
    };

    var plotStepsVsTracksCorrelationData = function (stepsVsTracksCorrelationData) {
        result.stepsVsTracksCorrelationData = stepsVsTracksCorrelationData;
        var toolTipText = "{{xValue}} steps walked with {{yValue}} tracks listened";
        result.plotScatterPlot('#correlate-steps-vs-tracks-events', stepsVsTracksCorrelationData, 'stepSum', 'musicListenCount', 'Steps', "Count of Tracks Listened", toolTipText);
    };

    var plotIDEActivityVsTracksCorrelationData = function (iDEActivityVsTracksCorrelationData) {
        result.iDEActivityVsTracksCorrelationData = iDEActivityVsTracksCorrelationData;
        var toolTipText = "Active programming duration of {{xValue}} mins with {{yValue}} tracks listened";
        result.plotScatterPlot('#correlate-ideactivity-vs-tracks-events', iDEActivityVsTracksCorrelationData, 'activeTimeInMinutes', 'musicListenCount', 'IDE Activity In Minutes', "Count of Tracks Listened", toolTipText);
    };

    result.updateCorrelationData = function () {
        postAjax("correlate?firstEvent=Develop&secondEvent=Push", plotIDEActivityVsGithubPushesCorrelationData);
    };

    result.updateStepsVsTracksCorrelationData = function () {
        postAjax("correlate/steps/trackcount", plotStepsVsTracksCorrelationData);
    };

    result.updateIDEActivityVsTracksCorrelationData = function () {
        postAjax("correlate/ideactivity/trackcount", plotIDEActivityVsTracksCorrelationData);
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
        plotHourlyStepsEvents(result.hourlyStepsEvents);
        plotHourlyTracksEvents(result.hourlyTracksEvents);
        plotHourlyWtfEvents(result.hourlyWtfEvents);
        plotHourlyHydrationEvents(result.hourlyHydrationEvents);
        plotHourlyCaffeineEvents(result.hourlyCaffeineEvents);
        plotHourlyGithubPushEvents(result.hourlyGithubPushEvents);
        plotIDEActivityVsGithubPushesCorrelationData(result.iDEActivityVsGithubPushesCorrelationData);
        plotStepsVsTracksCorrelationData(result.stepsVsTracksCorrelationData);
        plotIDEActivityVsTracksCorrelationData(result.iDEActivityVsTracksCorrelationData);
    };

    return result;
};

window.qd = qd();
