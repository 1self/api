(function(){
    var Event = function(evt){
        try{
            this.name = this.computeName(evt.payload);
            this.values = this.getValues(evt.payload);
            this.url = this.computeUrl(evt.payload);
        }catch(e){
            console.log(e.message + "for " + JSON.stringify(evt));
        }
    };

    Event.prototype.computeName = function(evt){
        return evt.objectTags.join(' ') + ' ' + 
            evt.actionTags.join(' ');
    };

    Event.prototype.getValues = function(evt){
        var properties = JSON.stringify(evt.properties),
        value = properties
            .replace("{", "")
            .replace("}","")
            .replace(/"/g, '');

        return value;
    };

    Event.prototype.humanizedValue = function(){
        var value = "";

        //dirty hack for "duration"
        if("duration" == this.values.split(':')[0]){
            var durationString = this.values.split(":")[1];
            var duration = moment.duration(parseInt(durationString) * 1000),
            humanized_value = "";
            
            humanized_value += duration.hours() ? duration.hours() + " hour " : "";
            humanized_value += duration.minutes() ? duration.minutes() + " mins " : "";
            humanized_value += duration.seconds() ? duration.seconds() + " secs " : "";
            
            value = humanized_value;
        }else{
            var valueString = this.values.split(",")[0],
            valueTitle = valueString.split(":")[0],
            valueCount = parseFloat(valueString.split(":")[1]).toFixed(1);

            //hack, if its not a number just display the string as it is.
            if(isNaN(valueCount)){
                valueCount = "'" + valueString.split(":")[1] + "'";
            }

            value = valueCount + " " + valueTitle.replace(/-/g, " ");
        }

        return value;
    }

    Event.prototype.computeUrl = function(evt){
        //sum on first existing event FOR NOW
        var first_value = this.values.split(":")[0],
        operation;
        
        //hack for noiseapp (for now)
        if("dba" == operation){
            operation = "mean(dba)";
        }else{
            operation = "sum(" + first_value  + ")";
        }

        return "window.location.href = " + 
            "'/v1/users/" + username + "/events/" + evt.objectTags.join(',') +
            "/" + evt.actionTags.join(',') + "/" + operation +
            "/daily/barchart'";
    };
    
    window.OsEvent = Event;
})();
