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


class ProjectSession {

    constructor(project, backendServer, options){
        options = options === undefined ? {} : options

        this.project = project
        this.backendServer = backendServer
        this.options = options
        this.window = null
        this.sessionId = options.sessionId
    }

    get url(){
        return this.backendServer.url
    }

    createWindow(windowConfig, callback) {
        const self = this
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
        console.log("Setting Cookie", cookie)
        this.window.webContents.session.cookies.set(cookie, (error) => {
            if (error) {
                console.log("Error while setting cookie", error)
            }
            self.window.loadURL(self.url)
            self.window.maximize()
            ipcMain.on("openDevTools", (event) => self.window.webContents.openDevTools())
            console.log("windowConfig", windowConfig, "callback", callback)
            if (callback !== undefined) {
                callback(self)
            }
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
        console.log("callback", callback)
        var self = this

        let task = () => {
            self.backendServer.registerProjectSession(self.project, (registration) => {
                let windowConfig = {}
                windowConfig.projectBackendId = registration.project_id
                console.log("Response from registerProjectSession", windowConfig, callback)
                self.createWindow(windowConfig, callback)
            })
        }

        if(this.backendServer.hasStartedProcess) {
            task()
        } else {
            this.backendServer.launchServer(() => {
                self.backendServer.waitForServer(0, () => {
                    task()
                })
            })
        }
    }
}


module.exports = ProjectSession