const electron = require('electron')

// Module to control application life cycle
const app = electron.app

if(require('electron-squirrel-startup')) return;

const squirrel = require("./squirrel")
const project = require("./project")
const serverConfig = require("./server-config")
const BackendServer = require("./backend-server-control")

let ProjectSelectionController = null
let nativeClientKey = serverConfig.configManager.makeSecretToken()


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
        ProjectSelectionController = new project.ProjectSelectionWindow({
            "nativeClientKey": nativeClientKey
        })
        app.ProjectSelectionController = ProjectSelectionController
    }
}

const shouldQuit = app.makeSingleInstance((argv, workingDirectory) => {
    console.log("Application Run Invocation", argv, workingDirectory)
    showProjectManager()
})

if (shouldQuit){
    app.quit()
    return
}

app.on("ready", createProjectManager)

console.log("Setup Done")