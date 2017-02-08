const http = require("http")
const querystring = require("querystring")
const path = require('path')
const child_process = require("child_process")

const electron = require("electron")
const app = electron.app
const dialog = electron.dialog
const ipcMain = electron.ipcMain
const net = electron.net

const WINDOW_OPTIONS = {
    "title": "GlycReSoft",
    "webPreferences": {
        "preload": path.join(__dirname, "static/js/preload.js")
    }
}


let SESSION_COUNTER = 1


class ProjectSession {

    constructor(project, backendServer, options){
        options = options === undefined ? {} : options

        //Guarantee unique ID
        this.instanceId = SESSION_COUNTER;
        SESSION_COUNTER++;

        this.project = project
        this.backendServer = backendServer
        this.options = options
        this.window = null
        this.sessionId = options.sessionId
        this.checkIfClose = true
    }

    get url(){
        return this.backendServer.url
    }

    request(options) {
        try{
            options.session = this.window.webContents.session
        } catch (err) {

        }
        return new net.ClientRequest(options)
    }

    pendingTasks(callback){
        let options = {
            url: `${this.url}/api/tasks`,
        }
        let request = this.request(options)
        let buffer = []
        request.on("response", (response) => {
            response.on("data", (chunk) => {
                buffer.push(chunk)
            })
            response.on("end", () => {
                let result = JSON.parse(buffer.join(""))
                if(callback !== undefined) {
                    callback(result)
                }
            })            
        })
        request.end()
    }

    endTasks(callback){
        let options = {
            url: `${this.url}/internal/end_tasks`,
            method: "post"
        }
        let request = this.request(options)
        let buffer = []
        request.on("response", (response) => {
            response.on("data", (chunk) => {
                buffer.push(chunk)
            })
            response.on("end", () => {
                if(callback !== undefined) {
                    callback(buffer.join(""))
                }
            })            
        })
        request.end()
    }

    reallyQuit() {
        this.checkIfClose = false
        this.window.close()
    }

    createWindow(windowConfig, callback) {
        let self = this
        if (windowConfig.projectBackendId === undefined) {
            this.sessionId = 0
        } else {
            this.sessionId = windowConfig.projectBackendId
        }
        this.window = new electron.BrowserWindow(WINDOW_OPTIONS)
        let cookie = {
            "url": self.url,
            "name": "project_id",
            "value": this.sessionId.toString()
        }
        this.checkIfClose = true
        this.window.webContents.session.cookies.set(cookie, (error) => {
            if (error) {
                console.log("Error while setting cookie", error)
            }
            self.window.loadURL(self.url)
            self.window.maximize()

            ipcMain.on("openDevTools", (event) => {
                if(self.window !== null){
                    self.window.webContents.openDevTools()
                }
            })

            if (callback !== undefined) {
                callback(self)
            }
            this.window.on("close", function(e) {
                console.log((`Preparing to close Window For Project "${self.project.path}" ` +
                             `with session id ${self.sessionId} with checkIfClose value ` +
                             `${self.checkIfClose}`))
                if (self.checkIfClose) {
                    e.preventDefault()

                    self.pendingTasks((tasks) => {
                        let keys = Object.keys(tasks)
                        if(keys.length > 0) {                
                            dialog.showMessageBox(self.window, {
                                "title": "Close With Pending Tasks",
                                "type": "question",
                                "message": `
                            This window may close, but any pending tasks waiting to run will
                            continue running until all windows are closed and the application
                            completely shuts down.`,
                                "buttons": ["Okay", "Cancel", "Stop Tasks"],
                            },
                            (response) => {
                                console.log("Choice", response)
                                if(response == 2) {
                                    self.endTasks()
                                }
                                if(response == 0 || response == 2) {
                                    self.reallyQuit()
                                }
                            })
                        } else {
                            console.log("No tasks pending. Quit right away.")
                            self.reallyQuit()
                        }
                    })
                }
            })
        })

        this.window.on("closed", (e) => {
            self.backendServer.removeSession(self);
            self.window = null
        })

        this.window.webContents.on("dom-ready", function(){
            //Set up SVG to PNG Export on Right-click of SVG Graphics
            self.window.webContents.executeJavaScript(`$('body').delegate('svg', 'contextmenu', function(e){
                var SVGSaver,
                  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

                SVGSaver = (function() {
                  function SVGSaver(svgElement) {
                    this.svgElement = svgElement;
                    this.draw = bind(this.draw, this);
                    this.canvas = $("<canvas></canvas>")[0];
                    this.img = $("<img>");
                    this.canvas.height = this.svgElement.height();
                    this.canvas.width = this.svgElement.width();
                  }

                  SVGSaver.prototype.draw = function() {
                    var ctx, xml;
                    xml = new XMLSerializer().serializeToString(this.svgElement[0]);
                    this.img.attr("src", "data:image/svg+xml;base64," + btoa(xml));
                    ctx = this.canvas.getContext('2d');
                    return ctx.drawImage(this.img[0], 0, 0);
                  };

                  return SVGSaver;

                })();
                const saver = new SVGSaver($(this))
                saver.draw()
                const uri = saver.canvas.toDataURL()
                const webContents = require('electron').remote.webContents
                const activeContents = webContents.getFocusedWebContents()
                
                if(activeContents === null){
                    return
                }
                activeContents.downloadURL(uri)
            })`)
        })
    }

    openWindow(callback) {
        var self = this

        let task = () => {
            console.log("Registering Session")
            self.backendServer.registerProjectSession(self.project, (registration) => {
                let windowConfig = {}
                windowConfig.projectBackendId = registration.project_id
                self.backendServer.addSession(self)
                self.createWindow(windowConfig, callback)
            })
        }

        if(this.backendServer.hasStartedProcess) {
            task()
        } else {
            console.log("Launching server.")
            this.backendServer.launchServer(() => {
                self.backendServer.waitForServer(0, () => {
                    task()
                })
            })
        }
    }
}

module.exports = ProjectSession
