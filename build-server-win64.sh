echo "Removing build artifacts"
rm -rf pyinstaller-build/ server/win64/
echo "Beginning build"
python -m PyInstaller -c glycresoft-cli.py -D --exclude-module _tkinter --exclude-module PyQt4 --exclude-module IPython\
       --workpath pyinstaller-build --distpath server/win64 -i img/logo.ico
