'use strict'

exports.toDisplay = function(card){
	if(card.type === undefined){
		throw 'type is undefined';
	}
    return card.type !== 'date' && 
    card.type !== 'bottom10' && 
    card.read === undefined || card.read === false;
};