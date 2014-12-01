$(document).ready(function(){
    getEvents();
});

function setHeader(xhr) {
    xhr.setRequestHeader('Authorization', eun);
}

var getEvents = function(){
    $.ajax({
        url: '/event',
        type: 'GET',
        dataType: 'json',
        success: insertEvents,
        error: function() { alert('boo!'); },
        beforeSend: setHeader
    });
};

var insertEvents = function(data){
    var dateGroupedEvents = groupEventsByDate(data.reverse()),
    timeline_container = $('#timeline'),
    html = "";

    for(var date in dateGroupedEvents){
        html += '<div class="panel panel-primary">' +
            '<div class="panel-heading">' +
            '<h3 class="panel-title">' + formatDate(date) + '</h3>' +
            '</div>' +
            '<div class="panel-body">' +
            '<ul class="list-group">';

        var listOfEvents = dateGroupedEvents[date];
        for(i = 0; i < listOfEvents.length; i++){
            var os_event = getOsEvent(listOfEvents[i]);
            if(os_event == null){
                console.log("No os event for : " + JSON.stringify(listOfEvents[i]));
                continue;
            }
            html += '<li onclick="' + getVisualizationUrl(listOfEvents[i])  + '" class="list-group-item">' + os_event.name  + '<br/>' +
                os_event.interestingProperty + " : " + listOfEvents[i].payload.properties[os_event.interestingProperty] +
                '</li>';
        }
        
        html += '</ul>' +
            '</div>' +
            '</div>';
    }

    timeline_container.html(html);
};

var groupEventsByDate = function(data){
    var groups = {};

    data.forEach(function(event){
        try{
            var date = event.payload.eventDateTime.split('T')[0];
        }catch(e){
            console.log(JSON.stringify(event));
        }
        if(!groups[date]){
            groups[date] = [];
        }
        
        groups[date].unshift(event);
    });
    
    return groups;
};

var getVisualizationUrl = function(event){
    return "window.location.href = " + 
        "'/v1/users/" + username + "/events/" + event.payload.objectTags.join(',') +
        "/" + event.payload.actionTags.join(',') + "/sum(:dba)" + 
        "/daily/barChart'";
};


var formatDate = function(date){
    moment.locale('en', {
        calendar: {
            lastDay: '[Yesterday]',
            sameDay: '[Today]',
            lastWeek: '[Last] dddd LL',
            sameElse: 'ddd ll'
        }
    });
    
    return moment(date).calendar();
}


var getOsEvent = function(event){
    return os_event_lookup.findByObjectAndActionTags(event.payload.objectTags, event.payload.actionTags);
};