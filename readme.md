OTP-Auth
----------
This module provides a simple middleware to implement two-factor authentication using a one time password. Using Plivo or Twilio's awesome API's as the carrier. You need to have either twilio or plivo api credentials to use this (sign-up is Free!! Hoorah).

Simple Example
--------------
[code]
    var config = require('/path/to/config.json');
    var session = require('express-session');

    var app = require('express')();
    var otpAuth = require('otpAuth')({
        provider: app.otp.provider, // "Plivio" or "Twilio"
        key: app.otp.key, // The Key for Plivio or "Twilio"
        secret: app.otp.secret
    });


    // otpAuth uses its own version of sessions
    // to avoid collapsing with service level sessions
    // read the docs on how to handle them wisely
    // if no alternative is given, memory-store will be used
    // which is memory based
    app.use(otpAuth.authenticate);

    // Create auth flow
    app.get('/login/', otpAuth.User, function(req, res){
        // the original request method is serialized
        // and reverted
    });
    app.listen(9001); // Its its over 9000 !
[/code]


API
---

