
var Types = 
exports.Types = {
	HELLO:		0x00,
	CIPHER:		0x01,
	READY:		0x02,
	DATA:		0x04,
	END:		0x07
},

VERSION = 
exports.VERSION = 0x00,

HEADER_SIZE = 1,
FLAGS_REPLY = 0x01;


exports.read = function(buf) {
	var header = buf.readUInt8(0),
			
	msg = {
		type: header >>> 5,
		flags: header & 0x1F,
		content: buf.slice(1)
	};
	
	return msg;
};


exports.writeHello = function(data) {
	var buf = new Buffer(
		HEADER_SIZE + 2 + (data.ciphers.length * 2)
	);
	
	writeHeader(buf, Types.HELLO);
	
	buf.writeUInt8(VERSION, HEADER_SIZE);
	
	var pos = HEADER_SIZE + 1;
	buf.writeUInt8(data.ciphers.length, pos++);
	
	for(var i in data.ciphers) {
		buf.writeUInt16BE(data.ciphers[i], pos);
		pos += 2;
	}
	
	return buf;
};

exports.parseHello = function(msg) {
	if(msg.content.length < 2)
		throw new Error('Buffer is too short');
		
	msg.version = msg.content.readUInt8(0);
	var ciphersLength = msg.content.readUInt8(1);
	
	if(!ciphersLength)
		throw new Error('Ciphers not found');
	
	if(msg.content.length < 2 + ciphersLength * 2)
		throw new Error('Buffer is too short');
	
	msg.ciphers = [];
	msg.ciphersMap = {};
	for(var pos = 2; msg.ciphers.length < ciphersLength; pos += 2) {
		var cipher = msg.content.readUInt16BE(pos);
		msg.ciphers.push(cipher);
	}
	
	return msg;
};
	
exports.writeCipher = function(data) {
	var flags = data.reply ? FLAGS_REPLY : 0,
	
	buf = new Buffer(
		HEADER_SIZE + 5 + data.cipherData.length
	);
	
	writeHeader(buf, Types.CIPHER, flags);
	
	buf.writeUInt8(data.version, HEADER_SIZE);
	buf.writeUInt16BE(data.cipher, HEADER_SIZE + 1);
	
	buf.writeUInt16BE(data.cipherData.length, HEADER_SIZE + 3);
	data.cipherData.copy(buf, HEADER_SIZE + 5);
	
	return buf;
};

exports.parseCipher = function(msg) {
	if(msg.content.length < 5)
		throw new Error('Buffer is too short');
	
	msg.reply = (msg.flags & FLAGS_REPLY) === FLAGS_REPLY;
	msg.version = msg.content.readUInt8(0);
	msg.cipher = msg.content.readUInt16BE(1);
	
	var dataLength = msg.content.readUInt16BE(3),
	end = 5 + dataLength;
	if(msg.content.length < end)
		throw new Error('Buffer is too short');
	
	msg.cipherData = msg.content.slice(5, end);
	
	return msg;
};

exports.writeReady = function(content) {
	var buf = new Buffer(
		HEADER_SIZE + content.length
	);
	
	writeHeader(buf, Types.READY);
	content.copy(buf, HEADER_SIZE);
	
	return buf;
};

exports.writeData = function(content) {
	var buf = new Buffer(
		HEADER_SIZE + content.length
	);
	
	writeHeader(buf, Types.DATA);
	content.copy(buf, HEADER_SIZE);
	
	return buf;
};

exports.writeEnd = function() {
	var buf = new Buffer(
		HEADER_SIZE
	);
	
	writeHeader(buf, Types.END);
	
	return buf;
};


/*** local helpers ***/ 

function writeHeader(buf, type, flags) {
	var header = (type << 5);
	if(flags)
		header |= flags;
	
	buf.writeUInt8(header, 0);
	return buf;
};