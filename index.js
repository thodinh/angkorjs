var Angkor = require('./angkor-server');
module.exports = Angkor;

var yaml = require('js-yaml');
var conf = yaml.safeLoad(require('fs').readFileSync(__dirname + '/conf/config.yaml', 'utf8'));
console.log(conf)