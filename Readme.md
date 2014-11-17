[Secure UDP protocol](https://npmjs.org/package/sudp)
==========

Secure-UDP implementation on [Node.js](http://nodejs.org/)


Install
=======

	$ npm install sudp


Simple Usage
=====

```js
var sudp = require('sudp');

var port = 50335, address = '127.0.0.1',

socket = sudp.createSocket('udp4', function(buf, rinfo, peer) {
  console.log('Got new message from ' 
       + rinfo.address + ':' + rinfo.port 
       + '\n' + buf
  );
  socket.close();
});

socket.bind(port, address, function() {
  console.log('bind');

  var socket2 = sudp.createSocket(),
  msg = new Buffer('Hello World!!');
  socket2.send(msg, 0, msg.length, port, address, function(err) {
    if(err) throw err;
  
    console.log('message sent!');
    socket2.close();
  });
});
```


License
=======

supd is freely distributable under the terms of the MIT license.

Copyright (c) 2014 Moshe Simantov

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.