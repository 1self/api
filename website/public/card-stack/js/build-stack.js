var cardsAdded = 0;
var $liTemplate = $(".li-template");
var globalCardsArray;
var $loadingDivTop;
var $noMoreCardsDiv;
var $noCardsDiv;

function buildStack (stack) {
    var numberOfCardsToShow = 3;
    var skip = 0;
    deferred.done(function(cardsArray) {
    	globalCardsArray = cardsArray;

        $('.loading-div-bottom').remove();
        $noMoreCardsDiv = $('.no-more-cards-div-bottom').remove();

        if (cardsArray.length > 0) {
            $loadingDivTop = $('.loading-div-top').remove();
            $noCardsDiv = $('.no-cards-div-bottom').remove();
            $('.out-of-text').text(cardsArray.length);
            $('.card-number-text').text("1");
            $('.card-count').show();
            showFlickButtons('nextOnly');

            if (numberOfCardsToShow > cardsArray.length) {
                numberOfCardsToShow = cardsArray.length;
            }

            // for (var i = numberOfCardsToShow + skip - 1; i >= skip; i--) {
            for (var i = 0; i < numberOfCardsToShow; i++) {
                var $li = addToStack($liTemplate, stack, cardsArray[i], i, (i === skip));
                
                if (i === skip) {
    	          	markCardUnique($li[0], 'topOfMain');
                    renderThumbnailMedia($li, cardsArray[i]);
    	        	renderMainMedia($li, cardsArray[i]);
                }
           	}
        } else {
            $('.no-cards-div-bottom').removeClass('hide');
        }

    });
}

function markCardUnique(cardEl, label) {
    $('.stack li').removeClass(label);
    if (cardEl !== undefined) {
        $(cardEl).addClass(label);
    }
}

function stripHash(stringToStrip) {
    return stringToStrip.replace('#', '');
}

function getHighlightDates(cardData) {
    if (cardData.startRange === cardData.endRange) {
        return cardData.startRange;
    }
}

function sendToBottom($cardLi) {
	if ($cardLi) {
		var $cardUl = $cardLi.parent();
		$cardLi.detach();
		$cardUl.prepend($cardLi);
	}
}

function bringToTop(cardLi) {
	if (cardLi) {
		var $cardLi = $(cardLi);
		var $cardUl = $cardLi.parent();
		$cardLi.detach();
		$cardUl.append(cardLi);
	}
}

function addToStack ($liTemplate, stack, cardData, cardIndex, renderThumbnail) {
    
    setSourceElements(cardData);

	var $li = $liTemplate.clone();
	var liHtml = $li[0];
	var $card = createCard(cardData);
	$li.removeClass("li-template");
	liHtml.cardIndex = cardIndex;
	var $stack = $(".stack");

	$stack.prepend($li);
	$li.find(".card-container").append($card);
	$li.removeClass("card-hide");
	$card.removeClass("card-hide");
	assignCardHandlers($li);

    stack.createCard(liHtml);
    sendToBottom($li);
    cardsAdded++;
    liHtml.classList.add('in-deck');

    $li.find('.cardData').val(encodeURIComponent(JSON.stringify(cardData)));
    $li.attr('cardId', cardData.id);
    $li.attr('cardIndex', cardIndex);

    return $li;
}

function assignCardHandlers ($li) {
    $li.find(".more, .more-back").click(function() {
        $li.find(".card-container").toggleClass("hover");
        $li.find(".back").toggleClass("iefix");
        // $li.find(".back .headline").on('mousedown', function() { return false; });
        // $li.find(".back .headline").on('touchstart', function() { return false; });
        // $li.find(".back").on('touchstart', function() { return false; });
     });

    $li.find(".more-back").click(function() {
        showFlickButtons();
        $li.find(".front .chart-container").show();
        sendGAEvent('flipped-to-front', username + "#" + $li.attr('cardId'), $li.attr('cardIndex'));
     });

    $li.find(".more").click(function() {
        hideFlickButtons();
        $li.find(".front .chart-container").hide();
        sendGAEvent('flipped-to-back',  username + "#" + $li.attr('cardId'), $li.attr('cardIndex'));
     });
}

