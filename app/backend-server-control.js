"use strict"

const {GetNextPort, GetNextPortAsync, TerminateServer} = require("./server-config")

const http = require("http")
const path = require('path')
const child_process = require("child_process")

const electron = require("electron")
const app = electron.app

const WINDOW_OPTIONS = {
    "title": "GlycReSoft",
    "webPreferences": {
        "preload": path.join(__dirname, "static/js/preload.js")
    }
}

const serverConfig = require("./server-config").configManager


var EXECUTABLE = "\"" + serverConfig.serverExecutable + '" server '
console.log(EXECUTABLE)

function BackendServerControl(project, options){
    options = options === undefined ? {} : options;
    this.project = project
    console.log(this.project, this.project.storePath)
    this.port = undefined
    if(options.port === undefined) {
        let self = this
        GetNextPortAsync((err, port) => {
            self.port = port
            self.url = "http://127.0.0.1:" + this.port
        })
    } else {
        this.port = options.port
    }
    this.host = options.host === undefined ? "127.0.0.1" : options.host
    this.protocol = options.protocol === undefined ? "http:" : options.protocol
    this.terminateCallback = options.callback === undefined ? function(){} : options.callback
    this.url = null
    this.process = null
    this.window = null
}

BackendServerControl.EXECUTABLE = EXECUTABLE
BackendServerControl.prototype.EXECUTABLE = EXECUTABLE

BackendServerControl.prototype.constructServerProcessCall = function(){
    return (this.EXECUTABLE + "\"" + this.project.storePath + "\" --port " + this.port + " -b \"" + this.project.path + "\"")
}

BackendServerControl.prototype.launchServer = function(callback, n){
    if (n === undefined) {
        n = 0
    }
    if (n > 250) {
        throw new Error("No Port Assigned after 250 attempts")
    }
    // Guard against unavailable ports
    if(this.port === undefined){
        let self = this
        setTimeout(() => self.launchServer(callback, n + 1), 1250)
    } else {
        console.log(this.constructServerProcessCall())
        let child = child_process.exec(this.constructServerProcessCall())
        child.stdout.on("data", function(){
            //console.log("stdout", arguments)
            //console.log(arguments[0])
        })
        child.stderr.on("data", function(){
            //console.log("stderr", arguments)
            //console.log(arguments[0])
        })
        this.process = child
        callback()
    }
}


BackendServerControl.prototype.configureTerminationBehavior = function(){
    var self = this
    self.process.on("exit", function(){
        console.log("Server View Exited!", arguments)
        self.terminateServer()
        self.terminateCallback(self)
    })
    self.window.on("close", function(){
        console.log('Server View Closed!', self.project)
        self.terminateServer()
        // self.process.kill()
        self.terminateCallback(self)
    })

}


BackendServerControl.prototype.openWindow = function(){
    this.window = new electron.BrowserWindow(WINDOW_OPTIONS)
    // this.window.webContents.openDevTools()
    this.window.loadURL(this.url)
    this.window.maximize()
}


BackendServerControl.prototype.navigateOnReady = function(count, callback){
    var url = this.url
    var self = this
    count = count === undefined ? 1 : count + 1;
    if(count > 600){
        throw new Error("Server Not Ready After " + count + " Tries")
    }
    console.log("Calling navigateOnReady with", count, url)
    http.get(self.url, function(response){
        var retry = false
        if(response.statusCode == 200){
            console.log(self.url)
            try{
                self.openWindow()
                if(callback !== undefined){
                    callback()
                }                
            } catch(error){
                retry = true
                console.log(error)
            }
        } else {
            retry = true
        }
        if(retry){
            self.navigateOnReady(count, callback)
        }
    }).on('error', function(e) {
        console.log(e)
        setTimeout(function(){self.navigateOnReady(count, callback)}, 150)
    });
}

BackendServerControl.prototype.terminateServer = function(){
    console.log("Terminating ", this.url)
    let rq = http.request({host:this.host, "port": this.port, protocol: this.protocol,
                           path: "/internal/shutdown", method: "POST"})
    rq.on("data", function(data){
        console.log("terminateServer response", arguments)
    })
    rq.on("error", function(err){
        console.log("terminateServer failed")
    })
    rq.end()
}

BackendServerControl.launch = function(project, options){
    var server = new BackendServerControl(project, options)
    console.log(server, server.project)
    server.launchServer(() => server.navigateOnReady(0, function(){server.configureTerminationBehavior()}))
    console.log("Server Launched")
    return server
}

module.exports = BackendServerControl
    
