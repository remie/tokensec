# TokenSec
Javascript / node.js utility for securing transport of authentication tokens (JWT/OAuth) between client &amp; server.

## Understanding the problem
By leveraging solutions like Firebase, Parse, Deployd, Meteor or by connecting to an almost infinite amount of external API's the modern front end client application can exist almost without a traditional (bloated) back end. Either the solution provider or the open source community will have published a client-side library, eliminating the need for a custom back-end interfacing between your client application and the external resource.

But there is a catch: when accessing sensitive information, many of those systems require authentication based on a shared secret. Whether they use OAuth or JWT tokens, each of these systems need a handshake using a signed token that is encrypted with a key that should not be revealed.

As a best practice, API providers recommend that you generate the token on the server (which is a good recommendation!) where the secret key is stored securely in envinronment variables (and not in source code ;)

### Getting the token from the server to the client

Now that you have generated a token, a new challenge reveals itself: how to get the token from the server to the client application.

Keep in mind that this token will give the client application scope-based or full access to the external API. This makes you vulnerable to replay attacks, where a malicious attacker retrieves the token and impersonates the rightful user (also known as session hijacking).

A quick search on Google will tell you that common ways of transporting the token will include:
1. Using a (signed) cookie with unencrypted token, which is vulnerable to man-in-the-middle and XSS attacks
2. Using a Message Authentication Code (MAC) with client-side encryption using a publicly visible secret. This is also vulnerable to XSS attacks, but less vulnerable to unintelligent man-in-the-middle attacks as the payload is encrypted.
3. Relaying on the experiration date of the token, which limits the window of opportunity

Regarding that last option: most access tokens will allow you to set a custom expiration dates, which gives you control over the window of opportunity. You could set this to 2 seconds or a couple of minutes, but that would imply that you constantly retrieve a new token. Most API providers use a default expiration date which conforms to the best practices of session timeouts or even longer (Firebase creates tokens with a 24 hour expiration time by default).

Although expiration date is a valid way to prevent token abuse, it still leaves you vulnerable to cross-site ccripting (XSS) exploits which hijack the token while the user is in session. In most cases, the token will still be valid while the user is actively browsing the site.

So how do we propose to securely transport the (JWT) access token to the client?

## The TokenSec solution
The TokenSec library consist of a client-side javascript utlity and a node.js server module that can be used in combination with Express / Connect / Restify.

Once the API access token has been acquired on the server, the client application uses the TokenSec library to randomly generate a temporary key which is encrypted using a shared secret (preferable a CSRF token). This temporary key is submitted to the server in a custom header as part of an XMLHttpRequest POST request. Preferable, this POST request is secured with CSRF tokens. 

Each request to the server will include a new randomly generated temporary key. The randomization includes multiple calls to Math.Random() (which is a pseudo-random number), a random permutation method using a variation on the Fisher–Yates shuffle and a addition / multiplication based on value of modulo operation.

On the node.js server, the CSRF token should be validated to prevent cross server request forgery. If the request is valid, the TokenSec library decrypts the value of the custom HTTP header, thus retrieving the temporary key. It uses this key to encrypt the actual API access token (a.k.a. the payload). It responds to the HTTP request by adding the same custom header with the encrypted payload as its new value.

The client application receives the response from the server and decrypts the custom HTTP header value. It now has securely recovered the API access token, which can be used by the client. The client application can store this in a private javascript method and use it throughout the application. Once the token has expired, the client application can use TokenSec to retrieve a new token.

###Why is this more secure?

This solution is more secure because it utilizes multiple layers of security:

1. Use SSL encryption to discourage man-in-the-middle attacks (not part of the TokenSec, but definitely a best practice!)
2. Uses HTTP headers or httpOnly cookies to avoid XSS accessing the payload
3. Creates an encrypted Message Authentication Code to secure the payload
4. Can leverage CSRF tokens to avoid cross server request forgery (not part of the TokenSec, but definitely a best practice!)

## Installation

You can install TokenSec using NPM:

```
npm install tokensec --save
```

The client-side libraries are generated upon installation and can be found in _./node_modules/tokensec/dist/_.

## Usage

### node.js

