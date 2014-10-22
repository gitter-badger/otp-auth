var Express = require('express');
var Router = Express.Router;
var Session = require('express-session');
var speakeasy = require('speakeasy');
var uuid = require('uuid');
var transport = require('./transport.js');


function createErrorHandler(res, code){
	code = code || 500;
	return function(){
		console.log("Error", arguments );
		res.status(500).send('Internal Server Error');
	}
}

function returnSuccess(res){
	return function(){
		res.status(200).send('Ok');
	}
}
// Generates a otp;
function OTPHandShake(phoneNumber ,opts){
	// Being over protective here
	// maybe remove this... all this does is
	// ensure that our 3 attempts thing doesn't fail
	this.uuid = uuid.v4();
	this.leftAttempts = opts.attempts; 
	this.timeout = opts.timeout;
	this.phoneNumber = phoneNumber;
	this.issued = Date.now();
	this.lastSent = -1;
}

OTPHandShake.createOTP = function( otpHandshake ){

	return speakeasy.totp({
		key: otpHandshake.uuid,
		step: otpHandshake.timeout
	});

};

OTPHandShake.createOTPVoiceMessage = function( otp ){

	var numbers = otp.split('').join(' ');
	return {
		header: 'Your txt verfication code is ',
		otp:  numbers,
		ender: 'Happy Txting.'
	};

}

OTPHandShake.createOTPTextMessage = function( otp ){
	// TODO : Localize this !
	return 'Your txt verification code is ' + otp + '. Happy Txting'; 
};

function OTPAuth(opts){	
	this.opts 		  = opts;
	opts.exposeRouter = opts.exposeRouter || true;
	opts.preserveData = opts.preserveData || true;
	this.transport 	  = new transport(opts.transport);
	
	var begin = this.begin.bind(this);
	var sendPayload = this.sendPayload.bind(this);
	var verify = this.verify.bind(this);
	var sendVoicePayload = this.sendVoicePayload.bind(this);

	this.handshakeOpts = {
		attempts: opts.attempts || 3,
		timeout: opts.timeout || 60
	};
	
	this.router = new Router;
	this.router.use('/create/', begin, sendPayload);
	this.router.use('/resend/', sendPayload);
	this.router.use('/verify/', verify);
	this.router.use('/call_handler/answer/:otp', sendVoicePayload);
}


OTPAuth.prototype.sendVoicePayload = function(req, res){
	var otp = req.param('otp');
	
	if( !otp || otp.length !== 6 || isNaN(+otp ) ){
		res.status(401).end('Unauthorized');
	}

	res.header('Content-Type','text/xml')
	   .send(this.transport.createXMLSpeech( OTPHandShake.createOTPVoiceMessage( req.param('otp') ) ))
	   .end();
}


OTPAuth.prototype.begin = function(req, res, next){
	var phoneNumber = req.param('phone_number');
	var otpHandshake = req.session.otpHandshake;

	if( ! phoneNumber ){

		return res.status(400).end('phone_number not sent');
	}
	
	if( ! otpHandshake || otpHandshake.leftAttempts <= 0 ||
		otpHandshake.issued < Date.now() - this.opts.timeout * 1000 ){
		req.session.otpHandshake = new OTPHandShake(phoneNumber, this.handshakeOpts);
	}

	if( otpHandshake.phoneNumber != phoneNumber ){
		otpHandshake.phoneNumber = phoneNumber;
	}

	if( this.opts.preserveData ){
		// Serialize sent data to 
		req.session.otpHandshake.data = {
			params: req.params,
			body: req.body,
			query: req.query
		};
	}

	next();
}


OTPAuth.prototype.sendPayload = function(req, res, next){
	var otpHandshake = req.session.otpHandshake;
	var number = otpHandshake.phoneNumber;
	var otp = OTPHandShake.createOTP(otpHandshake);
	var ok = returnSuccess(res);
	var errorHandler = createErrorHandler(res, 500);

	if( otpHandshake.lastSent + (this.opts.timeout * 1000) > Date.now() ){
		res.status(400).send('Please wait' + this.opts.timeout + 'second to try alternate method');
		return;
	}
	
	otpHandshake.lastSent = Date.now();

	if( req.param('transport') === 'call' ){
		var url = this.opts.transport.server_url + '/auth/call_handler/answer/' + otp + '/';
		this.transport.makePhoneCall(number, url).then(ok, errorHandler);
		//res.status(501).end("Not Implemented");
	}else{		
		// Well then generate and send.
		var message = OTPHandShake.createOTPTextMessage(otp);
		//console.log(number, message);
		this.transport.sendSMS(number, message).then(ok, errorHandler);
	};
}

OTPAuth.prototype.verify = function(req, res, next){
	var otp = req.param('otp');
	var loginSuccess = false;
	var otpHandshake = req.session.otpHandshake;


	if( otpHandshake === undefined || otpHandshake === null || otp === undefined ){
		return res.status(401).end('Unauthorized');
	}
	
	if( otpHandshake.leftAttempts <= 0){
		req.session.otpHandshake = null;
		return res.status(410).end('Your OTP has expired');
	}

	otpHandshake.leftAttempts--;

	
	if( otp === OTPHandShake.createOTP(otpHandshake) ){
		loginSuccess = true;

		if( this.opts.preserveData === true ){
			console.log("preserving data now", otpHandshake.data);
			req.params = otpHandshake.data.params;
			req.body = otpHandshake.data.body;
			req.query = otpHandshake.data.query;			
			console.log(req.query);
		}

		req.session.otpHandshake = null;
		return next();
	}

	
	return res.status(401).end('Unauthorized');
}

module.exports = OTPAuth;
