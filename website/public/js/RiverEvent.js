(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof exports === "object") {
        module.exports = factory();
    } else {
        root.RiverEvent = factory();
    }
}(this, function (context) {
    'use strict';

    var RiverEvent = function(event) {
        this.event = event;
        return this;
    }

    RiverEvent.prototype.formatTitle = function() {
        return this.event.payload.actionTags.join(' ');
    };

    RiverEvent.prototype.formatTime = function() {
        var datetime = moment.utc(this.event.payload.eventDateTime);
        return datetime.hour() + "." + datetime.minute();
    };

    RiverEvent.prototype.formatProperties = function() {
        var self = this;
        return Object.keys(self.event.payload.properties).map(function(key) {
            return {
                name: key,
                value: self.event.payload.properties[key]
            };
        });
    };

    return RiverEvent;
}));
