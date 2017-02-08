const electron = require('electron')
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow

if(require('electron-squirrel-startup')) return;

const squirrel = require("./squirrel")
const project = require("./project")
const serverConfig = require("./server-config")
const BackendServerControl = require("./backend-server-control")

app.BackendServerControl = BackendServerControl

let ProjectSelectionController = null


function showProjectManager(callback){
    if(ProjectSelectionController.window === null){
        ProjectSelectionController.setupWindow()
    }
    if(ProjectSelectionController.hidden){
        ProjectSelectionController.window.show()
    } else if(ProjectSelectionController.window.isMinimized()){
        ProjectSelectionController.window.restore()
    }
    ProjectSelectionController.window.focus()
    if (callback !== undefined) callback()

}


function createProjectManager() {
    if(ProjectSelectionController === null){
        ProjectSelectionController = new project.ProjectSelectionWindow()
        app.ProjectSelectionController = ProjectSelectionController
    }
}

const shouldQuit = app.makeSingleInstance((argv, workingDirectory) => {
    console.log(argv, workingDirectory)
    showProjectManager()
})

if (shouldQuit){
    app.quit()
    return
}

app.on("ready", createProjectManager)

console.log("Setup Done")