$(function() {

  var updateLocalStorage = function() {
    window.localStorage.theirUsername = $('#friendList').val();
  };

  $('#auth-save-compare').click(function() {
    updateLocalStorage();
    window.qd.plotComparisonGraphs(window.localStorage.theirUsername);
  });

  $('#compare-btn').click(function() {
    $("#compare-modal").modal("show");
    $("#request-comparison").show();
    $("#comparison-email").hide();
    $("#request-comparision-form")[0].reset();
    $("#comparision-email-form")[0].reset();
    $(".compare_error_message").hide();
  });

  $(document).ready(function() {
    var theirUsernameIsAvailable = function() {
      return window.localStorage.theirUsername;
    };
    updateLocalStorage();
    window.qd.plotComparisonGraphs(window.localStorage.theirUsername);
  });

  $('#submit-compare-details').on('click', function(e) {
    var friendsEmail;

    var friendsUsername;
    if ($("#friend-name1").val() !== "") {
      friendsUsername = $("#friend-name1").val()
    } else if ($("#friend-email").val() !== "") {
      friendsEmail = $("#friend-email").val()
    }

    if ((_.isEmpty(friendsUsername) && (_.isEmpty(friendsEmail)))) {
      $(".compare_error_message").show();
      return false;
    }

    var pattern = /^\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,3}$/;
    function isEmailAddress(str) {
       return str.match(pattern);    
    }
      
    if ((_.isEmpty(friendsUsername)) && !(_.isEmpty(friendsEmail)) ) {
        if (!(isEmailAddress(friendsEmail))){
            $(".compare_error_message").show();
            return;
       };
    }

    var yourUsername = $(".user-name").attr('data-username');

    $("#request-comparison").hide();
    $("#comparison-email").show();
    $("#your-name").val(yourUsername);
    var friendName = "";
    if (friendsUsername !== undefined) {
      $("#friend-name2").val(friendsUsername);
      friendName = friendsUsername;
    } else {
      $("#friend-name2").val(friendsEmail);
      friendName = friendsEmail;
    }

    $.get('/email_templates/invite.eml.html', function(template) {
        var rendered = Mustache.render(template, {yourName: yourUsername, friendName: friendName,
                                                 acceptUrl: "#", rejectUrl: "#" });
        $("#email-message").html(rendered);
     });
    
  });

  var emailSuccessCallback = function() {
    $("#send-compare-request-email").removeAttr("disabled");
    alert("Successfully sent compare request.");
    $("#compare-modal").modal("hide");
  };
  var emailFailureCallback = function() {
    $("#send-compare-request-email").removeAttr("disabled");
    $(".compare_error_message").show();
    $("#request-comparison").show();
    $("#comparison-email").hide();
  };
  $('#send-compare-request-email').on('click', function(e) {
    $("#send-compare-request-email").attr("disabled", "true");
    var friendsUsername = $("#friend-name1").val();
    var friendsEmail = $("#friend-email").val();
    var data;
    if (!(_.isEmpty(friendsUsername))) {
      data = {
        'friendsUsername': friendsUsername
      };
      postAjaxWithData("request_to_compare_with_username", data, emailSuccessCallback, emailFailureCallback);
    } else if (!(_.isEmpty(friendsEmail))) {
      data = {
        'friendsEmail': friendsEmail
      };
      postAjaxWithData("request_to_compare_with_email", data, emailSuccessCallback, emailFailureCallback);
    }
  });

});
