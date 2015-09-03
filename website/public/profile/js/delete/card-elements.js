// Set up moment locale
moment.locale('en', {
    calendar : {
        lastDay : '[Yesterday at] LT',
        sameDay : '[Today at] LT',
        nextDay : '[Tomorrow at] LT',
        lastWeek : 'dddd [at] LT',
        nextWeek : '[next] dddd [at] LT',
        sameElse : 'dddd ll'
    }
});

function markCardRead(username, cardElem, cardReloadCount) {

    var cardId = cardElem.getAttribute('cardId');
    if (cardId) {
        var now = new Date();

        var apiUrl = API_HOST + "/v1/users/" + username + "/cards/" + cardId;

        var viewDuration = now.getTime() - cardElem.cardVisibleAt;

        var dataBody = {   "read" : true, 
                            "readInfo" : 
                                            { 
                                                viewDuration:       viewDuration,
                                                cardIndex:          +cardElem.getAttribute('cardIndex'),
                                                cardReloadCount:    cardReloadCount
                                            }
                        };

        console.log('markCardRead url:', apiUrl, ", dataBody: ", dataBody);

        if (!offline) {
            $.ajax({
                        url: apiUrl,
                        data: JSON.stringify(dataBody),
                        type: "PATCH",
                        contentType: "application/json"

            }).done(function (data) {
                console.log('markCardRead', username, cardId, data);

            }).fail(function (data) {
                console.log('ERROR markCardRead', username, cardId, data);
            });
        }
    }
}

function createCardText(cardData) {
    var cardText = '';
    var colour = getPrimaryColour(cardData.dataSource);

    if (cardData.type === "top10" || cardData.type === "bottom10") {

        var template1 = '{{value}} {{action_pl}}<br>Your {{comparitor}} in {{eventPeriod}} {{comparisonPeriod}}'; // e.g. [Yesterday]: [6th] [fewest] [commit]s in [a day] [ever]
        var template2 = '{{value}} {{action_pp}} {{property}}<br>Your {{comparitor}} in {{eventPeriod}} {{comparisonPeriod}}'; // [Yesterday]: [6th] [most] [commit]ted [file changes] in [a day] [ever]
        var template3 = '{{value}} {{objects}} {{action_pl}}<br>Your {{comparitor}} in {{eventPeriod}} {{comparisonPeriod}}'; // [Yesterday]: [6th] [fewest] [music track] [listen]s in [a day] [ever]
        // var template4 = '{{comparitor}} {{action_pl}} to {{property}} in {{eventPeriod}} {{comparisonPeriod}}'; // [Yesterday]: [6th] [fewest] [listen]s [to Royksopp] in [a day] [ever]
        // var template5 = '{{comparitor}} {{objects}} {{property}} in {{eventPeriod}} {{comparisonPeriod}}'; // [Yesterday]: [6th] [fewest] [computer desktop] [all distracting percent] in [a day] [ever]
        var template6 = '{{value}} {{action_pl}} to {{property}}<br>Your {{comparitor}} in {{eventPeriod}} {{comparisonPeriod}}'; // [Yesterday]: [13] [listens] to [Four Tet]<br>Your [6th] [fewest] in [a day]
        var template7 = '{{value}} of your {{objects}} was {{property}}<br>Your {{comparitor}} in {{eventPeriod}} {{comparisonPeriod}}<br><span class="infoLink" style="color:{{colour}}"><i class="fa fa-info-circle"></i> <a style="color:{{colour}}" onclick="logInfoClick(this);" href="https://www.rescuetime.com/dashboard/for/the/day/of/{{cardDate}}" target="_blank">More info at RescueTime.com</a></span>'; // [Yesterday]: [1.2%] of your [computer use] was [business]<br>Your [6th] [fewest] in [a day]
        var template8 = '{{value}} {{property}}<br>Your {{comparitor}} in {{eventPeriod}} {{comparisonPeriod}}'; // [Yesterday]: [2609] [steps]<br>Your [6th] [fewest] in [a day]
        var template9 = '{{value}} {{objects}} {{property}}<br>Your {{comparitor}} in {{eventPeriod}} {{comparisonPeriod}}'; // [Yesterday]: [34] [google] [visits]<br>Your [6th] [fewest] in [a day]

        var templateDefault = '{{value}} {{{objects}}} {{{action_pp}}} {{{property}}}<br>Your {{comparitor}} in {{eventPeriod}} {{comparisonPeriod}}'; // [Yesterday]: [1.2] {objects} {actions} {properties}<br>Your [6th] [fewest] in [a day]


        var propertiesObj = buildPropertiesTextAndGetValue(cardData.properties.sum);

        var supplantObject = {
            eventDate: stripAtDetail(dateRangetext(cardData.startRange, cardData.endRange)),
            comparitor: createComparitorText(cardData.position, cardData.type),
            eventPeriod: "a day",
            comparisonPeriod: "",
            colour: colour,
            value: propertiesObj.value
        };


        if (cardData.actionTags[0] === "commit" || cardData.actionTags[1] === "push") {
            if (cardData.properties.sum.__count__) {
                supplantObject.action_pl = displayTags(pluralise(cardData.actionTags));
                cardText = template1.supplant(supplantObject);
                // console.log("template1");
            } else {
                supplantObject.action_pp = displayTags(pastParticiple(cardData.actionTags));
                supplantObject.property = propertiesObj.propertiesText;
                cardText = template2.supplant(supplantObject);
                // console.log("template2", cardData.actionTags);
            }
        } else if (cardData.actionTags[0] === "listen") {
            if (cardData.properties.sum.__count__) {
                supplantObject.action_pl = customFormatActionTags(displayTags(cardData.actionTags));
                supplantObject.objects = customFormatObjTags(displayTags(cardData.objectTags));
                cardText = template3.supplant(supplantObject);
                // console.log("template3");
            } else {
                supplantObject.action_pl = displayTags(pluralise(cardData.actionTags));
                supplantObject.property = propertiesObj.propertiesText;
                cardText = template6.supplant(supplantObject);
                // console.log("template6");
            }
        } else if (cardData.actionTags[0] === "use") {
            supplantObject.property = "&quot;" + propertiesObj.propertiesText + "&quot;";
            supplantObject.objects = customFormatObjTags(displayTags(cardData.objectTags));
            supplantObject.cardDate = cardData.cardDate;
            cardText = template7.supplant(supplantObject);
            // console.log("template7", cardData.actionTags);

        } else if (cardData.actionTags[0] === "develop") {
            if (cardData.chart.indexOf('.duration') > 0) {
                supplantObject.property = "coding";
            } else {
                supplantObject.property = "coding sessions";
            }
            cardText = template8.supplant(supplantObject);

        } else if (cardData.actionTags[0] === "exercise") {

            if (cardData.actionTags[1] === "walk") {
                if (cardData.chart.indexOf('steps') > 0) {
                    supplantObject.property = propertiesObj.propertiesText;
                } else {
                    supplantObject.property = "walks";
                }
                cardText = template8.supplant(supplantObject);
            } else if (cardData.actionTags[1] === "ride") {
                if (cardData.propertyName === "distance.sum") {
                    supplantObject.property = "metres ridden";
                    cardText = template8.supplant(supplantObject);
                }
            }
            // console.log("template8");

        } else if (cardData.actionTags[0] === "browse" && cardData.chart.indexOf('times-visited') > 0) {
            supplantObject.property = propertiesObj.propertiesText;
            supplantObject.objects = customFormatObjTags(displayTags(cardData.objectTags));
            cardText = template9.supplant(supplantObject);
            // console.log("template9");
        }

        if (cardText === '') {
            supplantObject.property = propertiesObj.propertiesText;
            supplantObject.action_pp = displayTags(pastParticiple(cardData.actionTags));
            supplantObject.objects = displayTags(cardData.objectTags);
            cardText = templateDefault.supplant(supplantObject);
            // console.log("templateDefault");
        } 

        cardText = cardText.supplant(supplantObject);

        cardData.cardText = cardText;
    }
}

