
function GADictionary() {
  this.data = [];
}

GADictionary.prototype.add = function(ga, name, device, type) {
  this.data.push({
    'ga' : ga,
    'name' : name,
    'device' : device,
    'type' : type
  });
}

GADictionary.prototype.gaLookup = function(ga) {
  return this.data.filter(
    function (element, index) {
      if (element.ga != ga) return false;
      return true;
    }).pop();
}

GADictionary.prototype.gaLookupByName = function(name) {
  return this.data.filter(
    function (element, index) {
      if (element.name != name) return false;
      return true;
    }).pop();
}

function init() {
  var e = new GADictionary();
  return e;
}

module.exports = init;
