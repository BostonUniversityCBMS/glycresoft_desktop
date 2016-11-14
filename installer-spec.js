var electronInstaller = require('electron-winstaller');

resultPromise = electronInstaller.createWindowsInstaller({
    appDirectory: 'dist/win-unpacked',
    outputDirectory: 'dist/winstaller64',
    authors: 'JK',
    exe: 'glycresoft_electron.exe'
  });

resultPromise.then(() => console.log("It worked!"), (e) => console.log(`No dice: ${e.message}`));