const electron = require('electron')

// Module to control application life cycle
const app = electron.app
app.disableHardwareAcceleration()

const log = require("electron-log")
log.transports.file.level = 'info'

const {autoUpdater} = require('./update-check');

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
        autoUpdater.checkForUpdatesAndNotify()
    })
}


autoUpdater.on('checking-for-update', () => {
    log.log('Checking for update...');
})
autoUpdater.on('update-available', (info) => {
    log.log('Update available.');
})
autoUpdater.on('update-not-available', (info) => {
    log.log('Update not available.');
})
autoUpdater.on('error', (err) => {
    log.log('Error in auto-updater. ' + err);
})

autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
    log.log(log_message);
})
autoUpdater.on('update-downloaded', (info) => {
    log.log('Update downloaded');
});


// const shouldQuit = app.makeSingleInstance((argv, workingDirectory) => {
//     log.log("Application Run Invocation", argv, workingDirectory)
//     showProjectManager()
// })

const gotLock = app.requestSingleInstanceLock()
app.on('second-instance', (event, argv, workingDirectory, additionalData) => {
    log.log("Application Run Invocation", argv, workingDirectory)
    showProjectManager()
})

if (!gotLock){
    console.log("Secondary Instance, Quitting")
    app.quit()
} else {
    log.log("Application Setup Done")
    app.on("ready", createProjectManager)
}