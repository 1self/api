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

var deferred = $.Deferred();

var offline = false;

if (offline) {
    var data = [/*{
        "id": "5584077cedd7cc047e86fe2e",
        "type": "date",
        "generatedDate": "2015-06-25T12:13:48.706Z"
    }, */{
        "id": "5584077dedd7cc047e86fe34",
        "type": "top10",
        "thumbnailMedia": "chart.html",
        "startRange": "2015-06-25",
        "endRange": "2015-06-25",
        "objectTags": [
            "music"
        ],
        "actionTags": [
            "listen"
        ],
        "position": 0,
        "properties": {
            "sum": {
                "album-name": {
                    "The Inevitable End": {
                        "__count__": 10
                    }
                }
            }
        },
        "generatedDate": "2015-06-19T12:13:49.256Z",
        "chart": "/v1/users/ed/rollups/day/music/listen/sum.album-name..__count__/.json"
    }, {
        "id": "5584077dedd7cc047e86fe30",
        "type": "top10",
        "thumbnailMedia": "chart.html",
        "startRange": "2015-06-25",
        "endRange": "2015-06-25",
        "objectTags": [
            "music"
        ],
        "actionTags": [
            "listen"
        ],
        "position": 2,
        "properties": {
            "sum": {
                "artist-name": {
                    "Daft Punk": {
                        "__count__": 1
                    }
                }
            }
        },
        "generatedDate": "2015-06-19T12:13:49.017Z",
        "chart": "/v1/users/ed/rollups/day/music/listen/sum.album-name..__count__/.json"
    }, {
        "id": "5584077dedd7cc047e86fe35",
        "type": "bottom10",
        "thumbnailMedia": "chart.html",
        "startRange": "2015-06-25",
        "endRange": "2015-06-25",
        "objectTags": [
            "computer",
            "control",
            "software",
            "source"
        ],
        "actionTags": [
            "github",
            "push"
        ],
        "position": 28,
        "properties": {
            "sum": {
                "commits": 5
            }
        },
        "generatedDate": "2015-06-19T12:13:49.301Z",
        "chart": "/v1/users/ed/rollups/day/computer,control,software,source/github,push/sum.commits/.json"
    }, {
        "id": "5584077dedd7cc047e86fe39",
        "type": "top10",
        "thumbnailMedia": "chart.html",
        "startRange": "2015-06-25",
        "endRange": "2015-06-25",
        "objectTags": [
            "computer",
            "control",
            "software",
            "source"
        ],
        "actionTags": [
            "commit"
        ],
        "position": 1,
        "properties": {
            "sum": {
                "__count__": 5
            }
        },
        "generatedDate": "2015-06-19T12:13:49.626Z",
        "chart": "/v1/users/ed/rollups/day/computer,control,software,source/github,push/sum.__count__/.json"
    }, {
        "id": "5584077dedd7cc047e86fe3a",
        "type": "bottom10",
        "thumbnailMedia": "chart.html",
        "startRange": "2015-06-25",
        "endRange": "2015-06-25",
        "objectTags": [
            "computer",
            "control",
            "software",
            "source"
        ],
        "actionTags": [
            "github",
            "push"
        ],
        "position": 0,
        "properties": {
            "sum": {
                "repo": {
                    "1self/api": {
                        "__count__": 1
                    }
                }
            }
        },
        "generatedDate": "2015-06-19T12:13:49.630Z",
        "chart": "/v1/users/ed/rollups/day/computer,control,software,source/github,push/sum.repo.1self/api.__count__/.json"
    }, {
        "id": "5584077dedd7cc047e86fe32",
        "type": "top10",
        "thumbnailMedia": "chart.html",
        "startRange": "2015-06-25",
        "endRange": "2015-06-25",
        "objectTags": [
            "computer",
            "control",
            "software",
            "source"
        ],
        "actionTags": [
            "github",
            "push"
        ],
        "position": 0,
        "properties": {
            "sum": {
                "repo": {
                    "1self/api": {
                        "commits": 1
                    }
                }
            }
        },
        "generatedDate": "2015-06-19T12:13:49.036Z",
        "chart": "/v1/users/ed/rollups/day/computer,control,software,source/github,push/sum.repo.1self/api.commits/.json"
    }, {
        "id": "5584077dedd7cc047e86fe37",
        "type": "bottom10",
        "thumbnailMedia": "chart.html",
        "startRange": "2015-06-25",
        "endRange": "2015-06-25",
        "objectTags": [
            "computer",
            "git",
            "github",
            "software",
            "source control"
        ],
        "actionTags": [
            "commit"
        ],
        "position": 8,
        "properties": {
            "sum": {
                "__count__": 5
            }
        },
        "generatedDate": "2015-06-19T12:13:49.528Z",
        "chart": "/v1/users/ed/rollups/day/computer,git,github,software,source control/commit/sum.__count__/.json"
    }, {
        "id": "5584077dedd7cc047e86fe3c",
        "type": "bottom10",
        "thumbnailMedia": "chart.html",
        "startRange": "2015-06-25",
        "endRange": "2015-06-25",
        "objectTags": [
            "computer",
            "git",
            "github",
            "software",
            "source control"
        ],
        "actionTags": [
            "commit"
        ],
        "position": 6,
        "properties": {
            "sum": {
                "author-email": {
                    "ed^sykes@gmail^com": {
                        "__count__": 5
                    }
                }
            }
        },
        "generatedDate": "2015-06-19T12:13:49.862Z",
        "chart": "/v1/users/ed/rollups/day/computer,git,github,software,source control/commit/sum.author-email.ed^sykes@gmail^com.__count__/.json"
    }];

    deferred.resolve(data);
} else {
    // Get the ajax requests out of the way early because they
    // are typically longest to complete

    var username = getQSParam().user;
    var minStdDev = getQSParam().minStdDev;
    var maxStdDev = getQSParam().maxStdDev;

    var sort_by_date = function(a, b) {
        return new Date(b.cardDate).getTime() - new Date(a.cardDate).getTime();
    };

    console.log('minStdDev',minStdDev);

    if (!username) username = "ed";

    var url = 'https://api-staging.1self.co/v1/users/';
    url += username + '/cards';
    url += '?extraFiltering=true';
    url += minStdDev ? '&minStdDev=' + minStdDev : '?minStdDev=' + "2";
    url += maxStdDev ? '&maxStdDev=' + maxStdDev : '';

    console.log(url);

    $.getJSON(url,
            function() {
                console.log("accessed api for cards");
            })
        .done(function(data) {

            data.sort(sort_by_date);
            console.log('card data', data);
            window.cardData = data;
            deferred.resolve(data);
        })
        .fail(function(data) {
            console.log('error getting cards', data);

        });
}

