var EventEmitter = require("events").EventEmitter;

module.exports = class Base extends EventEmitter {
    constructor() {
        super();
    }
}