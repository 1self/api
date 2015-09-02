function getDataSource (cardData) {
    if (cardData.actionTags && cardData.objectTags) {

        if (cardData.actionTags[0] === "use") {
            return 'rescuetime';
        }

        else if (cardData.actionTags[0] === "listen") {
            return 'lastfm';
        }
            
        else if (cardData.actionTags[0] === "exercise") {
            return 'googlefit';
        }
            
        else if (cardData.actionTags[0] === "browse") {
            return 'visitcounter';
        }
            
        else if (cardData.actionTags[0] === "develop") {
            return 'sublime';
        }
            
        else if (cardData.objectTags[0] === "tweets") {
            return 'twitter';
        }
            
        else if (cardData.objectTags.indexOf("github") >= 0 || cardData.actionTags.indexOf("github") >= 0) {
            return 'github';
        }
        else {
            return 'unknown-data-source';
        }
    } 
}

function getPrimaryColour(dataSourceName) {
	if (dataSourceName === "foursquare")
		return "#fa4778";

	if (dataSourceName === "github")
		return "#000000";

	if (dataSourceName === "googlefit")
		return "#DC493C";

	if (dataSourceName === "hackernews")
		return "#F46507";

	if (dataSourceName === "instagram")
		return "#175A83";

	if (dataSourceName === "intellij")
		return "#1A5CAB";

	if (dataSourceName === "lastfm")
		return "#DD2649";

	if (dataSourceName === "rescuetime")
		return "#a52011";

	if (dataSourceName === "stackoverflow")
		return "#F47920";

	if (dataSourceName === "strava")
		return "#F26122";

	if (dataSourceName === "sublime")
		return "#ff8100";

	if (dataSourceName === "twitter")
		return "#4D97D4";

	if (dataSourceName === "visitcounter")
		return "#0EB6EA";

	if (dataSourceName === "visualstudio")
		return "#6A207D";

	if (dataSourceName === "unknown-data-source")
		return "#0097C4";

	return "#999999";
}


