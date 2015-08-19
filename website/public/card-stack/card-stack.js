function htmlEncode(value) {
    //create a in-memory div, set it's inner text(which jQuery automatically encodes)
    //then grab the encoded contents back out.  The div never exists on the page.
    return $('<div/>').text(value).html();
}

function htmlDecode(value) {
    return $('<div/>').html(value).text();
}

function stripHash(stringToStrip) {
    return stringToStrip.replace('#', '');
}

function stripAtDetail(stringToStrip) {
    stringArr = stringToStrip.split(' at ');
    stringArr[0] = stringArr[0].replace('Last ', '');
    return stringArr[0];
}

function slideLeft(eventElement) {
    var $cardBackContainer = $(eventElement).parent().parent();
    $cardBackContainer.find('.cardBack-1').addClass('slideOutLeft');
    $cardBackContainer.find('.cardBack-2').addClass('slideInLeft');
}

function slideRight(eventElement) {
    var $cardBackContainer = $(eventElement).parent().parent().parent();
    $cardBackContainer.find('.cardBack-1').removeClass('slideOutLeft');
    $cardBackContainer.find('.cardBack-2').removeClass('slideInLeft');
}

function getHighlightDates(cardData) {
    if (cardData.startRange === cardData.endRange) {
        return cardData.startRange;
    }
}

$('.prevButton').on('mousedown', function() { 
    $(this).removeClass('button-shadow'); 
});

$('.prevButton').on('mouseup', function() { 
    $(this).addClass('button-shadow'); 
});

$('.nextButton').on('mousedown', function() { 
    $(this).removeClass('button-shadow'); 
});

$('.nextButton').on('mouseup', function() { 
    $(this).addClass('button-shadow'); 
});

$(document).keydown(function (e) {
    var keyCode = e.keyCode || e.which,
    arrow = {left: 37, up: 38, right: 39, down: 40 };

    switch (keyCode) {
        case arrow.left:
            $('.prevButton').trigger('click');
        break;
        case arrow.right:
            $('.nextButton').trigger('click');
        break;
        // case arrow.down:
        //     $('.flip-toggle').trigger('mouseup');
        // break;
        default: return; // allow other keys to be handled
    }
    e.preventDefault();
    // prevent default action (eg. page moving up/down)
    // but consider accessibility (eg. user may want to use keys to choose a radio button)
});


// $('.cardBack-2').ready(function() {
//     var $cardBacks = $('.cardBack-2');
//     for (var i in $cardBacks) { 
//         $cardBacks[i].position().left = $('.stack').width() + $('.stack').position().left;
//     }
// });

// Set up moment locale
moment.locale('en', {
    calendar : {
        lastDay : '[Yesterday at] LT',
        sameDay : '[Today at] LT',
        nextDay : '[Tomorrow at] LT',
        lastWeek : 'dddd [at] LT',
        nextWeek : '[next] dddd [at] LT',
        sameElse : 'll'
    }
});

var deferred; // = $.Deferred();

var offline = false;

function getCards() {

    deferred = $.Deferred();

    var url;

    var sort_by_date = function(a, b) {
        return new Date(b.cardDate).getTime() - new Date(a.cardDate).getTime();
    };

    if (offline) {
        url = "offline_json/offline.json";
    } else {
        // Get the ajax requests out of the way early because they
        // are typically longest to complete

        var minStdDev = getQSParam().minStdDev;
        var maxStdDev = getQSParam().maxStdDev;

        url = API_HOST + '/v1/users/';
        url += username + '/cards';
        url += '?extraFiltering=true';
        url += minStdDev ? '&minStdDev=' + minStdDev : ''; //&minStdDev=' + "0.5";
        url += maxStdDev ? '&maxStdDev=' + maxStdDev : '';
    }

    console.log(url);

    $.getJSON(url,
            function() {
                console.log("accessed api for cards");
            })
        .done(function(data) {

            // data.sort(sort_by_date);
            console.log('card data', data);
            data = data.reverse();
            window.cardData = data;
            deferred.resolve(data);
        })
        .fail(function(data) {
            console.log('error getting cards', data);

        });
}

