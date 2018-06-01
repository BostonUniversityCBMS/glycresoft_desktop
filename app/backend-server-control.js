"use strict"

const {GetNextPort, GetNextPortAsync} = require("./server-config")
const http = require("http")
const querystring = require("querystring")
const path = require('path')
const child_process = require("child_process")

const serverConfig = require("./server-config").configManager


var EXECUTABLE = "\"" + serverConfig.serverExecutable + '" server '
console.log(EXECUTABLE)


const MAX_RETRIES = 600;


class BackendServer {
    constructor(project, options) {
        options = options === undefined ? {} : options;
        this.project = project
        console.log(this.project, this.project.storePath)
        this.port = undefined
        this.url = null
        this.protocol = options.protocol === undefined ? "http:" : options.protocol
        this.multiuser = options.allowExternalUsers === undefined ? false : options.allowExternalUsers
        this.maxTasks = options.maxTasks === undefined ? 1 : options.maxTasks
        this.host = options.host === undefined ? "127.0.0.1" : options.host
        this.nativeClientKey = (options.nativeClientKey === undefined ? serverConfig.makeSecretToken() : options.nativeClientKey)
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
        this.sessionCounter = 0
    }

    addSession(session) {
        this.sessionCounter += 1
    }

    removeSession(session) {
        this.sessionCounter -= 1
    }

    get hasNoSessions() {
        this.sessionCounter <= 0
    }

    get hasStartedProcess() {
        return this.process !== null
    }

    constructServerProcessCall() {
        let cmdStr =`${this.EXECUTABLE} "${this.project.storePath}" --port ${this.port}
-b "${this.project.path}" --native-client-key "${this.nativeClientKey}"
-t ${this.maxTasks}`.replace(/\n/g, " ");
        if(this.multiuser) {
            cmdStr += " -m -e"
        }
        return cmdStr
    }

    launchServer(callback, n) {
        console.log("Attempting to launch server with url ", this.url)
        if (n === undefined) {
            n = 0
        }
        if (n > 250) {
            throw new Error(`Server not launched after ${n} attempts`)
        }
        // Guard against unavailable ports
        if(this.port === undefined){
            let self = this
            setTimeout(() => self.launchServer(callback, n + 1), 1250)
        } else {
            console.log(this.constructServerProcessCall())
            let child = child_process.exec(this.constructServerProcessCall())
            child.stdout.on("data", function(){
                console.log(arguments[0].trim())
            })
            child.stderr.on("data", function(){
                console.log(arguments[0].trim())
            })
            console.log("Server Launched")
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

    waitForServer(count, callback){
        var url = this.url
        var self = this
        count = count === undefined ? 1 : count + 1;
        if(count > MAX_RETRIES){
            throw new Error("Server Not Ready After " + count + " Tries")
        }
        http.get(self.url, function(response){
            var retry = false
            if(response.statusCode == 200 || response.statusCode == 302){
                console.log("Connection Established", self.url)
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
            console.log("Waiting For Server... ", count)
            setTimeout(function(){self.waitForServer(count, callback)}, 150)
        });
    }

    terminateServer() {
        console.log("Terminating ", this.url, this.sessionCounter, this.process.pid)
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


BackendServer.EXECUTABLE = EXECUTABLE
BackendServer.prototype.EXECUTABLE = EXECUTABLE


module.exports = BackendServer
    
