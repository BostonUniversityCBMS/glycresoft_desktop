"use strict"

const electron = require("electron")
const app = electron.app
const dialog = electron.dialog

const ipcMain = electron.ipcMain

const Project = require("./project")

const storage = require("electron-json-storage")

const {PROJECTS_KEY, PROJECT_FILE, VERSION} = require("./constants")

const {
    AddProjectToLocalStorage,
    LoadAllProjects,
    _RemoveAllProjects,
    _RemoveProject,
    makeNewProjectDirectory
} = require("./project-storage")


const ProjectSession = require("./project-session")

const BackendServerController = require("../backend-server-control")

const fs = require('fs')
const rimraf = require("rimraf")
const localforage = require("localforage")


function projectFromObject(obj){
    return new Project(obj)
}


class ProjectSelectionWindow {
    constructor(managedWindow, options){
        this.backendServers = []
        this.projects = []
        this.activeSessions = new Map()

        this.options = options || {}

        let self = this

        this.window = null
        this.setupWindow()
        this._registerIPCHandlers()
        this.hidden = false
        this.terminated = false

        LoadAllProjects(function(projects){
            self.projects = projects
        })

        process.on("exit", function(){
            console.log("Process Exit: Cleaning up servers")
            self.cleanUpServers()
        })
    }


    get defaultServer(){
        return this.backendServers[0]
    }

    _createNewServer(project){
        let serverPort = this.options.port || 8001

        let terminateCallback = function(){
            console.log("Create Server callback")
        }

        let serverOptions = {
            port: serverPort,
            host: "127.0.0.1",
            protocol: "http:",
            callback: terminateCallback,
        }

        let server = new BackendServerController(project, serverOptions)
        return server
    }

    /**
     * Creates a new {BackendServerController} instance and
     * adds it to this object's `backendServers` list.
     * @param  {Project}
     * @return {BackendServerController}
     */
    createServer(project){
        let server = this._createNewServer(project)
        this.backendServers.push(server)
        return server
    }

    /**
     * Creates a new {ProjectSession} instance associated with this
     * object's default {BackendServerController}. This session is
     * opened and added to `activeSessions`.
     * @param  {Project}
     */
    openWindowFor(project){
        let server = null
        let self = this
        if (this.defaultServer === undefined) {
            server = this.createServer(project)
        } else {
            server = this.defaultServer
        }

        let session = new ProjectSession(project, server)

        function callback(projectSession){
            projectSession.window.on("closed", function(event) {
                self.removeSession(projectSession)
                if(self.terminated) {
                    self.shutdownIfAllSessionsClosed()
                }
            })
        }

        session.openWindow(callback)
        this.activeSessions.set(session.instanceId, session)
    }


    removeSession(session){
        console.log("Removing Session from Active Session Map", session.instanceId)
        this.activeSessions.delete(session.instanceId)
    }

    shutdownIfAllSessionsClosed() {
        if (this.activeSessions.size == 0) {
            this.cleanUpServers()
            this._reallyQuit()
            return true
        }
        return false
    }

    cleanUpServers(){
        console.log("Cleaning up servers", this.backendServers.length)
        for(var i = 0; i < this.backendServers.length;i++){
            var controller = this.backendServers[i]
            controller.terminateServer()
        }
    }

    _setupWindowCloseBehavior(){
        let self = this
        self.window.on("close", function(e){
            console.log("Closing ProjectSelectionWindow")
            self.terminated = true
            self.window = null
            console.log(`${self.activeSessions.size} sessions still active`)
            // There are no other tasks open, so we can terminate completely.
            if (!self.shutdownIfAllSessionsClosed()) {
                console.log("Active sessions remaining. Cannot Quit")
            }
        })
    }

    _reallyQuit(){
        console.log("Really quitting")
        setTimeout(() => {
            app.releaseSingleInstance()
            app.quit()
        }, 1000)
    }

    setupWindow(){
        this.window = new electron.BrowserWindow({
            width: 800,
            height: 1000
        })
        this.window.loadURL(`file://${__dirname}/../static/html/select_project.html`)
        this._setupWindowCloseBehavior()
        this.hidden = false
        this.terminated = false
    }

    _registerIPCHandlers(){
        let self = this
        ipcMain.on("createProject", (event, data) => self.createProject(event, data))
        ipcMain.on("deleteProject", (event, data) => self.deleteProject(event, data))
        ipcMain.on("openProject", (event, data) => self.openProject(event, data))
        ipcMain.on("SelectProjectDirectory", (event) => self._selectProjectDirectory(event))
        ipcMain.on("openDevTools", (event) => self.window.webContents.openDevTools())
        ipcMain.on("updatePort", (event, data) => {
            self.options.port = data
        })
    }

    _selectProjectDirectory(event){
        let directory = dialog.showOpenDialog(this.window, {
            properties: ["openDirectory", "createDirectory"]
        })
        console.log("Selected", directory)
        event.sender.send("ProjectDirectorySelected", directory)
    }

    updateProjectDisplay(event){
        event.sender.send("updateProjectDisplay")
    }

    openProject(event, tag){
        let project = this.projects[tag]
        console.log("Open Project", project)
        this.createWindowForProject(project)
    }

    deleteProject(event, tag){
        let project = this.projects[tag]
        var self = this
        console.log(project)
        _RemoveProject(project, () => self.updateProjectDisplay(event))
        rimraf(project.path, function(){
            self.updateProjectDisplay(event)
        })
    }

    createWindowForProject(project) {
        this.openWindowFor(project)
    }

    createProject(event, obj){
        var project = new Project(obj)
        var self = this
        this.projects.push(project)
        AddProjectToLocalStorage(project, () => self.updateProjectDisplay(event))
        console.log("Creating Project", project)
        this.createWindowForProject(project)
        console.log("Launching Server")
    }

    dropBackendController(server){
        var ix = -1;
        for(var i = 0; i < this.backendServers.length; i++){
            if(this.backendServers[i].port === server.port){
                ix = i
            }
        }
        if(ix != -1){
            this.backendServers.pop(ix);
        }
        if(this.backendServers.length == 0 && (this.hidden || this.terminated)){
            this._reallyQuit()
        }
    }
}

module.exports = ProjectSelectionWindow