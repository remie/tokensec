
// Include crypto-js when creating full version using Browserify
if ( typeof require === "function" && !require.isBrowser) {
	var CryptoJS = require('crypto-js');
}

// TokenSec.js
(function( global ) {

	var self = {};

	// Check if CryptoJS is available
	if(!CryptoJS) {
		if(global && (!CryptoJS || !CryptoJS.AES)) {
			throw new Error("TokenSec requires the CryptoJS core and AES libraries to be loaded");
		}
	}

	// Get XmlHttpRequest object
	var xhr = new XMLHttpRequest();
	if(!xhr) { xhr = new ActiveXObject("MSXML2.XMLHTTP.3.0"); }
	if(!xhr) { throw new Error('XMLHttpRequest object is required!') }

	// Generate the handshake token which will be used to
	// encrypt the actual payload from the server
	var tokenGenerator = function(secret, salt) {
		var _salt = salt || "TokenSec";
			_token = 0;
			_rndnumbers = [];

		for(var i=0;i < 100;i++) { 
			_rndnumbers.push(Math.floor((Math.random() * 10000) + 1)); 
		}

		// Random Permutations (loosly based on Knuth shuffle)
		var _shuffles = Math.floor(Math.random() * (75 - 25 + 1)) + 25;
		for(var i=0; i<_shuffles; i++) {
			var _posA = Math.floor((Math.random() * 100) + 1),
			    _posB = Math.floor((Math.random() * 100) + 1);

			var _swap = _rndnumbers[_posA];
			_rndnumbers[_posA] = _rndnumbers[_posB];
			_rndnumbers[_posB] = _swap;
		}		

		for(var i=0; i<_rndnumbers; i++) {
			if(_rndnumbers[i] % 2 == 0) { 
				_token += _rndnumbers[i];
			} else {
				_token *= _rndnumbers[i];
			}
		}

		return CryptoJS.AES.encrypt(_salt + _token, secret);		
	}

	self.handshake = function(options, done) {

		var _uri = options.uri || '/';
		var _csrf = options.csrfToken;
		var _secret = options.secret || _csrf;
		var _salt = options.salt || "TokenSec";
		var _header = options.header || 'x-tokensec-handshake';
		var _token = tokenGenerator(_secret, _salt);

		xhr.open('POST', encodeURI(_uri));
		xhr.setRequestHeader(_header, _token);
		if(_csrf) {
			xhr.setRequestHeader('x-csrf-token', encodeURIComponent(_csrf));
		}

		xhr.onload = function() {
			if (xhr.status === 200) {
				var _envelop = xhr.getResponseHeader(_header);
				if(_envelop) {
					var _payload = CryptoJS.AES.decrypt(_envelop, _token.toString());
					done(_payload.toString(CryptoJS.enc.Utf8));
				} else {
					done();
				}
			} else {
				throw new Error('The TokenSec handshake request failed with return status ' + xhr.status);
			}
		}

		xhr.send();
	}

	// Return as an AMD module or attach to the global namespace
	if ( typeof define === "function" && define.amd ) {
		define( "TokenSec", [], function() {
			return self;
		});
	} else if(global) {
		global.TokenSec = self;
	} else {
		throw new Error("TokenSec should either be used as AMD module or in an environment where a Window object is available.")
	}

})(typeof window !== "undefined" ? window : false);
