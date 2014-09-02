$(function() {

    var updateLocalStorage = function() {
        window.localStorage.theirUsername = $('#friendList').val();
    };

    $('#friendList').change(function() {
        window.localStorage.theirUsername = $(this).find(":selected").val();
        window.qd.plotComparisonGraphs(window.localStorage.theirUsername);
    });

    $('#compare-btn').click(function() {
        (function(callback){
            $("#request-comparison").show();
            $("#comparison-email").hide();
            $("#compare_email_sent_success").hide();
            $("#request-comparision-form")[0].reset();
            $("#comparision-email-form")[0].reset();
            $(".compare_error_message").hide();
            var fullName = $(".user-name").attr('data-fullname');
            $("#your-name1").val(fullName);
            $('#compare-modal').on('shown.bs.modal', function () {
                $('#friend-email').focus();
            });
            callback();
        })(function(){
            $("#compare-modal").modal("show");
        });
    });

    $(window).resize(function() {
        window.qd.plotComparisonGraphs(window.localStorage.theirUsername);
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

        friendsEmail = $("#friend-email").val();

        if (_.isEmpty(friendsEmail)) {
            $(".compare_error_message").show();
            return false;
        }

        var pattern = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

        function isEmailAddress(str) {
            return str.match(pattern);
        }

        if (!(_.isEmpty(friendsEmail))) {
            if (!(isEmailAddress(friendsEmail))) {
                $(".compare_error_message").show();
                return false;
            };
        }

        var yourUsername = $(".user-name").attr('data-username');
        var yourName = $("#your-name1").val();
        $("#your-name2").val(yourName);

        $("#request-comparison").hide();
        $("#comparison-email").show();

        $("#friend-email-id").val(friendsEmail);

        $.get('/email_templates/invite.eml.html', function(template) {
            var rendered = Mustache.render(template, {
                fromUserFullName: yourName,
                acceptUrl: "#",
                rejectUrl: "#"
            });
            $("#email-message").html(rendered);
        });

    });

    $("#send-compare-request-back").click(function() {
        $("#request-comparison").show();
        $("#comparison-email").hide();
    });

    var emailSuccessCallback = function() {
        $("#send-compare-request-email").removeAttr("disabled");
        $("#request-comparison").hide();
        $("#comparison-email").hide();
        $("#compare_email_sent_success").show();
    };
    var emailFailureCallback = function() {
        $("#send-compare-request-email").removeAttr("disabled");
        $(".compare_error_message").show();
        $("#request-comparison").show();
        $("#comparison-email").hide();
    };
    $('#send-compare-request-email').on('click', function(e) {
        $("#send-compare-request-email").attr("disabled", "true");
        var friendsEmail = $("#friend-email").val();
        var myName = $("#your-name2").val();
        var data;
        if (!(_.isEmpty(friendsEmail))) {
            data = {
                'friendsEmail': friendsEmail,
                'myName': myName
            };
            postAjaxWithData("request_to_compare_with_email", data, emailSuccessCallback, emailFailureCallback);
        }
    });

});
