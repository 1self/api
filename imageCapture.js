var path = require('path')
var childProcess = require('child_process')
var phantomjs = require('phantomjs')
var binPath = phantomjs.path
var q = require('q');

exports.saveChartImage = function(url, output) {
    var deferred = q.defer();
    var apiUrl = process.env.CONTEXT_URI + url;

	console.log("SAVING THE IMAGE FROM ", apiUrl, " TO ", output);
	var width = 390,
		height = 435;

	var childArgs = [
		path.join(__dirname, 'scripts', 'phantom-image-script.js'),
		apiUrl, output, width, height
	];

	childProcess.execFile(binPath, childArgs, function(err, stdout, stderr) {
		// handle results 
		console.log("Child process results: ", err, stdout, stderr);
		if (err !== null) {
			deferred.reject(err);
		}
		deferred.resolve();
	});

    return deferred.promise;
};

// exports.saveChartImg('','images/lalal.png');