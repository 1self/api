window.addEventListener("load", executeOnLoadTasks);

function executeOnLoadTasks() {

  // var cal = new Calendar(1);

  var month = 8;
  var year = 2015;
  // var weeks = cal.monthDays(year, month);

  var table = d3.select('#calendar');
  // var header = table.append('thead');
  // var body = table.append('tbody');

  var monthNames = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];
  var dayNames = [ "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun" ];
  // var dayNames = [ "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday" ];

  var isToday = function(dayOfMonth) {
    var now = new Date();
    if (now.getMonth() === month) {
      if (now.getDate() === dayOfMonth) {
        return true;
      }
    }
    return false;
  };

  var today = new Date();
  var data = createData(today, 14);
  console.log(data);

  // header
  //   .append('tr')
  //   .append('td')
  //   .attr('colspan', 7)
  //   .style('text-align', 'center')
  //   .text(monthNames[month]);

  // header
  //   .append('tr')
  //   .selectAll('td')
  //   .data(dayNames)
  //   .enter()
  //   .append('td')
  //   .style('text-align', 'center')
  //   .text(function (d) {
  //     return d;
  //   });

  // weeks.forEach(function (week) {
    table
      // .append('tr')
      .selectAll('div')
      .data(data)
      .enter()
      .append('div')
      .attr('class', function (d) { 
        d=1;
        var classes = "calendar-day ";
        if (d > 0) {
          classes += "is-day";
          if (isToday(d)) {
            classes += " is-today";
          }
        } else {
          classes += "empty";
        }
        return classes;
      })
      .text(function (d) {
        return d > 0 ? d : '';
      });
//   });
}

function createDataElements() {
  var returnElements = [];
  var sourceTemplates = [
      {
        dataSource: "strava",
        value: {
          description: "kilometers ridden"
        }        
      },
      {
        dataSource: "googlefit",
        value: {
          description: "kilometers ridden"
        }        
      },
      {
        dataSource: "lastfm",
        value: {
          description: "kilometers ridden"
        }        
      },
      {
        dataSource: "sublime",
        value: {
          description: "kilometers ridden"
        }        
      },
      {
        dataSource: "twitter",
        value: {
          description: "kilometers ridden"
        }        
      },
      {
        dataSource: "instagram",
        value: {
          description: "kilometers ridden"
        }        
      },
      {
        dataSource: "github",
        value: {
          description: "kilometers ridden"
        }        
      }
  ];

  var numberToAdd = getRandomInt(0, sourceTemplates.length);

  var alreadyAdded = [];
  for (var i = 0; i < numberToAdd; i++) {
    var whichToAdd = -1;
    while (whichToAdd < 0 || alreadyAdded.indexOf(whichToAdd) >= 0) {
      whichToAdd = getRandomInt(0, numberToAdd - 1);
    }
    alreadyAdded.push(whichToAdd);

    var sourceTemplate = sourceTemplates[whichToAdd];
    sourceTemplate.iconUrl = "img/service-" + sourceTemplate.dataSource + ".svg";
    sourceTemplate.colours = [];
    sourceTemplate.colours.push(getPrimaryColour(sourceTemplate.dataSource));
    sourceTemplate.value = {};
    sourceTemplate.value.dataValue = 104;
    sourceTemplate.value.relativeValue = (Math.round(Math.random() * 100) / 100);

    returnElements.push(sourceTemplate);
  }

  return returnElements;
}

function createData(untilDate, numberOfDays) {
  var formatDate = d3.time.format("%d-%m-%Y");
  var msInADay = 1000 * 60 * 60 * 24;
  var data = [];

  var startDate = new Date(untilDate.getTime() - (msInADay * numberOfDays));
  for (var i = 0; i < numberOfDays; i++) {
    var dataItem = {};
    var dataItemDate = new Date(startDate.getTime() + (msInADay * i));
    dataItem.date = formatDate(dataItemDate);
    dataItem.dataElements = createDataElements();
    data.push(dataItem);
  }

  return data;
}

           