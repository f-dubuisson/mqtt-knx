var mqtt = require('mqtt');
var knxHelper = require('./knx-helper'); // TODO: move methods in a GroupAddresses object

function MqttHandler() {
  DEBUG = true;
}

MqttHandler.prototype.connect = function(host, inputPattern, outputPattern, groupAddresses, knxHandler) {
  this.mqttClient = mqtt.connect(host);
  this.groupAddresses = groupAddresses;
  this.knxHandler = knxHandler;
  console.log(this.groupAddresses);

  var handler = this;
  this.mqttClient.on('message', function(topic, message) {
    handler.onNewMessage(topic, message);
  });
//  this.mqttClient.subscribe('/knx/+/+/+/set');
  this.mqttClient.subscribe('/#');
}

MqttHandler.prototype.onNewMessage = function(topic, message) {
  console.log(this);
  console.log(this.groupAddresses);
  var c = topic.split('/').length;
  try {
    var cleanedTopic = topic.substring(0, topic.indexOf("/set")).split("/").slice(-1)[0];
    gad = knxHelper.gaLookupByName(cleanedTopic, this.groupAddresses).ga;
  }
  catch(err) {
    console.log(`Cannot find ga for [${topic}] in ga.xml: ${err}`);
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
}

MqttHandler.prototype.publish = function(topic, value, opts) {
  this.mqttClient.publish(topic, value, opts);
}


function init() {
  var e = new MqttHandler();
  return e;
}

module.exports = init;
