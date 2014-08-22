stream=$(curl -x localhost:8888 	-X POST http://app.quantifieddev.org/stream)

id=$(echo $stream | sed 's_.*"streamid": "\([^"]*\)".*_\1_')
read=$(echo $stream | sed 's_.*"readToken": "\([^"]*\)".*_\1_')
write=$(echo $stream | sed 's_.*"writeToken": "\([^"]*\)".*_\1_')

curl -k -x localhost:8888 -X POST -H Content-Type:application/json -H Authorization:$write -H Cache-Control:no-cache -d '{ "dateTime": "2014-03-31T15:28:36.1788806Z", "location": { "lat": 52.5203, "long": 0.8567 }, "actionTags": [ "Build", "Start" ], "objectTags": [ "Computer", "Software" ], "properties": { "Language": "C#", "Environment": "VisualStudio2012" } }' http://app.quantifieddev.org/stream/$id/event

echo register this stream at http://app.quantifieddev.org/dashboard?streamId=$id\&readToken=$read