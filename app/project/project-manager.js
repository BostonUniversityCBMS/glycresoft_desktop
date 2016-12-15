"use strict"

const electron = require("electron")
const app = electron.app
const dialog = electron.dialog

const ipcMain = electron.ipcMain

const Project = require("./project")

const {PROJECTS_KEY, PROJECT_FILE, VERSION} = require("./constants")

const {
    AddProjectToLocalStorage,
    LoadAllProjects,
    _RemoveAllProjects,
    _RemoveProject,
    makeNewProjectDirectory
} = require("./project-storage")

const BackendServerControl = require("../backend-server-control")

const fs = require('fs')
const rimraf = require("rimraf")
const localforage = require("localforage")


function projectFromObject(obj){
    return new Project(obj)
}


class ProjectSelectionWindow {
    constructor(managedWindow){
        this.controllers = []
        this.projects = []
        this.window = null
        this.setupWindow()
        this._registerIPCHandlers()
        this.hidden = false
        this.terminated = false
        let self = this
        LoadAllProjects(function(projects){
            self.projects = projects
        })

        process.on("exit", function(){
            console.log("Process Exit: Cleaning up servers")
            self.cleanUpServers()
        })
    }

    cleanUpServers(){
        console.log("Cleaning up servers", this.controllers.length)
        for(var i = 0; i < this.controllers.length;i++){
            var controller = this.controllers[i]
            controller.terminateServer()
        }
    }

    _setupWindowCloseBehavior(){
        let self = this
        self.window.on("close", function(e){
            console.log("Closing ProjectSelectionWindow")
            self.terminated = true
            self.window = null
            console.log(`${self.controllers.length} controllers still active`)
            // There are no other tasks open, so we can terminate completely.
            if(self.controllers.length === 0){
                self._reallyQuit()
            }
        })
    }

    _reallyQuit(){
        console.log("Really quitting")
        setTimeout(() =>{
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
        console.log(project)
        this.controllers.push(BackendServerControl.launch(
            project, {callback: this.dropBackendController.bind(this)}))
    }

    deleteProject(event, tag){
        let project = this.projects[tag]
        var self = this
        console.log(project)
        _RemoveProject(project, () => self.updateProjectDisplay(event))
        rimraf(project.path, function(){
            //self.updateProjectDisplay(event)
        })
    }

    createProject(event, obj){
        var project = new Project(obj)
        var self = this
        this.projects.push(project)
        AddProjectToLocalStorage(project, () => self.updateProjectDisplay(event))
        console.log("Creating Project", project)
        this.controllers.push(BackendServerControl.launch(
            project, {callback: this.dropBackendController.bind(this)}))
        console.log("Launching Server")
    }

    dropBackendController(server){
        // console.log("dropBackendController", server.project)
        var ix = -1;
        for(var i = 0; i < this.controllers.length; i++){
            if(this.controllers[i].port === server.port){
                ix = i
            }
        }
        if(ix != -1){
            this.controllers.pop(ix);
        }
        if(this.controllers.length == 0 && (this.hidden || this.terminated)){
            this._reallyQuit()
        }
    }
}

module.exports = ProjectSelectionWindow