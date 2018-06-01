"use strict"

const electron = require("electron")
const app = electron.app
const dialog = electron.dialog

const ipcMain = electron.ipcMain

const Project = require("./project")
const path = require("path")
const storage = require("electron-json-storage")

const {PROJECTS_KEY, PROJECT_FILE, VERSION, PROJECT_STRUCTURE_PATHS} = require("./constants")

const {
    AddProjectToLocalStorage,
    LoadAllProjects,
    _RemoveAllProjects,
    _RemoveProject,
    makeNewProjectDirectory
} = require("./project-storage")


const ProjectSession = require("./project-session")

const BackendServer = require("../backend-server-control")

const fs = require('fs')
const rimraf = require("rimraf")
const localforage = require("localforage")


function projectFromObject(obj){
    return new Project(obj)
}


class ProjectSelectionWindow {
    constructor(options){
        this.backendServers = []
        this.projects = []
        this.activeSessions = new Map()

        this.options = options || {}
        this.nativeClientKey = this.options.nativeClientKey

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
        let maxTasks = this.options.maxTasks === undefined ? 1 : this.options.maxTasks
        let allowExternalUsers = this.options.allowExternalUsers === undefined ? false : this.options.allowExternalUsers
        let terminateCallback = function(){
            console.log("Create Server callback")
        }

        let serverOptions = {
            port: serverPort,
            host: "127.0.0.1",
            protocol: "http:",
            callback: terminateCallback,
            nativeClientKey: this.nativeClientKey,
            "allowExternalUsers": allowExternalUsers,
            "maxTasks": maxTasks
        }

        let server = new BackendServer(project, serverOptions)
        return server
    }

    /**
     * Creates a new {BackendServer} instance and
     * adds it to this object's `backendServers` list.
     * @param  {Project}
     * @return {BackendServer}
     */
    createServer(project){
        console.log("Creating Server...")
        let server = this._createNewServer(project)
        console.log("Server Created.")
        this.backendServers.push(server)
        return server
    }

    /**
     * Creates a new {ProjectSession} instance associated with this
     * object's default {BackendServer}. This session is
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
        console.log("Creating Session...")
        let session = new ProjectSession(project, server, {
            nativeClientKey: this.nativeClientKey
        })

        function callback(projectSession){
            projectSession.window.on("closed", function(event) {
                self.removeSession(projectSession)
                if(self.terminated) {
                    self.shutdownIfAllSessionsClosed()
                }
            })
        }
        console.log("Opening Window...")
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
        let self = this
        this.window = new electron.BrowserWindow({
            width: 800,
            height: 1000
        })

        this.window.webContents.session.clearCache(() => {
            self.window.loadURL(`file://${__dirname}/../static/html/select_project.html`)
            self._setupWindowCloseBehavior()
            self.hidden = false
            self.terminated = false            
        })
    }

    _registerIPCHandlers(){
        let self = this
        ipcMain.on("createProject", (event, data) => self.createProject(event, data))
        ipcMain.on("deleteProject", (event, data) => self.deleteProject(event, data))
        ipcMain.on("openProject", (event, data) => self.openProject(event, data))
        ipcMain.on("SelectProjectDirectory", (event) => self._selectProjectDirectory(event))
        ipcMain.on("openDevTools", (event) => self.window.webContents.openDevTools())
        ipcMain.on("openExistingProject", (event, path) => self.openProjectByPath(path))
        ipcMain.on("updatePort", (event, data) => {
            self.options.port = data
        })
        ipcMain.on("updateMaxTasks", (event, data) => {
            self.options.maxTasks = data
        })
        ipcMain.on("updateAllowExternalUsers", (event, data) => {
            self.options.allowExternalUsers = data
        })
    }

    _selectProjectDirectory(event){
        let directory = dialog.showOpenDialog(this.window, {
            properties: ["openDirectory", "createDirectory"]
        })
        
        console.log("Selected", directory)
        if (this.findProjectByPath(directory) !== null) {
            event.sender.send("ProjectDirectorySelected", {
                "directory": directory,
                "is_new": false
            })
        } else {
            let temp = new Project('new-1', directory, 0)
            // TODO: opening an exsiting project but one not in the index
            // should add it to the index. Currently, the program does this correctly,
            // but I haven't traced out why.
            if (fs.existsSync(directory) && fs.existsSync(temp.storePath)) {
                event.sender.send("ProjectDirectorySelected", {
                    "directory": directory,
                    "is_new": false
                })  
            } else {
                event.sender.send("ProjectDirectorySelected", {
                    "directory": directory,
                    "is_new": true
                })
            }
        }
    }

    updateProjectDisplay(event){
        event.sender.send("updateProjectDisplay")
    }

    openProject(event, tag){
        let project = this.projects[tag]
        console.log("Open Project", project)
        this.createWindowForProject(project)
    }

    openProjectByPath(path) {
        let project = this.findProjectByPath(path)
        if (project === null) {
            project = new Project('', path)
        }
        this.createProject(project)
    }

    deleteProject(event, tag){
        console.log("Calling deleteProject", tag)
        let project = this.projects[tag]
        console.log("Target Project", project)
        let self = this
        let repeatCount = 0
        for (var i = 0; i < this.projects.length; i++) {
            let otherProject = this.projects[i]
            if (i == tag) {
                continue
            } else {
                repeatCount += project.path == otherProject.path
            }
        }
        // Remove the selected project from the list
        _RemoveProject(project, () => self.updateProjectDisplay(event))
        // If there are no redundancies, delete the project's files
        if (repeatCount == 0) {
            let paths = PROJECT_STRUCTURE_PATHS.concat([])
            let clearPaths = (pathArray, callback) => {
                if (pathArray.length > 0) {
                    let fullPath = path.join(project.path, pathArray[0])
                    console.log("rimraf", fullPath)
                    rimraf(fullPath, (err) => {
                        if(err) {
                            console.log("clearPaths::rimraf::error", err, pathArray)
                        }
                        clearPaths(pathArray.slice(1), callback)
                    })
                } else {
                    callback()
                }
            }
            clearPaths(paths, () => {
                self.updateProjectDisplay(event)  
            })
        }
    }

    createWindowForProject(project) {
        this.openWindowFor(project)
    }

    _checkIfDuplicate(project) {
        let repeatCount = 0
        for (var i = 0; i < this.projects.length; i++) {
            let otherProject = this.projects[i]
            repeatCount += project.path == otherProject.path
        }
        return repeatCount > 0
    }

    findProjectByPath(path) {
        for (var i = 0; i < this.projects.length; i++) {
            let project = this.projects[i]
            if (project.path == path) {
                return project
            }
        }
        return null
    }

    createProject(event, obj){
        var project = new Project(obj)
        if (this._checkIfDuplicate(project)) {
            console.log("Project is Duplicate")
            project = this.findProjectByPath(project.path)
            console.log("Launching Server")
            this.createWindowForProject(project)
        } else {
            var self = this
            this.projects.push(project)
            AddProjectToLocalStorage(project, () => self.updateProjectDisplay(event))
            console.log("Creating Project", project)
            this.createWindowForProject(project)
            console.log("Launching Server")            
        }
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