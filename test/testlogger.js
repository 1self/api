

var logger = {
  messages:{
    verbose: [],
    info: [],
    warn: [],
    debug: [],
    silly: []
  },

  verbose: function(message){
    this.messages.verbose.push(message);
  },

  info: function(message){
    this.messages.info.push(message);
  },

  warn: function(message){
    this.messages.warn.push(message);
  },

  debug: function(message){
    this.messages.debug.push(message);
  },

  silly: function(message){
    this.messages.silly.push(message);
  },

};

module.exports.logger = logger;