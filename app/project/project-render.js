"use strict"

// const $ = require("../static/js/jquery")
const $ = window.$
const _ = require("../static/js/lodash")

const storage = require("electron-json-storage")
const projectStorage = require("./project-storage")
const Project = require("./project")
const LoadAllProjects = projectStorage.LoadAllProjects
const makeNewProjectDirectory = projectStorage.makeNewProjectDirectory
const mkdirRecursiveSync = projectStorage.mkdirRecursiveSync

const ipcRenderer = require("electron").ipcRenderer
const app = require("electron").remote.app
const dialog = require("electron").remote.dialog
const remote = require("electron").remote

const log = require("electron-log")

const pathlib = require("path")
const fs = require("fs")


function selectDirectory(callback){
    ipcRenderer.send("SelectProjectDirectory")
    ipcRenderer.once("ProjectDirectorySelected", callback)
}


function openDevTools(){
    ipcRenderer.send("openDevTools")
}

const PORT_STORAGE_KEY = "GLYCRESOFT-PORT"
const MAX_TASKS_KEY = "GLYCRESOFT-MAX-TASKS"
const ALLOW_EXTERNAL_KEY = "GLYCRESOFT-ALLOW-EXTERNAL"

const DEFAULT_PROJECT_DIRECTORY = pathlib.join(app.getPath("documents"), "GlycReSoft\ Projects")


function setMaxTasks(maxTasks) {
    storage.set(MAX_TASKS_KEY, maxTasks)
}


function getMaxTasks(callback) {
    storage.get(MAX_TASKS_KEY, (err, value) => {
        if (err) {
            log.log(err)
        }
        if (value === undefined || value === null || value == "" || _.isEqual(value, {})) {
            value = 1
            setMaxTasks(value)
        }
        log.log("Loaded Max Task Count", value)
        callback(value)
    })
}


function setAllowExternalUsers(allowExternalUsers) {
    storage.set(ALLOW_EXTERNAL_KEY, allowExternalUsers)
}


function getAllowExternalUsers(callback) {
    storage.get(ALLOW_EXTERNAL_KEY, (err, value) => {
        if (err) {
            log.log(err)
        }
        if (value === undefined || value === null || value === "" || _.isEqual(value, {})) {
            value = false
            setAllowExternalUsers(value)
        }
        log.log("Loaded AllowExternalUsers", value)
        callback(value)
    })
}


function setPort(portValue){
    storage.set(PORT_STORAGE_KEY, portValue)
}


function getPort(callback){
    storage.get(PORT_STORAGE_KEY, (err, value) => {
        if (err) {
            log.log(err)
        }
        if (value === undefined || value === null || value == "" || _.isEqual(value, {})) {
            value = 8001
            setPort(value)
        }
        log.log("Loaded Port Number", value)
        callback(value)
    })
}


class ProjectSelectionViewControl {
    constructor(handle){
        let self = this
        this.handle = handle
        self.projects = []

        this._setupEventHandlers()

        getPort((value) => {
            log.log("Port", value)
            $("#application-port-entry").val(value)
            ipcRenderer.send("updatePort", value)
        })

        getMaxTasks((value) => {
            $("#maximum-concurrent-tasks").val(value)
            ipcRenderer.send("updateMaxTasks", value)
        })

        getAllowExternalUsers((value) => {
            $("#allow-external-users").prop("checked", value)
            ipcRenderer.send("updateAllowExternalUsers", value)
        })

        this.updateInterval = setInterval(() => self.updateProjectDisplay(), 10000)

        self.updateProjectDisplay()

        this.projectLocationButton = $("#project-location-btn")
        this.projectOpenCreateButton = $("#create-project-btn")

    }

    _makeProjectFromDOM(){
        var path = $("#project-location-path").val().trim()
        // var name = $("#project-name").val().trim()
        name = ""
        if (path === "") {
            path = DEFAULT_PROJECT_DIRECTORY
            try {
                fs.lstatSync(path)
            } catch (e) {
                log.log("Creating default storage directory", path)
                mkdirRecursiveSync(path)
            }
        }
        if (name.trim() !== "") {
            $("#project-name").val("")
            $("#project-location-path").val("")
        }
        path = makeNewProjectDirectory(path, name)
        return new Project(name, path)
    }

    _updatePort(portInput){
        let value = portInput.value
        if(value === "") {
            value = 8001
            this.flashMessage("Port must have a value. Using default 8001.", 'red')
            portInput.value = value
        }
        setPort(value)
        ipcRenderer.send("updatePort", value)
    }

