//I suggest manually adding build-extras.gradle to .meteor/local/cordova-build/platforms/android/
/*var fs = require('fs');
var path = require('path');
var rootdir = process.env.PWD;
var platformAndroidPath = '.meteor/local/cordova-build/platforms/android/';
var srcFile = path.join(rootdir, 'build-extras.gradle');
var destFile = path.join(rootdir, platformAndroidPath, 'build-extras.gradle');
var destDir = path.dirname(destFile);
if (fs.existsSync(srcFile) && fs.existsSync(destDir)) {
  fs.createReadStream(srcFile).pipe(fs.createWriteStream(destFile));
} else {
  throw new Error('Unable to copy build-extras.gradle');
}*/
//%% Script file does't exist and will be skipped: /Users/jonathanlehner/websites/inkstone/.meteor/local/cordova-build/hooks/copy-build-extras-gradle.js
//file should be in a different place


