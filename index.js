var Socket = require('./Socket');

// register ciphers
require('./ciphers');
	

module.exports.createSocket = function(options, callback) {
	if(typeof options === 'function') {
		callback = options;
		options = {};
	}
	
	var server = new Socket(options);
	
	if(callback)
		server.once('message', callback);
	
	return server;
};

module.exports.Socket = Socket;
module.exports.Peer = require('./Peer');
module.exports.Cipher = require('./Cipher');