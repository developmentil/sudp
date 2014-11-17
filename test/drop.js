process.env.NODE_ENV = 'test';

var sudp = require('../');
	
describe('Drop-Connection', function() {
	var socketPort = 64225,
	socket2Port = 64226,
	localhost = 'localhost',
	
	socket, socket2;

	it('should bind to localhost', function(done) {
		socket = sudp.createSocket();
		socket.bind(socketPort, localhost, done);
	});

	it('should bind with port only', function(done) {
		socket2 = sudp.createSocket();
		socket2.bind(socket2Port, done);
	});

	it('should send a message', function(done) {
		var msg = new Buffer('Hello World!!');
		
		socket2.once('message', function() {
			done();
		});

		socket.send(msg, 0, msg.length, socket2Port, localhost, function(err) {
			if(err) done(err);
		});
	});

	it('should close discreet', function(done) {
		var timer = null;
		socket2.once('end', function() {
			if(timer)
				clearTimeout(timer);
			timer = false;
			
			done(new Error('Close should be discreet'));
		});
		
		socket.once('close', function() {
			if(timer === false)
				return;
			
			timer = setTimeout(done, 500);
		});
		socket.close(true);
	});

	it('should bind to localhost again', function(done) {
		socket = sudp.createSocket();
		socket.bind(socketPort, localhost, done);
	});

	it('should send next message', function(done) {
		var msg = new Buffer('Nexttt');
		
		socket2.once('message', function() {
			done();
		});

		socket.send(msg, 0, msg.length, socket2Port, localhost, function(err) {
			if(err) done(err);
		});
	});

	it('should close discreet', function(done) {
		socket.once('close', done);
		socket.close(true);
	});

	it('reply should ignore', function(done) {
		var msg = new Buffer('Replyy');
		socket2.send(msg, 0, msg.length, socketPort, localhost, done);
	});

	it('should bind to localhost again', function(done) {
		socket = sudp.createSocket();
		socket.bind(socketPort, localhost, done);
	});

	it('reply should end connection again', function(done) {
		var msg = new Buffer('Replyy');
		
		socket2.on('end', function() {
			done();
		});
		
		socket2.send(msg, 0, msg.length, socketPort, localhost, done);
	});

	it('should close nicely', function(done) {
		socket2.once('close', done);
		socket2.close();
	});
});