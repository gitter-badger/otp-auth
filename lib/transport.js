var plivo = require('plivo');
var twilio = require('twilio');
var Promise = require('bluebird');
function PlivoService(key, secret, caller_id){
	this.client = plivo.RestAPI({
		authId: key,
		authToken: secret
	});
}

PlivoService.prototype.sendSMS = function(to, body, from){
	var self = this;	
	return new Promise(function(resolve, reject){	
		
		function plivoCallback(status_code, message){
			var msg = {
				code: status_code,
				message: message
			};

			if( status_code === 200 ){
				return resolve(msg);
			}

			reject(msg);
		}

		self.client.send_message({
			src: from,
			type: 'sms',
			text: body,
			dst: to
		}, plivoCallback);
	
	})
}

PlivoService.prototype.__initiateCall__ = function(to, caller_id){
	var self = this;
	return new Promise(function(resolve, reject){
			self.make_call({
				to: to,
				from: self.caller_id,
				answer_url: '20.21.22.23/convert_to_speak/:uid/'
			});
	})
}

PlivoService.prototype.__speakIt__ = function(body){
	var self = this;

	return new Promise(function(resolve, reject){
		self.speak({

		});
	})
}


PlivoService.prototype.makePhoneCall = function(to, body, caller_id){
	
	var initiateCall = this.__initiateCall__.bind(this);
	var speakIt = this.__speakIt__.bind(this, body);
	
	return new Promise(function(resolve, reject){
			// Hello world
			initiateCall(to, caller_id)
				.then(speakIt, reject)
				.then(resolve);
	});

}

PlivoService.prototype.createXMLSpeech = function (message){
	var response = plivo.Response();
	response.addSpeak(message.header);
	response.addSpeak(message.otp);
	response.addWait({
		length: 1
	});
	response.addSpeak('Once Again');	
	response.addSpeak(message.otp);
	response.addWait({
		length: 1
	});
	response.addSpeak(message.ender);
	response.addHangup({
		reason: "Call over",
		schedule: 1
	});
	
	return response.toXML();
}


function TwilioService(key, secret){
	this.client = twilio(key, secret);
}

TwilioService.prototype.sendSMS = function(to, body, from){
	var self = this;
	return new Promise(function(resolve, reject){

		function twilioCallback(err, response){
			if( !err ){
				resolve( response );
			}else{
				reject( err );
			}
		}	

		self.client.sendSMS({
			from: this.from,
			to: to,
			body: body
		}, plivoCallback);
	})
}

function TransportService(transport){
	this.service = null;
	this.caller_id = transport.caller_id;

	switch( transport.carrier ){
		case 'twilio':
			this.service = new TwilioService(transport.key, transport.secret);
			break;
		case 'plivo':
			this.service = new PlivoService(transport.key, transport.secret);
			break;
		default:
			throw new Error("Unknown service");
	}
}

TransportService.prototype.sendSMS = function(to, body){
	return this.service.sendSMS(to, body, this.caller_id);
}

TransportService.prototype.makePhoneCall = function(to, body){
	return this.service.makePhoneCall(to, body, this.caller_id);
}


TransportService.prototype.createXMLSpeech = function(message){
	return this.service.createXMLSpeech(message);
}

module.exports = TransportService;