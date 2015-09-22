'use strict'

var logger = function(scope, innerLogger){
    return {
        debug: function(message, data){
            innerLogger.debug(scope + ': ' + message, data);
        },
        info: function(message, data){
            innerLogger.info(scope + ': ' + message, data);
        },
        warning: function(message, data){
            innerLogger.warning(scope + ': ' + message, data);
        },
        silly: function(message, data){
            innerLogger.silly(scope + ': ' + message, data);
        },
        error: function(message, data){
            innerLogger.error(scope + ': ' + message, data);
        }
    };
}

exports.logger = logger;