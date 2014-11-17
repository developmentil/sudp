process.env.NODE_ENV = 'test';

var sudp = require('../');
	
describe('Socket', function() {
	var socket, socketPort = 64225;
	
	it('should create', function() {
		socket = sudp.createSocket();
	});
	
	it('should inherit from event emitter', function(done) {
		socket.once('foo', done);
		socket.emit('foo');
	});
	
	it('should not have address when not running', function() {
		try {
			console.log(socket.address());
		} catch(err) {
			return;
		}
		
		throw 'Address returned!';
	});
	
	describe('#bind()', function() {
		it('should bind with port only', function(done) {
			socket.bind(socketPort, done);
		});
		
		var rinfo;
		it('should has address', function() {
			rinfo = socket.address();
		});
			
		it('port should be ' + socketPort, function() {
			rinfo.port.should.equal(socketPort);
		});
			
		it('address should be 0.0.0.0', function() {
			rinfo.address.should.equal('0.0.0.0');
		});
			
		it('family should be IPv4', function() {
			rinfo.family.should.equal('IPv4');
		});

		it('should close nicely', function(done) {
			socket.once('close', done);
			socket.close();
		});
		
		it('should not bind after close', function() {
			try {
				socket.bind(socketPort);
			} catch(err) {
				return;
			}
			
			throw 'Socket alreay closed!';
		});
	});
});