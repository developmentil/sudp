process.env.NODE_ENV = 'test';

var sudp = require('../');
	
describe('UDP6', function() {
	var socketPort = 64225,
	localhost = 'localhost',
	
	socket ,socket2;

	it('should create socket from type', function(done) {
		socket = sudp.createSocket('udp6');
		socket.bind(socketPort, localhost, done);
	});

	it('should have address', function() {
		var rinfo = socket.address();
		
		rinfo.family.should.equal('IPv6');
		rinfo.address.should.equal('::ffff:0.0.0.0');
	});

	it('should create socket from options', function() {
		socket2 = sudp.createSocket({
			type: 'udp6'
		});
	});

	it('should send a message', function(done) {
		var msg = new Buffer('UDP6 test!');
		
		socket.once('message', function(buf, rinfo) {
			try {
				rinfo.family.should.equal('IPv6');
				rinfo.address.should.equal('::1');
				
				buf.toString('hex').should.equal(msg.toString('hex'));
				done();
			} catch(err) {
				done(err);
			}
		});

		socket2.send(msg, 0, msg.length, socketPort, localhost, function(err) {
			if(err) done(err);
		});
	});

	it('should bind automatically', function() {
		var rinfo = socket2.address();
		
		rinfo.family.should.equal('IPv6');
		rinfo.address.should.equal('::ffff:0.0.0.0');
	});

	it('should close nicely', function(done) {
		socket.once('close', done);
		socket.close();
	});

	it('should close nicely', function(done) {
		socket2.once('close', done);
		socket2.close();
	});
});