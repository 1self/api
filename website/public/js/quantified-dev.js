var qd = function () {
    var result = {};

    result.showNoDataMessage = true;
    result.hideMessage = function () {
        result.showNoDataMessage = false;
    };

    result.initProgress = function (total, completed_fn) {
        result['total'] = total;
        result['progress'] = 0;

        if (typeof completed_fn !== 'undefined') {
            result['completed'] = completed_fn;
        }
    };

    result.updateProgress = function () {
        result['progress'] += 1;
        var progress = Math.ceil((result['progress'] / result['total']) * 100);
        if (progress >= 100) {
            if (typeof result['completed'] !== 'undefined') {
                result['completed']();
            }
        }

        return progress;
    };

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
            .always(result.updateProgress)
    };

    var showParentDiv = function (graphData, graphParentTileId) {
        if (graphData.length > 0) {
            result.hideMessage();
            $(graphParentTileId).show();
            return true;
        }
        return false;
    };

    result.plotHeatmapWith = function (graphParentTileId, graphTileId, graphData, toolTipText) {
        if (graphData === undefined) {
            console.log('graph data for ' + graphTileId + ' is empty');
            return;
        }

        if (graphData.length > 0) {
            result.hideMessage();
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
            .always(result.updateProgress)
            .fail(function (error) {
                console.error("Error is: " + error);
            });
    };

    result.updateTweetModel = function () {
        postV1Ajax("twitter,tweet", "publish", "count", "daily")
            .done(plotTweetEvents)
            .always(result.updateProgress)
            .fail(function (error) {
                console.error("Error is: " + error);
            });
    };

    result.updateSongsByDayModel = function () {
        postV1Ajax("music", "listen", "count", "daily")
            .done(plotSongsByDayEvents)
            .always(result.updateProgress)
            .fail(function (error) {
                console.error("Error is: " + error);
            });
    };

    result.updateStepsModel = function () {
        postV1Ajax("steps", "walked", "sum(numberOfSteps)", "daily")
            .done(plotStepsEvents)
            .always(result.updateProgress)
            .fail(function (error) {
                console.error("Error is: " + error);
            });
    };

    result.updateWTFModel = function () {
        postV1Ajax("Computer,Software", "wtf", "count", "daily")
            .done(plotWtfEvents)
            .always(result.updateProgress)
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
            .always(result.updateProgress)
            .fail(function (error) {
                console.error("Error is: " + error);
            });
    };
    var convertSecondsToMinutes = function (data, value) {
        data.forEach(function (d) {
            return d[value] = d[value] / 60;
        });
    };
    var plotActivity = function (activeEvents) {
        result.activeEvents = activeEvents;
        if (showParentDiv(activeEvents, "#active-event-history-parent")) {
            var toolTipText = "{{value}} min(s)";
            convertSecondsToMinutes(activeEvents, "value");
            result.plotDashboardBarChart('#active-event-history', activeEvents, '#e93e5a', 'Activity Duration(mins)', toolTipText);
        }
    };
    result.updateActiveEvents = function () {
        postV1Ajax("Computer,Software", "Develop", "sum(duration)", "daily")
            .done(plotActivity)
            .always(result.updateProgress)
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
            .always(result.updateProgress)
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
            .always(result.updateProgress)
            .fail(function (error) {
                console.error("Error is: " + error);
            });
    };

    var getEventCountForHourlyEvents = function (events) {
        return _.reduce(_.map(events, function (event) {
            return event.value;
        }), function (totalEventCount, eventCount) {
            return totalEventCount + eventCount;
        }, 0);
    };

    var plotHourlyBuildEvents = function (hourlyBuildEvents) {
        result.hourlyBuildEvents = hourlyBuildEvents;
        var eventCount = getEventCountForHourlyEvents(hourlyBuildEvents);
        $('#totalBuildCount').html("Total No of Builds : " + eventCount);
        var toolTipText = "{{value}} builds";
        result.plotHeatmapWith("#hourlyBuild-heat-map-parent", '#hourlyBuild-heat-map', hourlyBuildEvents, toolTipText);
    };

    var plotHourlyStepsEvents = function (hourlyStepsEvents) {
        result.hourlyStepsEvents = hourlyStepsEvents;
        var eventCount = getEventCountForHourlyEvents(hourlyStepsEvents);
        $('#totalStepsCount').html("Total No of Steps Walked : " + eventCount);
        var toolTipText = "{{value}} steps";
        result.plotHeatmapWith("#hourlySteps-heat-map-parent", '#hourlySteps-heat-map', hourlyStepsEvents, toolTipText);
    };

    var plotHourlyTracksEvents = function (hourlyTracksEvents) {
        result.hourlyTracksEvents = hourlyTracksEvents;
        var eventCount = getEventCountForHourlyEvents(hourlyTracksEvents);
        $('#totalTracksCount').html("Total No of Songs Listened : " + eventCount);
        var toolTipText = "{{value}} tracks";
        result.plotHeatmapWith("#hourlyTracks-heat-map-parent", '#hourlyTracks-heat-map', hourlyTracksEvents, toolTipText);
    };

    result.updateHourlyBuildHeatMap = function () {
        postV1Ajax("Computer,Software", "Build,Finish", "count", "hourOfDay")
            .done(plotHourlyBuildEvents)
            .always(result.updateProgress)
            .fail(function (error) {
                console.error("Error is: " + error);
            });
    };

    result.updateHourlyStepsHeatMap = function () {
        postV1Ajax("steps", "walked", "sum(numberOfSteps)", "hourOfDay")
            .done(plotHourlyStepsEvents)
            .always(result.updateProgress)
            .fail(function (error) {
                console.log("Error is: " + error);
            })
    };

    result.updateHourlyTracksHeatMap = function () {
        postV1Ajax("music", "listen", "count", "hourOfDay")
            .done(plotHourlyTracksEvents)
            .always(result.updateProgress)
            .fail(function (error) {
                console.log("Error is: " + error);
            });
    };

    var plotHourlyWtfEvents = function (hourlyWtfEvents) {
        result.hourlyWtfEvents = hourlyWtfEvents;
        var eventCount = getEventCountForHourlyEvents(hourlyWtfEvents);
        $('#totalWtfCount').html("Total No of WTFs : " + eventCount);
        var toolTipText = "{{value}} wtfs";
        result.plotHeatmapWith("#hourlyWtf-heat-map-parent", '#hourlyWtf-heat-map', hourlyWtfEvents, toolTipText);
    };
    result.updateHourlyWtfHeatMap = function () {
        postV1Ajax("Computer,Software", "wtf", "count", "hourOfDay")
            .done(plotHourlyWtfEvents)
            .always(result.updateProgress)
            .fail(function (error) {
                console.log("Error is: " + error);
            });
    };
    var plotHourlyGithubPushEvents = function (hourlyGithubPushEvents) {
        result.hourlyGithubPushEvents = hourlyGithubPushEvents;
        var eventCount = getEventCountForHourlyEvents(hourlyGithubPushEvents);
        $('#totalPushCount').html("Total No of Pushes : " + eventCount);
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
            .always(result.updateProgress)
            .fail(function (error) {
                console.error("Error is: " + error);
            });
    };

    var plotIDEActivityVsGithubPushesCorrelationData = function (iDEActivityVsGithubPushesCorrelationData) {
        if (iDEActivityVsGithubPushesCorrelationData.length === 0) {
            result.updateProgress();
            return;
        }
        convertSecondsToMinutes(iDEActivityVsGithubPushesCorrelationData, "value1");
        result.iDEActivityVsGithubPushesCorrelationData = iDEActivityVsGithubPushesCorrelationData;
        result.hideMessage();
        $("#correlate-events-parent").show();
        var toolTipText = "Active programming duration of {{xValue}} mins with {{yValue}} github push(es)";
        result.plotScatterPlot('#correlate-events', iDEActivityVsGithubPushesCorrelationData, "IDE Activity In Minutes", "Push Count", toolTipText);
        result.updateProgress();
    };

    var plotStepsVsTracksCorrelationData = function (stepsVsTracksCorrelationData) {
        result.stepsVsTracksCorrelationData = stepsVsTracksCorrelationData;
        if (stepsVsTracksCorrelationData.length === 0) {
            result.updateProgress();
            return;
        }
        result.hideMessage();
        $("#correlate-steps-vs-tracks-events-parent").show();
        var toolTipText = "{{xValue}} steps walked with {{yValue}} tracks listened";
        result.plotScatterPlot('#correlate-steps-vs-tracks-events', stepsVsTracksCorrelationData, 'Steps', "Count of Tracks Listened", toolTipText);
        result.updateProgress();
    };

    var plotIDEActivityVsTracksCorrelationData = function (iDEActivityVsTracksCorrelationData) {
        if (iDEActivityVsTracksCorrelationData.length === 0) {
            result.updateProgress();
            return;
        }
        convertSecondsToMinutes(iDEActivityVsTracksCorrelationData, "value1");
        result.iDEActivityVsTracksCorrelationData = iDEActivityVsTracksCorrelationData;
        result.hideMessage();
        $('#correlate-ideactivity-vs-tracks-events-parent').show();
        var toolTipText = "Active programming duration of {{xValue}} mins with {{yValue}} tracks listened";
        result.plotScatterPlot('#correlate-ideactivity-vs-tracks-events', iDEActivityVsTracksCorrelationData, 'IDE Activity In Minutes', "Count of Tracks Listened", toolTipText);
        result.updateProgress();
    };

    var plotTwitterFollowersVsTweetsCorrelationData = function (twitterFollowersVsTweetsCorrelationData){
        if (twitterFollowersVsTweetsCorrelationData.length === 0) {
            result.updateProgress();
            return;
        }
        result.twitterFollowersVsTweetsCorrelationData = twitterFollowersVsTweetsCorrelationData;
        result.hideMessage();
        $('#correlate-twitter-followers-vs-tweets-parent').show();
        var toolTipText = "{{xValue}} Twitter followers with {{yValue}} tweets";
        result.plotScatterPlot('#correlate-twitter-followers-vs-tweets', twitterFollowersVsTweetsCorrelationData, 'Twitter Followers', "Number of tweets", toolTipText);
        result.updateProgress();
    };

    result.updateCorrelationData = function () {
        postV1CorrelateAjax("daily", "Computer,Software/Develop/sum(duration)", "Computer,Software,Source Control/Github,Push/count")
            .done(plotIDEActivityVsGithubPushesCorrelationData)
            .fail(function (err) {
                console.error("Error fetching correlation data: " + err)
            });
    };

    result.updateStepsVsTracksCorrelationData = function () {
        postV1CorrelateAjax("daily", "steps/walked/sum(numberOfSteps)", "music/listen/count")
            .done(plotStepsVsTracksCorrelationData)
            .fail(function (err) {
                console.error("Error fetching correlation data: " + err)
            });
    };

    result.updateIDEActivityVsTracksCorrelationData = function () {
        postV1CorrelateAjax("daily", "Computer,Software/Develop/sum(duration)", "music/listen/count")
            .done(plotIDEActivityVsTracksCorrelationData)
            .fail(function (err) {
                console.error("Error fetching correlation data: " + err)
            });
    };

    result.updateTwitterFollowersVsTweetsCorrelationData = function () {
        postV1CorrelateAjax("daily","internet,social-network,twitter,social-graph,inbound,follower/sample/max(count)", "twitter,tweet/publish/count")
            .done(plotTwitterFollowersVsTweetsCorrelationData)
            .fail(function (err) {
                console.error("Error fetching correlation data: " + err)
            });
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
                .always(result.updateProgress)
                .fail("Error getting build events!");
            $("#compare-active-events-parent").show();
            $.when(result.getEventsFor(myUsername, "myActiveEvents"), result.getTheirEventsFor(myUsername, theirUsername, "myActiveEvents"))
                .done(result.compareActiveEvents)
                .always(result.updateProgress)
                .fail("Error getting active events!");
            $("#diff-hourly-github-events-parent").show();
            $.when(result.getEventsFor(myUsername, "hourlyGithubPushEvents"), result.getTheirEventsFor(myUsername, theirUsername, "hourlyGithubPushEvents"))
                .done(result.compareGithubPushCount)
                .always(result.updateProgress)
                .fail("Error in comparison of hourly github push events");
            $("#daily-github-event-compare-parent").show();
            $.when(result.getEventsFor(myUsername, "dailyGithubPushEvents"), result.getTheirEventsFor(myUsername, theirUsername, "dailyGithubPushEvents"))
                .done(result.compareDailyGithubPushCount)
                .always(result.updateProgress)
                .fail("Error in comparison of hourly github push events");
        }
        result.updateCompareGithubEvents();
        result.updateIdeActivityEventForCompare();
    };

    result.replotGraphs = function () {
        plotBuildEvents(result.buildEvents);
        plotActivity(result.activeEvents);
        plotWtfEvents(result.wtfEvents);
        plotBuildDurationEvents(result.buildDurationEvents);
        plotHourlyBuildEvents(result.hourlyBuildEvents);
        plotHourlyStepsEvents(result.hourlyStepsEvents);
        plotHourlyTracksEvents(result.hourlyTracksEvents);
        plotHourlyWtfEvents(result.hourlyWtfEvents);
        plotHourlyGithubPushEvents(result.hourlyGithubPushEvents);
        plotIDEActivityVsGithubPushesCorrelationData(result.iDEActivityVsGithubPushesCorrelationData);
        plotStepsVsTracksCorrelationData(result.stepsVsTracksCorrelationData);
        plotIDEActivityVsTracksCorrelationData(result.iDEActivityVsTracksCorrelationData);
        plotTwitterFollowersVsTweetsCorrelationData(result.twitterFollowersVsTweetsCorrelationData);
    };

    return result;
};

window.qd = qd();
