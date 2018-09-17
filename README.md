![Logo](admin/xbox.png)
# ioBroker.xbox
=================

This adapter allows you to control your Xbox via ioBroker.

## Steps 

* Fulfill the requirements (make sure that **xbox-smartglass-rest and all it's dependencies are installed**)
* Install the adapter and control your Xbox

## Requirements

* Linux Kernel (maybe MAC will work too, MS currently not supported)
* Python 3.6 is required
* pip3 install xbox-smartglass-rest (https://github.com/OpenXbox/xbox-smartglass-rest-python)
* pip3 install xbox-smartglass-core (https://github.com/OpenXbox/xbox-smartglass-core-python)

## Installation
You can isntall the adapter via Admin interface (install from Github) or on your terminal.

### Admin

### Terminal
Navigate into your iobroker folder and execute the following command:
 
```bash
npm i iobroker.denon
```

### Setup
1. Fill in the Live ID of your Xbox in the settings of the adapter. You can find the Live ID in the settings of your console.
2. Fill in the ip address of your Xbox. <br/>
![Adapter Configuration](/doc/adapter-configuration.png)

## States


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