TokenSec is [Express](http://expressjs.com/)-compatible middleware for [Node.js](http://nodejs.org/).

#### TokenSec.initialize(options)

```node
// For this example, we are putting the csrfToken in a cookie to be accessible on the client
// Please consider other means to transport the token to your client application (i.e. injection in html templates)
app.use(tokenSec.initialize({ cookie: true }));
```

The options argument is an Object with the following properties:

#### `cookie` #
Optional. Either a boolean value or an Object with the cookie arguments. This will set a cookie with the value of `req.csrfToken()` (if available). Defaults to `false`. If set to the boolean value `true`, the following default cookie arguments will be used

```node
{
	httpOnly: false,
	path: '/'
}
```

#### TokenSec.handshake(options)

```node
// Transport the secret token using TokenSec
app.post(/^\/.*/, tokenSec.handshake({ payload: 'MyVerySpecialSecretToken', terminate: true }));
```

The options argument is an Object with the following properties:

#### `payload` #
Required. The (JWT) access token or any other message that you want to securely transport to the client application. This can be either a String value or a function() which returns a String value.

#### `header` #
Optional. The name of the HTTP header that is used to communicate between client and server. Defaults to `x-tokensec-handshake`. If this is changed, it should also be used in the client-side TokenSec library.

#### `terminate` #
Optional. Boolean value to indicate if the response stream and chain should be terminated after processing the TokenSec handshake. Defaults to `false`, causing the chain to continue using the `next()` callback.

#### TokenSec.client(options)

```node
// Serve the client-side library
app.get(/^\/tokensec.js/, tokenSec.client({ crypto: true }));
```

The options argument is an Object with the following properties:

#### `crypto` #
Optional. Includes the [crypto-js](https://www.npmjs.com/package/crypto-js) package which is required for the client-side library. By default this is set to false, as the CryptoJS library is not minified. It is recommended to include the CryptoJS core and AES rollup from [CDNJS](http://cdnjs.com/libraries/crypto-js).

#### `minified` #
Optional. Serves the minified version of the TokenSec client library. Defaults to `true`.

### Javascript (client-side)

TokenSec is an AMD compatible client-side library. If loaded directly into the page it will create a `window.TokenSec` object. The TokenSec library requires the availability of the `window.CryptoJS` object.

#### TokenSec.handshake(options)

```javascript
TokenSec.handshake({ csrfToken: 'SomeToken', salt: 'SomeSalt', header: 'x-mycustom-header' });
```

The options argument is an Object with the following properties:

#### `uri` #
Optional. The request URI, which should correspond with the node.js route on which the TokenSec `handshake` middleware function is applied. The TokenSec client-side library will post to this URI. Defaults to `'/'`.

#### `csrfToken` #
Optional. If the csrfToken is set, this will be passed back to the server using the 'x-csrf-token` header. Additionally, the csrfToken is used as secret if no secret was provided.

#### `secret` #
Optional / Required. A shared secret between client and server which will be used to encrypt the temporary key during transport from client to server. It is recommended to use a generated token, like the CSRF token, instead of a fixed secret. If not set, the secret will default to the CSRF token (if available). If neither a secret is provided, nor a CSRF token the TokenSec library will throw an error.

#### `salt` #
Optional. An additional secret that is added to the encryption layer. This is only required to be available on the client application, so it can be a fixed or generated String. Defaults to the less secure fixed value of 'TokenSec'.

#### `header` #
Optional. The HTTP header that is used in the communication between client and server. If used, the value should match with the value of the HTTP header configuration of the node.js TokenSec middleware function on the route. Defaults to `x-tokensec-handshake`.

## Related Modules

- [csurf](https://www.npmjs.com/package/csurf) — CSRF implementation for node.js
- [crypto-js](https://www.npmjs.com/package/crypto-js) — Cryptograhpy library for node.js ([client-side library](http://cdnjs.com/libraries/crypto-js))

## Credits

  - [Remie Bolte](http://github.com/remie)

## License

[The GNU Lesser General Public License, version 3.0 (LGPL-3.0)](http://opensource.org/licenses/LGPL-3.0)

Copyright (c) 2015 Remie Bolte
