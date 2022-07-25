const path = require('path');

module.exports = {
  entry: ["@babel/polyfill", "./lib/js/Exports.js"],
  output: {
    path: path.resolve(__dirname, 'lib/es5'),
    filename: 'dock-spawn-ts.js',
    libraryTarget: 'var',
    library: 'DockSpawnTS',
    hashFunction: "xxhash64"
  }
};