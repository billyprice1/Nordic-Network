var path = require('path');
var mods = require('./getProps.js');
var user = require('./user-extras.js');
var express = mods.express;
var app = mods.app;
var http = mods.http;
var io = mods.io;
var fs = require('fs');
var exec = require('child_process').exec;

var values = mods.values;
var props = mods.props;

// Get line number; for debugging
Object.defineProperty(global, '__stack', {
  get: function(){
    var orig = Error.prepareStackTrace;
    Error.prepareStackTrace = function(_, stack){ return stack; };
    var err = new Error;
    Error.captureStackTrace(err, arguments.callee);
    var stack = err.stack;
    Error.prepareStackTrace = orig;
    return stack;
  }
});

Object.defineProperty(global, '__line', {
  get: function(){
    return __stack[1].getLineNumber();
  }
});

function printError(reason, id) {
	io.emit('server-checked', {"success": false, "reason": reason, "id": id});
}

function printSuccess(id) {
	if(typeof id == 'number') {
		io.emit('server-checked', {"success": true, "id": id});
	} else {
		io.emit('server-checked', {"success": true});
	}
}

function boolify(obj, ignoreCase) {
	if(ignoreCase) {
		str = str.toLowerCase();
	}
	
	if(obj == 'true' || obj == 1 || obj == '1') {
		return true;
	} else {
		return false;
	}
}

io.on('connection', function(socket){
	var IP = socket.request.connection.remoteAddress;
	socket.on('start-server', function(data){
		user.isBanned(IP, function(err, banned) {
			if(err) {
				return console.log(err);
			}
			
			if(banned[0]) {
				return printError("Please don't overload our servers.", Number('0.' + __line));
			} else if(banned[1] == 0) {
				user.addIP(IP, function(err) {
					if(err) {
						console.log(err);
					}
					
					user.incrUsage(IP, 16);
				});
			} else {
				user.incrUsage(IP, 16);
			}
			
			if(typeof data.server != 'number' || typeof data.session != 'string') {
				return printError("Invalid server ID and/or session ID.", Number('1.' + __line));
			}
			
			fs.readFile('servers/' + data.server + '/.properities', 'utf8', function(err, dat) {
				if (err) {
					return printError(err, Number('2.' + __line));
				}
				
				props = dat.split("\n");
				var serv_session = props[0].trim();
				var serv_isSleeping = boolify(props[1].trim());
				var serv_type = props[2].trim();
				var serv_typeCS = serv_type.substring(1, 2);
				var serv_rank = props[3].trim();
				var serv_timeOn = props[4].trim();
				var serv_ram = [[256, 512, 1024, 2048, 4096], [512, 1024, 2048, 4096], [512, 1024, 2048, 4096]];
				
				// Check if session is matching
				if(serv_session == data.session) {
					
					// Run server
					if(serv_type == 0) {
						// Minecraft
						
						exec("java -Xmx" + serv_ram[serv_type][serv_rank] + "M -Xms" + serv_ram[serv_type][serv_rank] + "M -jar servers/" + data.server + "/minecraft_server.jar nogui", function(err2, out, stderr) {
							if(err2) {
								return printError(stderr, Number('3.' + __line));
							}
							
							printSuccess(serv_type);
						});
					} else if(serv_type.substring(0, 1) == 1) {
						// CS:GO
						
						if(serv_typeCS == 1) { // Classic Competive
							exec("./srcds_run -game csgo -console -usercon +game_type 0 +game_mode 1 +mapgroup mg_active +map de_dust2", function(err, out, stderr) {
								if(err) {
									return printError(stderr, Number('4.' + __line));
								}
								
								printSuccess(serv_type);
							});
						} else if(serv_typeCS == 2) { // Arms Race
							exec("./srcds_run -game csgo -console -usercon +game_type 1 +game_mode 0 +mapgroup mg_armsrace +map ar_shoots", function(err, out, stderr) {
								if(err) {
									return printError(stderr, Number('5.' + __line));
								}
								
								printSuccess(serv_type);
							});
						} else if(serv_typeCS == 3) { // Demolition
							exec("./srcds_run -game csgo -console -usercon +game_type 1 +game_mode 1 +mapgroup mg_demolition +map de_lake", function(err, out, stderr) {
								if(err) {
									return printError(stderr, Number('6.' + __line));
								}
								
								printSuccess(serv_type);
							});
						} else if(serv_typeCS == 4) { // Deathmatch
							exec("./srcds_run -game csgo -console -usercon +game_type 1 +game_mode 2 +mapgroup mg_allclassic +map de_dust", function(err, out, stderr) {
								if(err) {
									return printError(stderr, Number('7.' + __line));
								}
								
								printSuccess(serv_type);
							});
						} else { // Classic Casual
							exec("./srcds_run -game csgo -console -usercon +game_type 0 +game_mode 0 +mapgroup mg_active +map de_dust2", function(err, out, stderr) {
								if(err) {
									return printError(stderr, Number('8.' + __line));
								}
								
								printSuccess(serv_type);
							});
						}
					} else if(serv_type == 2) {
						// TF2
						return printError("WIP", Number('9' + __line));
					} else {
						return printError("Unknown server type", Number('10.' + __line));
					}
				} else {
					return printError("ACCESS DENIED. But seriously, start your own server instead of others :P", Number('11.' + __line));
				}
			});
		});
	});
});
