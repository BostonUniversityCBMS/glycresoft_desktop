"use strict"

const {GetNextPort, GetNextPortAsync} = require("./server-config")
const http = require("http")
const querystring = require("querystring")
const path = require('path')
const child_process = require("child_process")

const { ipcMain } = require("electron")
const log = require("electron-log")

const serverConfig = require("./server-config").configManager


var EXECUTABLE = "\"" + serverConfig.serverExecutable + '" server '
log.log("Server Executable", EXECUTABLE)


const MAX_RETRIES = 600;


class BackendServer {
    constructor(project, options) {
        options = options === undefined ? {} : options;
        this.project = project
        log.log(this.project, this.project.storePath)
        this.port = undefined
        this.url = null
        this.protocol = options.protocol === undefined ? "http:" : options.protocol
        this.multiuser = options.allowExternalUsers === undefined ? false : options.allowExternalUsers
        this.maxTasks = options.maxTasks === undefined ? 1 : options.maxTasks
        this.validateProjects = options.validateProjects === undefined ? false : true
        this.host = options.host === undefined ? "127.0.0.1" : options.host
        this.nativeClientKey = (options.nativeClientKey === undefined ? serverConfig.makeSecretToken() : options.nativeClientKey)
        if(options.port === undefined) {
            log.log("Acquiring port using GetNextPortAsync")
            let self = this
            GetNextPortAsync((err, port) => {
                self.port = port
                self.url = self.protocol + "//" + self.host + ":" + self.port
            })
        } else {
            this.port = options.port
            this.url = this.protocol + "//" + this.host + ":" + this.port
        }
        log.log("Server Setup: ", this.host, this.port, this.url)
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
            cmdStr += " -m -e "
        }
        if(this.validateProjects) {
            cmdStr += " -v "
        }
        return cmdStr
    }

    launchServer(callback, n) {
        log.log("Attempting to launch server with url ", this.url)
        if (n === undefined) {
            n = 0
        }
        if (n > 250) {
            throw new Error(`Server not started after ${n} attempts`)
        }
        // Guard against unavailable ports
        if(this.port === undefined){
            let self = this
            log.log("Failed to assign port, waiting for port assignment")
            setTimeout(() => self.launchServer(callback, n + 1), 1250)
        } else {
            const serverProcessCmd = this.constructServerProcessCall()
            log.log(`Executing ${serverProcessCmd}`)
            let child = child_process.exec(serverProcessCmd)
            child.stdout.on("data", function(){
                log.log(arguments[0].trim())
            })
            child.stderr.on("data", function(){
                log.log(arguments[0].trim())
            })
            log.log("Server Started")
            this.process = child
            callback()
        }
    }

    configureTerminationBehavior() {
        var self = this
        self.process.on("exit", function(){
            log.log("Server View Exited!", arguments)
            self.terminateServer()
            self.terminateCallback(self)
        })
        self.window.on("close", function(){
            log.log('Server View Closed!', self.project)
            self.terminateServer()
            // self.process.kill()
            self.terminateCallback(self)
        })

    }

    registerProjectSession(project, callback, options) {
        options = options === undefined ? {} : options;
        var validate = options.validate === undefined ? false : options.validate
        var url = this.url
        var self = this
        var payload = {
            "connection_string": project.storePath,
            "basepath": project.path,
            "validate": validate
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
                let responseData = {}
                responseData = JSON.parse(buffer.join(""));
                callback(responseData);
            });
        })

        req.on('error', (e) => {
            log.log(`problem with request: ${e.message}`);
        });

        req.write(postData);
        req.end();
    }

    waitForServer(count, onServerReadyCallback, onServerWaitingCallback){
        const self = this
        count = count === undefined ? 1 : count + 1;
        if(count > MAX_RETRIES){
            throw new Error("Server Not Ready After " + count + " Tries")
        }
        http.get(self.url, (response) => {
            let retry = false
            if(response.statusCode == 200 || response.statusCode == 302){
                log.log("Connection Established", self.url)
                try{
                    if(onServerReadyCallback !== undefined){
                        onServerReadyCallback(self)
                    }
                } catch(error){
                    retry = true
                    log.log(error)
                }
            } else {
                retry = true
            }
            if(retry){
                self.waitForServer(count, onServerReadyCallback, onServerWaitingCallback)
            }
        }).on('error', () => {
            log.log("Waiting For Server... ", count)
            if (onServerWaitingCallback !== undefined) {
                onServerWaitingCallback(count)
            }
            setTimeout(() => { self.waitForServer(count, onServerReadyCallback, onServerWaitingCallback) }, 150)
        });
    }

    terminateServer() {
        log.log("Terminating ", this.url, this.sessionCounter, this.process.pid)
        let rq = http.request({host: this.host, "port": this.port, protocol: this.protocol,
                               path: "/internal/shutdown", method: "POST"},
            (res) => {
                console.log(`STATUS: ${res.statusCode}`)
                res.setEncoding('utf8')
                res.on("data", (data) => {
                    log.log("terminateServer response", arguments)
                })
                res.on("error", (err) => {
                    if (err.code !== 'ECONNRESET') {
                        log.log("terminateServer failed", err)
                    }
                })
                res.on("end", () => {
                    log.log("Finished sending terminate")
                })
            }
        )
        rq.on("error", (err) => {
            if (err.code !== 'ECONNRESET') {
                log.log("terminateServer failed", err)
            }
        })
        rq.end()
    }
}


BackendServer.EXECUTABLE = EXECUTABLE
BackendServer.prototype.EXECUTABLE = EXECUTABLE


module.exports = BackendServer

