const electron = require('electron')

// Module to control application life cycle
const app = electron.app
app.disableHardwareAcceleration()

const {appUpdater} = require('./update-check');


if(require('electron-squirrel-startup')) return;

const squirrel = require("./squirrel")
const project = require("./project")
const serverConfig = require("./server-config")
const BackendServer = require("./backend-server-control")
const updateCheck = require("./update-check")

let ProjectSelectionController = null
let nativeClientKey = serverConfig.configManager.makeSecretToken()

// Funtion to check the current OS. As of now there is no proper method
// to add auto-updates to linux platform.
function isWindowsOrmacOS() {
    return process.platform === 'darwin' || process.platform === 'win32';
}


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
    const page = ProjectSelectionController.window.webContents
    page.once('did-frame-finish-load', () => {
        const checkOS = isWindowsOrmacOS()
        if (checkOS) {
            console.log("Checking for updates")
            appUpdater()
        }
    })
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