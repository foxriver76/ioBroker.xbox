![Logo](admin/xbox.png)
# ioBroker.xbox
===========================

[![Build Status Travis](https://travis-ci.org/foxriver76/ioBroker.xbox.svg?branch=master)](https://travis-ci.org/foxriver76/ioBroker.xbox)[![Build status](https://ci.appveyor.com/api/projects/status/s1we3cpcbxm97upp/branch/master?svg=true)](https://ci.appveyor.com/project/foxriver76/iobroker-xbox/branch/master)
[![NPM version](http://img.shields.io/npm/v/iobroker.xbox.svg)](https://www.npmjs.com/package/iobroker.xbox)
[![Downloads](https://img.shields.io/npm/dm/iobroker.xbox.svg)](https://www.npmjs.com/package/iobroker.xbox)

[![NPM](https://nodei.co/npm/iobroker.xbox.png?downloads=true)](https://nodei.co/npm/iobroker.xbox/)

## Steps 

* Fulfill the requirements
* Install the adapter and control your Xbox One or Xbox One X

## Requirements

* You need to have Python >= 3.5 installed
* For Linux additional packages are required.
   
   The required packages will automatically be installed. Due to this fact root privileges are required as well as the 
   --unsafe-perm flag. If this fails, you have to install the packages manually (build-essential libssl-dev libffi-dev 
   python3-dev).

## Installation
You can install the adapter via Admin interface or on your terminal.

### Admin
1. Open your ioBroker web interface in a browser (eg: 192.168.30.70:8081)
2. Click on Tab "Adapters"
3. Type "Xbox" in the filter
4. Click on the three points and then on the "+" symbol of the Xbox adapter <br/>
![Add Adapter](/doc/plusAddAdapter.png)

### Terminal
Navigate into your ioBroker folder and execute the following command (on Linux Root privileges are required to install 
the additional packages, use sudo):
 
```bash
npm i iobroker.xbox --unsafe-perm
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

* info.currentTitles

   *Read-only JSON string, which consits of key-value pairs. The key is the name of an active title,
   while the value is the title id converted to hexadecimal. The hex title id can be used to launch a
   title via the settings.launchTitlte state.*
   
### Channel Settings

* settings.power

   *Boolean-value to turn your Xbox on and off. State also indicates current power status of the Xbox.*

* settings.launchTitle

   *A writable string, which allows the user to launch a specific title by its title id
   (converted to hexadecimal). To find out about the hex code of a desired title, you can
   use the info.currentTitles state. The command is acknowledged when it has arrived at the server,
   which does not mean, that the command has been executed.*

   *Example:*
    ```javascript
    setState('settings.launchTitle', '2340236c', false); // Launch Red Ded Redemption 2
    ```

* settings.inputText

   *Writable string, which allows the user to fill text into an active text field, e.g. to send
   private messages. The command is acknowledged when it has arrived at the server, which does
   not mean, that the command has been executed.*

   *Example:*
   ```javascript
   setState('settings.inputText', 'H1 M8 h0w d0 u do?', false); // Send a super nerdy text so someone
   ```

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

### 0.1.2
* (foxriver76) fix when currentTitles is empty

### 0.1.1
* (foxriver76) minor fixes
* (foxriver76) explicit require versions of python deps
* (foxriver76) fix for power on, when Xbox not in broadcast network

### 0.1.0
* (foxriver76) brought back live id to settings
* (foxriver76) input text state to enter text in an open text field
* (foxriver76) ability to find consoles which are not available via broadcast
* (foxriver76) info state for active titles & launch title state

### 0.0.13
* (foxriver76) minor fix
* (foxriver76) restart adapter on rest server error
* (foxriver76) log when losing connection without ping

### 0.0.12
* (foxriver76) when console unavailable, also do not connect
* (foxriver76) debug logging for unavailable console
* (foxriver76) only set power states on change

### 0.0.11
* (foxriver76) minor connection fix

### 0.0.10
* (foxriver76) when status is connecting, don't connect again

### 0.0.9
* (foxriver76) LiveID is not necessary anymore

### 0.0.8
* (foxriver76) If reconnect attempts fail often in a row, only log it once
* (foxriver76) removed unneeded objects from io-package and adjusted title

### 0.0.6
* (foxriver76) Stop making connect requests when already connected
* (foxriver76) more user friendly logging
* (foxriver76) more robustness in nopys path

### 0.0.5
* (foxriver76) using relative paths for starting server
* (foxriver76) adding commands for windows
* (foxriver76) enhanced installation manual

### 0.0.4
* (foxriver76) automatically install required Debian packages
* (foxriver76) updated Readme
* (foxriver76) make installation for Windows possible
* (foxriver76) improved logging
* (foxriver76) detect OS

### 0.0.3
* (foxriver76) fixed state handling
* (foxriver76) using ping to check consoles power status instead of connection
* (foxriver76) stop powering on if it is unsuccessful for 15 seconds
* (foxriver76) restarting adapter when REST snpm erver is down

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
