var net = require('net');
var StringDecoder = require('string_decoder').StringDecoder;
var decoder = new StringDecoder();

var JsonSocket = function(socket, opts) {
    this._socket = socket;
    this._contentLength = null;
    this._buffer = '';
    this._opts = opts || {}
    if (!this._opts.delimeter) {
        this._opts.delimeter = '#';
    }
    this._closed = false;
    socket.on('data', this._onData.bind(this));
    socket.on('connect', this._onConnect.bind(this));
    socket.on('close', this._onClose.bind(this));
    socket.on('err', this._onError.bind(this));
};
module.exports = JsonSocket;

JsonSocket.sendSingleMessage = function(port, host, message, opts, callback) {
    if (typeof(opts) === "function") {
        callback = opts;
        opts = {};
    } else {
        callback = callback || function(){};
        if (!opts) {
            opts = {};
        }
    }
    var socket = new JsonSocket(new net.Socket(), opts);
    socket.connect(port, host);
    socket.on('error', function(err) {
        callback(err);
    });
    socket.on('connect', function() {
        socket.sendEndMessage(message, callback);
    });
};

JsonSocket.sendSingleMessageAndReceive = function(port, host, ndjson, message, opts, callback) {
    if (typeof(opts) === "function") {
        callback = opts;
        opts = {};
    } else {
        callback = callback || function(){};
        if (!opts) {
            opts = {};
        }
    }
    var socket = new JsonSocket(new net.Socket(), opts);
    socket.connect(port, host);
    socket.on('error', function(err) {
        callback(err);
    });
    socket.on('connect', function() {
        socket.sendMessage(message, function(err) {
            if (err) {
                socket.end();
                return callback(err);
            }
            socket.on('data', function(message) {
				socket.end();
                if (message.success === false) {
                    return callback(new Error(message.error));
                }
                callback(null, message)
            });
        }, ndjson);
    });
};

JsonSocket.prototype = {

    _onData: function(data) {
        data = decoder.write(data);
        try {
            this._handleData(data);
        } catch (e) {
            this.sendError(e);
        }
    },
    _handleData: function(data) {
        this._buffer += data;
        if (this._contentLength == null) {
            var i = this._buffer.indexOf(this._opts.delimeter);
            //Check if the buffer has a this._opts.delimeter or "#", if not, the end of the buffer string might be in the middle of a content length string
            if (i !== -1) {
                var rawContentLength = this._buffer.substring(0, i);
                this._contentLength = parseInt(rawContentLength);
                if (isNaN(this._contentLength)) {
                    this._contentLength = null;
                    this._buffer = '';
                    var err = new Error('Invalid content length supplied ('+rawContentLength+') in: '+this._buffer);
                    err.code = 'E_INVALID_CONTENT_LENGTH';
                    throw err;
                }
                this._buffer = this._buffer.substring(i+1);
            }
        }
        if (this._contentLength != null) {
            var length = Buffer.byteLength(this._buffer, 'utf8');
            if (length == this._contentLength) {
                this._handleMessage(this._buffer);
            } else if (length > this._contentLength) {
                var message = this._buffer.substring(0, this._contentLength);
                var rest = this._buffer.substring(this._contentLength);
                this._handleMessage(message);
                this._onData(rest);
            }
        }
    },
    _handleMessage: function(data) {
        this._contentLength = null;
        this._buffer = '';
        var message;
        try {
            message = JSON.parse(data);
        } catch (e) {
            var err = new Error('Could not parse JSON: '+e.message+'\nRequest data: '+data);
            err.code = 'E_INVALID_JSON';
            throw err;
        }
        message = message || {};
        this._socket.emit('message', message);
    },

    sendError: function(err) {
        this.sendMessage(this._formatError(err));
    },
    sendEndError: function(err) {
        this.sendEndMessage(this._formatError(err));
    },
    _formatError: function(err) {
        return {success: false, error: err.toString()};
    },

    sendMessage: function(message, callback, ndjson) {
        if (this._closed) {
            if (callback) {
                callback(new Error('The socket is closed.'));
            }
            return;
        }
        this._socket.write(this._formatMessageData(message, ndjson), 'utf-8', callback);
		//console.log('Just sent this message: ' + JSON.stringify(this._formatMessageData(message, ndjson)));
    },
    sendEndMessage: function(message, callback) {
        var that = this;
        this.sendMessage(message, function(err) {
            that.end();
            if (callback) {
                if (err) return callback(err);
                callback();
            }
        });
    },
    _formatMessageData: function(message, ndjson) {
		if(ndjson)
			return messageData = JSON.stringify(message) + '\r\n';
		else
		{
			var length = Buffer.byteLength(messageData, 'utf8');
			var data = length + this._opts.delimeter + messageData;
			var data = messageData;
		}
		
        return data;
    },

    _onClose: function() {
        this._closed = true;
    },
    _onConnect: function() {
        this._closed = false;
    },
    _onError: function() {
        this._closed = true;
    },
    isClosed: function() {
        return this._closed;
    }

};

var delegates = [
    'connect',
    'on',
    'end',
    'setTimeout',
    'setKeepAlive'
];
delegates.forEach(function(method) {
    JsonSocket.prototype[method] = function() {
        this._socket[method].apply(this._socket, arguments);
        return this
    }
});
