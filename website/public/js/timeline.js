var skip = 0;
var limit = 50; // per page 50 records

$(document).ready(function () {
    //getEvents(skip, limit);
    $('#more_events_button').click(function () {
        skip += 50;
        //getEvents(skip, limit);
    });
});


function setHeader(xhr) {
    xhr.setRequestHeader('Authorization', eun);
}

var getEvents = function (skip, limit) {
    $.ajax({
        url: "/v1/users/" + username + "/events?skip=" + skip + "&limit=" + limit,
        type: 'GET',
        dataType: 'json',
        success: renderTimeline,
        error: function () {
            console.error('Problem while fetching timeline events!');
        },
        beforeSend: setHeader
    });
};

var formatDate = function (date) {
    moment.locale('en', {
        calendar: {
            lastDay: '[Yesterday]',
            sameDay: '[Today]',
            lastWeek: '[Last] dddd LL',
            sameElse: 'ddd ll'
        }
    });
    return moment(date).calendar();
};

var formatTime = function(time) {
    var datetime = moment.utc(time);
    return datetime.hour() + "." + datetime.minute();
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
            group.push(event)
        } else {
            groups.push(group);
            state = tags(event);
            group = [event];
        }
    });
    groups.push(group);
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


var constructRiverData = function(events) {
    var data = []
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
                from: formatTime(_.first(group).payload.eventDateTime),
                to: formatTime(_.last(group).payload.eventDateTime),
                icon: _.first(group).iconUrl,
                chartUrl: computeChartUrl(_.first(group)),
                events: groupTransformedEvents
            };
            return riverDetailGrouped;
        });
        data.push(riverDateGrouped);
    });
    return data;
};

var computeChartUrl = function(event) {
    //sum on first existing event FOR NOW
    var first_value = values.split(":")[0],
        operation;

    if (non_numeric_metric) {
        operation = "count";
    }
    //dirty hack for noiseapp/twitter (for now)
    else if (event.payload.objectTags.indexOf("sound") !== -1) {
        operation = "mean(dba)";
    } else if (event.payload.objectTags.indexOf("tweets") !== -1) {
        operation = "count";
    } else {
        operation = "sum(" + first_value + ")";
    }

    return "/v1/users/" + username + "/events/" + event.objectTags.join(',') +
        "/" + event.actionTags.join(',') + "/" + operation +
        "/daily/barchart?bgColor=00a2d4";
};