function hideFlickButtons(oneOnly) {
    if (oneOnly === 'nextOnly') {
        $(".next").addClass('hide'); 
    } else if (oneOnly === 'previousOnly') {
        $(".previous").addClass('hide'); 
    } else {
        $(".next").addClass('hide'); 
        $(".previous").addClass('hide'); 
    }
}

function showFlickButtons(oneOnly) {
    if (oneOnly === 'nextOnly') {
        $(".next").removeClass('hide'); 
    } else if (oneOnly === 'previousOnly') {
        $(".previous").removeClass('hide'); 
    } else {
        $(".next").removeClass('hide'); 
        $(".previous").removeClass('hide'); 
    }  
}

function injectCardData (cardData, $card) {
	createCardText(cardData);

    var $headlineText = $card.find(".headline-text");
    $headlineText.prepend(cardData.cardText);

    var $eventDate = $card.find(".event-date");
    $eventDate.text(stripAtDetail(dateRangetext(cardData.startRange, cardData.endRange)));

    var $headline = $card.find(".headline");
	$headline.addClass(cardData.dataSource);

}

function createCard (cardData) {
	var $card; 

	if (cardData.type ==="date") {
        var cardDate = moment(cardData.cardDate);
		$card = $(".card-template.date-card").clone();
        $card.find('.event-date').text(stripAtDetail(cardDate.calendar()));

	} else if (cardData.type === "top10" || cardData.type === "bottom10") {
		$card = $(".card-template.top-ten-card").clone();
		injectCardData(cardData, $card);
	}

	$card.removeClass("card-template");

    var $back = $card.find('.back');

    if ($back.length > 0) {
        var bodyHeight = $('body').height(); 
        $back.height(bodyHeight);
    }

	return $card;
}


