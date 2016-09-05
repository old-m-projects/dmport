#! /usr/bin/env node

var program = require('commander');
var pack = require('./package.json');
var exec = require('child_process').exec;
var fs = require('fs');
var path = require('path');
var exportCommand = "";

/**
 * Docker Machine Import / Export
 *
 * @copyright 2016 Mumba Pty Ltd. All rights reserved.
 * @license   Apache-2.0
 */

//Setup our command line interactions
program
	.version(pack.version)
	.usage('[options]')
	.description('Import/Export docker-machines')
	.option('-x, --export [value]', 'export docker machine')
	.option('-i, --import [value]', 'import json encoded output from dmport export. NOTE! use eval $(dmport -i $ENVVAR_W_EXPORT_JSON) to set env vars for machine, certificates will also be written to file')
	.option('-s, --shell [value]', 'sets the shell for docker-machine to use')
	.parse(process.argv);

//we require options so lets error out if we dont get them.
if (!program.export && !program.import) {
	console.error('An option is required');
	process.exit(9);
}

function getPaths(vars) {
	var machinepath, certPathArray, storepath, certpath;

	if (vars.indexOf('DOCKER_') === -1) {
		machinepath = path.join(process.env.HOME, '.docker', 'machine', 'machines', vars, path.sep);
		certpath = path.join(process.env.HOME, '.docker', 'machine', 'certs', path.sep);
		storepath = path.join(process.env.HOME, '.docker', 'machine', path.sep);

		if (!fs.existsSync(path.join(process.env.HOME, '.docker'))) {
			fs.mkdirSync(path.join(process.env.HOME, '.docker'));
		}

		if (!fs.existsSync(storepath)) {
			fs.mkdirSync(storepath);
		}

		if (!fs.existsSync(certpath)) {
			fs.mkdirSync(certpath);
		}

		if (!fs.existsSync(path.join(storepath, 'machines'))) {
			fs.mkdirSync(path.join(storepath, 'machines'));
		}

		if (!fs.existsSync(machinepath)) {
			fs.mkdirSync(machinepath);
		}
	} else {
		//this regex digs the path out of the environment variables
		machinepath = /DOCKER_CERT_PATH=(.*)/g.exec(vars)[1].replace(/['"]+/g, '');
		certPathArray = machinepath.split(path.sep);
		certPathArray.splice(-2, 2);
		storepath = certPathArray.join(path.sep);
		certPathArray.push("certs");
		certpath = certPathArray.join(path.sep);
	}

	return {"machine": machinepath, "cert": certpath, "store": storepath};
}

//start of the export method
if (program.export) {

	exportCommand = 'docker-machine env ' + program.export;

	if(program.shell){
		exportCommand = exportCommand + ' --shell ' + program.shell;
	}

	//since this is specific to docker-machine we are assuming its installed for exporting.
	exec(exportCommand, function (error, stdout, stderr) {
		if (error) {
			console.error('exec error', error);
			return;
		}
		var config = {};
		var paths = getPaths(stdout);

		//this regex look for all the environment variables with docker in the name, we also grab the value to place into our output config
		var r = /(DOCKER_[A-Z]\w+)=(.*)/g;
		var m;

		//loop through the values of the regex to build our config
		while (m = r.exec(stdout)) {
			if (m[1] === 'DOCKER_CERT_PATH') {
				config[m[1]] = '__MACHINE_PATH__';
			} else {
				config[m[1]] = m[2].replace(/['"]+/g, '');
			}
		}
		config["machines"] = {};
		config["certs"] = {};

		//next we grab the files in the cert path, not sure if these are needed but I suspect they are
		fs.readdir(paths.cert, function (err, files) {
			Promise.all(files.map(function (filename) {
				return new Promise(function (resolve, reject) {
					fs.readFile(path.join(paths.cert, filename), 'utf8', function (err, data) {
						if (err) {
							reject(err);
						}

						config["certs"][filename] = new Buffer(data).toString('base64');
						resolve();
					});
				});
			})).then(function () {

				//next we grab the files in the machine export path, I added this into a machine key so we can later add exporting of multiple wihtout breaking anyting
				config["machines"][program.export] = {};
				fs.readdir(paths.machine, function (err, files) {
					Promise.all(files.map(function (filename) {
						return new Promise(function (resolve, reject) {
							fs.readFile(path.join(paths.machine, filename), 'utf8', function (err, data) {
								if (err) {
									reject(err);
								}

								//now we sanitize our paths in the config.json
								if (filename === 'config.json') {
									//this just preps the paths for use as regex, Im sure there is a better way to do this.
									//@todo test replace(/[\/]+/g, '\\/')
									//sanitize our machines path
									var jsonifiedMachinePath = JSON.stringify(paths.machine)
										.replace(/['"]+/g, '')//remove quotes
										.replace(/[\\\\]+/g, '\\\\\\\\')//add escaping slashes for windows paths
										.replace(/[\/]+/g, '\\/');//add escaping slashes for linux paths

									//build our regex
									var jmpr = new RegExp(jsonifiedMachinePath + '(\\\\+)?', 'g');

									//replace our paths with something easily identifiable
									data = data.replace(jmpr, '__MACHINE_PATH__');

									//sanitize our certificate path
									var jsonifiedCertPath = JSON.stringify(paths.cert)
										.replace(/['"]+/g, '')
										.replace(/[\\\\]+/g, '\\\\\\\\')
										.replace(/[\/]+/g, '\\/');

									var jcpr = new RegExp(jsonifiedCertPath + '(\\\\+)?', 'g');

									data = data.replace(jcpr, '__MACHINE_CERT_PATH__');

									//santize our storepath
									var jsonifiedStorePath = JSON.stringify(paths.store)
										.replace(/['"]+/g, '')
										.replace(/[\\\\]+/g, '\\\\\\\\')
										.replace(/[\/]+/g, '\\/');

									var jspr = new RegExp(jsonifiedStorePath + '(\\\\+)?', 'g');

									data = data.replace(jspr, '__MACHINE_STORE_PATH__');
								}

								config["machines"][program.export][filename] = new Buffer(data).toString('base64');
								resolve();
							});
						});
					})).then(function () {

						//once we are done just console log the config.
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

//start of the import method
if (program.import) {
	var input = JSON.parse(program.import);
	var keys = Object.keys(input);
	var env = '';
	var paths;

	Object.keys(input['machines']).map(function (machinename) {

		//we do the machine first so we can get the paths setup for certs but also change paths in the future if we have multiple machines.
		paths = getPaths(machinename);

		//We do the certs now that we have the paths setup
		Promise.all(Object.keys(input['certs']).map(function (filename) {
			return new Promise(function (resolve, reject) {
				fs.writeFile(path.join(paths.cert, filename), new Buffer(input['certs'][filename], 'base64'), {
					'encoding': 'utf8',
					'mode': '600'
				}, function (err) {
					if (err) {
						reject(err);
					}
					resolve();
				});
			});
		})).then(function () {

		}).catch(function (err) {
			console.error(err)
		});

		//Finally we do the machines files
		Promise.all(Object.keys(input['machines'][machinename]).map(function (filename) {
			return new Promise(function (resolve, reject) {
				var cleartext = new Buffer(input['machines'][machinename][filename], 'base64');

				//for the config.json we want to add the paths appropriate for the computer we are importing to
				if (filename === 'config.json') {
					cleartext = cleartext.toString();
					cleartext = cleartext.replace(/__MACHINE_PATH__/g, JSON.stringify(paths.machine).replace(/['"]+/g, ''));
					cleartext = cleartext.replace(/__MACHINE_CERT_PATH__/g, JSON.stringify(paths.cert).replace(/['"]+/g, ''));
					cleartext = cleartext.replace(/__MACHINE_STORE_PATH__/g, JSON.stringify(paths.store).replace(/['"]+/g, ''));
				}

				fs.writeFile(path.join(paths.machine, filename), cleartext, {
					'encoding': 'utf8',
					'mode': '600'
				}, function (err) {
					if (err) {
						reject(err);
					}


					resolve();
				});
			});
		})).then(function () {
			//we loop through once to get our paths && exports
			keys.forEach(function (v) {
				if (v.indexOf('DOCKER') !== -1) {
					if (v === 'DOCKER_CERT_PATH') {
						env += 'export ' + v + '="' + paths.machine + '"\n';
					} else {
						env += 'export ' + v + '="' + input[v] + '"\n';
					}

				}
			});

			//output our environment vars
			console.log(env);
		}).catch(function (err) {
			console.error(err)
		});
	});

}