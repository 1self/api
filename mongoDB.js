var mongoClient = require('mongodb').MongoClient;
var mongoAppKey = process.env.DBKEY;
var mongoUri = process.env.DBURI;
var qdDb;

console.log("Connecting XX to: " + mongoUri);

mongoClient.connect(mongoUri, function(err, db) {
	console.log("XXXXX");
	if (err) {
		console.log(err);
	} else {
		qdDb = db;
		console.log('database connected : ' + qdDb);
	}
});

exports.qdDb = qdDb
