var assert = require('assert');
var exec = require('child_process').exec;
var pack = require('./../package.json');

describe('docker-machine import/export', function(){
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
	it('should throw an error if the import option given is invalid');
});