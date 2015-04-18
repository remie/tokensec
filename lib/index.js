
var _ = require("lodash");
var crypto = require("crypto-js/aes");

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

	self.handshake = function(options) {

		var _payload = options.payload;
		var _header = options.header || "x-tokensec-handshake";
		var _end = options.terminate;

		return function(req, res, next) {

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


