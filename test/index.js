var assert = require('assert');
var exec = require('child_process').exec;
var pack = require('./../package.json');

describe('dmport export', function(){
	it('should show version', function(done){
		exec('node index.js -V', function(error, stdout, stderr) {
			if (error) {
				throw error;
			}
			assert(stdout, pack.version);
			done();
		});
	});

	it('should show help', function(done){
		exec('node index.js -h', function(error, stdout, stderr) {
			if (error) {
				throw error;
			}
			assert(stdout.indexOf('Usage:')!==-1);
			done();
		});
	});
	
	it('should throw an error if no option given');
	it('should throw an error if the export option given is invalid');
	it('should get the cert path for the machine given');
	it('should get the cert & Machine storage path');
	it('should get the env vars for the machine given');
	it('should read the cert files and convert them to base64');
	it('should read the machine files and convert them to base64');
	it('should find and replace the paths in the config.json with easy to find placeholders');
	it('should output a json string with the machine env vars as well as the file required to connect to a machine');
});

describe('dmport import', function(){
	it('should grab the value');
	it('should throw an error if the import option given is invalid');
	it('should parse the env vars and export them to the shell');
	it('should parse the import value and write the values to the proper files');
	it('should add the correct paths to the config.json');
});


