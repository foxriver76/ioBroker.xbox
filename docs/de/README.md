![Logo](admin/xbox.png)

# Xbox One Adapter

Der Xbox Adapter ermöglicht die Einbindung einer Xbox One bzw. Xbox One X
Spielekonsole in das ioBroker System.

## Überblick

## Steps 

* Fulfill the requirements
* Install the adapter and control your Xbox One or Xbox One X

## Requirements

* You need to have Python >= 3.5 installed
* For Linux additional packages are required.
   
   The required packages will automatically be installed. Due to this fact root privileges are required as well as the 
   --unsafe-perm flag. If this fails, you have to install the packages manually (build-essential libssl-dev libffi-dev 
   python3-dev).
* If you want to power your Xbox on with this adapter, you have to
[configure the instant-on power modus](https://support.xbox.com/en-GB/xbox-one/console/learn-about-power-modes) on your Xbox.

## Acknowledgement
Thanks to [Team Open Xbox](https://openxbox.org/) for developing and maintaining the
[xbox-rest-server](https://github.com/OpenXbox/xbox-smartglass-rest-python) and the related libraries.
Without their effort, developing this package would not be possible.

## Installation
You can install the adapter via Admin interface or on your terminal.

### Admin
1. Open your ioBroker web interface in a browser (eg: 192.168.30.70:8081)
2. Click on Tab "Adapters"
3. Type "Xbox" in the filter
4. Click on the three points and then on the "+" symbol of the Xbox adapter <br/>
![Add Adapter](/docs/de/img/plusAddAdapter.png)

### Terminal
Navigate into your ioBroker folder and execute the following command (on Linux Root privileges are required to install 
the additional packages, use sudo):
 
```bash
npm i iobroker.xbox --unsafe-perm
```

### Setup
1. Fill in the Live ID of your Xbox in the settings of the adapter. You can find the Live ID in the settings of your console.
2. Fill in the ip address of your Xbox. <br/>
![Adapter Configuration](/docs/de/img/adapter-configuration.png)
3. If you want to use the features which require authentication on Xbox Live,
you have to enable the authenticate checkbox.
4. Provide the e-mail address as well as the password of you Xbox Live account.

## States
In this section you can find a description of every state of the adapter.

### Channel Info

* info.connection

    |Datentyp|Berechtigung|
    |:---:|:---:|
    |boolean|R|
   
   *Read-only boolean indicator. Is true if adapter is connected to Xbox.*

* info.currentTitles

    |Datentyp|Berechtigung|
    |:---:|:---:|
    |string|R|

   *Read-only JSON string, which consits of key-value pairs. The key is the name of an active title,
   while the value is the title id converted to hexadecimal. The hex title id can be used to launch a
   title via the settings.launchTitlte state.*

* info.activeTitleName

    |Datentyp|Berechtigung|
    |:---:|:---:|
    |string|R|

    *Contains the name of the active title (which is focused) as read-only string.*

* info.activeTitleId

    |Datentyp|Berechtigung|
    |:---:|:---:|
    |string|R|

    *Contains the id (converted to hex) of the active title (which is focused) as read-only string.*

* info.activeTitleImage

    |Datentyp|Berechtigung|
    |:---:|:---:|
    |string|R|

    *Contains the link to the active title (which is focused) cover image as a string.
    The state is only available when authenticate is activated in the settings.*

* info.activeTitleType

    |Datentyp|Berechtigung|
    |:---:|:---:|
    |string|R|

    *Contains the type of the active title (which is focused) as a read-only string, e.g. 'Game'.*

* info.gamertag

    |Datentyp|Berechtigung|
    |:---:|:---:|
    |string|R|

    *String which contains the gamertag of the currently authenticated user.
    The state is only available when authenticate is activated in the settings.*

* info.authenticated

    |Datentyp|Berechtigung|
    |:---:|:---:|
    |boolean|R|

    *Boolean value which indicates if you are successfully authenticated on Xbox Live.
    The state is only available when authenticate is activated in the settings.*
   
### Channel Settings

* settings.power

    |Datentyp|Berechtigung|
    |:---:|:---:|
    |boolean|R/W|

   *Boolean-value to turn your Xbox on and off. State also indicates current power status of the Xbox.*

* settings.launchTitle

    |Datentyp|Berechtigung|
    |:---:|:---:|
    |string|R/W|

   *A writable string, which allows the user to launch a specific title by its title id
   (converted to hexadecimal). To find out about the hex code of a desired title, you can
   use the info.currentTitles state. The command is acknowledged when it has arrived at the server,
   which does not mean, that the command has been executed.*

   *Example:*
    ```javascript
    setState('settings.launchTitle', '2340236c', false); // Launch Red Dead Redemption 2
    ```

* settings.inputText

    |Datentyp|Berechtigung|
    |:---:|:---:|
    |string|R/W|

   *Writable string, which allows the user to fill text into an active text field, e.g. to send
   private messages. The command is acknowledged when it has arrived at the server, which does
   not mean, that the command has been executed.*

   *Example:*
   ```javascript
   setState('settings.inputText', 'H1 M8 h0w d0 u do?', false); // Send a super nerdy text to someone
   ```

* settings.gameDvr

    *Button which records the previous minute of gameplay. The button is available when
    authenticate is turned on in the settings. You have to be logged in on your Xbox with the same account
    as you are authenticated with. A game needs to be in foreground.*

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
