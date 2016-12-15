"use strict"

const $ = require("../static/js/jquery")
const _ = require("../static/js/lodash")

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


class ProjectSelectionViewControl{
    constructor(handle){
        this.handle = handle
        let self = this
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
        self.updateProjectDisplay()

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
