var knxHelper = require('./knx-helper');

function KnxHandler() {
  DEBUG = true;
}

KnxHandler.prototype.connect = function(host, port, gaDictionary, mqttHandler) {
  this.eibd = require('eibd');
  this.eibdConn = this.eibd.Connection();
  this.eibdOpts = {
    host: host,
    port: port
  };
  this.gaDictionary = gaDictionary;
  this.mqttHandler = mqttHandler;

  this.block = false;

  var handler = this;
  this.eibdConn.socketRemote(this.eibdOpts, function(err) {
    if (err) {
      throw new Error(`Error connecting to KNX server: ${err}`);
    }

    handler.eibdConn.openGroupSocket(0, function(messageparser) {
      messageparser.on('write', function(src, dest, type, val) {
        handler.onNewMessage(src, dest, type, val);
      });
    });
  });
}

KnxHandler.prototype.onNewMessage = function(src, dest, type, val) {
  if (DEBUG) console.log("msg: ", src, dest, type, val);
  var value = knxHelper.getDPTValue(val, type);
  if (value) {
    var gaItem = this.gaDictionary.gaLookup(dest);
		if (DEBUG) console.log("gaItem: ", gaItem);
    if (typeof gaItem == 'undefined') return;

    var topic = `/knx/${gaItem.device}/${gaItem.type}/${gaItem.name}/get`;
    gaItem.value = value;
//    message = JSON.stringify(gaItem);
    if (DEBUG) console.log(`publish on ${topic}: ${gaItem.value}`);
    this.mqttHandler.publish(topic, gaItem.value, { "retain": false, "qos": 2 });
  }
}

KnxHandler.prototype.groupWrite = function(gad, messageAction, DPTType, value) {
  var handler = this;
  var synchronous = function() {
	  setTimeout(function(){
      if (handler.block){
        synchronous();
      }
      else {
        handler.block = true;
        handler.groupWriteDo(gad, messageAction, DPTType, value);
      }
    }, 50);
  };
  synchronous(gad);
}

KnxHandler.prototype.groupWriteDo = function(gad, messageAction, DPTType, value) {
  this.block = true;
  if (DPTType == 'DPT10.001' || DPTType == 'DPT9') {}
  else if (DPTType != 'DPT3.007' && DPTType != 'DPT5.001' ) {
    value = parseInt(value);
  }
  else {
    value = parseInt(value, 16);
  }
  if (DEBUG)
    console.log('groupWrite', gad, messageAction, DPTType, value);
  var address = this.eibd.str2addr(gad);

  var handler = this;
  this.eibdConn.socketRemote(this.eibdOpts, function () {
    handler.eibdConn.openTGroup(address, 1, function (err) {
      var msg = handler.eibd.createMessage(messageAction, DPTType, value);
      handler.eibdConn.sendAPDU(msg, function (err) {
        handler.block = false;
        if (err) {
          console.error('Error:', err);
        }
      });
    });
  });
}

KnxHandler.prototype.groupRead = function(gad) {
  if (DEBUG)
    console.log('groupRead', gad);
  var address = this.eibd.str2addr(gad);

  var handler = this;
  this.eibdConn.socketRemote(eibdOpts, function () {
    handler.eibdConn.openTGroup(address, 1, function (err) {
      var msg = handler.eibd.createMessage('read');
      handler.eibdConn.sendAPDU(msg, function (err) {
        handler.block = false;
        if (err) {
          console.error('Error:', err);
        }
      });
    });
  });
}

function init() {
  var e = new KnxHandler();
  return e;
}

module.exports = init;
