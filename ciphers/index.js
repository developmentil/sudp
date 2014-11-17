
var Cipher = require('../Cipher'),
	ECDH = require('./ECDH');
	

Cipher.register(new ECDH({
	code: 0x01,
	name: 'ECDHE-AES256-SHA1',
	curve: 'secp256k1',
	algorithm: 'aes-256-cbc',
	hmac: 'sha1'
}));

Cipher.register(new ECDH({
	code: 0x02,
	name: 'ECDHE-AES128-SHA1',
	curve: 'secp128r1',
	algorithm: 'aes-128-cbc',
	hmac: 'sha1'
}));