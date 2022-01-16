const electron = require('electron')
const log = require("electron-log")
const { autoUpdater } = require("electron-updater")
const os = require('os');
const {app, dialog} = require('electron');
const version = app.getVersion();
const platform = os.platform() + '_' + os.arch();

const currentVersion = app.getVersion()

autoUpdater.logger = log
log.transports.file.level = 'info'

autoUpdater.setFeedURL({
    "provider": "github",
    "owner": "BostonUniversityCBMS",
    "repo": "glycresoft_desktop"
})


module.exports = { autoUpdater}
