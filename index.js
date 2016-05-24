#! /usr/bin/env node

var program = require('commander');
var pack = require('./package.json');
var exec = require('child_process').exec;
var fs = require('fs');
var path = require('path');


//Setup our command line interactions
program
	.version(pack.version)
	.usage('[options]')
	.description('Import/Export docker-machines')
	.option('-x, --export [value]', 'export docker machine')
	.option('-i, --import [value]', 'import json encoded output from dmport export')
	.parse(process.argv);

//we require options so lets error out if we dont get them.
if(!program.export && !program.import){
	console.error('An option is required');
	process.exit(9);
}


//start the export method
if(program.export){

	//since this is specific to docker-machine we are assuming its installed for exporting.
	exec('docker-machine env ' + program.export, function(error, stdout, stderr) {
		if (error) {
			console.error('exec error',error);
			return;
		}
		var config = {};
		//this regex digs the path out of the environment variables
		var machinepath = /DOCKER_CERT_PATH=(.*)/g.exec(stdout)[1].replace(/['"]+/g, '');
		var certPathArray = machinepath.split(path.sep);
		var certpath = '';
		certPathArray.splice(-2, 2);
		var storepath = certPathArray.join(path.sep);
		
		certPathArray.push("certs");
		certpath = certPathArray.join(path.sep);

		//this regex look for all the environment variables with docker in the name, we also grab the value to place into our output config
		var r =  /(DOCKER_[A-Z]\w+)=(.*)/g;
		var m;

		//loop through the values of the regex to build our config
		while (m = r.exec(stdout)) {
			config[m[1]] = m[2].replace(/['"]+/g, '');
		}
		config["machines"] = {};
		config["certs"] = {};

		//next we grab the files in the cert path, not sure if these are needed but I suspect they are
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

				//next we grab the files in the machine export path, I added this into a machine key so we can later add exporting of multiple wihtout breaking anyting
				config["machines"][program.export] = {};
				fs.readdir(machinepath, function(err, files){
					Promise.all(files.map(function(filename){
						return new Promise(function (resolve, reject) {
							fs.readFile(path.join(machinepath, filename), 'utf8', function (err, data) {
								if (err) {
									reject(err);
								}

								//now we sanitize our paths in the config.json
								if(filename === 'config.json'){
									//this just preps the paths for use as regex, Im sure there is a better way to do this.
									//@todo test replace(/[\/]+/g, '\\/')
									//sanitize our machines path
									var jsonifiedMachinePath = JSON.stringify(machinepath)
										.replace(/['"]+/g, '')//remove quotes
										.replace(/[\\\\]+/g, '\\\\\\\\')//add escaping slashes for windows paths
										.replace(/[\/]+/g, '\\/');//add escaping slashes for linux paths

									//build our regex
									var jmpr = new RegExp(jsonifiedMachinePath+'(\\\\+)?', 'g');

									//replace our paths with something easily identifiable
									data = data.replace(jmpr, '__MACHINE_PATH__');
									
									//sanitize our certificate path
									var jsonifiedCertPath = JSON.stringify(certpath)
										.replace(/['"]+/g, '')
										.replace(/[\\\\]+/g, '\\\\\\\\')
										.replace(/[\/]+/g, '\\/');

									var jcpr = new RegExp(jsonifiedCertPath+'(\\\\+)?', 'g');

									data = data.replace(jcpr, '__MACHINE_CERT_PATH__');
									
									//santize our storepath
									var jsonifiedStorePath = JSON.stringify(storepath)
										.replace(/['"]+/g, '')
										.replace(/[\\\\]+/g, '\\\\\\\\')
										.replace(/[\/]+/g, '\\/');

									var jspr = new RegExp(jsonifiedStorePath+'(\\\\+)?', 'g');

									data = data.replace(jspr, '__MACHINE_STORE_PATH__');
									
									console.log(data);
								}

								config["machines"][program.export][filename] = new Buffer(data).toString('base64');
								resolve();
							});
						});
					})).then(function(){

						//once we are done just console log the config.
						//console.log(JSON.stringify(config));
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

if(program.import){

}