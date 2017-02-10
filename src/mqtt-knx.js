#!/usr/bin/env nodejs

var DEBUG = true;
if (typeof process.env.DEBUG != 'undefined' && process.env.DEBUG == 'true') {
    DEBUG = true;
    console.log('Debug mode enabled');
}

var knxHandler = require('./knx-handler')();
var mqttHandler = require('./mqtt-handler')();

console.log('Loading config');
var yaml_config = require('node-yaml-config');
var config = yaml_config.load(__dirname + '/../conf/config.yml');

console.log('Loading group addresses');
var knxProjectLoader = require('./knx-project-loader')();
var gaDictionary = knxProjectLoader.load(__dirname + '/../conf/groupaddresses.xml');

console.log(`Connecting to MQTT: ${config.mqttHost}`)
mqttHandler.connect(config.mqttHost, '', '', gaDictionary, knxHandler);
console.log(`Connecting to KNX: ${config.eibdHost}:${config.eibdPort}`)
knxHandler.connect(config.eibdHost, config.eibdPort, gaDictionary, mqttHandler);
console.log('Ready');