$(document).ready(function() { 

    var stack;
    var discardPile = [];

    var stackConfig = {
        throwOutConfidence: function(offset, element) {
            // console.log('offset and element', offset, element.offsetWidth);
            // console.log(Math.min(Math.abs(Math.abs(offset) + 180) / element.offsetWidth, 1));
            return Math.min(Math.abs(Math.abs(offset) + 180) / element.offsetWidth, 1);
        }
    };

    stack = gajus.Swing.Stack(stackConfig);

    stack.on('throwout', function (e) {

    	var $cardList = $(".stack li");

        e.target.classList.remove('in-deck');
        e.target.classList.add('removed-from-deck');
        discardPile.push(e.target);

        var $target = $(e.target);
        $target.fadeOut(2000, function() { $target.hide(); }); // fade it out and then ensure it's hidden so the DOM knows it doesn't need to render it

        markCardUnique(e.target, 'topOfDiscard');
        e.target.thrownX = 1;
        e.target.thrownY = 78;
        var cardsOnDiscard = discardPile.length;

        if ($cardList.length - 1 - cardsOnDiscard >= 0) {
        	var newTop = $cardList[$cardList.length - 1 - cardsOnDiscard];
        	var $newTop = $(newTop);

            var cardData = $newTop.find('.cardData');
            cardData = decodeURIComponent(cardData.val());
            cardData = JSON.parse(cardData);

        	markCardUnique(newTop, 'topOfMain');
        	bringToTop(newTop);
            newTop.cardVisibleAt = (new Date()).getTime();
            renderThumbnailMedia($newTop, cardData);
            renderMainMedia($newTop, cardData);

            var $cardNumText = $('.card-number-text');
            $cardNumText.text(cardsOnDiscard + 1);

            showFlickButtons();

        } else {
        	$('.stack li').removeClass('topOfMain');
            $('.card-count').hide();
            $('.stack').prepend($loadingDivTop);
            $('.stack').append($noMoreCardsDiv);
            $('.no-more-cards-div-bottom').removeClass('hide');
            hideFlickButtons('nextOnly');
        }
        
        sendGAEvent('thrown-out', username + "#" + e.target.getAttribute('cardId'), e.target.getAttribute('cardIndex'));

        var cardReloadCount = 0;
        markCardRead(username, e.target, cardReloadCount); // username is declared globally in index.html

        if (cardsAdded < globalCardsArray.length) {
        	addToStack($liTemplate, stack, globalCardsArray[cardsAdded], cardsAdded, false);
        }

    });

    stack.on('throwin', function(e) {

        if (existsInDiscard(discardPile, e.target)) {

            discardPile.pop();
            var cardEl = $(discardPile[discardPile.length - 1])[0];
            markCardUnique(e.target, 'topOfMain');
            markCardUnique(cardEl, 'topOfDiscard');

            var cardsInDeck = $('.stack li.in-deck');

            if (cardsInDeck.length >= 0) {
                var cardsOnDiscard = discardPile.length;
                var $cardNumText = $('.card-number-text');
                $cardNumText.text(cardsOnDiscard + 1);
            }

            if (cardsInDeck.length >= 3) {

                cardsAdded--;
                var bottomLi = $('.stack li.in-deck')[0];
                var bottomCard = stack.getCard(bottomLi);
                bottomCard.destroy();
                $(bottomLi).remove();
            }

            // move existing in-deck cards to bottom of stack for correct formatting
            cardsInDeck = $('.stack li.in-deck').detach();
            $('.stack').prepend(cardsInDeck);

            $target = $(e.target); 
            $target.stop(true, false); // stop the fade out animation
            $target.fadeIn(1); // fade it back in
            $target.show(); // ensure it's visible
        
            e.target.classList.add('in-deck');
            e.target.classList.remove('removed-from-deck');

            // bring the active card to the top in the li list so it can always be interacted with
            bringToTop(e.target);

            if ($('.loading-div-top').length > 0) {
                $loadingDivTop = $('.loading-div-top').remove();
            }

            if ($('.no-more-cards-div-bottom').length > 0) {
                $noMoreCardsDiv = $('.no-more-cards-div-bottom').remove();
                $('.no-more-cards-div-bottom').addClass('hide');
            }

            showFlickButtons();
            $('.card-count').show();

            if (discardPile.length === 0) {
                hideFlickButtons('previousOnly');
            }

            sendGAEvent('thrown-in', username + "#" + e.target.getAttribute('cardId'), e.target.getAttribute('cardIndex'));
        }

// http://stackoverflow.com/questions/2087510/callback-on-css-transition
// http://stackoverflow.com/questions/5023514/how-do-i-normalize-css3-transition-functions-across-browsers

    });

	$(".next").click(function(e) {
        clickPulse(e.pageX, e.pageY, $('.menu-wrap'));
        throwOutNext(stack);
	});

	$(".previous").click(function(e) {
        clickPulse(e.pageX, e.pageY, $('.menu-wrap'));
        throwInPrevious(stack);
	});

	buildStack(stack);

});

function existsInDiscard(discardPile, targetElem) {
    for (var i = 0; i < discardPile.length; i++) {
        if (discardPile[i] === targetElem)
            return true;
    }
    return false;
}


function throwInPrevious(stack){
	var $cardToThrow = $(".topOfDiscard");
	var cardLi = $cardToThrow[0];

	if (cardLi) {
		var card = stack.getCard(cardLi);
		card.throwIn(cardLi.thrownX, cardLi.thrownY);
        sendGAEvent('button-thrown-in', username + "#" + cardLi.getAttribute('cardId'), cardLi.getAttribute('cardIndex')); 
	}
}

function throwOutNext(stack){
	var $cardToThrow = $(".topOfMain");
	var cardLi = $cardToThrow[0];

	if (cardLi) {
	    var card = stack.getCard(cardLi);
	    cardLi.thrownY = getRandomInt(-100, 100);
	    cardLi.thrownX = 1;
	    card.throwOut(cardLi.thrownX, cardLi.thrownY);
	    sendGAEvent('button-thrown-out', username + "#" + cardLi.getAttribute('cardId'), cardLi.getAttribute('cardIndex'));            
	}
}