var formatDate = function (date) {
    moment.locale('en', {
        calendar: {
            lastDay: '[Yesterday]',
            sameDay: '[Today]',
            lastWeek: '[Last] dddd[,] LL',
            sameElse: 'ddd ll'
        }
    });
    return moment(date).calendar();
};

var formatTime = function(time) {
    var zeroPad = function(num, width) {
        var an = Math.abs(num);
        var digitCount = 1;
        if(an !== 0){
            digitCount = 1 + Math.floor(Math.log(an) / Math.LN10);
        }
        if (digitCount >= width) {
            return num;
        }
        var zeroString = Math.pow(10, width - digitCount).toString().substr(1);
        return num < 0 ? '-' + zeroString + an : zeroString + an;
    }
    var datetime = moment.utc(time);
    var localDateTime = datetime._d;
    return zeroPad(localDateTime.getHours(), 2) + "." + zeroPad(localDateTime.getMinutes(), 2);
};

var groupEventsByDate = function(events) {
    var dictGroup = function() {
        var groups = {};
        events.forEach(function(event) {
            var date = event.payload.eventDateTime.split('T')[0];
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].unshift(event);
        });
        return groups;
    }
    //String sorting dates - works with current format
    var dateGroups = dictGroup();
    var dates = Object.keys(dateGroups).sort().reverse();

    return dates.map(function(date){
        return {date: formatDate(date), data: dateGroups[date]};
    });
};

var groupSuccessiveEventsByTags = function(events) {
    groups = [];

    var tags = function(event) {
        return event.payload.actionTags.concat(event.payload.objectTags);
    };

    group = [];
    state = tags(events[0]);
    events.forEach(function(event){
        if(_.isEqual(state, tags(event))) {
            group.unshift(event)
        } else {
            groups.unshift(group);
            state = tags(event);
            group = [event];
        }
    });
    groups.unshift(group);
    return groups;
};

var joinTags = function(event) {
    var compose = function(tags) {
        var toTitleCase = function(str) {
            return str.replace(/\w\S*/g, function(txt) {
                return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            });
        };
        return tags.map(function(tag) {
            return toTitleCase(tag)
        }).join(" ");
    };
    return compose(event.payload.objectTags) + " " + compose(event.payload.actionTags);
};

var computeChartUrl = function(event) {
    var findFirstNumericProperty = function(){
        var event_properties = event.payload.properties;
        if(event_properties === undefined){
	    return undefined;
	}

	var keys = Object.keys(event_properties);
        var prop;

        for(i = 0; i < keys.length; i++){
            var val = event_properties[keys[i]];
            if (typeof(val) === "number") {
                prop = keys[i];
                break;
            }
        }

        return prop;
    };

    var isWithinLastWeek = function(date) {
        var now = moment();
        var current = moment(date);
        return now.diff(current, 'days') < 7;
    };

    var operation = "count";
    var prop = findFirstNumericProperty();

    //dirty hack for noiseapp/twitter or show first numeric property if any (for now)
    if(prop === undefined){
        operation = "count";
    } else if (event.payload.objectTags.indexOf("sound") !== -1) {
        operation = "mean(dba)";
    } else if (event.payload.objectTags.indexOf("tweets") !== -1 || event.payload.objectTags.indexOf("tweet") !== -1) {
        operation = "count";
    } else if (event.payload.objectTags.indexOf("follower") !== -1 || event.payload.objectTags.indexOf("following") !== -1) {
        operation = "max(count)";
    } else if (event.payload.objectTags.indexOf("foursquare") !== -1) {
        operation = "count";
    } else if (event.payload.objectTags.indexOf("hackernews") !== -1) {
        operation = "max(points)";
    } else if (event.payload.objectTags.indexOf("reputation") !== -1) {
        operation = "max(points)";
    } else if ((event.payload.objectTags.indexOf("questions") !== -1) && (event.payload.properties["asked"] !== undefined)) {
        operation = "max(asked)";
    } else if ((event.payload.objectTags.indexOf("questions") !== -1) && (event.payload.properties["answered"] !== undefined)) {
        operation = "max(answered)";
    } else if (typeof(prop) !== "undefined") {
        operation = "sum(" + prop + ")";
    }

    var url = "/v1/users/" + username + "/events/" + event.payload.objectTags.join(',') +
        "/" + event.payload.actionTags.join(',') + "/" + operation +
        "/daily/barchart?bgColor=00a2d4";

    if(!isWithinLastWeek(event.payload.eventDateTime)) {
        var current = moment(event.payload.eventDateTime);
        var from = moment(current).subtract(3, 'days').toISOString();
        var to = moment(current).add(3, 'days').toISOString();
        url += "&from=" + from + "&to=" + to;
    }

    return url;
};

var constructRiverData = function(events) {
    var data = [];
    var dateGrouped = groupEventsByDate(events);

    dateGrouped.forEach(function(groupedEvents){
        var riverDateGrouped = {date: groupedEvents['date'], data: []};
        var succesiveGrouped = groupSuccessiveEventsByTags(groupedEvents.data);

        riverDateGrouped['data'] = succesiveGrouped.map(function(group){
            var transformEvent = function(event) {
                var riverEvent = new RiverEvent(event);
                return {
                    title: riverEvent.formatTitle(),
                    time: riverEvent.formatTime(),
                    properties: riverEvent.formatProperties()
                };
            };

            groupTransformedEvents = group.map(function(event) {
                return transformEvent(event);
            });

            riverDetailGrouped = {
                title: joinTags(_.first(group)),
                from: formatTime(_.last(group).payload.eventDateTime),
                to: formatTime(_.first(group).payload.eventDateTime),
                icon: _.first(group).iconUrl || "/img/noimage.png",
                chartUrl: computeChartUrl(_.first(group)),
                events: groupTransformedEvents
            };
            return riverDetailGrouped;
        });
        data.push(riverDateGrouped);
    });
    return data;
};
