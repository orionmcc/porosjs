require("babel-register");
require("babel-polyfill");
require('./app');

process.on('uncaughtException', function (err) {
  console.log(err);
})
