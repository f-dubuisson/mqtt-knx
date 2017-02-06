var self = module.exports = {
  getDPTValue : function(val, type) {
    switch (type) {
      case 'DPT1':
        if (val === 0) {
          return 'false';
        } else {
          return 'true';
        }
        break;
      case 'DPT3.007':
      case 'DPT10.001':
        return val;
      case 'DPT5':
        return (val * 100 / 255).toFixed(1) + '%';
      case 'DPT9':
        return val.toFixed(2);
      default:
        return undefined;
    }
  },

  gaLookup : function(ga, groupAddresses) {
    return groupAddresses.filter(
      function (element, index) {
        if (element.ga != ga) return false;
        return true;
      }).pop();
  },

  gaLookupByName : function(name, groupAddresses) {
    return groupAddresses.filter(
      function (element, index) {
        if (element.name != name) return false;
        return true;
      }).pop();
  }
}
