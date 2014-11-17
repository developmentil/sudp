var events = require('events'),
	util = require('util'),

	messages = require('./messages'),
	
	UNUSE_MIN_IDLE = 5 * 60000; // 5 minutes
	

var Peer = module.exports = function(socket, port, address, keys) {
	Peer.super_.call(this);
	this._socket = socket;
	
	this.port = port;
	this.address = address;
	
	this._version = null;
	this._cipher = null;
	
	this._status = Status.INIT;
	this._lastSend = null;
	this._lastRecieve = null;
	this._timeout = null;
};
util.inherits(Peer, events.EventEmitter);
var proto = Peer.prototype;

var Status = Peer.Status = {
	INIT:		0x00,
	HANDSHAKE:	0x01,
	PENDING:	0x02,
	DATA:		0x03,
	END:		0x04
};


/*** public methods ***/

proto.isReady = function() {
	return (this._status === Status.DATA);
};

proto.isUnuse = function() {
	if(this._status !== Status.INIT && this._status !== Status.END)
		return false;
	
	var now = Date.now();
	return (
		(!this._lastSend || (now - this._lastSend) > UNUSE_MIN_IDLE) &&
		(!this._lastRecieve || (now - this._lastRecieve) > UNUSE_MIN_IDLE)
	);
};

proto.send = function(buf, offset, length, callback) {
	if(!callback) callback = function(){};
	
	if(this._status === Status.DATA)
		return this._sendData(buf, offset, length, callback);
	
	var self = this;
	this._handshake(function(err) {
		if(err) return callback(err);
		
		self._sendData(buf, offset, length, callback);
	});
	
	return this;
};

proto.end = function(callback) {
	if(!callback) callback = function(){};
	
	if(this._status === Status.END || this._status === Status.INIT) {
		callback(null, 0);
		return this;
	}
	
	this._status = Status.END;
	this._sendEnd(callback);
	
	return this;
};

proto.receiveHello = function(version, peerCipher, cipherData, callback) {
	this._lastRecieve = new Date();
	
	this._version = version;
	this._cipher = peerCipher;
	
	this._status = Status.PENDING;
	this._sendCipher(cipherData, false, callback);
	
	return this;
};

proto.receiveCipher = function(version, peerCipher, cipherData, readyCipher, callback) {
	this._lastRecieve = new Date();
	
	if(this._status !== Status.HANDSHAKE)
		throw new Error('Peer not start the handshake');
	
	this._status = Status.PENDING;
	this._version = version;
	this._cipher = peerCipher;
	
	this._cipher.apply(readyCipher);
	this._sendCipher(cipherData, true, callback);
	
	return this;
};

proto.receiveCipherReply = function(readyCipher, callback) {
	this._lastRecieve = new Date();
	
	if(this._status !== Status.PENDING)
		throw new Error('Peer not receive HELLO');
	
	this._cipher.apply(readyCipher);
	this._sendReady(callback);
	
	return this;
};

proto.receiveReady = function(buf) {
	this._lastRecieve = new Date();
	
	if(this._status !== Status.PENDING)
		throw new Error('Peer not send cipher');
	
	var content = this._cipher.decrypt(buf);
	if(!this._cipher.verifyHmac(content)) {
		this._status = Status.INIT;
		return this;
	}
	
	this._ready();
	return this;
};

proto.receiveData = function(msg, rinfo) {
	this._lastRecieve = new Date();
	
	if(this._status !== Status.DATA) {
		if(this._status === Status.PENDING)
			this._ready();
		else {
			throw new Error('Peer not ready yet');
		}
	}
	
	try {
		var content = this._cipher.decrypt(msg.content);
		
		this.emit('message', content, rinfo);
		return content;
	} catch(err) {
		this._status = Status.END;
		throw err; 
	}
};

proto.receiveEnd = function() {
	this._lastRecieve = new Date();
	this._status = Status.END;
	
	this.emit('end');
	return this;
};


/*** protected methods ***/

proto._handshake = function(callback) {
	if(this._status === Status.HANDSHAKE && Date.now() - this._lastSend < this._socket._handshakeTimeout) {
		if(callback) {
			this.once('ready', callback);
			this.once('timeout', callback);
		}
		
		return;
	}
	
	this._status = Status.HANDSHAKE;
	this._version = null;
	this._cipher = null;
	
	if(!this._timeout) {
		this.removeAllListeners('ready');
		this.removeAllListeners('timeout');
	} else {
		clearTimeout(this._timeout);
	}
	
	if(callback) {
		this.once('ready', callback);
		this.once('timeout', callback);
	}
	
	var self = this;
	this._timeout = setTimeout(function() {
		self._timeout = null;
		
		self.emit('timeout', new Error('Handshake takes too long'));
		self.removeAllListeners('ready');
	}, this._socket._handshakeTimeout);
	
	this._sendHello();
};

proto._ready = function() {
	if(this._timeout) {
		clearTimeout(this._timeout);
		this._timeout = null;
	}
	
	this._status = Status.DATA;
	this.emit('ready');
};

proto._sendHello = function(callback) {
	var buf = messages.writeHello({
		ciphers: this._socket.getSupportedCipher()
	});
	
	this._socket._socket.send(buf, 0, buf.length, this.port, this.address, callback);
	this._lastSend = new Date();
};

proto._sendCipher = function(cipherData, isReply, callback) {
	var buf = messages.writeCipher({
		reply: isReply || false,
		version: this._version,
		cipher: this._cipher.code,
		cipherData: cipherData
	});
	
	this._socket._socket.send(buf, 0, buf.length, this.port, this.address, callback);
	this._lastSend = new Date();
};

proto._sendReady = function(callback) {
	var hmac = this._cipher.generateHmac(),
	
	buf = messages.writeReady(
		this._cipher.encrypt(hmac)
	);
	
	this._socket._socket.send(buf, 0, buf.length, this.port, this.address, callback);
	this._lastSend = new Date();
};

proto._sendData = function(content, offset, length, callback) {
	var buf = messages.writeData(
		this._cipher.encrypt(content.slice(offset, offset+length))
	);
	
	this._socket._socket.send(buf, 0, buf.length, this.port, this.address, callback);
	this._lastSend = new Date();
};

proto._sendEnd = function(callback) {
	var buf = messages.writeEnd();
	
	this._socket._socket.send(buf, 0, buf.length, this.port, this.address, callback);
	this._lastSend = new Date();
};