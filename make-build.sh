rm -rf dist
npm run pack
bash include-server.sh
cp app-update.yml dist/win-unpacked/resources/
dist/win-unpacked/GlycReSoft.exe