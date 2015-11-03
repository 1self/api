'use strict';

var assert = require('assert');
var cardFilters = require('../cardFilters');

var logger = {
	messages:{
		verbose: [],
		info: [],
		warn: [],
		debug: [],
		silly: []
	}
};

describe('cardfilters', function () {
  it('filters out bottom 10', function () {
    var result = cardFilters.toDisplay({type: 'bottom10'});
    assert(result === false);
  });

  it('filters out date', function () {
    var result = cardFilters.toDisplay({type: 'date'});
    assert(result === false);
  });

  it('filters in top10', function () {
    var result = cardFilters.toDisplay({type: 'top10'});
    assert(result === true);
  });

  it('filters out read', function () {
    var result = cardFilters.toDisplay({type: 'top10', read: true});
    assert(result === false);
  });
});


