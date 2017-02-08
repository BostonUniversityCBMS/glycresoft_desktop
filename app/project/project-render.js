"use strict"

const $ = require("../static/js/jquery")
const _ = require("../static/js/lodash")

const storage = require("electron-json-storage")
const projectStorage = require("./project-storage")
const Project = require("./project")
const LoadAllProjects = projectStorage.LoadAllProjects
const makeNewProjectDirectory = projectStorage.makeNewProjectDirectory

const ipcRenderer = require("electron").ipcRenderer


function makeProjectFromDOM(){
    var path = $("#project-location-path").val()
    var name = $("#project-name").val()
    $("#project-name").val("")
    $("#project-location-path").val("")
    path = makeNewProjectDirectory(path, name)
    return new Project(name, path)
}


function selectDirectory(callback){
    ipcRenderer.send("SelectProjectDirectory")
    ipcRenderer.once("ProjectDirectorySelected", callback)
}


function openDevTools(){
    ipcRenderer.send("openDevTools")
}


const PORT_STORAGE_KEY = "GLYCRESOFT-PORT"


function setPortPersistent(portValue){
    storage.set(PORT_STORAGE_KEY, portValue)
}


function getPortPersistent(callback){
    storage.get(PORT_STORAGE_KEY, (err, value) => {
        console.log("Loaded Port Number", value)
        if (err) {
            console.log(err)
        }
        callback(value)
    })
}


class ProjectSelectionViewControl{
    constructor(handle){
        let self = this
        this.handle = handle
        self.projects = []
        $("#create-project-btn").click(function(){self.createProject()})
        $("#delete-existing-btn").click(function(){self.deleteProject()})
        $("#load-existing-btn").click(function(){self.openProject()})
        $("#project-location-btn").click(function(){
            selectDirectory(function(event, directory){
                $("#project-location-path").val(directory)
            })
        })
        $("#logo").click(openDevTools)
        $("#application-port-entry").change(function(event) {
            console.log("Updating Port", this.value)
            setPortPersistent(this.value)
            ipcRenderer.send("updatePort", this.value)
        })

        getPortPersistent((value) => {
            console.log("Port", value)
            if (value === undefined || value === null || value == "") {
                value = 8001
            }
            $("#application-port-entry").val(value)
        })

        self.updateProjectDisplay()
    }

    updatePort() {

    }

    deleteProject(){
        var selectProjectTag = $("select#existing-project"); 
        ipcRenderer.send("deleteProject", selectProjectTag.val())
    }

    openProject(){
        var selectProjectTag = $("select#existing-project");
        ipcRenderer.send("openProject", selectProjectTag.val())
    }

    createProject(){
        let proj = makeProjectFromDOM()
        console.log(proj)
        ipcRenderer.send("createProject", proj)
    }

    updateProjectDisplay(){
        var self = this
        LoadAllProjects(function(projects, err){
            console.log(err, projects)
            var existingContainer = $("#load-existing-project-container");
            if(projects == null || projects.length == 0){
                existingContainer.hide()
                return;
            }
            console.log(projects)
            var selectProjectTag = $("select#existing-project");
            self.projects = projects
            selectProjectTag.empty()
            for(var i = 0; i < projects.length; i++){
                var project = projects[i]
                var displayName = project.name === undefined ? project.path : project.name;
                if(project.path === undefined){
                    continue;
                }
                var optionTag = $("<option></option>").text(displayName).attr("value", i)
                selectProjectTag.append(optionTag);
            }
            existingContainer.show();
        })
    }
}

module.exports = ProjectSelectionViewControl
