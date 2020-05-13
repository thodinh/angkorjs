# angkorjs

# Overview

The generic server daemon and supports a component plug-in system built-in with basic functions such as configuration file loading, command-line argument parsing, logging, and more.

# Usage

Use [npm](https://www.npmjs.com/) to install the module:

```
npm install angkorjs
```

Then use `require()` to load it in your code:

```javascript
var AngkorServer = require('angkorjs');
```

Then instantiate a server object and start it up:

```javascript
var server = new AngkorServer({
	
	$_name: 'AngkorServer',
    $_version : "1.0",
	
	configFile: __dirname + '/conf/config.json',
	components: []
	
});

server.startup( function() {
	// It's work!
} );
```

Of course, this example won't actually do anything useful, because the server has no components.  Let's add a web server component to our server, just to show how it works:

```javascript
var AngkorServer = require('angkorjs');

var server = new AngkorServer({
	
	$_name: 'AngkorServer',
	$_version: "1.0",
	
	config: {
		"log_dir": "./log",
		"debug_level": 9,
		
		"ExpressServer": {
			"port": 80,
			"dir": "./html"
		}
	},
	
	components: [
		require('./components/express-server')
	]
	
});
server.startup( function() {
	// startup complete
} );
```

# Configuration

```javascript
{
	config: {
		"log_dir": "/var/log",
		"debug_level": 9,
		"uid": "www"
	}
}
```

Or it can be saved in JSON file, and specified using the `configFile` property like this:

```javascript
{
	configFile: "conf/config.json"
}
```

Here are the global configuration keys:

| Config Key | Default Value | Description |
|------------|---------------|-------------|
| `debug` | `false` | When set to `true`, will run directly on the console without forking a daemon process. |
| `echo` | `false` | When set to `true` and combined with `debug`, will echo all log output to the console. |
| `color` | `false` | When set to `true` and combined with `echo`, all log columns will be colored in the console. |
| `log_dir` | "." | Directory path where event log will be stored. |
| `log_filename` | "event.log" | Event log filename, joined with `log_dir`. |
| `log_columns` | [Array] | Custom event log columns, if desired (see [Logging](#logging) below). |
| `log_crashes` | `false` | When set to `true`, will log all uncaught exceptions to a `crash.log` file in the `log_dir` dir. |
| `log_async` | `false` | When set to `true`, all log entries will be written in async mode (i.e. in the background). |
| `uid` | `null` | If set and running as root, forked daemon process will attempt to switch to the specified user (numerical ID or a username string). |
| `pid_file` | - | Optionally set a PID file, that is created on startup and deleted on shutdown. |
| `debug_level` | `1` | Debug logging level, larger numbers are more verbose, 1 is quietest, 10 is loudest. |
| `inject_cli_args` | - | Optionally inject Node.js command-line arguments into forked daemon process, e.g. `["--max_old_space_size=4096"]`. |
| `log_debug_errors` | `false` | Optionally log all debug level 1 events as errors with `fatal` code.  Helps for visibility with log alerting systems. |

Remember that each component should have its own configuration key.  Here is an example server configuration, including the `WebServer` component:

```javascript
{
	config: {
		"log_dir": "/var/log",
		"debug_level": 9,
		"uid": "www",
		
		"WebServer": {
			"http_port": 80,
			"http_htdocs_dir": "/var/www/html"
		}
	}
}
```

Consult the documentation for each component you use to see which keys they require.

## Command-Line Arguments

You can specify command-line arguments when launching your server.  If these are in the form of `--key value` they will override any global configuration keys with matching names.  For example, you can launch your server in debug mode and enable log echo like this:

```
node my-script.js --debug 1 --echo 1
```

Actually, you can set a configuration key to boolean `true` simply by including it without a value, so this works too:

```
node my-script.js --debug --echo
```

### Optional Echo Categories

If you want to limit the log echo to certain log categories or components, you can specify them on the command-line, like this:

```
node my-script.js --debug 1 --echo "debug error"
```

This would limit the log echo to entries that had their `category` or `component` column set to either `debug` or `error`.  Other non-matched entries would still be logged -- they just wouldn't be echoed to the console.

## Multi-File Configuration

If your app has multiple configuration files, you can specify a `multiConfig` property (instead of `configFile`) in your pixl-server class.  The `multiConfig` property should be an array of objects, with each object representing one configuration file.  The properties in the objects should be as follows:

| Property Name | Description |
|---------------|-------------|
| `file` | **(Required)** Filesystem path to the configuration file. |
| `key` | Optional key for configuration to live under (omit to merge file into top-level config). |
| `parser` | Optional function for parsing custom file format (defaults to `JSON.parse`). |
| `freq` | Optional frequency for polling file for changes (in milliseconds, defaults to `10000`). |

So for example, let's say you had one main configuration file which you want loaded and parsed as usual, but you also have an environment-specific config file, and want it included as well, but separated into its own namespace.  Here is how you could accomplish this with `multiConfig`:

```js
"multiConfig": [
	{
		"file": "/opt/myapp/conf/config.json"
	},
	{
		"file": "/etc/env.json",
		"key": "env"
	}
]
```

So in the above example the `config.json` file would be loaded and parsed as if it were the main configuration file (since it has no `key` property), and its contents merged into the top-level server configuration.  Then the `/etc/env.json` file would also be parsed, and its contents made available in the `env` configuration key.  So you could access it via:

```js
var env = server.config.get('env');
```

Both files would be monitored for changes (polled every 10 seconds by default) and hot-reloaded as necessary.  If any file is reloaded, a `reload` event is emitted on the main `server.config` object, so you can listen for this and perform any app-specific operations as needed.

For another example, let's say your environment-specific file is actually in [XML](https://en.wikipedia.org/wiki/XML) format.  For this, you need to specify a custom parser function via the `parser` property.  If you use our own [pixl-xml](https://www.npmjs.com/package/pixl-xml) module, the usage is as follows:

```js
"multiConfig": [
	{
		"file": "/opt/myapp/conf/config.json"
	},
	{
		"file": "/etc/env.xml",
		"key": "env",
		"parser": require('pixl-xml').parse
	}
]
```

Your `parser` function is passed a single argument, which is the file contents preloaded as UTF-8 text, and it is expected to return an object containing the parsed data.  If you need to parse your own custom file format, you can call your own inline function like this:

```js
"multiConfig": [
	{
		"file": "/opt/myapp/conf/config.json"
	},
	{
		"file": "/etc/env.ini",
		"key": "env",
		"parser": function(text) {
			// parse simple INI `key=value` format
			var config = {};
			text.split(/\n/).forEach( function(line) {
				if (line.trim().match(/^(\w+)\=(.+)/)) { 
					config[ RegExp.$1 ] = RegExp.$2; 
				}
			} );
			return config;
		}
	}
]
```

If your custom parser function throws during the initial load at startup, the error will bubble up and cause an immediate shutdown.  However, if it throws during a hot reload event, the error is caught, logged as a level 1 debug event, and the old configuration is used until the file is modified again.  This way a malformed config file edit won't bring down a live server.

It is perfectly fine to have multiple configuration files that "share" the top-level main configuration namespace.  Just specify multiple files without `key` properties.  Example:

```js
"multiConfig": [
	{
		"file": "/opt/myapp/conf/config-part-1.json"
	},
	{
		"file": "/opt/myapp/conf/config-part-2.json"
	}
]
```

Beware of key collision here inside your files: no error is thrown, and the latter prevails.

You can also combine an inline `config` object, and the `multiConfig` object, in your server properties.  The files in the `multiConfig` array take precedence, and can override any keys present in the inline config.  Example:

```js
{
	"config": {
		"log_dir": "/var/log",
		"log_filename": "myapp.log",
		"debug_level": 9
	},
	"multiConfig": [
		{
			"file": "/opt/myapp/conf/config.json"
		},
		{
			"file": "/etc/env.json",
			"key": "env"
		}
	]
}
```

If you need to temporarily swap out your `multiConfig` file paths for testing, you can do so on the command-line.  Simply specify one or more `--multiConfig` CLI arguments, each one pointing to a replacement file.  The files must be specified in order of the items in your `multiConfig` array.  Example:

```
node myserver.js --multiConfig test/config.json --multiConfig test/env.json
```

**Note:** The `configFile` and `multiConfig` server properties are mutually exclusive.  If you specify `configFile`  it takes precedence, and disables the multi-config system.

# Logging

The server keeps an event log using the [pixl-logger](https://www.npmjs.com/package/pixl-logger) module.  This is a combination of a debug log, error log and transaction log, with a `category` column denoting the type of log entry.  By default, the log columns are defined as:

```javascript
['hires_epoch', 'date', 'hostname', 'component', 'category', 'code', 'msg', 'data']
```

However, you can override these and provide your own array of log columns by specifying a `log_columns` configuration key.

Here is an example debug log snippet:

```
[1432581882.204][2015-05-25 12:24:42][joeretina-2.local][][debug][1][MyServer v1.0 Starting Up][]
[1432581882.207][2015-05-25 12:24:42][joeretina-2.local][][debug][2][Configuration][{"log_dir":"/Users/jhuckaby/temp","debug_level":9,"WebServer":{"http_port":3012,"http_htdocs_dir":"/Users/jhuckaby/temp"},"debug":true,"echo":true}]
[1432581882.208][2015-05-25 12:24:42][joeretina-2.local][][debug][2][Server IP: 10.1.10.17, Daemon PID: 26801][]
[1432581882.208][2015-05-25 12:24:42][joeretina-2.local][][debug][3][Starting component: WebServer][]
[1432581882.209][2015-05-25 12:24:42][joeretina-2.local][WebServer][debug][2][Starting HTTP server on port: 3012][]
[1432581882.218][2015-05-25 12:24:42][joeretina-2.local][][debug][2][Startup complete, entering main loop][]
```

For debug log entries, the `category` column is set to `debug`, and the `code` columns is used as the debug level.  The server object (and your component object) has methods for logging debug messages, errors and transactions:

```javascript
server.logDebug( 9, "This would be logged at level 9 or higher." );
server.logError( 1005, "Error message for code 1005 here." );
server.logTransaction( 99.99, "Description of transaction here." );
```

These three methods all accept two required arguments, and an optional 3rd "data" object, which is serialized and logged into its own column if provided.  For the debug log, the first argument is the debug level.  Otherwise, it is considered a "code" (can be used however your app wants).

When you call `logDebug()`, `logError()` or `logTransaction()` on your component object, the `component` column will be set to the component name.  Otherwise, it will be blank (including when the server logs its own debug messages).

If you need low-level, direct access to the [pixl-logger](https://www.npmjs.com/package/pixl-logger) object, you can call it by accessing the `logger` property of the server object or your component class.  Example:

```javascript
server.logger.print({ 
	category: 'custom', 
	code: 'custom code', 
	msg: "Custom message here", 
	data: { text: "Will be serialized to JSON" } 
});
```

The server and component classes have a utility method named `debugLevel()`, which accepts a log level integer, and will return `true` if the current debug log level is high enough to emit something at the specified level, or `false` if it would be silenced.

# Component Development

To develop your own component, create a class that inherits from the `pixl-server/component` base class.  It is recommended you use the [pixl-class](https://www.npmjs.com/package/pixl-class) module for this.  Set your `$_name` property to a unique, alphanumeric name, which will be your Component ID.  This is how other components can reference yours from the `server` object, and this is the key used for your component's configuration as well.

Here is a simple component example:

```javascript
var Class = require("pixl-class");
var Component = require("pixl-server/component");

module.exports = Class.create({
	
	$_name: 'MyComponent',
	__parent: Component,
	
	startup: function(callback) {
		this.logDebug(1, "My component is starting up!");
		callback();
	},
	
	shutdown: function(callback) {
		this.logDebug(1, "My component is shutting down!");
		callback();
	}
	
});
```

Now, assuming you saved this class as `my_component.js`, you would load it in a server by adding it to the `components` array like this:

```javascript
components: [
	require('pixl-server-web'),
	require('./my_component.js')
]
```

This would load the [pixl-server-web](https://www.npmjs.com/package/pixl-server-web) component first, followed by your `my_component.js` component after it.  Remember that the load order is important, if you have a component that relies on another.

Your component's configuration would be keyed off the value in your `$_name` property, like this:

```javascript
{
	config: {
		"log_dir": "/var/log",
		"debug_level": 9,
		"uid": "www",
		
		"WebServer": {
			"http_port": 80,
			"http_htdocs_dir": "/var/www/html"
		},
		
		"MyComponent": {
			"key1": "Value 1",
			"key2": "Value 2"
		}
	}
}
```

If you want to specify default configuration keys (in case they are missing from the server configuration for your component), you can define a `defaultConfig` property in your class, like this:

```javascript
module.exports = Class.create({
	$_name: 'MyComponent',
	__parent: Component,
	
	defaultConfig: {
		"key1": "Default Value 1",
		"key2": "Default Value 2"
	}
});
```

## Startup and Shutdown

Your component should at least provide `startup()` and `shutdown()` methods.  These are both async methods, which should invoke the provided callback function when they are complete.  Example:

```javascript
{
	startup: function(callback) {
		this.logDebug(1, "My component is starting up!");
		callback();
	},
	
	shutdown: function(callback) {
		this.logDebug(1, "My component is shutting down!");
		callback();
	}
}
```

As with all Node.js callbacks, if something goes wrong and you want to abort the startup or shutdown routines, pass an `Error` object to the callback method.

## Accessing Your Configuration

Your configuration object is always accessible via `this.config`.  Note that this is an instance of [pixl-config](https://www.npmjs.com/package/pixl-config), so you need to call `get()` on it to fetch individual configuration keys, or you can fetch the entire object by calling it without an argument:

```javascript
{
	startup: function(callback) {
		this.logDebug(1, "My component is starting up!");
		
		// access our component configuration
		var key1 = this.config.get('key1');
		var entire_config = this.config.get();
		
		callback();
	}
}
```

If the server configuration is live-reloaded due to a changed file, your component's `config` object will emit a `reload` event, which you can listen for.

## Accessing The Root Server

Your component can always access the root server object via `this.server`.  Example:

```javascript
{
	startup: function(callback) {
		this.logDebug(1, "My component is starting up!");
		
		// access the main server configuration
		var server_uid = this.server.config.get('uid');
		
		callback();
	}
}
```

## Accessing Other Components

Other components are accessible via `this.server.COMPONENT_NAME`.  Please be aware of the component load order, as components listed below yours in the server `components` array won't be fully loaded when your `startup()` method is called.  Example:

```javascript
{
	startup: function(callback) {
		this.logDebug(1, "My component is starting up!");
		
		// access the WebServer component
		this.server.WebServer.addURIHandler( '/my/custom/uri', 'Custom Name', function(args, callback) {
			// custom request handler for our URI
			callback( 
				"200 OK", 
				{ 'Content-Type': "text/html" }, 
				"Hello this is custom content!\n" 
			);
		} );
		
		callback();
	}
}
```

## Accessing The Server Log

Your component's base class has convenience methods for logging debug messages, errors and transactions via the `logDebug()`, `logError()` and `logTransaction()` methods, respectively.  These log messages will all be tagged with your component name, to differentiate them from other components and generic server messages.  Example:

```javascript
this.logDebug( 9, "This would be logged at level 9 or higher." );
this.logError( 1005, "Error message for code 1005 here." );
this.logTransaction( 99.99, "Description of transaction here." );
```

If you need low-level, direct access to the [pixl-logger](https://www.npmjs.com/package/pixl-logger) object, you can call it by accessing the `logger` property of your component class.  Example:

```javascript
this.logger.print({ 
	category: 'custom', 
	code: 'custom code', 
	msg: "Custom message here", 
	data: { text: "Will be serialized to JSON" } 
});
```

# Uncaught Exceptions

When the `log_crashes` feature is enabled, the [uncatch](https://www.npmjs.com/package/uncatch) module is used to manage uncaught exceptions.  The server registers a listener to log crashes, but you can also add your own listener to perform emergency shutdown procedures in the event of a crash (uncaught exception).

The idea with [uncatch](https://www.npmjs.com/package/uncatch) is that multiple modules can all register listeners, and that includes your application code.  Example:

```js
require('uncatch').on('uncaughtException', function(err) {
	// run your own sync shutdown code here
	// do not call process.exit
});
```
