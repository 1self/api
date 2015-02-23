var skip = 0;
const limit = 50; // per page 50 records

$(document).ready(function () {
    getEvents(skip, limit);
    $('#more_events_button').click(function () {
        $(this).hide();
        skip += 50;
        getEvents(skip, limit);
    });
    $('#modal_close_button').click(function () {
        $('#display_chart_modal').hide();
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
        success: displayEventsOnTimeline,
        error: function () {
            console.error('Problem while fetching timeline events!');
        },
        beforeSend: setHeader
    });
};

var groupEventsByDate = function (data) {
    var groups = {};

    data.forEach(function (event) {
        try {
            var date = event.payload.eventDateTime.split('T')[0];
        } catch (e) {
            console.log(JSON.stringify(event));
        }
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].unshift(event);
    });

    return groups;
};

var composeComponents = function(components) {
    var composed = '';
    components.forEach(function(component){
        composed += component + '\n';
    });
    return composed;
};

var componentTitle = function(actionTag, from, to, count, logo) {
    var component = '
    <div class="accordian-title-container">
        <img class="accordian-title-logo float-left" src="' + logo+ '">
        <div class="accordian-heading float-left">
            <div class="width-100 center-aligned">
                <h3>'+ actionTag +'</h3>
                <span>From '+ from +' to '+ to +'</span>
             </div>
        </div>
        <span class="counter bold">'+ logo +'</span>
    </div>';
   return component;
};

var componentDetails = function(time, property, value) {
    component = '
    <div class="details">
        <div class="clear-all">
            <h4 class="list-title">Music Listen</h4>
            <div class="time-stamp">'+ time +'</div>
        </div>
        <div class="clear-all">
            <span>'+ property +' :</span>
            <span>&ldquo;'+ value +'&rdquo;</span>  
      </div>
    </div>'
    return component;
};

var componentDetailsList = function(detailComponents) {
    var start = '<div class="clear-all list-container-class" id="list-container">';
    var details = composeComponents(detailComponents);
    var end = "</div>"
    var component = start + details + end;
    return component;
};

var componentGraph = function(graphUrl) {
    var component = '
    <div class="clear-all">
      <div class="accordian-title-logo float-left height-ten-pixle hide-on-mobile"></div>
      <div class="clear-all graph-container-class accordian-heading righ-aligned" id="graph-container" style="display:none">
          
          <iframe src="'+ graphUrl +'" class="graph-iframe">
          </iframe>
      </div>
    </div>'
    return component;
};

var componentContent = function(detailsListComponent, graphComponent) {
    var start = '
    <div>
        <div class="accordian-title-logo float-left height-ten-pixle"></div>
        <div class="accordian-heading float-left">
            <span class="list-graph-toggle-container">
                <a href="#" class="graph-toggle-link border-right list-link active-link">
                    <img src="images/list-icon.png" class="graph-toggle-icon">
                </a>   
                <a href="#" class="graph-toggle-link graph-link"> 
                    <img src="images/graph-icon.png" class="graph-toggle-icon">
                </a> 
            </span>
        </div>'
    var end = '</div>'
    var component = composeComponents([start, detailsListComponent, graphComponent, end]);
    return component;
};

var componentGroup = function(titleComponent, contentComponent) {
    var component = composeComponents([titleComponent, contentComponent]);
    return component;
};


var displayEventsOnTimeline = function (data) {
    if (0 === data.length) {
        return;
    }

    var dateGroupedEvents = groupEventsByDate(data);
    var timeline_container = $('#timeline');
    var html = "";

    for (var date in dateGroupedEvents) {
        html += '<div class="panel panel-primary">' +
            '<div class="panel-heading">' +
            '<h3 class="panel-title">' + formatDate(date) + '</h3>' +
            '</div>' +
            '<div class="panel-body">' +
            '<ul class="list-group">';

        var listOfEvents = dateGroupedEvents[date];

        listOfEvents.forEach(function (current_event) {
            var os_event = new OsEvent(current_event);
            html += '<li onclick="openInModal(\'' + os_event.url + '\');" class="list-group-item"><span class="event_title">' + os_event.name + '</span>';
            html += '<div class="event_property">' + os_event.displayValue + '</div>';
            html += '</li>';
        });

        html += '</ul>' +
            '</div>' +
            '</div>';
    }

    timeline_container.append(html);
    $('#more_events_button').show();
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

var openInModal = function (url) {
    $('#show_chart_iframe').attr('src', url);

    $('#display_chart_modal')
        .css('top', $(document).scrollTop() + 70 + "px")
        .show();
};