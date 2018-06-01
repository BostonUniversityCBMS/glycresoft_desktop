"use strict"

const {PROJECTS_KEY, PROJECT_FILE, VERSION} = require("./constants")

const fs = require('fs')
const os_path = require("path")
const rimraf = require("rimraf")
const storage = require("electron-json-storage")
const Project = require("./project")


function mkdirRecursiveSync(path, mode) {
    mode = mode || 511;
    let sep = require('path').sep
    let parts = require('path').normalize(path).split(sep)
    for(let i = 0; i < parts.length; i++) {
        let directory = parts.slice(0, i + 1).join('/');
        try {
            fs.lstatSync(directory)
        } catch (e) {
            fs.mkdirSync(directory)
        }
    }
}


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
        storage.set(PROJECTS_KEY, value, function(err){
            if (err) {
                console.log("Error in AddProjectToLocalStorage", err)
            }
            callback()
        })
    })
}

function LoadAllProjects(callback){
    return storage.get(PROJECTS_KEY, function(err, values){
        if(values === undefined || values === null || values.length === undefined){
            values = []
        }
        callback(values.map(projectFromObject))
    })
}


function _RemoveAllProjects(callback){
    storage.set(PROJECTS_KEY, [], callback);
}


function _RemoveProject(project, callback){
    console.log("Call to _RemoveProject on ", project.path)
    storage.get(PROJECTS_KEY, function(err, value){
        if(value === undefined || value === null){
            value = [];
        }
        let filter = []
        for(var i = 0; i < value.length; i++){
            var project_i = value[i];
            if(project_i.path === project.path){
                continue;
            }
            filter.push(project_i)
        }
        storage.set(PROJECTS_KEY, filter, function(err) {
            if (err) {
                console.log("Error in RemoveProject", err)
            }
            callback()
        })
    })
}


function makeNewProjectDirectory(path, name){
    name = name.replace(/\s/g, '_')
    path = os_path.join(path, name)
    try {
        fs.lstatSync(path)
    } catch (err) {
        mkdirRecursiveSync(path)
    }
    return path
}

module.exports = {
    AddProjectToLocalStorage,
    LoadAllProjects,
    _RemoveAllProjects,
    _RemoveProject,
    makeNewProjectDirectory,
    mkdirRecursiveSync
}
