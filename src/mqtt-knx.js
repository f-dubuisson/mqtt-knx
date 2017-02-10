#!/usr/bin/env nodejs

console.log('Starting mqtt-knx');

var DEBUG = true;
if (typeof process.env.DEBUG != 'undefined' && process.env.DEBUG == 'true') {
    DEBUG = true;
    console.log('Debug mode enabled');
}

var knxHandler = require('./knx-handler')();
var mqtt = require('mqtt');

console.log('Loading config');
var yaml_config = require('node-yaml-config');
var config = yaml_config.load(__dirname + '/../conf/config.yml');
var host = config.eibdHost;
var port = config.eibdPort;

console.log('Loading group addresses');
var knxProjectLoader = require('./knx-project-loader')();
var groupAddresses = knxProjectLoader.load(__dirname + '/../conf/groupaddresses.xml');

console.log('Connecting to MQTT')
var mqttClient = mqtt.connect(config.mqttHost);
console.log('Connecting to KNX')
knxHandler.connect(host, port, groupAddresses, mqttClient);
console.log('Ready');

mqttClient.subscribe('/knx/+/+/+/set');

mqttClient.on('message', function (topic, message) {
    var c = topic.split('/').length;
    try {
        gad = gaLookupByName(topic.substring(0, topic.indexOf("/set")).split("/").slice(-1)[0]).ga;
    }
    catch(err) {
        console.log('Cannot find ga for [' + topic + '] in ga.xml', err);
        return;
    }

    var value = message.toString();
    if (DEBUG) console.log('mqttClient.on', gad, value);
    if (value === 'true' || value === 'ON' || value === 'on' || value === 'DOWN' || value === 'down') {
        knxHandler.groupWrite(gad, 'write', 'DPT3', '1');
    }
    else if (value === 'false' || value === 'OFF' || value === 'off' || value === 'UP' || value == 'up') {
        knxHandler.groupWrite(gad, 'write', 'DPT3', '0');
    }
    else if (value === '+') {
        knxHandler.groupWrite(gad, 'write', 'DPT3.007', '0C');
    }
    else if (value === '-') {
        knxHandler.groupWrite(gad, 'write', 'DPT3.007', '04');
    }
    else if (value === 'read') {
        knxHandler.groupRead(gad, 'read');
    }
    else if (value.slice(-1) == '%') {
        value = value.substr(0, value.length-1);
        hexString = Math.round(+value * 2.55).toString(16).toUpperCase();
        knxHandler.groupWrite(gad, 'write', 'DPT5.001', hexString);
    }
    else if (value.split('.').length == 2) {
        knxHandler.groupWrite(gad, 'write', 'DPT9', value);
    }
    else if (value.split(':').length == 3) {
        v = value.split(':');
        knxHandler.groupWrite(gad, 'write', 'DPT10.001', [0, v[0], v[1], v[2]]);
    }
    else {
        knxHandler.groupWrite(gad, 'write', 'DPT5', value);
    }
});
