console.log("Preload Script Start")

const fs = require("fs")
const dialog = require("electron").remote.dialog
const shell = require("electron").remote.shell

let ExternNativeAPI = {}
window.ExternNativeAPI = ExternNativeAPI

class SVGSaver {
    constructor(svgElement) {
        this.svgElement = svgElement;
        this.canvas = $("<canvas></canvas>")[0];
        this.img = $("<img>");
        this.canvas.height = this.svgElement.height();
        this.canvas.width = this.svgElement.width();     
    }

    draw() {
        let xml = new XMLSerializer().serializeToString(this.svgElement[0]);
        this.img.attr("src", "data:image/svg+xml;base64," + btoa(xml));
        let ctx = this.canvas.getContext('2d');
        return ctx.drawImage(this.img[0], 0, 0);
    }

}


function PNGToURI(imgElement) {
    imgElement = $(imgElement)
    let canvas = $("<canvas></canvas>")[0]
    canvas.height = imgElement.height()
    canvas.width = imgElement.width()
    let ctx = canvas.getContext('2d')
    ctx.drawImage(imgElement[0], 0, 0)
    return canvas.toDataURL()
}


function imgURIToFile(path, data, callback) {
    let parts = data.match('data:image/(.*);base64,(.*)')
    let components = {
        imageType: parts[1],
        dataBase64: parts[2],
        dataBuffer: new Buffer(parts[2], 'base64')
    };
    fs.writeFile(path, components.dataBuffer, err => {
        if (err) {
            console.log("imgURIToFile Error", err)
        }
        if (callback !== undefined){
            callback(path)
        }
    })
}


function savePNGDialog(callback) {
    dialog.showSaveDialog({
        title: "Save File",
        defaultPath: "figure.png",
        filters: [
            { name: 'All Files', extensions: ['*']},
            { name: 'PNG', extensions: ['png']}
        ]
    }, callback)
}


function saveImage(uri, callback){
    savePNGDialog((path) => {
        imgURIToFile(path, uri, callback)
    })
}


function saveSVGToPNG(svgElement) {
    const saver = new SVGSaver($(svgElement))
    saver.draw()
    const uri = saver.canvas.toDataURL()
    saveImage(uri)
}


function saveIMGToPNG(imgElement) {
    saveImage(
        PNGToURI($(imgElement)))
}


window.SVGSaver = ExternNativeAPI.SVGSaver = SVGSaver
window.saveSVGToPNG = ExternNativeAPI.saveSVGToPNG = saveSVGToPNG
window.saveIMGToPNG = ExternNativeAPI.saveIMGToPNG = saveIMGToPNG

function nativeClientMultiFileDownloadDirectory(callback){
    dialog.showOpenDialog({
        title: "Select directory to save files in",
        properties: ["openDirectory", "createDirectory"]
    }, (directoryPathList) => {
        directoryPath = directoryPathList[0]
        callback(directoryPath)
    })
}

window.nativeClientMultiFileDownloadDirectory = ExternNativeAPI.nativeClientMultiFileDownloadDirectory = nativeClientMultiFileDownloadDirectory


function openDirectoryExternal(path) {
    shell.openItem(path)
}

window.openDirectoryExternal = ExternNativeAPI.openDirectoryExternal = openDirectoryExternal
