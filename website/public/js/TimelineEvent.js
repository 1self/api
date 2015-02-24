(function(){
    var Event = function(evt){
        try{
            var computeName = function(evt){
                return evt.objectTags.join(' ') + ' ' + 
                    evt.actionTags.join(' ');
            },

            getValues = function(evt){
                var properties = JSON.stringify(evt.properties),
                value = properties
                    .replace("{", "")
                    .replace("}","")
                    .replace(/"/g, '');

                return value;
            },

            humanizedValue = function(values){
                var value = "";
                if("" == values.trim()) {
                    non_numeric_metric = true;
                    return value;
                }

                //dirty hack for "duration"
                if("duration" == values.split(':')[0]){
                    var durationString = values.split(":")[1];
                    var duration = moment.duration(parseInt(durationString) * 1000),
                    humanized_value = "";
                    
                    humanized_value += duration.hours() ? duration.hours() + " hour " : "";
                    humanized_value += duration.minutes() ? duration.minutes() + " mins " : "";
                    humanized_value += duration.seconds() ? duration.seconds() + " secs " : "";
                    
                    value = humanized_value;
                }else{
                    var valueString = values.split(",")[0],
                    valueTitle = valueString.split(":")[0],
                    valueCount = parseFloat(valueString.split(":")[1]).toFixed(1);

                    //hack, if its not a number just display the string as it is.
                    if(isNaN(valueCount)){
                        non_numeric_metric = true;
                        valueCount = "'" + valueString.split(":")[1] + "'";
                    }

                    value = valueCount + " " + valueTitle.replace(/-/g, " ");
                }

                return value;
            },

            computeUrl = function(evt){
                //sum on first existing event FOR NOW
                var first_value = values.split(":")[0],
                operation;
                
                if(non_numeric_metric){
                    operation = "count";
                }
                //dirty hack for noiseapp/twitter (for now)
                else if(evt.objectTags.indexOf("sound") !== -1){
                    operation = "mean(dba)";
                } else if(evt.objectTags.indexOf("tweets") !== -1){
                    operation = "count";
                } else {
                    operation = "sum(" + first_value  + ")";
                }

                return "/v1/users/" + username + "/events/" + evt.objectTags.join(',') +
                    "/" + evt.actionTags.join(',') + "/" + operation +
                    "/daily/barchart?bgColor=00a2d4";
            };

            //main
            var non_numeric_metric = false;
            var values = getValues(evt.payload);

            this.name = computeName(evt.payload);
            this.displayValue = humanizedValue(values);
            this.url = computeUrl(evt.payload);

        }catch(e){
            console.log(e.message + "for " + JSON.stringify(evt));
        }
    };

    window.TimelineEvent = Event;
})();
