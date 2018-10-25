'use strict';

const path = require('path');
const {updateKitePaths} = require('kite-api/test/helpers/kite');

module.exports = ({action, root}) => {
  beforeEach(() => { 
    updateKitePaths({
      blacklist: action.properties.blacklist.map(p => path.join(root(), p)),
    });
  });
};
