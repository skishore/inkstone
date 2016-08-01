![Inkstone in action](http://i.imgur.com/FetiXVc.gif)

### Introduction

Inkstone is a mobile app for English-speakers who want to learn to read
and write Mandarin. To build this app,
[install the latest version of Meteor.js](https://www.meteor.com/install),
then check out this repository and run:

    $ meteor build output --server localhost:3785

The `--server` parameter in this build command is a dummy: this app is an
entirely client-side app. That means that you can study Chinese on the go
without any Internet connection!

### Supported platforms

This app is currently Android-only. After running the build command
above, you'll find two .apk files in the output directory, one for armv7
phones and the other for x86 phones. Look for the files in:

    output/inkstone/android/project/build/outputs/apk/

In theory, the code in this repository can be used to build an iOS app,
too, as follows:

    $ meteor add-platform ios
    $ meteor build output --server localhost:3785

However, I can't test or debug the iOS build because I don't have an
iPhone. If people are interested, I'd love to buy one and try it out!
Apple devices are expensive, though, as are Apple developer licenses...

### Pre-built binaries

I've uploaded copies of the Android binaries to Dropbox. Only use these
binaries if you trust me and Dropbox! The legal disclaimers in the
`LICENSE` file apply to these binaries as well: **there is no warranty
for this program, to the extent permitted by applicable law**. See that
file for full details. With those caveats stated, the pre-built
binaries are here:

- [Inkstone for Android armv7](https://www.dropbox.com/s/z2avjvqclmj2snd/inkstone-armv7.apk?dl=0)
- [Inkstone for Android x86](https://www.dropbox.com/s/ucm7zrwuwmeioy6/inkstone-x86.apk?dl=0)

### Upcoming features

Right now, Inkstone only supports simplified characters. Adding an option
to study traditional characters is on the roadmap, as are a number of
other significant new features - see `todo.txt` for a list. If there's
something you'd like to see added that's not in that file, open an issue
or drop me an email at `kshaunak "at" gmail.com`.
