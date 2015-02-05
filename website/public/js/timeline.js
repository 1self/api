$(document).ready(function(){
    getEvents();
    
    $('#more_events_button').click(function(){
        ++timeline_page_number;
        $(this).hide();
        getEvents();
    });

    $('#modal_close_button').click(function(){
        $('#display_chart_modal').hide();
    });
});

function setHeader(xhr) {
    xhr.setRequestHeader('Authorization', eun);
}

var timeline_page_number = 1;
var data_fetch_retry_count = 0;
const max_data_fetch_retry_count = 5;

var getEvents = function(){
    $.ajax({
        url: '/event?page=' + timeline_page_number,
        type: 'GET',
        dataType: 'json',
        success: insertEvents,
        error: function() { console.log('Problem while fetching timeline events!'); },
        beforeSend: setHeader
    });
};

var insertEvents = function(data){
    if(0 === data.length){
        if(data_fetch_retry_count >= max_data_fetch_retry_count) return;

        ++timeline_page_number;
        ++data_fetch_retry_count;
        getEvents();
        return;
    }

    data_fetch_retry_count = 0; //reset counter if we have data

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
            var current_event = listOfEvents[i],
            os_event = new OsEvent(current_event);

            html += '<li onclick="openInModal(\'' + os_event.url  + '\');" class="list-group-item"><span class="event_title">' + os_event.name  + '</span>';

            html += '<div class="event_property">' + os_event.displayValue + '</div>';
            
            html += '</li>';
        }
        
        html += '</ul>' +
            '</div>' +
            '</div>';
    }

    timeline_container.append(html);
    $('#more_events_button').show();
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

var openInModal = function(url){
    $('#show_chart_iframe').attr('src', url);
    
    $('#display_chart_modal')
        .css('top', $(document).scrollTop() + 70 + "px")
        .show();
};