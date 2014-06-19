$('#auth-save').click(function() {
	var streamId = $('#stream-id').val();
	var readToken = $('#read-token').val();
	window.qd.save(streamId, readToken);
});

$("#builds-x").ready(function() {
	window.qd.registerForBuildModelUpdates(function() {
		var displayBuildCountAndBuildComparison = function(buildCount, buildCountElementId, comparisonValue, comparisonElementId) {
			$(buildCountElementId).text(buildCount);
			var buildComparison = Math.abs(comparisonValue);
			if (buildComparison && buildComparison !== Infinity) {
				$(comparisonElementId).text(buildComparison + "%");
				if (comparisonValue< 0) {
					$(comparisonElementId).addClass("icon-caret-down");
				} else if (comparisonValue > 0) {
					$(comparisonElementId).addClass("icon-caret-up");
				}
			}
		};

		displayBuildCountAndBuildComparison(window.qd.todaysTotalBuildCount, "#builds-x", window.qd.totalBuildComparison, "#total-build-comparison");
		displayBuildCountAndBuildComparison(window.qd.todaysPassedBuildCount, "#passed-x", window.qd.passedBuildComparison, "#passed-build-comparison");
		displayBuildCountAndBuildComparison(window.qd.todaysFailedBuildCount, "#failed-x", window.qd.failedBuildComparison, "#failed-build-comparison");
	});
});

$(document).ready(function() {
	// if url contains latest stream values, update local storage
	// else get the values from local storage and update textfield values.
	var streamId = $('#stream-id').val();
	var readToken = $('#read-token').val();
	if (streamId && readToken) {
		window.qd.save(streamId, readToken);
	} else {
		if (window.qd.streamId && window.qd.readToken) {
			$('#stream-id').val(window.qd.streamId);
			$('#read-token').val(window.qd.readToken);
			window.qd.save(window.qd.streamId, window.qd.readToken);
		}
	}
});