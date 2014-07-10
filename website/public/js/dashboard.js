var dashboardGraphs = ['updateBuildModel', 'updateWTFModel', 'updateHydrationModel', 'updateCaffeineModel', 'updateBuildDurationModel', 'updateHourlyBuildHeatMap', 'updateHourlyWtfHeatMap', 'updateHourlyHydrationHeatMap', 'updateHourlyCaffeineHeatMap', 'updateActiveEvents'];

var updateLocalStorage = function() {
	window.localStorage.streamId = $('#stream-id').val();
	window.localStorage.readToken = $('#read-token').val();
};

$('#auth-save').click(function() {
	updateLocalStorage();
	window.qd.plotGraphs(dashboardGraphs);
});

$("#builds-x").ready(function() {
	window.qd.registerForBuildModelUpdates(function() {
		var displayBuildCountAndBuildComparison = function(buildCount, buildCountElementId, comparisonValue, comparisonElementId) {
			$(buildCountElementId).text(buildCount);
			var buildComparison = Math.abs(comparisonValue);
			if (buildComparison && buildComparison !== Infinity) {
				$(comparisonElementId).text(buildComparison + "%");
				if (comparisonValue < 0) {
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
	var queryParamsExist = function() {
		return $('#stream-id').val() && $('#read-token').val();
	}

	var localStorageHasValues = function() {
		return window.localStorage.streamId && window.localStorage.readToken;
	}

	var populateTextboxes = function() {
		$('#stream-id').val(window.localStorage.streamId);
		$('#read-token').val(window.localStorage.readToken);
	}

	if (queryParamsExist()) {
		updateLocalStorage();
		window.qd.plotGraphs(dashboardGraphs);
	} else if (localStorageHasValues()) {
		populateTextboxes();
		window.qd.plotGraphs(dashboardGraphs);
	}
});