var mongoClient = require('mongodb').MongoClient;
var mongoAppKey = process.env.DBKEY;
var mongoUri = process.env.DBURI;
var qdDb;

console.log("Connecting to: " + mongoUri);

mongoClient.connect(mongoUri, function(err, db) {
	if (err) {
		console.log(err);
	} else {
		qdDb = db;
		console.log('database connected : ' + qdDb);
	}
});

exports.qdDb = qdDb