    _updateMaxTasks(countInput){
        let value = countInput.value
        if(value === ""){
            value = 1
            countInput.value = value
        } 
        setMaxTasks(value)
        ipcRenderer.send("updateMaxTasks", value)
    }

    _updateAllowExternalUsers(checkbox){
        let value = checkbox.checked;
        if(value === undefined) {
            value = false
            checkbox.checked = false
        }
        setAllowExternalUsers(value)
        ipcRenderer.send("updateAllowExternalUsers", value)
    }

    _setupEventHandlers() {
        const self = this
        this.projectLocationButton = $("#project-location-btn")
        $("#delete-existing-btn").click(function(){self.deleteProject()})
        $("#load-existing-btn").click(function(){self.openProject()})
        this.projectLocationButton.click(function(){self.selectProjectLocation()})

        $("#logo").click(openDevTools)

        $("#application-port-entry").change(function(event) {
            self._updatePort(this)
        })

        $("#maximum-concurrent-tasks").change(function(event) {
            self._updateMaxTasks(this)
        })

        $("#allow-external-users").change(function(event) {
            self._updateAllowExternalUsers(this)
        })
    }

    selectProjectLocation(){
        const self = this
        selectDirectory(function(event, directoryQuery){
            $("#project-location-path").val(directoryQuery.directory)
            if (!directoryQuery.is_new) {
                
            }
            self.openOrCreateProject()
        })
    }

    disableConfigWidgets(){
        $("#config-options input").prop("disabled", true)
    }

    flashMessage(message, color){
        if(color === undefined){
            color = 'black'
        }
        Materialize.toast(message, 4000, color)
    }

    deleteProject(){
        var selectProjectTag = $("select#existing-project"); 
        this.signalDeleteProject(selectProjectTag.val())
    }

    openProject(){
        var selectProjectTag = $("select#existing-project");
        this.signalOpenProject(selectProjectTag.val())
        this.disableConfigWidgets()
    }

    signalOpenProject(index) {
        ipcRenderer.send("openProject", index)
        this.disableConfigWidgets()
    }

    signalOpenExistingProject(path) {
        ipcRenderer.send("openExistingProject", path)
    }

    signalDeleteProject(index) {
        let choice = dialog.showMessageBox(remote.getCurrentWindow(), {
            type: "question",
            buttons: ["Yes", "No"],
            title: 'Confirm',
            message: `Are you sure you want to delete "${this.projects[index].path}"?`
        })
        if (choice === 0) {
            this.flashMessage(`Removing project ${this.projects[index].path}...`, 'red')
            ipcRenderer.send("deleteProject", index)
        }
    }

    openOrCreateProject(){
        let proj = this._makeProjectFromDOM()
        log.log("Created Project", proj)
        if (proj.name === "" && proj.path == DEFAULT_PROJECT_DIRECTORY) {
            this.flashMessage("You must provide a project name", 'red')
            return
        } else {
            ipcRenderer.send("createProject", proj)
            this.disableConfigWidgets()
        }
    }

    updateProjectDisplay(){
        var self = this
        LoadAllProjects(function(projects, err){
            var existingContainer = $("#load-existing-project-container");

            if(projects == null || projects.length == 0){
                existingContainer.hide()
                return;
            }

            self.projects = projects
            self.makeProjectDisplayList()

            existingContainer.show();
        })
    }

    makeProjectDisplayEntry(project, index) {
        let pathPrefix = project.path
        if(pathPrefix.length > 60){
            pathPrefix = pathPrefix.slice(0, 57) + "..."
        }
        let domEntry = `
        <div class="project-display-container" id="project-${project.name}-display"
             data-name="${project.name}" data-index="${index}">
            <div class='clearfix'>
            <span class="project-name-display left tooltipped" style='width:90%;' data-tooltip='${project.path}'>
                <a class="mdi mdi-folder"></a> ${project.name} <small>${pathPrefix}</small>
            </span>
            <span>
                <a class='delete-project right mdi mdi-close'></a>
            </span>
            </div>
        </div>
        `
        let self = this
        let handle = $(domEntry)
        project.index = index

        handle.click((event) => {
            self.signalOpenProject(index)
        })

        handle.find(".delete-project").click((e) => {
            self.signalDeleteProject(index)
            e.preventDefault()
            return false
        })
        return handle
    }

    makeProjectDisplayList() {
        let container = $("#existing-project-container")
        let i = 0
        container.empty()
        for(let project of this.projects) {
            let entry = this.makeProjectDisplayEntry(project, i)
            container.append(entry)
            i++
        }
        $('.material-tooltip').remove()
        $('.tooltipped').tooltip({delay: 50});

    }
}

module.exports = ProjectSelectionViewControl
