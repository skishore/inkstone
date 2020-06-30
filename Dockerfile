FROM ubuntu:20.04

# This is not essential for building Inkstone, but greatly simplifies the process
# by providing you with an automatically-created, ready-to-use Android SDK environment.
# 
# You can try it out by running the following:
# 
# ```
# docker build . -t skishore/inkstone-build
# docker run --entrypoint=/project/scripts/build -v `pwd`:/project -ti skishore/inkstone-build
# ```
# 
# So far signing doesn't work, but you can confirm that the apk keys should appear in your home directory.
#
# Assumes your UID is 1000, which is default on Ubuntu.

RUN apt-get update && apt-get install -qqqy curl && curl -sL https://deb.nodesource.com/setup_14.x | bash -
RUN apt-get update && apt-get install -qqqy openjdk-8-jdk wget unzip nodejs

RUN useradd -m -d /home/ubuntu -s /bin/bash -u 1000 user
RUN mkdir /project && chown 1000:1000 /project
USER user
WORKDIR /home/ubuntu

# This was copied from: https://hub.docker.com/r/chibatching/docker-android-sdk/dockerfile
# <COPY>
RUN mkdir tools && wget -nv https://dl.google.com/android/repository/sdk-tools-linux-4333796.zip -O tools.zip && \
    unzip -q tools.zip -d tools && \
    rm tools.zip

ENV ANDROID_HOME /home/ubuntu/tools
ENV PATH ${ANDROID_HOME}/tools:$ANDROID_HOME/platform-tools:$PATH:${ANDROID_HOME}/tools/bin

RUN mkdir $ANDROID_HOME/licenses && \
    echo 8933bad161af4178b1185d1a37fbf41ea5269c55 > $ANDROID_HOME/licenses/android-sdk-license && \
    echo d56f5187479451eabf01fb78af6dfcb131a6481e >> $ANDROID_HOME/licenses/android-sdk-license && \
    echo 24333f8a63b6825ea9c5514f83c2829b004d1fee >> $ANDROID_HOME/licenses/android-sdk-license && \
    echo 84831b9409646a918e30573bab4c9c91346d8abd > $ANDROID_HOME/licenses/android-sdk-preview-license
# </COPY>

# FIXME: there might be unnecessary lines here - if the project still builds APKs after removing them,
# let's get rid of the lines
RUN sdkmanager \
    "build-tools;28.0.3"\
    "emulator"\
    "extras;android;m2repository"\
    "extras;google;m2repository"\
    "extras;m2repository;com;android;support;constraint;constraint-layout-solver;1.0.2"\
    "extras;m2repository;com;android;support;constraint;constraint-layout;1.0.2"\
    "patcher;v4"\
    "platform-tools"\
    "platforms;android-14"\
    "platforms;android-23"\
    "platforms;android-28"\
    "sources;android-23" \
    2>&1 | tail -c 4096  # tail is here because sdkmanager doesn't have --quiet option and spams A LOT

# https://stackoverflow.com/questions/42645285/cordova-android-sdk-not-found-make-sure-that-it-is-installed-if-it-is-not-at
#
# We need this fix in order to be able to build under Cordova. Otherwise it doesn't detect Android SDK. 
ENV TOOLS_VERSION=r22.6.2
RUN cd $ANDROID_HOME && \
    rm -rf tools && \
    curl -O https://dl.google.com/android/repository/tools_${TOOLS_VERSION}-linux.zip && \
    unzip -qq tools_${TOOLS_VERSION}-linux.zip && \
    rm tools_${TOOLS_VERSION}-linux.zip && \
    chown 1000:1000 tools -R

# This solves the following: https://issuetracker.google.com/issues/116182838
RUN sed -e 's/init>/init\&gt;/g' -i $ANDROID_HOME/platform-tools/api/api-versions.xml && rm $ANDROID_HOME/platform-tools/api/annotations.zip

# Install Meteor as root, so that it's in $PATH
USER root
RUN curl 'https://install.meteor.com/?release=1.9' | sh
USER user

# Without this line, we're getting the following error:
# Exception in thread "main" java.lang.RuntimeException: java.io.IOException: Server returned HTTP response code: 403 for URL: http://services.gradle.org/distributions/gradle-2.2.1-all.zip
ENV CORDOVA_ANDROID_GRADLE_DISTRIBUTION_URL=https://services.gradle.org/distributions/gradle-2.2.1-all.zip

WORKDIR /project
