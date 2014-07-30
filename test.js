var _ = require('underscore')
var qd_events = [];

_.each([1, 2, 3], function(e) { setTimeout(function(){qd_events.push(e + 5)}, 1000)});
console.log(qd_events)
