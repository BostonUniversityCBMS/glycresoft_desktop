"use strict"

const path = require("path")
var constants = require("./constants")
var PROJECT_FILE = constants.PROJECT_FILE
var VERSION = constants.VERSION


function getStorePath(project) {
    return path.join(project.path, PROJECT_FILE)
}


class Project {
    constructor(name, path, version) {
        if(name instanceof Object){
                this.name = name.name;
                this.path = name.path;
                this.version = name.version === undefined ? VERSION : name.version;
        }
        else {
            this.name = name;
            this.path = path;
            this.version = version === undefined ? VERSION : version;
        }

    }

    get storePath() {
        return getStorePath(this)
    }
}

module.exports = Project