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
        var zeroPad = function(num, width) {
            var an = Math.abs(num);
            var digitCount = 1;
            if (an !== 0) {
                digitCount = 1 + Math.floor(Math.log(an) / Math.LN10);
            }
            if (digitCount >= width) {
                return num;
            }
            var zeroString = Math.pow(10, width - digitCount).toString().substr(1);
            return num < 0 ? '-' + zeroString + an : zeroString + an;
        }
        var datetime = moment.utc(this.event.payload.eventDateTime);
        var localDateTime = datetime._d;
        return zeroPad(localDateTime.getHours(), 2) + "." + zeroPad(localDateTime.getMinutes(), 2);
    };

    RiverEvent.prototype.formatProperties = function() {
        var self = this;

        if(self.event.payload.properties === undefined){
            return [{}];
        }

        return Object.keys(self.event.payload.properties).map(function(key) {
            return {
                name: key,
                value: self.event.payload.properties[key]
            };
        });
    };

    return RiverEvent;
}));
