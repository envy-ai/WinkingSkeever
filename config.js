// load configuration from config.yaml

const fs = require('fs');
const yaml = require('js-yaml');
const yamlFile = 'config.yaml';
const config = yaml.load(fs.readFileSync(yamlFile, 'utf8'));

module.exports = config;