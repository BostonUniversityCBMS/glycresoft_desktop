"use strict"

var electron = require("electron")
var app = electron.app

var fs = require('fs')
var path = require('path')

var child_process = require("child_process")
var http = require('http')
var net = require("net")

const portfinder = require("portfinder")

var basePort = 5000
var portOffset = 0;
function GetNextPort(){
    var port = basePort + portOffset;
    portOffset += 1;
    return port
}


class ServerConfigCache {
    constructor() {
        this.portMap = {}
        this._serverExecutable = null
    }

    get executablePath() {
        return path.join(
            path.dirname(app.getAppPath()),
            "bin",
            "glycresoft-cli",
            "glycresoft-cli.exe")
    }

    get serverExecutable() {
        var hasServerExecutableInResources = false
        if(this._serverExecutable !== null){
            return this._serverExecutable
        }
        try{
            hasServerExecutableInResources = fs.lstatSync(this.executablePath)
        } catch (err) {
            hasServerExecutableInResources = false
        }
        if(hasServerExecutableInResources){
            this._serverExecutable = this.executablePath
        } else {
            this._serverExecutable = "glycresoft"       
        }
        return this._serverExecutable;
    }

    getNextPort() {
        return GetNextPort()
    }

    getNextPortAsync(callback){
        GetNextPortAsync(callback)
    }
}


var configManager = new ServerConfigCache()


const GetNextPortAsync = portfinder.getPort


function TerminateServer(port){
    http.request({host:"127.0.0.1", "port": port, path: "/internal/shutdown", method: "POST"}).end()
}

module.exports = {
    GetNextPort, GetNextPortAsync, TerminateServer,
    configManager
}