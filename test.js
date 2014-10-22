var express = require('express');
var session = require('express-session');
var OTPAuth = require('./index.js');

var otpAuth = new OTPAuth({
	transport: {
		carrier: 'plivo',
		key: 'MAMMZLOTU2ODBHMMM3ZJ',
		secret: 'NGM1NGU5OGMzMTFmMzk1MjM2MzY3ZTE1NTliNjZm',
		caller_id: '+14159156061',
		server_url: 'http://128.199.187.237:1337'
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

