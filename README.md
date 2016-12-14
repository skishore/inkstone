![Inkstone in action](http://i.imgur.com/FetiXVc.gif)

### What's new

The app version that you're on is displayed on the main page below the
"Inkstone" title. If you don't see it there, you're at version 0.0.4
or earlier.

- Version 0.1.0 adds an asset download pane and a canvas width setting.
- Version 0.0.8 adds support for
  [handwriting shortcuts](http://i.imgur.com/suDHz1v.gif).
- Version 0.0.7 makes it
  [easier to import word lists](https://www.skishore.me/inkstone/docs/format.html).
- Version 0.0.6 makes it possible to adjust scheduling settings freely.
- Version 0.0.5 includes the option to **study traditional characters**.

See the [Installing from binary](#installing-from-binary)
section for updated APKs, or
[download the app from the Google Play Store](https://play.google.com/store/apps/details?id=com.id126c0rsxlvjwv18cf44u).

### Introduction

Inkstone is a mobile app for people who want to learn to read and
write Mandarin. It's **totally free**, **open-source**, and can be used
**without an Internet connection**! Inkstone is licensed under the
[GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.en.html).
Although the app is still being developed, it has quite a few features:

- Tap for a hint, double-tap for a walkthrough
- Stroke recognition and automatic grading
- Spaced-repetition-based scheduling
- Help pages and stroke-order animations for every character
- Bundled word lists: radicals and all HSK levels
- Settings that give you control over scheduling
- Support for custom word lists

Inkstone should run on both Android and iOS, but I don't have an iPhone
on which to test the iOS version. See the `Supported platforms` section
for details.

### Installing from binary

I've uploaded compiled Android APKs to Dropbox. Only use these
binaries if you trust me and Dropbox! The legal disclaimers in the
`LICENSE` file apply to these binaries as well: **there is no warranty
for this program, to the extent permitted by applicable law**. See that
file for full details. With those caveats stated, the pre-built
binaries are here:

- [Inkstone v. 0.1.0 for Android armv7](https://www.dropbox.com/s/sdobc0hvnidbjna/inkstone-armv7.apk?dl=1)
- [Inkstone v. 0.1.0 for Android x86](https://www.dropbox.com/s/hfo7rdp0pjghtnw/inkstone-x86.apk?dl=1)

Most Android phones use armv7. Trying to install the APK for the wrong
architecture will just result in an error message, so if you're not sure
which one your phone is, try both.

### Building from source

To build Inkstone,
[install the latest version of Meteor.js](https://www.meteor.com/install),
then check out this repository and run:

    $ meteor build .build --server localhost:3785
    $ cp -R cordova-build-override/* .build/android/project/assets/.
    $ pushd .build/android/project/cordova
    $ ./build --release
    $ popd

If the build goes successfully, you'll end up with APKs in:

    ./build/android/project/build/outputs/apk/

You'll have to sign these APKs before they can be installed on a device.
See `scripts/build` for an example that also signs the APKs.
Note that the `--server` parameter in the `meteor build` command is a dummy.
Other than custom-lists downloads, the app is an entirely-client-side app.

### Supported platforms

This app has only been tested on Android. In theory, this code could
be used to build an iOS app, too, as follows:

    $ meteor add-platform ios
    $ meteor build .build --server localhost:3785

However, I can't test or debug the iOS build because I don't have an
iPhone. If people are interested, I'd love to buy one and try it out!
Apple devices are expensive, though, as are Apple developer licenses...

### Open source credits

[Inkstone was made possible by a number of other open-source projects,
a full listing of which can be found here.](https://www.skishore.me/inkstone/docs/credits.html)

### Upcoming features

See `todo.txt` for a list of planned features. If there's something you'd
like to see added that's not in that file, open an issue or drop me an email
at `kshaunak "at" gmail.com`.
