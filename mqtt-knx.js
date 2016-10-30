#!/usr/bin/env node

console.log('Starting mqtt-knx');

var DEBUG = true;
if (typeof process.env.DEBUG != 'undefined' && process.env.DEBUG == 'true') {
    DEBUG = true;
    console.log('Debug mode enabled');
}

var eibd = require('eibd');
var mqtt = require('mqtt');
var parser = require('xml2js').parseString;
var yaml_config = require('node-yaml-config');

var nameL2;
var nameL3;
var groupAddresses = [];

var fs = require('fs')
console.log('Loading group addresses');
fs.readFile(__dirname + '/groupaddresses.xml', 'utf8', function (err,data) {
    if (err) {
        return console.log(err);
    }
    console.log('parsing xml data');
    parser(data, function (err, result) {
        var L1 = result["GroupAddress-Export"].GroupRange;
        L1.forEach(function (L2) {
            if (typeof L2 == 'undefined') return;
            nameL2 = L2['$'].Name;
            L2.GroupRange.forEach(function (L3) {
                if (typeof L3.GroupAddress == 'undefined') return;
                nameL3 = L3['$'].Name;
                L3.GroupAddress.forEach(function (item) {
                    groupAddresses.push({'ga' : item['$'].Address, 'name' : item['$'].Name, 'device' : nameL2, 'type' : nameL3});
                });
            });
        });
    });
});

var gaLookup = function(ga) {
    return groupAddresses.filter(
        function (element, index) {
            if (element.ga != ga) return false;
            return true;
        }
    ).pop();
};

var gaLookupByName = function(name) {
    return groupAddresses.filter(
        function (element, index) {
            if (element.name != name) return false;
            return true;
        }
    ).pop();
};


console.log('loading config');
var config = yaml_config.load(__dirname + '/config.yml');
var host = config.eibdHost;
var port = config.eibdPort;

console.log('connecting to mqtt')
var mqttClient = mqtt.connect(config.mqttHost);

console.log('connecting to eibd');
var eibdConn = eibd.Connection();
var eibdOpts = { host: config.eibdHost, port: config.eibdPort };
console.log('bootstrap done');

var block = false;

function groupWrite(gad, messageAction, DPTType, value) {

  var synchronous = function() {
	   setTimeout(
  	    function(){
  	       if (block){
              synchronous();
            }
            else {
              block = true;
              groupWriteDo(gad, messageAction, DPTType, value);
            }
          },
          50);
        };
  synchronous(gad);
}

function groupWriteDo(gad, messageAction, DPTType, value) {
    block = true;
    if (DPTType == 'DPT10.001' || DPTType == 'DPT9') {}
    else if (DPTType != 'DPT3.007' && DPTType != 'DPT5.001' ) {
        value = parseInt(value);
    }
    else {
        value = parseInt(value, 16);
    }
    if (DEBUG)
        console.log('groupWrite', gad, messageAction, DPTType, value);
    var address = eibd.str2addr(gad);

    eibdConn.socketRemote(eibdOpts, function () {
        eibdConn.openTGroup(address, 1, function (err) {
            var msg = eibd.createMessage(messageAction, DPTType, value);
            eibdConn.sendAPDU(msg, function (err) {
                block = false;
                if (err) {
                    console.error('Error:', err);
                }
            });
        });
    });
}

function groupRead(gad) {
    if (DEBUG)
        console.log('groupRead', gad);
    var address = eibd.str2addr(gad);

    eibdConn.socketRemote(eibdOpts, function () {
        eibdConn.openTGroup(address, 1, function (err) {
            var msg = eibd.createMessage('read');
            eibdConn.sendAPDU(msg, function (err) {
                block = false;
                if (err) {
                    console.error('Error:', err);
                }
            });
        });
    });
}

mqttClient.subscribe('/knx/actor/+/+/+/+');
mqttClient.subscribe('/knx/actor/+/+');

mqttClient.on('message', function (topic, message) {
    var c = topic.split('/').length;
    if (c == 7) {
        var gad = topic.split("/").slice(-3).join('/');
    }
    else if (c == 5) {
        try {
            gad = gaLookupByName(topic.split("/").slice(-1)[0]).ga;
        }
        catch(err) {
            console.log('Cannot find ga for [' + topic + '] in ga.xml', err);
            return;
        }
    }

    if (DEBUG) console.log(topic, message, gad, value);

    var value = message.toString();
    //if (DEBUG) console.log('mqttClient.on', gad, value);
    if (value === 'true' || value === 'ON' || value === 'on' || value === 'DOWN' || value === 'down') {
        groupWrite(gad, 'write', 'DPT3', '1');
    }
    else if (value === 'false' || value === 'OFF' || value === 'off' || value === 'UP' || value == 'up') {
        groupWrite(gad, 'write', 'DPT3', '0');
    }
    else if (value === '+') {
        groupWrite(gad, 'write', 'DPT3.007', '0C');
    }
    else if (value === '-') {
        groupWrite(gad, 'write', 'DPT3.007', '04');
    }
    else if (value === 'read') {
        groupRead(gad, 'read');
    }
    else if (value.slice(-1) == '%') {
        value = value.substr(0, value.length-1);
        hexString = Math.round(+value * 2.55).toString(16).toUpperCase();
        groupWrite(gad, 'write', 'DPT5.001', hexString);
    }
    else if (value.split('.').length == 2) {
        groupWrite(gad, 'write', 'DPT9', value);
    }
    else if (value.split(':').length == 3) {
        v = value.split(':');
        groupWrite(gad, 'write', 'DPT10.001', [0, v[0], v[1], v[2]]);
    }
    else {
        groupWrite(gad, 'write', 'DPT5', value);
    }
});

eibdConn.socketRemote(eibdOpts, function () {
    eibdConn.openGroupSocket(0, function (messageparser) {
        messageparser.on('write', function (src, dest, type, val) {
            var value = getDPTValue(val, type);
            if (value) {
                var gaItem = gaLookup(dest);
                if (typeof gaItem == 'undefined') return;

                if (gaItem.device != 'sensor') return;

                var topic = '/knx/sensor/' + gaItem.type + '/' + gaItem.name;
                gaItem.value = value;
                message = JSON.stringify(gaItem);
                if (DEBUG) console.log(topic, message);
                mqttClient.publish(topic, message, { "retain": false, "qos": 2 });
            }
        });
    });
});

function getDPTValue(val, type) {
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
}