function buildPropertiesTextAndGetValue (propertiesObject) {
    // debugger;
    var returnString = '';
    var objectKey = Object.keys(propertiesObject)[0];
    var prevObjectKey;
    var counter = 0;
    var returnObj = {};
    var isDuration = false;
    var isPercent = false;

    while (objectKey && objectKey !== "__count__") {
        var propertyText = unhyphenate(customFormatProperty(objectKey));
        propertiesObject = propertiesObject[objectKey];
        prevObjectKey = objectKey;

        if (objectKey.indexOf('duration') >= 0) {
            isDuration = true;
        } else if (objectKey.indexOf('percent') >= 0 || objectKey.indexOf('productivity-pulse') >= 0) {
            isPercent = true;
        }

        if (typeof propertiesObject === 'object')
            objectKey = Object.keys(propertiesObject)[0];
        else
            objectKey = null;

        if (propertyText !== "") {
            returnString += propertyText;
            if (objectKey && objectKey !== "__count__") {
                returnString += ": ";
            }
        }
        counter++;
    }

    returnObj.propertiesText = returnString.trim();

    if (objectKey === "__count__") {
        returnObj.value = propertiesObject[objectKey];
    } else {
        returnObj.value = propertiesObject;
    }

    if (isDuration)
        if (returnObj.value < 60)
            returnObj.value = setPrecision(returnObj.value) + " seconds";
        else
            returnObj.value = moment.duration(returnObj.value, "seconds").humanize();
    else if (isPercent)
        returnObj.value = setPrecision(returnObj.value) + '%';

    return returnObj;
}

String.prototype.supplant = function(o) {
    return this.replace(
        /\{\{([^{}]*)\}\}/g,
        function(a, b) {
            var r = o[b];
            return typeof r === 'string' || typeof r === 'number' ? r : a;
        }
    );
};

