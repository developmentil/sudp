var util = require('util'),
	crypto = require('crypto'),
	ecdh = require('ecdh');
	
	Cipher = require('../Cipher');
	

var ECDH = module.exports = function(options) {
	ECDH.super_.call(this, options.code, options.name);
	
	this._curve = ecdh.getCurve(options.curve || 'secp256k1');
	this._algorithm = options.algorithm || 'aes-256-cbc';
	this._hmac = options.hmac || 'sha1';
};
util.inherits(ECDH, Cipher);
var proto = ECDH.prototype;


/*** public methods ***/

proto.parse = function(buf, isReply) {
	return {
		publicKey: ecdh.PublicKey.fromBuffer(this._curve, buf)
	};
};

proto.apply = function(data, parsedData) {
	return {
		publicKey: data.publicKey,
		peerPublicKey: parsedData.publicKey,
		masterKey: data.privateKey.deriveSharedSecret(parsedData.publicKey)
	};
};

proto.generateHmac = function(data) {
	return crypto.createHmac(this._hmac, data.masterKey)
	.update(data.publicKey.buffer)
	.update(data.peerPublicKey.buffer)
	.digest();
};

proto.verifyHmac = function(data, buf) {
	return crypto.createHmac(this._hmac, data.masterKey)
	.update(data.peerPublicKey.buffer)
	.update(data.publicKey.buffer)
	.digest('hex') === buf.toString('hex');
};

proto.encrypt = function(buf, data) {
	var cipher = crypto.createCipher(this._algorithm, data.masterKey);
	
	return Buffer.concat([
		cipher.update(buf),
		cipher.final()
	]);
};

proto.decrypt = function(buf, data) {
	var decipher = crypto.createDecipher(this._algorithm, data.masterKey);
	
	return Buffer.concat([
		decipher.update(buf),
		decipher.final()
	]);
};


/*** protected methods ***/

proto._generate = function(callback) {
	var self = this;
	ecdh.generateR(this._curve, function(err, buf) {
		if(err) return callback(err);
		
		var keys = ecdh.generateKeys(self._curve, buf);
		
		callback(null, {
			publicKey: keys.publicKey,
			privateKey: keys.privateKey
		}, keys.publicKey.buffer);
	});
};