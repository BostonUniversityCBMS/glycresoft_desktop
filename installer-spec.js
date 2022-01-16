/// This script is way out of date and is kept around for historical record until the new method is fully integrated.

var electronInstaller = require('electron-winstaller');

resultPromise = electronInstaller.createWindowsInstaller({
    appDirectory: 'dist/win-unpacked',
    outputDirectory: 'dist/winstaller64',
    authors: 'Joshua Klein, Center for Biomedical Mass Spectrometry, Program for Bioinformatics, Boston University',
    exe: 'GlycReSoft.exe',
    iconUrl: "https://raw.githubusercontent.com/mobiusklein/glycresoft_desktop/master/img/logo.ico",
    setupIcon: "img/logo.ico",
    setupExe: "GlycReSoft_Setup.exe",
    noMsi: true
  });

resultPromise.then(() => console.log("It worked!"), (e) => console.log(`No dice: ${e.message}`));