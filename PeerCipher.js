
var PeerCipher = module.exports = function(cipher, data) {
	this.code = cipher.code;
	
	this._cipher = cipher;
	this._data = data;
};
var proto = PeerCipher.prototype;


/*** public methods ***/

proto.apply = function(data) {
	this._data = this._cipher.apply(this._data, data);				
	return this;
};

proto.generateHmac = function() {
	return this._cipher.generateHmac(this._data);
};

proto.verifyHmac = function(buf) {
	return this._cipher.verifyHmac(this._data, buf);
};

proto.encrypt = function(buf) {
	return this._cipher.encrypt(buf, this._data);
};

proto.decrypt = function(buf) {
	return this._cipher.decrypt(buf, this._data);
};