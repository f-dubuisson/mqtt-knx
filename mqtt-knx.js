#!/usr/bin/env node

console.log('Starting mqtt-knx');

var DEBUG = false;
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
                    groupAddresses.push({'ga' : item['$'].Address, 'name' : item['$'].Name, 'name-level2' : nameL2, 'name-level3' : nameL3});
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

function groupWrite(gad, messageAction, DPTType, value) {
    if (DEBUG) console.log('groupWrite', gad, messageAction, DPTType, value);
    var address = eibd.str2addr(gad);

    eibdConn.socketRemote(eibdOpts, function () {
        eibdConn.openTGroup(address, 1, function (err) {
            var msg = eibd.createMessage(messageAction, DPTType, parseInt(value));
            eibdConn.sendAPDU(msg, function (err) {
                if (err) {
                    console.error(err);
                }
            });
        });
    });
}

mqttClient.subscribe('/actor/knx/+/+/+');

mqttClient.on('message', function (topic, message) {
    var gad = topic.substr(topic.length + 1, topic.length - topic.length - 5);
    var gad = topic.split("/").slice(-4, -1).join('/');
    var value = message.toString();
    if (DEBUG) console.log('mqttClient.on', gad, value);
    if (value === 'true') {
        groupWrite(gad, 'write', 'DPT3', '1');
    }
    else if (value === 'false') {
        groupWrite(gad, 'write', 'DPT3', '0');
    }
    else {
        groupWrite(gad, 'write', 'DPT5', value);
    }
});

eibdConn.socketRemote(eibdOpts, function () {
    eibdConn.openGroupSocket(0, function (parser) {
        parser.on('write', function (src, dest, type, val) {
            var value = getDPTValue(val, type);
            if (value) {
console.log(value, dest);
                var topic = '/sensor/knx/' + dest
                var message = gaLookup(dest);
                if (typeof message == 'undefined') return;
                message.value = value;
                message = JSON.stringify(message);
                if (DEBUG) console.log(topic, message);
                mqttClient.publish(topic, message, { retain: true });
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
        case 'DPT5':
            return (val * 100 / 255).toFixed(1) + '%';
        case 'DPT9':
            return val.toFixed(2);
        default:
            return undefined;
    }
}

