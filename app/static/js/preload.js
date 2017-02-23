console.log("Preload Script Start")
let bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

var SVGSaver = (function() {
  function SVGSaver(svgElement) {
    this.svgElement = svgElement;
    this.draw = bind(this.draw, this);
    this.canvas = $("<canvas></canvas>")[0];
    this.img = $("<img>");
    this.canvas.height = this.svgElement.height();
    this.canvas.width = this.svgElement.width();
  }

  SVGSaver.prototype.draw = function() {
    var ctx, xml;
    xml = new XMLSerializer().serializeToString(this.svgElement[0]);
    this.img.attr("src", "data:image/svg+xml;base64," + btoa(xml));
    ctx = this.canvas.getContext('2d');
    return ctx.drawImage(this.img[0], 0, 0);
  };

  return SVGSaver;
})();



function saveSVGToPNG(svgElement) {
    const saver = new SVGSaver($(svgElement))
    saver.draw()
    const uri = saver.canvas.toDataURL()
    const webContents = require('electron').remote.webContents
    const activeContents = webContents.getFocusedWebContents()

    if(activeContents === null){
        return
    }
    activeContents.downloadURL(uri)
}


window.SVGSaver = SVGSaver
window.saveSVGToPNG = saveSVGToPNG

function nativeClientMultiFileDownloadDirectory(callback){
    let electron = require("electron").remote
    electron.dialog.showOpenDialog({
        title: "Select directory to save files in",
        properties: ["openDirectory", "createDirectory"]
    }, (directoryPathList) => {
        directoryPath = directoryPathList[0]
        callback(directoryPath)
    })
}

window.nativeClientMultiFileDownloadDirectory = nativeClientMultiFileDownloadDirectory


function openDirectoryExternal(path) {
    let {shell} = require("electron").remote
    shell.openItem(path)
}

window.openDirectoryExternal = openDirectoryExternal
