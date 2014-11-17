process.env.NODE_ENV = 'test';

var sudp = require('../'),
	Socket = sudp.Socket;
	
describe('Conntection', function() {
	var socketPort = 64225, randomPort,
	localIp = '127.0.0.1',
	socket = new Socket(),
	socket2 = new Socket(),

	msg = new Buffer('Hello World!!'),

	helloEvent = false,
	messageEvent = false;

	it('should bind to localIp', function(done) {
		socket.bind(socketPort, localIp, done);
	});

	it('should send a message', function(done) {
		socket.once('hello', function() {
			helloEvent = arguments;
		});
		socket.once('message', function() {
			messageEvent = arguments;
			done();
		});

		socket2.send(msg, 0, msg.length, socketPort, localIp, function(err) {
			if(err) done(err);
		});
	});

	it('should bind automatically', function() {
		var rinfo = socket2.address();
		randomPort = rinfo.port;
	});

	it('should trigger `hello` event', function() {
		helloEvent[0].port.should.equal(randomPort);
	});

	it('should trigger `message` event', function() {
		messageEvent[1].port.should.equal(randomPort);
		messageEvent[0].toString('hex').should.equal(msg.toString('hex'));
	});

	it('should send a reply', function(done) {
		var reply = new Buffer('Reply :)');
		
		socket2.once('message', function(buf, rinfo) {
			try {
				rinfo.port.should.equal(socketPort);
				buf.toString('hex').should.equal(reply.toString('hex'));
				done();
			} catch(err) {
				done(err);
			}
		});

		socket.send(reply, 0, reply.length, randomPort, localIp, function(err) {
			if(err) done(err);
		});
	});

	it('should trigger `end` event on close', function(done) {
		socket2.once('end', function(rinfo) {
			try {
				rinfo.port.should.equal(socketPort);
				done();
			} catch(err) {
				done(err);
			}
		});

		socket.close();
	});

	it('should close nicely', function(done) {
		socket2.once('close', done);
		socket2.close();
	});
});