$(function() {

    getCards();

    var stack;
    var cardReloadCount = 0;

    var getColour = function(idx) {
        var colourArray = ['#dd2649', '#00a2d4', '#e93d31', '#f2ae1c', '#61b346', '#cf4b9a', '#367ec0', '#00ad87'];
        return colourArray[idx % colourArray.length];
    };

    var sendGAEvent = function(eventAction, eventLabel, eventValue) {
        var gaObj = {};
        gaObj.eventCategory = 'card-stack';
        gaObj.eventAction = eventAction;
        gaObj.eventLabel = eventLabel;
        gaObj.eventValue = eventValue;

        console.log('gaObj', gaObj);

        ga('send', 'event', gaObj);
    };

    window.logInfoClick = function(elem) {
        var $elem = $(elem);
        var cardLi = $elem.parentsUntil('ul', 'li')[0];
        sendGAEvent('infoLink_click', $elem.attr('href'), cardLi.getAttribute('cardIndex'));
    };

    var dateRangetext = function(startRange, endRange) {
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
    };

    var displayTags = function(tagArray) {
        var returnString = '';

        for (var i in tagArray) {
            returnString += tagArray[i] + " ";
        }

        return returnString.trim();
    };

    String.prototype.supplant = function(o) {
        return this.replace(
            /\{\{([^{}]*)\}\}/g,
            function(a, b) {
                var r = o[b];
                return typeof r === 'string' || typeof r === 'number' ? r : a;
            }
        );
    };

    var createComparitorText = function(position, type) {
        var comparitorText = '';

        comparitorText = (type === "top10" ? "most" : "fewest");

        if (position > 0)
            comparitorText = ordinal_suffix_of(position + 1, true) + ' ' + comparitorText;

        return comparitorText;
    };

    var pluralise = function(stringArray) {
        var lastItem = stringArray[stringArray.length - 1];
        
        var plural;
        if (lastItem === "push")
            plural = "es";
        else
            plural = "s";

        lastItem += plural;

        stringArray[stringArray.length - 1] = lastItem;

        return stringArray;
    };

    var pastParticiple = function(stringArray) {
        var toReturn = [];
        for (var i in stringArray) {
            var pp;
            if (stringArray[i] === "commit")
                pp = "ted";
            else
                pp = "s";
            toReturn.push(stringArray[i] + pp);
        }
        return toReturn;
    };

    var unhyphenate = function(toUnhyphenate) {
        return toUnhyphenate.replace(/\^/g, '.').replace(/-/g, ' ');
    };

    // "properties": {
    //     "sum": {
    //         "artist-name": {
    //             "John Talabot": {
    //                 "#": 1
    //             }
    //         }
    //     }
    // }

    var customFormatProperty = function(propertyText) {
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
    };

    var customFormatObjTags = function(objTagsString) {
        if (objTagsString === "computer desktop") 
            return "computer time";
        else if (objTagsString === "music")
            return "music tracks";
        else
            return objTagsString;
    };

    var customFormatActionTags = function(actionTagsString) {
        if (actionTagsString === "listen") 
            return "listened to";
        else
            return actionTagsString;
    };

    var setPrecision = function(numberToSet) {
        var returnString = numberToSet.toPrecision(3) + '';
        while (returnString.indexOf('.') >= 0 && (returnString.charAt(returnString.length - 1) === '0' || returnString.charAt(returnString.length - 1) === '.')) {
            returnString = returnString.substring(0, returnString.length - 1);
        }
        return returnString;
    };

    var buildPropertiesTextAndGetValue = function(propertiesObject) {
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
                // returnString += '<span class="property-text" style="color: {{colour}}">' + propertyText + '</span>';
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
    };

    var createCardText = function(cardData, colour) {
        // if (!cardData.cardText) {
            var cardText = '';

            if (cardData.type === "top10" || cardData.type === "bottom10") {
                var template1 = '<b>{{eventDate}}</b><br>{{comparitor}} {{action_pl}} in {{eventPeriod}} {{comparisonPeriod}}'; // e.g. [Yesterday]: [6th] [fewest] [commit]s in [a day] [ever]
                var template2 = '<b>{{eventDate}}</b><br>{{comparitor}} {{action_pp}} {{property}} in {{eventPeriod}} {{comparisonPeriod}}'; // [Yesterday]: [6th] [most] [commit]ted [file changes] in [a day] [ever]
                var template3 = '<b>{{eventDate}}</b><br>{{comparitor}} {{objects}} {{action_pl}} in {{eventPeriod}} {{comparisonPeriod}}'; // [Yesterday]: [6th] [fewest] [music track] [listen]s in [a day] [ever]
                // var template4 = '<b>{{eventDate}}</b><br>{{comparitor}} {{action_pl}} to {{property}} in {{eventPeriod}} {{comparisonPeriod}}'; // [Yesterday]: [6th] [fewest] [listen]s [to Royksopp] in [a day] [ever]
                // var template5 = '<b>{{eventDate}}</b><br>{{comparitor}} {{objects}} {{property}} in {{eventPeriod}} {{comparisonPeriod}}'; // [Yesterday]: [6th] [fewest] [computer desktop] [all distracting percent] in [a day] [ever]
                var template6 = '<b>{{eventDate}}</b><br>{{value}} {{action_pl}} to {{property}}<br>Your {{comparitor}} in {{eventPeriod}} {{comparisonPeriod}}'; // [Yesterday]: [13] [listens] to [Four Tet]<br>Your [6th] [fewest] in [a day]
                var template7 = '<b>{{eventDate}}</b><br>{{value}} of your {{objects}} was {{property}}<br>Your {{comparitor}} in {{eventPeriod}} {{comparisonPeriod}}<br><a onclick="logInfoClick(this);" class="infoLink" href="https://www.rescuetime.com/dashboard/for/the/day/of/{{cardDate}}" target="_blank" style="color:{{colour}}"><i class="fa fa-info-circle"></i> More info at RescueTime.com</a>'; // [Yesterday]: [1.2%] of your [computer use] was [business]<br>Your [6th] [fewest] in [a day]
                var template8 = '<b>{{eventDate}}</b><br>{{value}} {{property}}<br>Your {{comparitor}} in {{eventPeriod}} {{comparisonPeriod}}'; // [Yesterday]: [2609] [steps]<br>Your [6th] [fewest] in [a day]
                var template9 = '<b>{{eventDate}}</b><br>{{value}} {{objects}} {{property}}<br>Your {{comparitor}} in {{eventPeriod}} {{comparisonPeriod}}'; // [Yesterday]: [34] [google] [visits]<br>Your [6th] [fewest] in [a day]

                var templateDefault = '<b>{{eventDate}}</b><br>{{value}} {{{objects}}} {{{action_pp}}} {{{property}}}<br>Your {{comparitor}} in {{eventPeriod}} {{comparisonPeriod}}'; // [Yesterday]: [1.2] {objects} {actions} {properties}<br>Your [6th] [fewest] in [a day]

                var supplantObject = {
                    eventDate: stripAtDetail(dateRangetext(cardData.startRange, cardData.endRange)),
                    comparitor: createComparitorText(cardData.position, cardData.type),
                    eventPeriod: "a day",
                    comparisonPeriod: "",
                    colour: colour
                };

                var propertiesObj = buildPropertiesTextAndGetValue(cardData.properties.sum);

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
                        supplantObject.value = propertiesObj.value;
                        cardText = template6.supplant(supplantObject);
                        // console.log("template6");
                    }
                } else if (cardData.actionTags[0] === "use") {
                    supplantObject.property = "&quot;" + propertiesObj.propertiesText + "&quot;";
                    supplantObject.objects = customFormatObjTags(displayTags(cardData.objectTags));
                    supplantObject.value = propertiesObj.value;
                    supplantObject.cardDate = cardData.cardDate;
                    cardText = template7.supplant(supplantObject);
                    // console.log("template7", cardData.actionTags);

                } else if (cardData.actionTags[0] === "develop") {
                    if (cardData.chart.indexOf('.duration') > 0) {
                        supplantObject.property = "coding";
                    } else {
                        supplantObject.property = "coding sessions";
                    }
                    supplantObject.value = propertiesObj.value;
                    cardText = template8.supplant(supplantObject);

                } else if (cardData.actionTags[0] === "exercise") {

                    if (cardData.actionTags[1] === "walk") {
                        if (cardData.chart.indexOf('steps') > 0) {
                            supplantObject.property = propertiesObj.propertiesText;
                        } else {
                            supplantObject.property = "walks";
                        }
                        supplantObject.value = propertiesObj.value;
                        cardText = template8.supplant(supplantObject);
                    } else if (cardData.actionTags[1] === "ride") {
                        if (cardData.propertyName === "distance.sum") {
                            supplantObject.property = "metres ridden";
                            supplantObject.value = propertiesObj.value;
                            cardText = template8.supplant(supplantObject);
                        }
                    }
                    // console.log("template8");

                } else if (cardData.actionTags[0] === "browse" && cardData.chart.indexOf('times-visited') > 0) {
                    supplantObject.property = propertiesObj.propertiesText;
                    supplantObject.value = propertiesObj.value;
                    supplantObject.objects = customFormatObjTags(displayTags(cardData.objectTags));
                    cardText = template9.supplant(supplantObject);
                    // console.log("template9");
                }

                if (cardText === '') {
                    supplantObject.property = propertiesObj.propertiesText;
                    supplantObject.action_pp = displayTags(pastParticiple(cardData.actionTags));
                    supplantObject.objects = displayTags(cardData.objectTags);
                    supplantObject.value = propertiesObj.value;
                    cardText = templateDefault.supplant(supplantObject);
                    // console.log("templateDefault");
                } 

                cardText = cardText.supplant(supplantObject);

                cardData.cardText = cardText;
            }
        // }
    };

    var flipButtonTemplate = [
        , '  <div class="avatar-button standard-shadow" style="background-image:url({{userAvatarUrl}});"">'
        , '    <!--div class="icon-button"><i class="fa fa-share-alt fa-2x"></i></div-->'
        , '  </div>'
        , '  <div class="share-button standard-shadow" style="background-color: {{colour}};">'
        , '    <div class="icon-button"><i class="fa fa-share-alt fa-2x"></i></div>'
        , '  </div>'
        , '  <div class="flip-toggle standard-shadow" style="background-color: {{colour}};">'
        , '    <div class="icon-button"><i class="fa fa-angle-double-{{action}} fa-2x"></i></div>'

        , '    <!--div class="icon-button icon-{{action}}"><img src="img/{{action}}-icon.png" /></div-->'
        , '  </div>'].join('');

    // var shareButtonTemplate = [
    // ].join('');

    var cardBackContentTemplate = [
        , '<div class="cardBack-1">'
        , '  <div class="cardHeader" style="background-color: {{colour}};"><p>{{headerText}}</p></div>'
        , '    <div class="cardBackMain">'
        , '      <div class="cardBackTitle" style="border-bottom-color:{{colour}}"><p>{{chartTitleText}}</p></div>'
        , '      <div class="cardBackMedia">'
        , '        <!--iframe class="mainChartFrame" src="{{mainChartSrc}}" scrolling="no"></iframe-->'
        , '      </div>'
        , '    </div>'
        , '    <!--div class="cardBackAction" onclick="slideLeft(this)"><div class="actionText">Explore &gt;</div></div-->'
        , '</div>'
        , '<!--div class="cardBack-2">'
        , '  <div class="cardHeader" style="background-color: {{colour}};"><p class="backButton" onclick="slideRight(this)">{{headerText2}}</p></div>'
        , '  <div class="cardBackMain">Next bit of info goes here</div>'
        , '</div-->'
        , '{{shareContainer}}'].join('');




    var shareContainerTemplate = [
        , '<div class="share-container {{shareContainerClasses}} hide" style="background-color: {{colour}};">'
        , '  <div class="social-share-button standard-shadow"><div id="shareToTwitter" class="innerButton">Share to Twitter</div></div>'
        , '  <div class="social-share-button standard-shadow"><div id="shareToFacebook" class="innerButton">Share to Facebook</div></div>'
        , '  <div class="social-share-button standard-shadow"><div id="shareToLink" class="innerButton">Get shareable link</div></div>'
        , '  <div class="social-share-thanks" style="display:none;"><p>We haven\'t implemented sharing yet but it is coming soon.<br>Thanks for clicking<br><br><i class="fa fa-smile-o fa-2x"></i></p></div>'
        , '</div>'].join('');


    var buildCardHtml = function(cardData, colourIndex) {

        var cardDate = moment(cardData.cardDate);
        cardData.colourIndex = colourIndex;

        var colour = getColour(colourIndex);
        var supplantObject = {
            headerText: '',
            cardNavText: '',
            colour: colour,
            colourIndex: colourIndex,
        };

        var html = '<input id="hidCard_{{id}}" class="cardData" type="hidden" value="{{inputValue}}" />';
        html += '<div class="cardContainer cardContainer-front">{{cardFrontContent}}</div>';
        html += '<div class="cardContainer cardContainer-back">';
        html += '  {{cardBackContent}}';
        html += '{{cardNav}}</div>';

        html = html.supplant({
            id: cardData.id,
            inputValue: encodeURIComponent(JSON.stringify(cardData)),
            cardNav: flipButtonTemplate.supplant({
                colour: colour,
                action: 'left',
                userAvatarUrl: userAvatarUrl
            })
        });

        if (cardData.type === "date") {
            var dateNow = stripAtDetail(cardDate.calendar());

            html = html.supplant({
                cardFrontContent: '<div class="cardFullText" style="background-color: {{colour}};"><p>{{dateNow}}</p></div>'.supplant({
                    dateNow: dateNow,
                    colour: colour
                })
            });

        } else if (cardData.type === "top10" || cardData.type === "bottom10") {

            var dataSourceIconUrl;
            if (cardData.actionTags[0] === "use")
                dataSourceIconUrl = 'img/rescuetimeicon.svg';
            else if (cardData.actionTags[0] === "listen")
                dataSourceIconUrl = 'img/lastfm.svg';
            else if (cardData.actionTags[0] === "exercise")
                dataSourceIconUrl = 'img/googlefiticon.svg';
            else if (cardData.actionTags[0] === "exercise")
                dataSourceIconUrl = 'img/googlefiticon.svg';
            else if (cardData.actionTags[0] === "browse")
                dataSourceIconUrl = 'img/visit_counter.png';
            else if (cardData.actionTags[0] === "develop")
                dataSourceIconUrl = 'img/sublime.png';
            else if (cardData.objectTags.indexOf("github") >= 0 || cardData.actionTags.indexOf("github") >= 0)
                dataSourceIconUrl = 'img/githubicon.svg';
            else
                dataSourceIconUrl = 'img/puzzlepiece.svg';

            createCardText(cardData, colour);

            var headerText = cardData.type === "top10" ? "Top" : "Bottom";
            headerText += ' 5'; //: ' + createComparitorText(cardData.position, cardData.type) + ' of ' + cardData.outOf;

            var frontContent = [
                , '<div class="cardHeader" style="background-color: {{colour}};">'
                , '  <p>{{headerText}}</p>'
                , '</div>'
                , '<div class="cardContentContainer">'
                , '  <div class="cardMedia" style="border-bottom-color: {{colour}};"></div>'
                , '  <div class="cardText">'
                , '    <div class="glance-row">'
                , '      <div class="glance-blob-cell"><div class="glance-blob glance-blob-left" style="background-color:{{colour}};border-color:{{colour}}"><p>{{position}}</p></div></div><div class="glance-blob-cell"><div class="glance-blob glance-blob-right" style="background-image:url({{dataSourceIconUrl}});border-color:{{colour}}"></div></div>'
                , '    </div>'
                , '    <div class="main-text-row"><p>{{data}}</p></div>'
                , '  </div>'
                , '</div>'
                , '{{shareContainer}}'
                , '<div class="cardNav" style="background-color: {{colour}};">'
                , '  <p>{{cardNavText}}</p>'
                , '  {{flipButton}}'
                , '</div>'].join('');

            html = html.supplant({
                cardFrontContent: frontContent.supplant({
                    data: cardData.cardText || 'undefined',
                    flipButton: flipButtonTemplate.supplant({
                        colour: colour,
                        action: "right",
                        userAvatarUrl: userAvatarUrl
                    }),
                    cardNavText: "",
                    colour: colour,
                    headerText: headerText,
                    shareContainer: shareContainerTemplate.supplant({
                        colour: colour,
                        shareContainerClasses: 'share-container-front'
                    }),
                    dataSourceIconUrl: dataSourceIconUrl,
                    position: ordinal_suffix_of(cardData.position + 1, true)
                }),
                cardBackContent: cardBackContentTemplate.supplant({
                    colour: colour,
                    headerText: headerText,
                    headerText2: '&lt; back',
                    chartTitleText: cardData.cardText,
                    shareContainer: shareContainerTemplate.supplant({
                        colour: colour,
                        shareContainerClasses: 'share-container-back'
                    })
                })
            });
        }

        return html;
    };

    var renderThumbnailMedia = function(cardLi) {
        if (cardLi) {
            var $cardMedia = $(cardLi).find('.cardMedia');

            if ($cardMedia.html() === "") {
                var cardData = $(cardLi).find('.cardData');
                cardData = decodeURIComponent(cardData.val());
                cardData = JSON.parse(cardData);

                if (cardData.thumbnailMedia) {
                    $cardMedia.empty();
                    var iFrameHtml = '<iframe class="thumbnailFrame" src="' + cardData.thumbnailMedia;
                    iFrameHtml += '?lineColour=' + stripHash(getColour(cardData.colourIndex));
                    iFrameHtml += '&highlightCondition=' + cardData.type;
                    iFrameHtml += '&highlightDates=' + getHighlightDates(cardData);
                    iFrameHtml += '&doTransitions=true';
                    iFrameHtml += '&dataSrc=' + encodeURIComponent(API_HOST + cardData.chart) + '" ';
                    iFrameHtml += 'scrolling="no"></iframe>';
                    iFrameHtml += '<div class="clickable-overlay"></div>';
                    $cardMedia.append(iFrameHtml);
                }
            }
        }
    };

    var renderMainMedia = function(cardLi) {
        console.log('rendering main media');
        var cardData = $(cardLi).find('.cardData');
        cardData = decodeURIComponent(cardData.val());
        cardData = JSON.parse(cardData);

        if (cardData.thumbnailMedia) {
            var $cardMedia = $(cardLi).find('.cardBackMedia');
            $cardMedia.empty();
            var iFrameHtml = '<iframe class="mainChartFrame" src="' + cardData.thumbnailMedia;
            iFrameHtml += '?lineColour=' + stripHash(getColour(cardData.colourIndex));
            iFrameHtml += '&highlightCondition=' + cardData.type;
            iFrameHtml += '&highlightDates=' + getHighlightDates(cardData);
            iFrameHtml += '&vaxis=true&haxis=true';
            iFrameHtml += '&displayTooltips=true';
            iFrameHtml += '&doTransitions=false';
            iFrameHtml += '&dataSrc=' + encodeURIComponent(API_HOST + cardData.chart) + '" ';
            iFrameHtml += 'scrolling="no"></iframe>';
            $cardMedia.append(iFrameHtml);
        }
    };

    var discardPile = [];
    var $cardList = null;
    var addedCardsCount = 0;
    var cardsArrayGlobal;

    var addToStack = function(stack, cardData, cardIndex, renderThumbnail) {
        var li = document.createElement('li');
        li.innerHTML = buildCardHtml(cardData, cardIndex);
        var $card = $(li).find('.cardContainer');
        $card.css({
            'border-color': getColour(cardIndex)
        });
        $(li).attr('id', 'card_' + addedCardsCount);
        $(li).attr('cardId', cardData.id);
        $(li).attr('cardIndex', cardIndex);
        $(li).addClass('mainPile');

        $('.stack').append(li);

        stack.createCard(li);

        if (renderThumbnail) {
            renderThumbnailMedia(li);
        }
        addedCardsCount++;
    };

    var stackConfig = {
        throwOutConfidence: function(offset, element) {
            // console.log('offset and element', offset, element.offsetWidth);
            // console.log(Math.min(Math.abs(Math.abs(offset) + 180) / element.offsetWidth, 1));
            return Math.min(Math.abs(Math.abs(offset) + 180) / element.offsetWidth, 1);
        }
    };

    function bringToTop(cardEl) {
        var $cardEl = $(cardEl);
        var cardElId = $cardEl.attr('id');
        var $cardUl = $cardEl.parent();
        $cardEl.detach();
        $cardUl.append(cardEl);
    }

    function moveToLast(arr, idx) {
        var lastIdx = arr.length - 1;
        var len = arr.length;
        var val = null;
        if (idx !== lastIdx) {
            val = arr[idx];
            for (var i = idx; i < len; ++i) {
                arr[i] = arr[i + 1];
            }
            arr[lastIdx] = val;
        }
    }

    function markCardUnique(cardEl, label) {
        $('.stack li').removeClass(label);
        if (cardEl !== undefined) {
            $(cardEl).addClass(label);
        }
    }

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

    var hideShareButtonsShowThanks = function() {
        $('.social-share-thanks').show();
        $('.social-share-button').hide();

        window.setTimeout(function() {
            $('.social-share-thanks').hide();
            $('.social-share-button').show();
        }, 4000);
    };

    var buildStack = function(stack, firstTime) {
        var numberOfCardsToShow = 10;
        var skip = 0;
        deferred.done(function(cardsArray) {
            cardsArrayGlobal = cardsArray.reverse();
            if (numberOfCardsToShow > cardsArray.length) {
                numberOfCardsToShow = cardsArray.length;
            }

            // empty stack of li elements
            $('.discardPile').remove();
            $('.mainPile').remove();
            discardPile = [];

            for (var i = numberOfCardsToShow + skip - 1; i >= skip; i--) {
                addToStack(stack, cardsArray[i], i, (i === skip));
            }

            markCardUnique($('.stack li:last')[0], 'topOfMain');

            if ($('.stack li:last')[0])
                $('.stack li:last')[0].cardVisibleAt = (new Date()).getTime();

            $cardList = $('.stack li');
            var $stack = $('.stack');

            if (firstTime) {
                $stack.on('mouseup', 'li', function(e) {
                    var id = '#' + this.id;
                    var idx = discardPile.indexOf(id);
                    if (idx > -1) {
                        moveToLast(discardPile, idx);
                        markCardUnique($(id), 'topOfDiscard');
                    }
                });

                $stack.on('mousedown', '.flip-toggle', function(e) {
                    $('.flip-toggle').removeClass('standard-shadow');
                });

                $stack.on('mouseup', '.flip-toggle', function(e) {
                    $('.flip-toggle').addClass('standard-shadow');
                });

                $stack.on('mouseup', '.clickable-overlay, .flip-toggle', function(e) {
                    var $container = $(this).parents('.cardContainer');
                    var $li = $(this).parents('li');

                    if ($container.hasClass('flip')) {
                        // flipped to front
                        sendGAEvent('flipped-to-front-' + $li.attr('cardIndex'), $li.attr('cardId'), $li.attr('cardIndex'));
                        $('#viewport').removeAttr('style');
                        $('.body').removeAttr('style');
                        // $('#viewport').css({"width": "90%", "height": "85%"});
                        // $('.body').css("padding","10px 0 0 0");
                    } else {
                        // flipped to back
                        renderMainMedia($li);
                        sendGAEvent('flipped-to-back-' + $li.attr('cardIndex'), $li.attr('cardId'), $li.attr('cardIndex'));
                        $('#viewport').css({"width": "100%", "height": "100%"});
                        $('.body').css("padding","0px");
                    }

                    $container.toggleClass('flip');
                    $container.siblings().toggleClass('flip');
                });

                // $stack.on('click', '.infoLink', function(e) {
                //     console.log(e.target);
                // });
                // 
                console.log($stack.find('.infoLink'));
                console.log($stack.find('.clickable-overlay'));
                console.log($('.clickable-overlay'));

                $stack.on('mousedown', '.share-button', function(e) {
                    $('.share-button').removeClass('standard-shadow');
                });

                $stack.on('mouseup', '.share-button', function(e) {
                    $('.share-button').addClass('standard-shadow');
                    var $container = $(this).parents('.cardContainer');
                    var $li = $(this).parents('li');

                    var sharePaneAction = ($container.find('.share-container').hasClass('hide') ? 'open' : 'close');
                    sharePaneAction += '-share-pane-';
                    sharePaneAction += ($container.hasClass('flip') ? 'back' : 'front');
                    sharePaneAction += '-' + $li.attr('cardIndex');

                    sendGAEvent(sharePaneAction, $li.attr('cardId'), $li.attr('cardIndex'));
                    
                    $container.find('.share-container').toggleClass('hide');
                });

                $stack.on('mousedown', '#shareToTwitter', function(e) {
                    $('#shareToTwitter').parents('.social-share-button').removeClass('standard-shadow');
                });

                $stack.on('mouseup', '#shareToTwitter', function(e) {
                    $('#shareToTwitter').parents('.social-share-button').addClass('standard-shadow');
                    var $container = $(this).parents('.cardContainer');
                    var $li = $(this).parents('li');

                    var sharePaneAction = 'share-to-twitter-';
                    sharePaneAction += ($container.hasClass('flip') ? 'back' : 'front');
                    sharePaneAction += '-' + $li.attr('cardIndex');

                    sendGAEvent(sharePaneAction, $li.attr('cardId'), $li.attr('cardIndex'));

                    hideShareButtonsShowThanks();
                    
                });
     
                $stack.on('mousedown', '#shareToFacebook', function(e) {
                    console.log($('#shareToFacebook').parent().attr('class'));
                    $('#shareToFacebook').parent('div').toggleClass('standard-shadow');
                    console.log($('#shareToFacebook').parent().attr('class'));
                });

                $stack.on('mouseup', '#shareToFacebook', function(e) {
                    $('#shareToFacebook').parent('div').addClass('standard-shadow');
                    var $container = $(this).parents('.cardContainer');
                    var $li = $(this).parents('li');

                    var sharePaneAction = 'share-to-facebook-';
                    sharePaneAction += ($container.hasClass('flip') ? 'back' : 'front');
                    sharePaneAction += '-' + $li.attr('cardIndex');

                    sendGAEvent(sharePaneAction, $li.attr('cardId'), $li.attr('cardIndex'));

                    hideShareButtonsShowThanks();
                    
                });

                $stack.on('mousedown', '#shareToLink', function(e) {
                    $('#shareToLink').parents('.social-share-button').removeClass('standard-shadow');
                });

                $stack.on('mouseup', '#shareToLink', function(e) {
                    $('#shareToLink').parents('.social-share-button').addClass('standard-shadow');
                    var $container = $(this).parents('.cardContainer');
                    var $li = $(this).parents('li');

                    var sharePaneAction = 'share-to-link-';
                    sharePaneAction += ($container.hasClass('flip') ? 'back' : 'front');
                    sharePaneAction += '-' + $li.attr('cardIndex');

                    sendGAEvent(sharePaneAction, $li.attr('cardId'), $li.attr('cardIndex'));

                    hideShareButtonsShowThanks();
                    
                });

                $stack.on('mousedown', '.getMoreCardsBtn', function(e) {
                    $('.getMoreCardsBtn').removeClass('standard-shadow');
                });

                $stack.on('mouseup', '.getMoreCardsBtn', function(e) {
                    $('.nextButton').trigger('click');
                });

                $stack.on('mousedown', '.tellMeAboutNewCardsBtn', function(e) {
                    $('.getMoreCardsBtn').removeClass('standard-shadow');
                });

                $stack.on('mouseup', '.tellMeAboutNewCardsBtn', function(e) {
                    sendGAEvent('request-new-card-notification', username);
                    $('.bottom-of-stack-container .tellMeAboutNewCardsBtn').hide();
                    $('.bottom-of-stack-container h1').text('You got it!').addClass("bottom-of-stack-large-text").show();
                    $('.bottom-of-stack-container p').html("We'll send you an email when you have new cards").show();
                    localStorage.requestedNotification = true;
                });
            }

            if (cardsArray.length > 0) {
                $('.bottom-of-stack-container h1').text('All done').hide();
                $('.bottom-of-stack-container p').hide();
                $('.bottom-of-stack-container .loading').hide();
                $('.bottom-of-stack-container .tellMeAboutNewCardsBtn').hide();
                $('.getMoreCardsBtn').show();
            } else {
                $('.bottom-of-stack-container h1').text('All done').addClass("bottom-of-stack-large-text").show();
                $('.bottom-of-stack-container p').html('That&apos;s all we&apos;ve got for you right now.<br><br>Thanks for looking!<br><br>New cards will be generated for you daily.').show();
                $('.bottom-of-stack-container .loading').hide();
                $('.getMoreCardsBtn').hide();

                if (!localStorage.requestedNotification)
                    $('.bottom-of-stack-container .tellMeAboutNewCardsBtn').show();
            }

            window.stack = stack;

            stack.on('throwout', function(e) {
                // debugger;
                console.log(e.throwOutConfidence);
                markCardUnique($('.stack .topOfMain')[0], 'topOfMain');
                markCardUnique(e.target, 'topOfDiscard');
                $(e.target).addClass("discardPile");
                $(e.target).removeClass("mainPile");
                discardPile.push('#' + e.target.id);
                e.target.thrownX = 1;
                e.target.thrownY = 78;
                var cardsOnDiscard = discardPile.length;
                markCardUnique($cardList[$cardList.length - 1 - cardsOnDiscard], 'topOfMain');

                if ($cardList.length - 1 - cardsOnDiscard >= 0) {
                    bringToTop($cardList[$cardList.length - 1 - cardsOnDiscard]);
                    $cardList[$cardList.length - 1 - cardsOnDiscard].cardVisibleAt = (new Date()).getTime();
                }
                
                renderThumbnailMedia($cardList[$cardList.length - 1 - cardsOnDiscard]);
                e.target.classList.remove('in-deck');
                console.log('thrown out', e.target.id, discardPile);   
                sendGAEvent('thrown-out-' + e.target.getAttribute('cardIndex'), e.target.getAttribute('cardId'), e.target.getAttribute('cardIndex'));

                markCardRead(username, e.target, cardReloadCount); // username is declared globally in index.html
            
                $('.topOfDiscard').delay(1000).fadeOut(1000, function() {

                });

            });                    

            stack.on('throwin', function(e) {
                discardPile.pop();
                var cardEl = $(discardPile[discardPile.length - 1])[0];
                markCardUnique(e.target, 'topOfMain');
                markCardUnique(cardEl, 'topOfDiscard');
                $(e.target).show();
                $(e.target).addClass("mainPile");
                $(e.target).removeClass("discardPile");

                e.target.classList.add('in-deck');
                console.log('thrown in', e.target.id, discardPile);

                sendGAEvent('thrown-in-' + e.target.getAttribute('cardIndex'), e.target.getAttribute('cardId'), e.target.getAttribute('cardIndex'));
            });

        });
    };

    function setUpStack() {

        stack = gajus.Swing.Stack(stackConfig);

        stack.throwInLast = function() {
            var cardLi = $('.stack .topOfDiscard')[0];
            if (cardLi) {
                bringToTop(cardLi);
                var val = '#' + cardLi.id;
                var idx = discardPile.indexOf(val);
                var card = stack.getCard(cardLi);
                card.throwIn(cardLi.thrownX, cardLi.thrownY);
                sendGAEvent('button-thrown-in-' + cardLi.getAttribute('cardIndex'), cardLi.getAttribute('cardId'), cardLi.getAttribute('cardIndex'));
            }
        };

        stack.throwOutNext = function() {
            var cardLi = $('.stack .topOfMain')[0];
            if (cardLi) {
                bringToTop(cardLi);
                var card = stack.getCard(cardLi);
                cardLi.thrownY = getRandomInt(-100, 100);
                cardLi.thrownX = 1;
                card.throwOut(cardLi.thrownX, cardLi.thrownY);
                sendGAEvent('button-thrown-out-' + cardLi.getAttribute('cardIndex'), cardLi.getAttribute('cardId'), cardLi.getAttribute('cardIndex'));            
            } else {
                $('.getMoreCardsBtn').addClass('standard-shadow');
                $('.getMoreCardsBtn').hide();
                $('.bottom-of-stack-container .loading').show();
                $('.bottom-of-stack-container h1').text('Loading cards...').removeClass("bottom-of-stack-large-text");
                $('.bottom-of-stack-container p').hide();
                $('.bottom-of-stack-container .tellMeAboutNewCardsBtn').hide();

                getCards();
                cardReloadCount++;
                setUpStack();
                buildStack(stack, false);

                sendGAEvent('get-more-cards');
            }
        };

    }

    setUpStack();
    buildStack(stack, true);

});
