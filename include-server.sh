echo "Making Directories..."
mkdir dist/win-unpacked/resources/bin
echo "Copying Executable..."
cp -r "../glycresoft/pyinstaller/dist/glycresoft-cli" "dist/win-unpacked/resources/bin"
echo "Done"