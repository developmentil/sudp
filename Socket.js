var events = require('events'),
	util = require('util'),
	dgram = require('dgram'),
	dns = require('dns'),
	
	messages = require('./messages'),
	Cipher = require('./Cipher'),
	Peer = require('./Peer');
	
	VALID_IPv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/i;
	VALID_IPv6 = /^[a-f0-9]{1,4}:([a-f0-9]{0,4}:){2,6}[a-f0-9]{1,4}$/i;
	

var Socket = module.exports = function(options) {
	Socket.super_.call(this);
	
	if(!options)
		options = {};
	else if(typeof options === 'string')
		options = {type: options};
	
	this._type = (options.type || 'udp4');
	this._family = (this._type === 'udp4' ? 4 : 6);
	this._validIP = (this._family === 4 ? VALID_IPv4 : VALID_IPv6);
	
	this._socket = dgram.createSocket(this._type);
	
	this._defaultCipher = options.cipher 
								? Cipher.getByName(options.cipher) 
								: Cipher.getDefault();
	
	var cipherNames = (options.supportedCiphers || Socket.SupportedCiphers);
	this._supportedCiphers = {};
	this._supportedCiphersCodes = [];
		
	for(var i in cipherNames) {
		var cipher = Cipher.getByName(cipherNames[i]);
		this._supportedCiphers[cipher.code] = cipher;
		this._supportedCiphersCodes.push(cipher.code);
	}
	
	this._socket.on('error',
			this._error.bind(this));

	this._socket.on('message',
			this._message.bind(this));

	this._socket.on('listening',
			this._listening.bind(this));

	this._socket.on('close',
			this._close.bind(this));
	
	this._handshakeTimeout = options.timeout || 2000;
	this._peersMaintanceLimit = 1 / (options.maintanceRatio || 0.005);
	this._peersMaintanceCounter = 0;
	
	this._peers = [];
	this._peersMap = {};
};
util.inherits(Socket, events.EventEmitter);
var proto = Socket.prototype;


/*** static vars ***/

Socket.Version = messages.VERSION;

Socket.SupportedCiphers = [
	'ECDHE-AES256-SHA1'
];


/*** public methods ***/

proto.send = function(buf, offset, length, port, address, callback) {
	if(!this._socket)
		throw new Error('Not running');
	
	this.getPeer(address, port, function(err, peer) {
		if(err) {
			if(callback)
				callback(err);
			return;
		}
		
		peer.send(buf, offset, length, function(err, bytes) {
			if(callback)
				callback(err, bytes, peer);
		});
	});
	return this;
};

proto.bind = function(port, address, callback) {
	if(!this._socket)
		throw new Error('Not running');
	
	if(arguments.length < 3) {
		if(typeof address === 'function') {
			callback = address;
			address = null;
		}
	}
	
	if(callback)
		this.once('listening', callback);
	
	this._socket.bind(port, address);
	return this;
};

proto.close = function(discreet) {
	if(!this._socket)
		throw new Error('Not running');
	
	var self = this,
	ref = 0,
	done = function() {
		if(ref-- > 0) return;
		
		self._socket.close();
	};
	
	if(discreet !== true) {
		this._peers.forEach(function(peer) {
			ref++;
			peer.end(done);
		});
	}
	
	done();
	return this;
};

proto.address = function() {
	if(!this._socket)
		throw new Error('Not running');
	
	return this._socket.address();;
};

proto.getPeer = function(address, port, callback) {
	var self = this;
	this._lookup(address, function(err, address) {
		if(err) return callback(err);
	
		callback(null, self._getPeer(address, port));
	});
};

proto.getSupportedCipher = function() {
	return this._supportedCiphersCodes;
};


/*** protected methods ***/

proto._lookup = function(address, callback) {
	if(address === 'localhost') 
		address = (this._family === 4 ? '127.0.0.1' : '::1');
	
	if(this._validIP.test(address))
		return callback(null, address);
	
	dns.lookup(address, this._family, function(err, address) {
		if(err) return callback(err);
				
		callback(null, address);
	});
};

