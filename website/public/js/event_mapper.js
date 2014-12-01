(function(){
    var Event = function(evt){
        this.name = evt.name;
        this.objectTags = evt.objectTags;
        this.actionTags = evt.actionTags;
        this.interestingProperty = evt.interestingProperty;
        this.operation = evt.operation;
    };

    var EventLookup = function(events){
        this.events = events;
    };

    EventLookup.prototype.findByObjectAndActionTags = function(objectTags, actionTags){
        for(var i = 0; i < this.events.length; i++){
            var event = this.events[i],
            eventObjectTags = event.objectTags.join('|').toLowerCase().split('|'),
            eventActionTags = event.actionTags.join('|').toLowerCase().split('|');

            //merge and check length to be same
            var objectTagsMatch = (_.union(eventObjectTags, objectTags).length == objectTags.length);
            var actionTagsMatch = (_.union(eventActionTags, actionTags).length == actionTags.length);

            if(objectTagsMatch && actionTagsMatch){
                return event;
            }
        }

        return null;
    };

    window.OsEvent = Event;
    window.OsEventLookup = EventLookup;
})();


var preDefinedOsEvents = [],
noiseEvent = new OsEvent({name: "Noise", 
                          objectTags: ["soundmeter"],
                          actionTags: ["sample"],
                          interestingProperty: "dba",
                          operation: "mean(dba)"
                         }),

githubPushEvent = new OsEvent({name: "Github Push", 
                               objectTags: ["computer", "software", "source control"],
                               actionTags: ["github", "push"],
                               interestingProperty: "",
                               operation: "count"
                              }),

exercisingEvent = new OsEvent({name: "Exercising", 
                               objectTags: ["self"],
                               actionTags: ["exercise"],
                               interestingProperty: "duration",
                               operation: "sum(duration)"
                              });


preDefinedOsEvents.push(noiseEvent, githubPushEvent);

var os_event_lookup = new OsEventLookup(preDefinedOsEvents);