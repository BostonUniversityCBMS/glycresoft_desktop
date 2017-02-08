"use strict"

const {GetNextPort, GetNextPortAsync, TerminateServer} = require("./server-config")

const http = require("http")
const querystring = require("querystring")
const path = require('path')
const child_process = require("child_process")

const electron = require("electron")
const app = electron.app
const ipcMain = electron.ipcMain

const WINDOW_OPTIONS = {
    "title": "GlycReSoft",
    "webPreferences": {
        "preload": path.join(__dirname, "static/js/preload.js")
    }
}

const serverConfig = require("./server-config").configManager


var EXECUTABLE = "\"" + serverConfig.serverExecutable + '" server '
console.log(EXECUTABLE)



class BackendServerControl {
    constructor(project, options) {
        options = options === undefined ? {} : options;
        this.project = project
        console.log(this.project, this.project.storePath)
        this.port = undefined
        this.url = null
        this.protocol = options.protocol === undefined ? "http:" : options.protocol
        this.host = options.host === undefined ? "127.0.0.1" : options.host
        if(options.port === undefined) {
            console.log("Acquiring port using GetNextPortAsync")
            let self = this
            GetNextPortAsync((err, port) => {
                self.port = port
                self.url = self.protocol + "//" + self.host + ":" + self.port
            })
        } else {
            this.port = options.port
            this.url = this.protocol + "//" + this.host + ":" + this.port
        }
        console.log("Server Setup: ", this.host, this.port, this.url)
        this.terminateCallback = options.callback === undefined ? function(){} : options.callback
        this.process = null
    }

    get hasStartedProcess() {
        return this.process !== null
    }

    constructServerProcessCall() {
        return (
            this.EXECUTABLE + "\"" + this.project.storePath +
            "\" --port " + this.port + " -b \"" + this.project.path + "\"")
    }

    launchServer(callback, n) {
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
                console.log(arguments[0])
            })
            child.stderr.on("data", function(){
                console.log(arguments[0])
            })
            this.process = child
            callback()
        }
    }

    configureTerminationBehavior() {
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

    registerProjectSession(project, callback) {
        var url = this.url
        var self = this
        var payload = {
            "connection_string": project.storePath,
            "basepath": project.path
        }

        var postData = querystring.stringify(payload)
        var requestOptions = {
            host: this.host,
            protocol: this.protocol,
            port: this.port,
            method: 'post',
            path: "/register_project",
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            }
        }

        var req = http.request(requestOptions, (res) => {
            res.setEncoding('utf8');
            let buffer = []
            res.on('data', (chunk) => {
                buffer.push(chunk);
            });
            res.on('end', () => {
                let responseData = JSON.parse(buffer.join(""));
                callback(responseData);
            });
        })

        req.on('error', (e) => {
            console.log(`problem with request: ${e.message}`);
        });

        req.write(postData);
        req.end();
    }

    navigateOnReady(count, windowConfig, callback) {
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
                    self.openWindow(windowConfig)
                    if(callback !== undefined){
                        callback(self)
                    }                
                } catch(error){
                    retry = true
                    console.log(error)
                }
            } else {
                retry = true
            }
            if(retry){
                self.navigateOnReady(count, windowConfig, callback)
            }
        }).on('error', function(e) {
            console.log(e)
            setTimeout(function(){self.navigateOnReady(count, windowConfig, callback)}, 150)
        });
    }

    waitForServer(count, callback){
        var url = this.url
        var self = this
        count = count === undefined ? 1 : count + 1;
        if(count > 600){
            throw new Error("Server Not Ready After " + count + " Tries")
        }
        http.get(self.url, function(response){
            var retry = false
            if(response.statusCode == 200){
                console.log(self.url)
                try{
                    if(callback !== undefined){
                        callback(self)
                    }                
                } catch(error){
                    retry = true
                    console.log(error)
                }
            } else {
                retry = true
            }
            if(retry){
                self.waitForServer(count, callback)
            }
        }).on('error', function(e) {
            console.log(e)
            setTimeout(function(){self.waitForServer(count, callback)}, 150)
        });
    }

    terminateServer() {
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
}


BackendServerControl.EXECUTABLE = EXECUTABLE
BackendServerControl.prototype.EXECUTABLE = EXECUTABLE


module.exports = BackendServerControl
    
