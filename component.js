
module.exports = class Component {
	
	constructor () {
        // class constructor
        this.$_name = '';
        
        this.server = null;
        this.config = null;
        this.defaultConfig = null;
        this.logger = null;
	}
	
	init(server, config) {
		// initialize and attach to server
		this.server = server;
		this.config = config || server.config.getSub( this.$_name );
		this.logger = server.logger;
		
		// init config and monitor for reloads
		this.initConfig();
		this.config.on('reload', this.initConfig.bind(this));
	}
	
	initConfig() {
		// import default config
		if (this.defaultConfig) {
			var config = this.config.get();
			for (var key in this.defaultConfig) {
				if (typeof(config[key]) == 'undefined') {
					config[key] = this.defaultConfig[key];
				}
			}
		}
	}
	
	earlyStart() {
		// override in subclass, return false to interrupt startup
		return true;
	}
	
	startup(callback) {
		// override in subclass
		callback();
	}
	
	shutdown(callback) {
		// override in subclass
		callback();
	}
	
	debugLevel(level) {
		// check if we're logging at or above the requested level
		return (this.logger.get('debugLevel') >= level);
	}
	
	logDebug(level, msg, data) {
		// proxy request to system logger with correct component
		this.logger.set( 'component', this.$_name );
		this.logger.debug( level, msg, data );
	}
	
	logError(code, msg, data) {
		// proxy request to system logger with correct component
		this.logger.set( 'component', this.$_name );
		this.logger.error( code, msg, data );
	}
	
	logTransaction(code, msg, data) {
		// proxy request to system logger with correct component
		this.logger.set( 'component', this.$_name );
		this.logger.transaction( code, msg, data );
	}
	
}