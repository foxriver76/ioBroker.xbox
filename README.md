![Logo](admin/xbox.png)
# ioBroker.xbox
===========================

[![Build Status Travis](https://travis-ci.org/foxriver76/ioBroker.xbox.svg?branch=master)](https://travis-ci.org/foxriver76/ioBroker.xbox)[![Build status](https://ci.appveyor.com/api/projects/status/s1we3cpcbxm97upp/branch/master?svg=true)](https://ci.appveyor.com/project/foxriver76/iobroker-xbox/branch/master)
[![NPM version](http://img.shields.io/npm/v/iobroker.xbox.svg)](https://www.npmjs.com/package/iobroker.xbox)
[![Downloads](https://img.shields.io/npm/dm/iobroker.xbox.svg)](https://www.npmjs.com/package/iobroker.xbox)

[![NPM](https://nodei.co/npm/iobroker.xbox.png?downloads=true)](https://nodei.co/npm/iobroker.xbox/)

## Steps 

* Fulfill the requirements
* Install the adapter and control your Xbox

## Requirements

* Linux Kernel (maybe MAC will work too, MS currently not supported)
* Needed packages will automatically be installed. Due this fact root privilges are required and the --unsafe-perm tag

## Installation
You can install the adapter via Admin interface (install from Github) or on your terminal.

### Admin
Currently: Install from Github.

### Terminal
Navigate into your ioBroker folder and execute the following command:
 
```bash
sudo npm i iobroker.xbox --unsafe-perm
```

### Setup
1. Fill in the Live ID of your Xbox in the settings of the adapter. You can find the Live ID in the settings of your console.
2. Fill in the ip address of your Xbox. <br/>
![Adapter Configuration](/doc/adapter-configuration.png)

## States
In this section you can find a description of every state of the adapter.

### Channel Info

* info.connection
   
   *Read-only boolean indicator. Is true if adapter is connected to Xbox.*
   
### Channel Settings

* settings.power

   *Boolean-value to turn your Xbox on and off. State also indicates current power status of the Xbox.*
   
### Channel Gamepad

* gamepad.a

   *Emulates the A button of your gamepad.*

* gamepad.b

   *Emulates the B button of your gamepad.*

* gamepad.x

   *Emulates the X button of your gamepad.*
   
* gamepad.y

   *Emulates the Y button of your gamepad.*
   
* gamepad.clear

   *Emulates the Clear button of your Xbox.*
   
* gamepad.dPadDown

   *Emulates the DPad Down button of your Xbox.*
   
* gamepad.dPadUp

   *Emulates the DPad Up button of your Xbox.*
   
* gamepad.dPadRight

   *Emulates the DPad Right button of your Xbox.*
   
* gamepad.dPadLeft

   *Emulates the DPad Left button of your Xbox.*
   
* gamepad.enroll

   *Emulates the Enroll button of your Xbox.*
   
* gamepad.leftShoulder

   *Emulates the Left Shoulder button of your Xbox.*
   
* gamepad.rightShoulder

   *Emulates the Right Shoulder button of your Xbox.*
   
* gamepad.leftThumbstick

   *Emulates the Left Thumbstick button of your Xbox.*
   
* gamepad.rightThumbstick

   *Emulates the Right Thumbstick button of your Xbox.*
   
* gamepad.menu

   *Emulates the Menu button of your Xbox.*
   
* gamepad.nexus

   *Emulates the Nexus (Xbox) button of your Xbox.*
 
* gamepad.view

   *Emulates the View (Xbox) button of your Xbox.*
   
### Channel Media

* media.play

   *Play button for media content.*
   
* media.pause

   *Pause button for media content.*
   
* media.playPause

   *Combined Play and Pause button for media content.*
   
* media.back

   *Back button for media content.*
   
* media.channelDown

   *Channel Down button for media content.*
   
* media.channelUp

   *Channel Up button for media content.*
   
* media.fastForward

   *Fast Forward button for media content.*
   
* media.menu

   *Menu button for media content.*
   
* media.nextTrack

   *Next Track button for media content.*
   
* media.previousTrack

   *Previous Track button for media content.*
   
* media.record

   *Record button for media content.*
   
* media.rewind

   *Rewind button for media content.*
   
* media.seek

   *Seek button for media content.*
   
* media.stop

   *Stop button for media content.*
   
* media.view

   *View button for media content.*
   
## Changelog

### 0.0.4
* (foxriver76) automatically install required Debian packages
* (foxriver76) updated Readme

### 0.0.3
* (foxriver76) fixed state handling
* (foxriver76) using ping to check consoles power status instead of connection
* (foxriver76) stop powering on if it is unsuccessful for 15 seconds
* (foxriver76) restarting adapter when REST server is down

### 0.0.2
* (foxriver76) fixed endpoints
* (foxriver76) automated installation of dependencies
* (foxriver76) readme updated
* (foxriver76) code optimized

### 0.0.1
* (foxriver76) initial release

## License
The MIT License (MIT)

Copyright (c) 2018 Moritz Heusinger <moritz.heusinger@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
