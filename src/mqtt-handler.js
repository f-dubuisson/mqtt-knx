var mqtt = require('mqtt');

function MqttHandler() {
  DEBUG = true;
}

MqttHandler.prototype.connect = function(host, inputPattern, outputPattern, gaDictionary, knxHandler) {
  this.mqttClient = mqtt.connect(host);
  this.gaDictionary = gaDictionary;
  this.knxHandler = knxHandler;

  var handler = this;
  this.mqttClient.on('message', function(topic, message) {
    handler.onNewMessage(topic, message);
  });
  this.mqttClient.subscribe('/knx/+/+/+/set');
}

MqttHandler.prototype.onNewMessage = function(topic, message) {
  var c = topic.split('/').length;
  try {
    var cleanedTopic = topic.substring(0, topic.indexOf("/set")).split("/").slice(-1)[0];
    gad = this.gaDictionary.gaLookupByName(cleanedTopic).ga;
  }
  catch(err) {
    console.log(`Cannot find ga for [${topic}] in ga.xml: ${err}`);
    return;
  }

  var value = message.toString();
  if (DEBUG) console.log('mqttClient.on', gad, value);
  if (value === 'true' || value === 'ON' || value === 'on' || value === 'DOWN' || value === 'down') {
    this.knxHandler.groupWrite(gad, 'write', 'DPT3', '1');
  }
  else if (value === 'false' || value === 'OFF' || value === 'off' || value === 'UP' || value == 'up') {
    this.knxHandler.groupWrite(gad, 'write', 'DPT3', '0');
  }
  else if (value === '+') {
    this.knxHandler.groupWrite(gad, 'write', 'DPT3.007', '0C');
  }
  else if (value === '-') {
    this.knxHandler.groupWrite(gad, 'write', 'DPT3.007', '04');
  }
  else if (value === 'read') {
    this.knxHandler.groupRead(gad, 'read');
  }
  else if (value.slice(-1) == '%') {
    value = value.substr(0, value.length-1);
    hexString = Math.round(+value * 2.55).toString(16).toUpperCase();
    this.knxHandler.groupWrite(gad, 'write', 'DPT5.001', hexString);
  }
  else if (value.split('.').length == 2) {
    this.knxHandler.groupWrite(gad, 'write', 'DPT9', value);
  }
  else if (value.split(':').length == 3) {
    v = value.split(':');
    this.knxHandler.groupWrite(gad, 'write', 'DPT10.001', [0, v[0], v[1], v[2]]);
  }
  else {
    this.knxHandler.groupWrite(gad, 'write', 'DPT5', value);
  }
}

MqttHandler.prototype.publish = function(topic, value, opts, callback) {
  this.mqttClient.publish(topic, value, opts, callback);
}


function init() {
  var e = new MqttHandler();
  return e;
}

module.exports = init;