proto._getPeer = function(address, port) {
	if(!this._peersMap.hasOwnProperty(address))
		this._peersMap[address] = {};
	
	if(!this._peersMap[address].hasOwnProperty(port)) {
		var peer = new Peer(this, port, address);

		this._peersMap[address][port] = this._peers.length;
		this._peers.push(peer);

		if(++this._peersMaintanceCounter >= this._peersMaintanceLimit) {
			this._peersMaintanceCounter = 0;
			this._maintancePeers();
		}
	}

	return this._peers[this._peersMap[address][port]];
};

proto._findPeer = function(address, port) {
	if(this._peersMap.hasOwnProperty(address) && this._peersMap[address].hasOwnProperty(port))
		return this._peersMap[address][port];
	else
		return -1;
};

proto._maintancePeers = function() {
	var map = {}, peers = [], peer;
	
	for(var i = 0; i < this._peers.length; i++) {
		peer = this._peers[i];
		if(!peer.isUnuse())
			continue;
		
		if(!map.hasOwnProperty(peer.address))
			map[peer.address] = {};
		
		map[peer.address][peer.port] = peers.length;	
		peers.push(peer);
	}
	
	this._peersMap = map;
	this._peers = peers;
};

proto._error = function(err) {
	this.emit('error', err);
};

proto._listening = function() {
	this.emit('listening');
};

proto._close = function() {
	this._socket = null;
	this.emit('close');
};

proto._message = function(buf, rinfo) {
//	console.log('Got new message from ' + 
//			rinfo.address + ':' + rinfo.port + 
//			'\n' + buf.toString('hex')
//	);
	
	try {
		var self = this,
		msg = messages.read(buf),
		
		Types = messages.Types, peer;
		
		if(msg.type === Types.HELLO) {
			messages.parseHello(msg);
			
			var version = Socket.Version <= msg.version 
								? Socket.Version : msg.version,
			
			cipher = this._defaultCipher;
			for(var i in this._supportedCiphers) {
				if(~msg.ciphers.indexOf(parseInt(i))) {
					cipher = this._supportedCiphers[i];
					break;
				}
			}
			
			cipher.generate(function(err, peerCipher, cipherData) {
				if(err) return self.emit('error', err);
				
				var peer = self._getPeer(rinfo.address, rinfo.port);
				peer.receiveHello(version, peerCipher, cipherData);

				self.emit('hello', rinfo, peer);
			});
			return;
		}
		
		var pIndex = this._findPeer(rinfo.address, rinfo.port);
		if(pIndex === -1) {
			if(msg.type === Types.DATA) {
				peer = this._getPeer(rinfo.address, rinfo.port);
				peer.end();
			}
			return;
		}
			
		peer = this._peers[pIndex];

		switch(msg.type) {
			case Types.CIPHER:
				messages.parseCipher(msg);
				
				var version = Socket.Version <= msg.version 
								? Socket.Version : msg.version,
				
				cipher = this._supportedCiphers[msg.cipher];
				// ignore unsupperted ciphers
				if(!cipher)
					return;
				
				var readyCipher = cipher.parse(msg.cipherData, msg.reply);
				if(msg.reply) {
					peer.receiveCipherReply(readyCipher);
					return;
				}
				
				cipher.generate(function(err, peerCipher, cipherData) {
					if(err) return self.emit('error', err);
					
					try {
						peer.receiveCipher(version, peerCipher, cipherData, readyCipher);
					} catch(err) {
//						console.warn(err);
					}
				});
				return;
				
			case Types.READY:
				peer.receiveReady(msg.content);
				return;
				
			case Types.DATA:
				this.emit('message', peer.receiveData(msg, rinfo), rinfo, peer);
				return;
				
			case Types.END:
				peer.receiveEnd();
				this.emit('end', rinfo, peer);
				return;
				
			default:
				return;
		}
	} catch(err) {
//		console.warn(err);
	}
};
