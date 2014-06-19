var $border_color = "#efefef";
var $grid_color = "#ddd";
var $default_black = "#666";
var $primary = "#575348";
var $secondary = "#8FBB6C";
var $orange = "#F38733";

// SparkLine Bar
$(function() {


});

//Date Range Picker
$(document).ready(function() {
    $('#reportrange').daterangepicker({
            startDate: moment().subtract('days', 29),
            endDate: moment(),
            minDate: '01/01/2012',
            maxDate: '12/31/2014',
            dateLimit: {
                days: 60
            },
            showDropdowns: true,
            showWeekNumbers: true,
            timePicker: false,
            timePickerIncrement: 1,
            timePicker12Hour: true,
            ranges: {
                'Minute': [moment(), moment()],
                'Hour': [moment().subtract('days', 1), moment().subtract('days', 1)],
                'Day': [moment().subtract('days', 6), moment()],
                'Last 30 Days': [moment().subtract('days', 29), moment()],
                'This Month': [moment().startOf('month'), moment().endOf('month')],
                'Last Month': [moment().subtract('month', 1).startOf('month'), moment().subtract('month', 1).endOf('month')]
            },
            opens: 'left',
            buttonClasses: ['btn btn-default'],
            applyClass: 'btn-small btn-info',
            cancelClass: 'btn-small',
            format: 'MM/DD/YYYY',
            separator: ' to ',
            locale: {
                applyLabel: 'Submit',
                fromLabel: 'From',
                toLabel: 'To',
                customRangeLabel: 'Custom Range',
                daysOfWeek: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
                monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
                firstDay: 1
            }
        },
        function(start, end) {
            console.log("Callback has been called!");
            window.updateLiveDuration(0);
            $('#reportrange span').html(start.format('MMMM D, YYYY') + ' - ' + end.format('MMMM D, YYYY'));
        }
    );
    //Set the initial state of the picker label
    $('#reportrange span').html(moment().subtract('days', 29).format('MMMM D, YYYY') + ' - ' + moment().format('MMMM D, YYYY'));
});

//Sortable
$(function() {
    $(".sortable").sortable();
    $(".sortable").disableSelection();
});

//Datepicker
$(function() {
    $("#datepicker").datepicker();
});

//Timer for tiles info
var x = 3395,
    y = 5578;

//Dropdown Menu
$(document).ready(function() {
    $('#menu > ul > li > a').click(function() {
        $('#menu li').removeClass('active');
        $(this).closest('li').addClass('active');
        var checkElement = $(this).next();
        if ((checkElement.is('ul')) && (checkElement.is(':visible'))) {
            $(this).closest('li').removeClass('active');
            checkElement.slideUp('normal');
        }
        if ((checkElement.is('ul')) && (!checkElement.is(':visible'))) {
            $('#menu ul ul:visible').slideUp('normal');
            checkElement.slideDown('normal');
        }
        if ($(this).closest('li').find('ul').children().length == 0) {
            return true;
        } else {
            return false;
        }
    });
});


$(function() {
    $(document).ready(function() {
        $.slidebars();
    });
});

//Sidebar
$(function() {
    var s = 0;

    $('.arrow-box').click(function() {
        if (s == 0) {
            s = 1;
            $('#sidebar').css('left', '-220px');
            $('.dashboard-wrapper').css('margin-left', '0px');
            $('.logo').css('background', 'transparent');
        } else {
            s = 0;
            $('#sidebar').css('left', '0');
            $('.dashboard-wrapper').css('margin-left', '220px');
            $('.logo').css('background', '');
        }
    });
});

//Tooltip
$('a').tooltip();

//Popover
$('button').popover();


//
$('#mob-nav').click(function() {
    if ($('aside.open').length > 0) {
        $('aside').attr('style', 'left: -220px').removeClass('open')
    } else {
        $('aside').attr('style', 'left: 0px').addClass('open')
    }
});