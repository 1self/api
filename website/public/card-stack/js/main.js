  $(document).keydown(function (e) {
      var keyCode = e.keyCode || e.which,
      arrow = {left: 37, up: 38, right: 39, down: 40 };

      switch (keyCode) {
          case arrow.left:
              $('.previous').trigger('click');
          break;
          case arrow.right:
              $('.next').trigger('click');
          break;
          case arrow.down:
              $('.topOfMain .more').trigger('click');
          break;
          case arrow.up:
              $('.topOfMain .more-back').trigger('click');
          break;
          default: return; // allow other keys to be handled
      }
      e.preventDefault();
      // prevent default action (eg. page moving up/down)
      // but consider accessibility (eg. user may want to use keys to choose a radio button)
  });   
// Menu

(function() {
  $(".flyout-btn").click(function() {
    console.log('click 1');
    $(".flyout-btn").toggleClass("btn-rotate");
    $(".overlay").toggleClass("open");
    // $(".flyout").find("a").removeClass();
    
    $li = $('.topOfMain');
    sendGAEvent('menu-button-click', username + "#" + $li.attr('cardId'), $li.attr('cardIndex'));

    return $(".flyout").removeClass("flyout-init fade").toggleClass("expand");
  });

  $(".flyout").find("a").click(function() {
    console.log('click 2');
    $(".flyout-btn").toggleClass("btn-rotate");
    $(".flyout").removeClass("expand").addClass("fade");
    return $(this).addClass("clicked");
  });

  $(".share").find("a").click(function() {
    console.log('click 3');
    return $(this).addClass("clicked");
  });

  $(".share").click(function() {
    console.log('click 5');
    $(".flyout-btn").toggleClass("btn-rotate");
    $(".share-buttons-wrap").toggleClass("hide zoomIn");
    $(".overlay").toggleClass("open");
  });

  $('.removed-from-deck').delay(1000).remove();

  $(".flyout").find("a").click(function (e) {
    console.log('click 6');
    e.preventDefault();                   // prevent default anchor behavior
    var goTo = this.getAttribute("href"); // store anchor href

    // do something while timeOut ticks ... 

    setTimeout(function(){
         window.location = goTo;
    }, 550);

  
});  

}).call(this);


function clickPulse(x, y, $pulseElem) {
    
    var clickY = y - $pulseElem.offset().top;
    var clickX = x - $pulseElem.offset().left;
    var setX = parseInt(clickX);
    var setY = parseInt(clickY);

    $pulseElem.find("svg.click-circle").remove();
    $pulseElem.append('<svg class="click-circle"><circle cx="'+setX+'" cy="'+setY+'" r="'+100+'"></circle></svg>');


    var c = $pulseElem.find("circle");
    c.animate(
        {
          "r" : $pulseElem.outerWidth()
        }, 200, function() { $pulseElem.find("svg.click-circle").remove(); }
    );  
}

function sendGAEvent(eventAction, eventLabel, eventValue) {
    var gaObj = {};
    gaObj.eventCategory = 'card-stack';
    gaObj.eventAction = eventAction;
    gaObj.eventLabel = eventLabel;
    gaObj.eventValue = eventValue;

    console.log('gaObj', gaObj);
    console.log(ga);

    ga('send', 'event', gaObj);
}

window.logInfoClick = function(elem) {
    var $elem = $(elem);
    var cardLi = $elem.parentsUntil('ul', 'li')[0];
    sendGAEvent('infoLink_click', cardLi.getAttribute('cardId'), username);
};




