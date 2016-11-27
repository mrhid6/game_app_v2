var Loader = {};

var logger_config = require('./logger_config.json');
Loader.logger = require('nicelogger').config(logger_config.logger, "/nodejs/web/game_app_v2");


Loader.config = require("./config");

module.exports = Loader;