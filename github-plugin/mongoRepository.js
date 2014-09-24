module.exports = function (mongoConnection) {
    this.mongoConnection = mongoConnection;

    this.findById = function (id) {
        console.log("Here's your record " + id);
        console.log("connection object is : " + this.mongoConnection);
    };

};