$(function() {
    var stack;

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
        var toReturn = [];
        for (var i in stringArray) {
            var plural;
            if (stringArray[i] === "push")
                plural = "es";
            else
                plural = "s";
            toReturn.push(stringArray[i] + plural);
        }
        return toReturn;
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
        else
            return propertyText;
    };

    var customFormatObjTags = function(objTagsString) {
        if (objTagsString === "computer desktop") 
            return "computer use";
        else
            return objTagsString;
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
            } else if (objectKey.indexOf('percent') >= 0) {
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

        returnObj.propertiesText = returnString;

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
        if (!cardData.cardText) {
            var cardText = '';

            if (cardData.type === "top10" || cardData.type === "bottom10") {
                var template1 = '<b>{{eventDate}}</b><br>{{comparitor}} {{action_pl}} in {{eventPeriod}} {{comparisonPeriod}}'; // e.g. [Yesterday]: [6th] [fewest] [commit]s in [a day] [ever]
                var template2 = '<b>{{eventDate}}</b><br>{{comparitor}} {{action_pp}} {{property}} in {{eventPeriod}} {{comparisonPeriod}}'; // [Yesterday]: [6th] [most] [commit]ted [file changes] in [a day] [ever]
                var template3 = '<b>{{eventDate}}</b><br>{{comparitor}} {{objects}} {{action_pl}} in {{eventPeriod}} {{comparisonPeriod}}'; // [Yesterday]: [6th] [fewest] [music track] [listen]s in [a day] [ever]
                var template4 = '<b>{{eventDate}}</b><br>{{comparitor}} {{action_pl}} to {{property}} in {{eventPeriod}} {{comparisonPeriod}}'; // [Yesterday]: [6th] [fewest] [listen]s [to Royksopp] in [a day] [ever]
                var template5 = '<b>{{eventDate}}</b><br>{{comparitor}} {{objects}} {{property}} in {{eventPeriod}} {{comparisonPeriod}}'; // [Yesterday]: [6th] [fewest] [computer desktop] [all distracting percent] in [a day] [ever]
                var template6 = '<b>{{eventDate}}</b><br>{{value}} {{action_pl}} to {{property}}<br>Your {{comparitor}} in {{eventPeriod}} {{comparisonPeriod}}'; // [Yesterday]: [13] [listens] to [Four Tet]<br>Your [6th] [fewest] in [a day]
                var template7 = '<b>{{eventDate}}</b><br>{{value}} {{property}} {{objects}}<br>Your {{comparitor}} in {{eventPeriod}} {{comparisonPeriod}}'; // [Yesterday]: [1.2] [RescueTime] [business percent]<br>Your [6th] [fewest] in [a day]

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
                    } else {
                        supplantObject.action_pp = displayTags(pastParticiple(cardData.actionTags));
                        supplantObject.property = propertiesObj.propertiesText;
                        cardText = template2.supplant(supplantObject);
                    }
                } else if (cardData.actionTags[0] === "listen") {
                    if (cardData.properties.sum.__count__) {
                        supplantObject.action_pl = displayTags(pluralise(cardData.actionTags));
                        supplantObject.objects = displayTags(cardData.objectTags);
                        cardText = template3.supplant(supplantObject);
                    } else {
                        supplantObject.action_pl = displayTags(pluralise(cardData.actionTags));
                        supplantObject.property = propertiesObj.propertiesText;
                        supplantObject.value = propertiesObj.value;
                        cardText = template6.supplant(supplantObject);
                    }
                } else if (cardData.actionTags[0] === "use") {
                    supplantObject.property = propertiesObj.propertiesText;
                    supplantObject.objects = customFormatObjTags(displayTags(cardData.objectTags));
                    supplantObject.value = propertiesObj.value;
                    cardText = template7.supplant(supplantObject);
                }

                cardText = cardText.supplant(supplantObject);
            }

            if (cardText === '') cardText = "Couldn't create friendly message";
            cardData.cardText = cardText;
        }
    };

    var flipButtonTemplate = [
        , '  <div class="avatar-button standard-shadow">'
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
                action: 'left'
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
            else
                dataSourceIconUrl = 'img/githubicon.svg';

            createCardText(cardData, colour);

            var headerText = cardData.type === "top10" ? "Top" : "Bottom";
            headerText += ' 10: ' + createComparitorText(cardData.position, cardData.type) + ' of ' + cardData.outOf;

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
                        action: "right"
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
            var cardData = $(cardLi).find('.cardData');
            cardData = decodeURIComponent(cardData.val());
            cardData = JSON.parse(cardData);

            if (cardData.thumbnailMedia) {
                var $cardMedia = $(cardLi).find('.cardMedia');
                $cardMedia.empty();
                var iFrameHtml = '<iframe class="thumbnailFrame" src="' + cardData.thumbnailMedia;
                iFrameHtml += '?lineColour=' + stripHash(getColour(cardData.colourIndex));
                iFrameHtml += '&highlightCondition=' + cardData.type;
                iFrameHtml += '&highlightDates=' + getHighlightDates(cardData);
                iFrameHtml += '&doTransitions=true';
                iFrameHtml += '&dataSrc=' + encodeURIComponent(cardData.chart) + '" ';
                iFrameHtml += 'scrolling="no"></iframe>';
                iFrameHtml += '<div class="clickable-overlay"></div>';
                $cardMedia.append(iFrameHtml);
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
            iFrameHtml += '&dataSrc=' + cardData.chart + '" ';
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

    var buildStack = function(stack) {
        var numberOfCardsToShow = 10;
        var skip = 0;
        deferred.done(function(cardsArray) {
            cardsArrayGlobal = cardsArray;
            if (numberOfCardsToShow > cardsArray.length) {
                numberOfCardsToShow = cardsArray.length;
            }

            for (var i = numberOfCardsToShow + skip - 1; i >= skip; i--) {
                addToStack(stack, cardsArray[i], i, (i === skip));
            }

            markCardUnique($('.stack li:last')[0], 'topOfMain');

            $cardList = $('.stack li');
            var $stack = $('.stack');

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
                
            });


            $('.bottom-of-stack-container h1').text('All done').css({"font-size": "3em", "margin": "0.67em 0"});
            $('.bottom-of-stack-container h1').after('<i class="fa fa-thumbs-o-up fa-4x"></i>');
            $('.bottom-of-stack-container p').text('Come back for more cards later');
            $('.bottom-of-stack-container .loading').remove();



        });
    };

    var stackConfig = {
        throwOutConfidence: function(offset, element) {
            // console.log('offset and element', offset, element.offsetWidth);
            // console.log(Math.min(Math.abs(Math.abs(offset) + 180) / element.offsetWidth, 1));
            return Math.min(Math.abs(Math.abs(offset) + 180) / element.offsetWidth, 1);
        }
    };

    stack = gajus.Swing.Stack(stackConfig);

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
        }    
    };

    window.stack = stack;
    buildStack(stack);

    function markCardUnique(cardEl, label) {
        $('.stack li').removeClass(label);
        if (cardEl !== undefined) {
            $(cardEl).addClass(label);
        }
    }

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
        renderThumbnailMedia($cardList[$cardList.length - 1 - cardsOnDiscard]);
        e.target.classList.remove('in-deck');
        console.log('thrown out', e.target.id, discardPile);   
        sendGAEvent('thrown-out-' + e.target.getAttribute('cardIndex'), e.target.getAttribute('cardId'), e.target.getAttribute('cardIndex'));
    
        $('.topOfDiscard').delay(1000).fadeOut(1000, function() {
           // $(this).remove();
           // console.log('removed card');
        });

        // addToStack(stack, cardDataGlobal, addedCardsCount, false);
        // $cardList = $('.stack li');
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
