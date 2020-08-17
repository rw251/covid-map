export BASE_DIR=/home/u584258542
export NODEJS_HOME=$BASE_DIR/node-latest-install/node-v10.15.0-linux-x64/bin
export PATH=$NODEJS_HOME:$PATH

echo STARTING: $(date '+%Y %b %d %H:%M')

node --version
npm --version

npm config set prefix $BASE_DIR/.npm-packages

node $BASE_DIR/cron/covid/update.js

npm run tidy

cp data.json $BASE_DIR/public_html/covid/data.json

npm run minify

echo END: $(date '+%Y %b %d %H:%M')