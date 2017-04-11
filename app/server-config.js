"use strict"

const electron = require("electron")
const app = electron.app

const fs = require('fs')
const path = require('path')
const crypto = require("crypto")

const child_process = require("child_process")
const http = require('http')
const net = require("net")

const portfinder = require("portfinder")

var basePort = 5000
var portOffset = 0;
function GetNextPort(){
    var port = basePort + portOffset;
    portOffset += 1;
    return port
}


class ServerConfiguration {
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

    makeSecretToken() {
        let buf = crypto.randomBytes(48)
        return buf.toString("hex")
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


var configManager = new ServerConfiguration()


const GetNextPortAsync = portfinder.getPort


function TerminateServer(port){
    http.request({host:"127.0.0.1", "port": port, path: "/internal/shutdown", method: "POST"}).end()
}

module.exports = {
    GetNextPort, GetNextPortAsync, TerminateServer,
    configManager
}