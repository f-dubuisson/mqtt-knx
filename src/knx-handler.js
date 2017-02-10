var knxHelper = require('./knx-helper');

function KnxHandler() {
  DEBUG = true;
}

KnxHandler.prototype.connect = function(host, port, groupAddresses, mqttHandler) {
  console.log('Connecting to eibd: ' + host + ':' + port);
  this.eibd = require('eibd');
  this.eibdConn = this.eibd.Connection();
  this.eibdOpts = {
    host: host,
    port: port
  };
  this.groupAddresses = groupAddresses;
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
  console.log('Connected to eibd');
}

KnxHandler.prototype.onNewMessage = function(src, dest, type, val) {
  if (DEBUG) console.log("msg: ", src, dest, type, val);
  var value = knxHelper.getDPTValue(val, type);
  if (value) {
    var gaItem = knxHelper.gaLookup(dest, this.groupAddresses);
		if (DEBUG) console.log("gaItem: ", gaItem);
    if (typeof gaItem == 'undefined') return;

    //var topic = '/knx/' + gaItem.device + '/' + gaItem.type + '/' + gaItem.name + '/get';
    var topic = `/knx/${gaItem.device}/${gaItem.type}/${gaItem.name}/get`;
    gaItem.value = value;
//    message = JSON.stringify(gaItem);
    if (DEBUG) console.log(`publish on ${topic}: ${gaItem.value}`);
    this.mqttHandler.publish(topic, gaItem.value, { "retain": false, "qos": 2 });
  }
}

KnxHandler.prototype.groupWrite = function(gad, messageAction, DPTType, value) {
  var synchronous = function() {
	  setTimeout(function(){
      if (this.block){
        synchronous();
      }
      else {
        this.block = true;
        groupWriteDo(gad, messageAction, DPTType, value);
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

  this.eibdConn.socketRemote(eibdOpts, function () {
    this.eibdConn.openTGroup(address, 1, function (err) {
      var msg = this.eibd.createMessage(messageAction, DPTType, value);
      this.eibdConn.sendAPDU(msg, function (err) {
        this.block = false;
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

  this.eibdConn.socketRemote(eibdOpts, function () {
    this.eibdConn.openTGroup(address, 1, function (err) {
      var msg = this.eibd.createMessage('read');
      this.eibdConn.sendAPDU(msg, function (err) {
        this.block = false;
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
