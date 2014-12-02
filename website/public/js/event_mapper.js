(function(){
    var Event = function(evt){
        this.name = evt.name;
        this.objectTags = evt.objectTags;
        this.actionTags = evt.actionTags;
        this.interestingProperty = evt.interestingProperty;
        this.operation = evt.operation;
        this.unitOfMeasurement = evt.unitOfMeasurement;
    };

    Event.prototype.humanizedValue = function(value){
        if("milliseconds" == this.unitOfMeasurement){
            var duration = moment.duration(value),
            humanized_value = "";
            
            humanized_value += duration.hours() ? duration.hours() + " hour " : "";
            humanized_value += duration.minutes() ? duration.minutes() + " mins " : "";
            humanized_value += duration.seconds() ? duration.seconds() + " secs " : "";
            
            return humanized_value;
        }else{
            return value + " " + this.unitOfMeasurement;
        }
    }; 

    var EventLookup = function(events){
        this.events = events;
    };

    EventLookup.prototype.findByObjectAndActionTags = function(objectTags, actionTags){
        for(var i = 0; i < this.events.length; i++){
            var event = this.events[i],
            objectTagsLowercased = objectTags.join('|').toLowerCase().split('|'),
            actionTagsLowercased = actionTags.join('|').toLowerCase().split('|');

            //merge and check length to be same
            var objectTagsMatch = (_.union(event.objectTags, objectTagsLowercased).length == event.objectTags.length);
            var actionTagsMatch = (_.union(event.actionTags, actionTagsLowercased).length == event.actionTags.length);

            if(objectTagsMatch && actionTagsMatch){
                return event;
            }
        }

        return null;
    };

    window.OsEvent = Event;
    window.OsEventLookup = EventLookup;
})();


var preDefinedOsEvents = [
    new OsEvent({name: "Noise Sample", 
                 objectTags: ["soundmeter"],
                 actionTags: ["sample"],
                 interestingProperty: "dba",
                 operation: "mean(dba)",
                 unitOfMeasurement: "decibels"
                }),

    new OsEvent({name: "Github Push", 
                 objectTags: ["computer", "software", "source control"],
                 actionTags: ["github", "push"],
                 interestingProperty: "",
                 operation: "count",
                 unitOfMeasurement: ""
                }),

    new OsEvent({name: "Exercising", 
                 objectTags: ["self"],
                 actionTags: ["exercise"],
                 interestingProperty: "duration",
                 operation: "sum(duration)",
                 unitOfMeasurement: "milliseconds"
                }),

    new OsEvent({name: "Coding", 
                 objectTags: ["self"],
                 actionTags: ["code"],
                 interestingProperty: "duration",
                 operation: "sum(duration)",
                 unitOfMeasurement: "milliseconds"
                }),

    new OsEvent({name: "Commuting", 
                 objectTags: ["self"],
                 actionTags: ["commute"],
                 interestingProperty: "duration",
                 operation: "sum(duration)",
                 unitOfMeasurement: "milliseconds"
                }),

    new OsEvent({name: "Cooking", 
                 objectTags: ["self"],
                 actionTags: ["cook"],
                 interestingProperty: "duration",
                 operation: "sum(duration)",
                 unitOfMeasurement: "milliseconds"
                }),

    new OsEvent({name: "Meditating", 
                 objectTags: ["self"],
                 actionTags: ["meditate"],
                 interestingProperty: "duration",
                 operation: "sum(duration)",
                 unitOfMeasurement: "milliseconds"
                }),

    new OsEvent({name: "Meeting", 
                 objectTags: ["self"],
                 actionTags: ["meet"],
                 interestingProperty: "duration",
                 operation: "sum(duration)",
                 unitOfMeasurement: "milliseconds"
                }),

    new OsEvent({name: "Partying", 
                 objectTags: ["self"],
                 actionTags: ["party"],
                 interestingProperty: "duration",
                 operation: "sum(duration)",
                 unitOfMeasurement: "milliseconds"
                }),

    new OsEvent({name: "Playing Instrument", 
                 objectTags: ["instrument"],
                 actionTags: ["play"],
                 interestingProperty: "duration",
                 operation: "sum(duration)",
                 unitOfMeasurement: "milliseconds"
                }),

    new OsEvent({name: "Playing Games", 
                 objectTags: ["computer", "games"],
                 actionTags: ["play"],
                 interestingProperty: "duration",
                 operation: "sum(duration)",
                 unitOfMeasurement: "milliseconds"
                }),

    new OsEvent({name: "Reading", 
                 objectTags: ["text"],
                 actionTags: ["read"],
                 interestingProperty: "duration",
                 operation: "sum(duration)",
                 unitOfMeasurement: "milliseconds"
                }),

    new OsEvent({name: "Sitting", 
                 objectTags: ["self"],
                 actionTags: ["sit"],
                 interestingProperty: "duration",
                 operation: "sum(duration)",
                 unitOfMeasurement: "milliseconds"
                }),

    new OsEvent({name: "Sleeping", 
                 objectTags: ["self"],
                 actionTags: ["sleep"],
                 interestingProperty: "duration",
                 operation: "sum(duration)",
                 unitOfMeasurement: "milliseconds"
                }),

    new OsEvent({name: "Standing", 
                 objectTags: ["self"],
                 actionTags: ["stand"],
                 interestingProperty: "duration",
                 operation: "sum(duration)",
                 unitOfMeasurement: "milliseconds"
                }),

    new OsEvent({name: "Studying", 
                 objectTags: ["self"],
                 actionTags: ["study"],
                 interestingProperty: "duration",
                 operation: "sum(duration)",
                 unitOfMeasurement: "milliseconds"
                }),

    new OsEvent({name: "Tooth Brushing", 
                 objectTags: ["teeth"],
                 actionTags: ["floss"],
                 interestingProperty: "duration",
                 operation: "sum(duration)",
                 unitOfMeasurement: "milliseconds"
                }),

    new OsEvent({name: "TV Watching", 
                 objectTags: ["tv"],
                 actionTags: ["watch"],
                 interestingProperty: "duration",
                 operation: "sum(duration)",
                 unitOfMeasurement: "milliseconds"
                }),

    new OsEvent({name: "Working", 
                 objectTags: ["self"],
                 actionTags: ["work"],
                 interestingProperty: "duration",
                 operation: "sum(duration)",
                 unitOfMeasurement: "milliseconds"
                }),

    new OsEvent({name: "Writing", 
                 objectTags: ["text"],
                 actionTags: ["write"],
                 interestingProperty: "duration",
                 operation: "sum(duration)",
                 unitOfMeasurement: "milliseconds"
                })
];

var os_event_lookup = new OsEventLookup(preDefinedOsEvents);