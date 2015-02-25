var q = require("q");

function doSomething(page) {
	var deferred = q.defer()
	setTimeout(function() {
		console.log("page " + page + " fetched.");
		deferred.resolve(page);
	}, 1);
	return deferred.promise;
}

var pages = [1, 2, 3, 4, 5];

pages.reduce(function(chain, page) {
	return chain.then(function() {
			return doSomething(page)
		})
		.then(console.log);
}, q.resolve());