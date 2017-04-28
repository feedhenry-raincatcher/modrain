var modrain = require('../modrain');


//TODO: This should probably be a separate module.
module.exports = function() {
  angular.module('wfm.core.modrain', []).factory('modrain', function testMediatorService() {
    return modrain;
  });

  return 'wfm.core.modrain';
};