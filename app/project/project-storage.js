"use strict"

const {PROJECTS_KEY, PROJECT_FILE, VERSION} = require("./constants")

const fs = require('fs')
const rimraf = require("rimraf")
const localforage = require("localforage")
const storage = require("electron-json-storage")
const Project = require("./project")


function projectFromObject(obj){
    return new Project(obj)
}


function AddProjectToLocalStorage(project, callback){
    return storage.get(PROJECTS_KEY, function(err, value){
        console.log(arguments)
        if((value === undefined) || (value === null || value.length === undefined)){
            value = [];
        }
        value.push(project)
        storage.set(PROJECTS_KEY, value)
        callback()
    })
}

function LoadAllProjects(callback){
    return storage.get(PROJECTS_KEY, function(err, values){
        console.log(values, values.map)
        if(values === undefined || values === null || values.length === undefined){
            values = []
        }
        callback(values.map(projectFromObject))
    })
}


function _RemoveAllProjects(callback){
    storage.set(PROJECTS_KEY, []);
    callback()
}


function _RemoveProject(project, callback){
    console.log(arguments)
    storage.get(PROJECTS_KEY, function(err, value){
        if(value === undefined || value === null){
            value = [];
        }
        let filter = []
        for(var i = 0; i < value.length; i++){
            var project_i = value[i];
            if(project_i.path === project.path){
                console.log(project_i)
                continue;
            }
            filter.push(project_i)
        }
        storage.set(PROJECTS_KEY, filter)
        callback()
    })
}


function makeNewProjectDirectory(path, name){
    name = name.replace(/\s/g, '_')
    path = [path, name].join('/')
    try {
        fs.lstatSync(path)
    } catch (err) {
        fs.mkdirSync(path)
    }
    return path
}

module.exports = {
    AddProjectToLocalStorage,
    LoadAllProjects,
    _RemoveAllProjects,
    _RemoveProject,
    makeNewProjectDirectory
}
