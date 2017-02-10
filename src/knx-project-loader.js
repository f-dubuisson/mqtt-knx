var fs = require('fs')
var parser = require('xml2js').parseString;

function KnxProjectLoader() {

}

KnxProjectLoader.prototype.load = function(filename) {
  var groupAddresses = [];
  fs.readFile(filename, 'utf8', function (err,data) {
    if (err) {
      throw new Error(`Error parsing the KNX project file ${filename}: ${err}`);
    }
    parser(data, function (err, result) {
      var L1 = result["KNX"]["Project"][0]["Installations"][0]["Installation"][0]["GroupAddresses"][0]["GroupRanges"][0]["GroupRange"];
      L1.forEach(function (L2) {
        if (typeof L2 == 'undefined') return;
        nameL2 = L2['$'].Name;
        L2.GroupRange.forEach(function (L3) {
        if (typeof L3.GroupAddress == 'undefined') return;
          nameL3 = L3['$'].Name;
          L3.GroupAddress.forEach(function (item) {
  		      var gad = addressValueToGad(item['$'].Address);
            groupAddresses.push({'ga' : gad, 'name' : item['$'].Name, 'device' : nameL2, 'type' : nameL3});
            console.log("Adding item: ", item['$'].Name, gad);
          });
        });
      });
    });
  });

  return groupAddresses;
}

function addressValueToGad(value) {
  var A = Math.floor(value / 2048);
  var B = Math.floor((value % 2048) / 256);
  var C = (value % 256);

  return A + '/' + B + '/' + C;
}

function init() {
  var e = new KnxProjectLoader();
  return e;
}

module.exports = init;
