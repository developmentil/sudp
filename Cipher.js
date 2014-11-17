var PeerCipher = require('./PeerCipher');
	

var Cipher = module.exports = function(code, name) {
	this.code = code;
	this.name = name;
};
var proto = Cipher.prototype;


/*** static methods ***/

var _codes = {}, _names = {}, _default;

Cipher.register = function(cipher, isDefault) {
	if(_codes[cipher.code])
		throw new Error('Cipher code `' + cipher.code + '` already exists');
	if(_names[cipher.name])
		throw new Error('Cipher name `' + cipher.name + '` already exists');
	
	_codes[cipher.code] = cipher;
	_names[cipher.name] = cipher;
	
	if(isDefault || !_default)
		_default = cipher;
	
	return cipher;
};

Cipher.deregister = function(cipher) {
	if(typeof cipher === 'string')
		cipher = _names[cipher];
	else if(typeof cipher === 'number')
		cipher = _codes[cipher];
	
	delete _codes[cipher.code];
	delete _names[cipher.name];
	
	if(_default == cipher) {
		for(var i in _codes) {
			_default = _codes[i];
			break;
		}
	}
	
	return cipher;
};

Cipher.getDefault = function() {
	return _default;
};

Cipher.getByName = function(name) {
	if(!_names.hasOwnProperty(name))
		throw new Error('Cipher name `' + name + '` not found');
	
	return _names[name];
};

Cipher.getByCode = function(code) {
	if(!_codes.hasOwnProperty(code))
		throw new Error('Cipher code `' + code + '` not found');
	
	return _codes[code];
};

Cipher.getAllByCode = function() {
	var map = {};
	
	for(var i in _codes)
		map[i] = _codes[i];
	
	return map;
};

Cipher.getAllByName = function() {
	var map = {};
	
	for(var i in _names)
		map[i] = _names[i];

	return map;
};


/*** public methods ***/

proto.generate = function(callback) {	
	var self = this;
	this._generate(function(err, data, buf) {
		if(err) return callback(err);
		
		callback(null, new PeerCipher(self, data), buf);
	});
	
	return this;
};

proto.parse = function(buf, isReply) {
	throw new Error('Unimplemented method');
};

proto.apply = function(data, parsedData) {
	throw new Error('Unimplemented method');
};

proto.generateHmac = function(data) {
	throw new Error('Unimplemented method');
};

proto.verifyHmac = function(data, buf) {
	throw new Error('Unimplemented method');
};

proto.encrypt = function(buf, data) {
	throw new Error('Unimplemented method');
};

proto.decrypt = function(buf, data) {
	throw new Error('Unimplemented method');
};


/*** protected methods ***/

proto._generate = function(callback) {
	callback(new Error('Unimplemented method'));
};