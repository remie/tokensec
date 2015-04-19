
// Using Restify for REST server
// https://github.com/mcavage/node-restify
var restify = require('restify');
var cookieParser = require('restify-cookies');

// Use csurf to generate with CSRF tokens (requires restify-cookies)
// https://github.com/expressjs/csurf
var csrf = require('csurf');

// Initialize TokenSec
var tokenSec = require('./../../lib/index.js');

// ------------------------------------------------------------------------------------------ App Server Config

// Initialize the REST server
var app = restify.createServer(); 

// Using a cookie for csrf in this example. It is recommended to change this to session-based storage.
app.use(cookieParser.parse);
app.use(csrf({ cookie: {
	httpOnly: true
}}));

// For this example, we are putting the csrfToken in a cookie to be accessible on the client
// Please consider other means to transport the token to your client application (i.e. injection in html templates)
app.use(tokenSec.initialize({ cookie: true }));

// ------------------------------------------------------------------------------------------ App Server Routes

// Transport the secret token using TokenSec
app.post(/^\/.*/, tokenSec.handshake({ payload: 'MyVerySpecialSecretToken', terminate: true }));

// Serve the client-side application
app.get(/^\/tokensec.js/, tokenSec.client({ crypto: true }));

app.get(/^\/.*/, restify.serveStatic({
	directory: __dirname + '/public',
	default: 'index.html'
}));

// ------------------------------------------------------------------------------------------ App Server Listener

// Start the server
var port = process.env.PORT || 5000;
app.listen(port, function() {
	console.log('%s listening at %s', app.name, app.url);
});
