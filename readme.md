OTP-Auth
----------
[![Gitter](https://badges.gitter.im/Join Chat.svg)](https://gitter.im/darkyen/otp-auth?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
This module provides a simple middleware to implement two-factor authentication using a one time password. Using Plivo or Twilio's awesome API's as the carrier. You need to have either twilio or plivo api credentials to use this (sign-up is Free!! Hoorah).

Simple Example
--------------

    var express = require('express');
    var session = require('express-session');
    var OTPAuth = require('./index.js');

    var otpAuth = new OTPAuth({
        transport: {
            carrier: 'twilio/plivo',
            key: 'your sid or auth id',
            secret: 'your secret or auth key',
            caller_id: 'caller_id_number',
            server_url: 'url of the server, used for voice authentication'
        }
    });

    app = new express();
    app.use(session({
        secret: 'keyboard cat',
        resave: true,
        saveUninitialized: false,
    }));
    app.use('/auth/', otpAuth.router, function(req, res, next){
        console.log(req.param('phone_number'));
        res.status(200).end('wel-cum');
    });
    app.listen(1337);



API
---

