#! /usr/bin/env node

var program = require('commander');
var pack = require('./package.json');
var exec = require('child_process').exec;
var fs = require('fs');
var path = require('path');

program
	.version(pack.version)
	.usage('[options]')
	.description('Import/Export docker-machines')
	.option('-x, --export [value]', 'export docker machine')
	.option('-i, --import [value]', 'import json encoded output from dmport export')
	.parse(process.argv);

if(!program.export && !program.import){
	console.error('An option is required');
	process.exit(9);
}

if(program.export){
	exec('docker-machine env ' + program.export, function(error, stdout, stderr) {
		if (error) {
			console.error('exec error',error);
			return;
		}
		var config = {};
		var machinepath = /DOCKER_CERT_PATH=(.*)/g.exec(stdout)[1].replace(/['"]+/g, '');
		var certPathArray = machinepath.split(path.sep);
		var certpath = '';
		certPathArray.splice(-2, 2);
		certPathArray.push("certs");
		certpath = certPathArray.join(path.sep);
		
		var r =  /(DOCKER_[A-Z]\w+)=(.*)/g;
		var m;
		
		while (m = r.exec(stdout)) {
			config[m[1]] = m[2].replace(/['"]+/g, '');
		}
		config["machines"] = {};
		config["certs"] = {};
		
		fs.readdir(certpath, function(err, files){
			Promise.all(files.map(function(filename){
				return new Promise(function (resolve, reject) {
					fs.readFile(path.join(certpath, filename), 'utf8', function (err, data) {
						if (err) {
							reject(err);
						}

						config["certs"][filename] = new Buffer(data).toString('base64');
						resolve();
					});
				});
			})).then(function(){
				config["machines"][program.export] = {};
				fs.readdir(machinepath, function(err, files){
					Promise.all(files.map(function(filename){
						return new Promise(function (resolve, reject) {
							fs.readFile(path.join(machinepath, filename), 'utf8', function (err, data) {
								if (err) {
									reject(err);
								}

								config["machines"][program.export][filename] = new Buffer(data).toString('base64');
								resolve();
							});
						});
					})).then(function(){
						console.log(JSON.stringify(config));
					}).catch(function (err) {
						console.error(err)
					});
				});
			}).catch(function (err) {
				console.error(err)
			});
		});
		
	});
}