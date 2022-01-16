console.log("Preload Script Start")

const fs = require("fs")
const remote = require('electron').remote
const {Menu, MenuItem, shell, dialog} = remote

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

    getXMLString() {
        let xml = new XMLSerializer().serializeToString(this.svgElement[0]);
        return xml
    }

    draw() {
        let xml = this.getXMLString();
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


function xmlToFile(path, data, callback) {
    fs.writeFile(path, data, err => {
        if (err) {
            console.log("xmlToFile Error", err)
        }
        if (callback !== undefined){
            callback(path)
        }
    })
}


function saveImageDialog(callback, formats) {
    if (formats === undefined) {
        formats = [
            { name: 'PNG', extensions: ['png']}
        ]
    }
    dialog.showSaveDialog({
        title: "Save File",
        defaultPath: "figure.png",
        filters: formats
    }).then(callback)
}


function saveSVGToFile(svgElement, callback) {
    const saver = new SVGSaver($(svgElement))
    saver.draw()
    saveImageDialog(function(path){
        if (path === undefined) {
            return
        }
        else if (path.endsWith("png")) {
            const uri = saver.canvas.toDataURL()
            imgURIToFile(path, uri, callback)
        }
        else if (path.endsWith("svg")) {
            const xml = saver.getXMLString()
            xmlToFile(path, xml, callback)
        }

    }, [
        { name: 'PNG', extensions: ['png']},
        { name: 'SVG', extensions: ['svg']}
    ])
}


function saveIMGToPNG(imgElement, callback) {
    const uri = PNGToURI($(imgElement))
    saveImageDialog(function(path){
        imgURIToFile(path, uri, callback)
    }, [{name: "PNG", extensions: ['png']}])
}


window.SVGSaver = ExternNativeAPI.SVGSaver = SVGSaver
window.saveSVGToFile = ExternNativeAPI.saveSVGToFile = saveSVGToFile
window.saveIMGToPNG = ExternNativeAPI.saveIMGToPNG = saveIMGToPNG

function nativeClientMultiFileDownloadDirectory(callback){
    dialog.showOpenDialog({
        title: "Select directory to save files in",
        properties: ["openDirectory", "createDirectory"]
    }).then((directoryPathList) => {
        console.log("Received", directoryPathList)
        if (!directoryPathList.canceled) {
            const directoryPath = directoryPathList.filePaths[0]
            console.log("Calling nativeClientMultiFileDownloadDirectory callback with", directoryPath)
            callback(directoryPath)
        }
    })
}

window.nativeClientMultiFileDownloadDirectory = ExternNativeAPI.nativeClientMultiFileDownloadDirectory = nativeClientMultiFileDownloadDirectory


function openDirectoryExternal(path) {
    console.log(`Opening External Path`, path)
    shell.openPath(path)
}

window.openDirectoryExternal = ExternNativeAPI.openDirectoryExternal = openDirectoryExternal
window.openExternalPage = ExternNativeAPI.openExternalPage = shell.openExternal