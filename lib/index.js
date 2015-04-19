
var _ = require("lodash");
var crypto = require("crypto-js/aes");
var nstatic = require('node-static');

module.exports = (function() {
    'use strict';

	var self = {};

	self.initialize = function(options) {

		return function (req, res, next) {
			if(res.setCookie && req.csrfToken && options.cookie) {
				var _cookieArgs = {
					httpOnly: false,
					path: '/'
				}

				if(_.isObject(options.cookie)) {
					_.merge(_cookieArgs, options.cookie);
				}

				res.setCookie('tokensec', req.csrfToken(), _cookieArgs);
			}
			next();
		};

	}

	self.client = function(options) {

		options = options || {};
		var _crypto = (options.crypto) ? options.crypto : false;
		var _minified = (options.minified) ? options.minified : true;
		var _file = (_crypto) ? 'tokensec-crypto' : 'tokensec';
		_file += (_minified) ? '.min.js' : '.js';

		return function (req, res, next) {
			var file = new nstatic.Server(__dirname + '/../dist/');
			file.serveFile('/' + _file, 200, { 'Cache-Control': 'private, max-age=131487' }, req, res);
			next(false);
		};

	}

	self.handshake = function(options) {

		var _payload = options.payload;
		var _header = options.header || "x-tokensec-handshake";
		var _end = options.terminate;

		return function (req, res, next) {

			// Determine if this is a request that should be processed by TokenSec
			if(req.headers[_header]) {

				// Use the value of the request header as the encryption secret
				var _secret = req.headers[_header];

				// If options.payload is a function(), retrieve the value first
				if(typeof _payload === "function") {
					_payload = _payload.call(req, res);
				};

				// Check if we have something to show for
				if(_payload) {
					var _envelop = crypto.encrypt(_payload, _secret);
					res.setHeader(_header, _envelop);

					if(_end) {
						res.end();
						next(false);
					}
				};
			};

			next();
		};
	};

	return self;
})();


