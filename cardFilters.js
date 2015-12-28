'use strict';
var moment = require('moment');
var _ = require('underscore');

_.mixin({

  // Get/set the value of a nested property
  deep: function (obj, key, value) {

    var keys = key.replace(/\[(["']?)([^\1]+?)\1?\]/g, '.$2').replace(/^\./, '').split('.'),
        root,
        i = 0,
        n = keys.length;

    // Set deep value
    if (arguments.length > 2) {

      root = obj;
      n--;

      while (i < n) {
        key = keys[i++];
        obj = obj[key] = _.isObject(obj[key]) ? obj[key] : {};
      }

      obj[keys[i]] = value;

      value = root;

    // Get deep value
    } else {
      while ((obj = obj[keys[i++]]) !== null && i < n) {}
      value = i < n ? void 0 : obj;
    }

    return value;
  }

});

exports.toDisplay = function(card){
    if(card.type === undefined){
        throw 'type is undefined';
    }
    return card.type !== 'date' && 
    card.type !== 'bottom10' && 
    _.isEqual(card.objectTags, ["internet", "questions", "social-network", "stackoverflow"]) === false &&
    _.isEqual(card.objectTags, ["internet", "reputation", "social-network", "stackoverflow"]) === false &&
    card.read === undefined || card.read === false;
};

exports.filterCards = function(logger, 
    user, 
    username, 
    minStdDev, 
    maxStdDev, 
    unfilteredCards,
    extraFiltering,
    integrations){
    
    username = user ? user.username : username;
    logger.debug([username, "filtercards", "starting"].join(': '));
    var timingInfo = {};
    timingInfo.startMoment = moment();
    var stdDevFilter;
    if(minStdDev && maxStdDev){
        stdDevFilter = function(card){
            return card.type === 'date' || card.sampleCorrectedStdDev > minStdDev && card.sampleCorrectedStdDev < maxStdDev;
        };
    }
    else if(minStdDev)
    {
        stdDevFilter = function(card){
            return card.type === 'date' || card.sampleCorrectedStdDev > minStdDev;
        };   
    }

    // if(filterFunc){
    //     res.cards = _.filter(res.cards, filterFunc);
    // }
    timingInfo.totalCards = unfilteredCards.length;

    var result = unfilteredCards;
    if(extraFiltering)
    {
        var  cards = {};
        var syncingGeneratingCards = [];
        _.each(unfilteredCards, function(card){

            if(!card.read && (card.type === 'datasyncing' || card.type === 'cardsgenerating')){
                card.id = card._id;
                card.serviceName = card.appDbId && integrations[card.appDbId] ? integrations[card.appDbId].title : '';
                card.identifier = card.appDbId && integrations[card.appDbId] ? integrations[card.appDbId].urlName : '';
                delete card._id;
                syncingGeneratingCards.push(card);
            }
        });


        var grouped = _(unfilteredCards).groupBy(function(card){
            //var cardType = card.type === 'date' ? '_date' : card.type;
            return card.cardDate + '/' + card.type;
        });

        var addToCards = function(card){
            card.id = card._id;
            delete card._id;
            var positionName = [card.type, card.objectTags.join(','), card.actionTags.join(','),card.propertyName].join('.');
            if(cards[positionName] === undefined){
                cards[positionName] = [];
            }

            if(cards[positionName][card.position] === undefined){
                cards[positionName][card.position] = [];
            }

            // if(positionName === 'bottom10.computer,git,github,software,source control.commit.line-changes.sum.file-types.dev'){
            //     debugger;
            // }

            cards[positionName][card.position].push(card);
        };
        

        // eas: this should be a foreach, change it.
        _(grouped).mapObject(function(value){
            // if(key === "2015-07-25/bottom10"){
            //     debugger;
            // }
            var sortedCardsForDay = _(value).reduce(function(memo, card){
                if(card.propertyName !== undefined){
                    _.deep(memo, [card.objectTags.join(','), card.actionTags.join(','), card.propertyName].join('/') + '.__card__', card);
                }

                return memo;
            }, {});

            var addBranch = function(node, depth){
               
                var candidateCard = node.__card__;
                if(candidateCard !== undefined){
                    var daysDiff = (moment() - moment(candidateCard.cardDate)) / 1000 / 60 / 60 / 24;
                    candidateCard.weight = (1.0/depth) * Math.pow(0.99,daysDiff);
                    candidateCard.depth = depth;
                    
                    addToCards(candidateCard);

                    _.each(_.keys(node), function(nodeKey){
                        if(nodeKey !== '__card__'){
                            addBranch(node[nodeKey], depth +1);
                        }
                    });
                }
                else{
                    _.each(_.keys(node), function(nodeKey){
                        addBranch(node[nodeKey], depth +1);
                    });
                }
            };

            addBranch(sortedCardsForDay, 0);
        });

        var findFirstNode = function(node){
            var result = [];

            var candidateCard = node.__card__;
            if(candidateCard !== undefined){
                result.push(candidateCard);
            }
            else{
                _.each(_.keys(node), function(nodeKey){
                    result.push(findFirstNode(node[nodeKey]));
                });
            }

            return result;
        };

        

        var filteredPositions = _.chain(cards)
        .map(function(v){
            return _.chain(v)
            .filter(Boolean)
            .first()
            .sortBy('cardDate')
            .sortBy('sortingValue')
            .value()[0];
        })
        
        .reduce(function(memo, card){
                if(card.propertyName !== undefined){
                    _.deep(memo, [card.type, card.objectTags.join(','), card.actionTags.join(','), card.propertyName].join('/') + '.__card__', card);
                }

                return memo;
            }, {})
        .map(function(cardBranch){
            return findFirstNode(cardBranch);
        })
        .flatten()
        .filter(exports.toDisplay)
        .groupBy(function(card){
             return card.cardDate;
             })
        
        .map(function(value, key){
            var dateCard = {
                type: 'date',
                cardDate: key
            };
            return [dateCard, value];
        })
        .flatten()
        .union(syncingGeneratingCards)
        .sortBy(function(card){
            return card.cardDate;
        })
        
        .value();

        result = filteredPositions;
    }

    return result;
};