function createComparitorText(position, type) {
    var comparitorText = '';

    comparitorText = (type === "top10" ? "most" : "fewest");

    if (position > 0)
        comparitorText = ordinal_suffix_of(position + 1, true) + ' ' + comparitorText;

    return comparitorText;
}

function displayTags(tagArray) {
    var returnString = '';

    for (var i in tagArray) {
        returnString += tagArray[i] + " ";
    }

    return returnString.trim();
}

function pluralise(stringArray) {
    var lastItem = stringArray[stringArray.length - 1];
    
    var plural;
    if (lastItem === "push")
        plural = "es";
    else
        plural = "s";

    lastItem += plural;

    stringArray[stringArray.length - 1] = lastItem;

    return stringArray;
}

function pastParticiple(stringArray) {
    var toReturn = [];
    for (var i in stringArray) {
        var pp;
        if (stringArray[i] === "commit")
            pp = "ted";
        else if (stringArray[i] === "github")
            pp = '';
        else if (stringArray[i] === "push")
            pp = 'ed';
        else
            pp = "s";
        toReturn.push(stringArray[i] + pp);
    }
    return toReturn;
}

function unhyphenate(toUnhyphenate) {
        return toUnhyphenate.replace(/\^/g, '.').replace(/-/g, ' ');
}

function customFormatProperty(propertyText) {
    if (propertyText === "artist-name")
        return "";
    else if (propertyText === "album-name")
        return "tracks from the album";
    else if (propertyText.indexOf('percent') >= 0)
        return propertyText.replace('percent', '').trim();
    else if (propertyText.indexOf('duration') >= 0)
        return propertyText.replace('duration', '').trim();
    else if (propertyText.indexOf('times-visited') >= 0)
        return propertyText.replace('times-visited', 'visits').trim();
    else
        return propertyText;
}

function customFormatObjTags(objTagsString) {
    if (objTagsString === "computer desktop") 
        return "computer time";
    else if (objTagsString === "music")
        return "music tracks";
    else
        return objTagsString;
}

function customFormatActionTags(actionTagsString) {
    if (actionTagsString === "listen") 
        return "listened to";
    else
        return actionTagsString;
}

function setPrecision(numberToSet) {
    var returnString = numberToSet.toPrecision(3) + '';
    while (returnString.indexOf('.') >= 0 && (returnString.charAt(returnString.length - 1) === '0' || returnString.charAt(returnString.length - 1) === '.')) {
        returnString = returnString.substring(0, returnString.length - 1);
    }
    return returnString;
}

function stripAtDetail(stringToStrip) {
    stringArr = stringToStrip.split(' at ');
    stringArr[0] = stringArr[0].replace('Last ', '');
    return stringArr[0];
}


function dateRangetext(startRange, endRange) {
    var rangeText;
    var now = moment();

    if (startRange === endRange) {
        // single moment
        startRange = moment(startRange);
        rangeText = startRange.calendar(); //'Yesterday';
    } else {
        // range of time
        startRange = moment(startRange);
        endRange = moment(endRange);
        rangeText = startRange.format('lll') + ' - ' + endRange.format('lll');
    }

    return rangeText;
}

function setSourceElements (cardData) {
    cardData.dataSource = getDataSource(cardData);
}


function renderThumbnailMedia($cardLi, cardData) {

    if (cardData.thumbnailMedia) {
        $iframe = $cardLi.find(".front .chart-iframe");
        if (!$iframe.attr('src') || $iframe.attr('src') === "") {
            var iFrameSrc = cardData.thumbnailMedia;
            iFrameSrc += '?lineColour=' + stripHash(getPrimaryColour(cardData.dataSource));
            iFrameSrc += '&highlightCondition=' + cardData.type;
            iFrameSrc += '&highlightDates=' + getHighlightDates(cardData);
            iFrameSrc += '&doTransitions=true';
            iFrameSrc += '&dataSrc=' + encodeURIComponent(API_HOST + cardData.chart);
            $iframe.attr("src", iFrameSrc);
        }
    }
}


function renderMainMedia($cardLi, cardData) {

    if (cardData.thumbnailMedia) {
        $iframe = $cardLi.find(".back .chart-iframe");
        if (!$iframe.attr('src') || $iframe.attr('src') === "") {
            var iFrameSrc = cardData.thumbnailMedia;
            iFrameSrc += '?lineColour=' + stripHash(getPrimaryColour(cardData.dataSource));
            iFrameSrc += '&highlightCondition=' + cardData.type;
            iFrameSrc += '&highlightDates=' + getHighlightDates(cardData);
            iFrameSrc += '&vaxis=true&haxis=true';
            iFrameSrc += '&displayTooltips=true';
            iFrameSrc += '&doTransitions=false';
            iFrameSrc += '&dataSrc=' + encodeURIComponent(API_HOST + cardData.chart);
            $iframe.attr("src", iFrameSrc);
        }
    }
}

