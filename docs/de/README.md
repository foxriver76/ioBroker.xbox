![Logo](media/xbox.png)

# Xbox Adapter

Der Xbox Adapter ermöglicht die Einbindung einer Xbox One bzw. Xbox One X
Spielekonsole in das ioBroker System.

## Überblick

### Xbox One Spielekonsole
Die Xbox One ist eine von Microsoft entwickelte Spielekonsole, die aktuell gängige
Videospiele wiedergeben kann. Zusätzlich ist die Xbox One fähig, diverese Komponenten
des Heimkinosystems zu steuern und ermöglicht die Nutzung von Microsoft Apps. <br/>
Weiter Ausprägungen der Xbox One sind derzeit die Xbox One X und die Xbox One S, welche
die gleichen Funktionalitäten wie die Ursprungskonsole, jedoch mit verbesserter Leistung
bieten.

### Xbox Adapter
Der Xbox Adapter kann für je eine Xbox One Konsole eingerichtet werden, was eine
Steuerung sowie das Auslesen von Informationen ermöglicht. <br/>
Der Adapter legt automatisch alle Befehle und Stati in Form von Objekten an.
Ein Großteil der Stati kann ebenfalls ausgelesen werden, wie z. B. der aktuelle Titel, der Einschaltzustand usw.
Durch geziehltes Beschreiben oder Lesen der angelegten Objekten kann deren Status geändert und
damit Aktionen ausgelöst oder auch abgefragt werden.

## Voraussetzungen vor der Installation
1. Bevor der Adapter hinzugefügt werden kann, muss mindestens Python 3.5 auf dem Hostsystem
installiert sein.
2. Wenn die Xbox über den Adapter eingeschaltet werden soll, muss der
['Schnelles Hochfahren'-Modus](https://support.xbox.com/de-DE/xbox-one/console/learn-about-power-modes)
in der Konsole konfiguriert sein.

## Danksagung
Vielen Dank an [Team Open Xbox](https://openxbox.org/) für die Entwicklung und Bereitstellung des
[xbox-rest-server](https://github.com/OpenXbox/xbox-smartglass-rest-python) sowie den zugehörigen Bilbiotheken.

## Installation
Eine Instanz des Adapters wird über die ioBroker Admin-Oberfläche installiert.
Die ausführliche Anleitung für die dazu notwendigen Installatonschritte kann hier (TODO:LINK) nachgelesen werden.
<br/><br/>
Nach Abschluss der Installation einer Adapterinstanz öffnet sich automatisch ein Konfigurationsfenster.

## Konfiguration
![Adapter Configuration](media/adapter-configuration.png "Konfiguration")<br/>
<span style="color:grey">*Admin Oberfläche*</span>

| Feld         | Beschreibung |
|:-------------|:-------------|
|Xbox Live ID  |Hier soll die Live ID der Xbox eingetragen werden, welche in den Einstellungen der Konsole zu finden ist.|
|IP            |Hier soll die IP-Adresse der Konsole eingetragen werden.|
|Authentifizierung bei Xbox Live|Wenn die Checkbox angehakt wurde, wird sich mit der E-Mail Adresse und Password bei Xbox Live eingeloggt.|
|E-Mail Adresse|Hier soll die E-Mail Adresse des Xbox Live Kontos eingetragen werden.|
|Passwort      |Hier soll das zugehörige Passwort für das Xbox Live Konto eingegeben werden.|

Nach Abschluss der Konfiguration wird der Konfigurationsdialog mit `SPEICHERN UND SCHLIEßEN` verlassen.
Dadurch efolgt im Anschluß ein Neustart des Adapters.

## Instanzen
Die Installation des Adapters hat im Bereich `Instanzen` eine aktive Instanz des Xbox Adapters angelegt.
<br/><br/>
![Instanz](media/instance.png "Instanz")<br/>
<span style="color:grey">*Erste Instanz*</span>

Auf einem ioBroker Server können mehrere Xbox Adapter Instanzen angelegt werden. Ebenfalls kann eine mit mehreren
ioBroker Servern gleichzeitig verbunden sein. Sollen mehrere Geräte von einem ioBroker Server gesteuert werden, sollte
je Xbox eine Instanz angelegt werden.
<br/><br/>
Ob der Adapter aktiviert oder mit der Xbox verbunden ist, wird mit der Farbe des Status-Feldes der
Instanz verdeutlicht. Zeigt der Mauszeiger auf das Symbol, werden weitere Detailinformationen dargestellt.

## Objekte des Adapters
Im Bereich `Objekte` werden in einer Baumstruktur alle von der Xbox
unterstützen Informationen und Aktivitäten aufgelistet. Zusätzlich wird auch noch
darüber informiert, ob die Kommunikation mit der Xbox reibungslos erfolgt.


![Objekte](media/objects.png "Xbox Objekte")</br>
<span style="color:grey">*Objekte des Xbox Adapters*</span>

Nachfolgend werden die Objekte nach Channel unterteilt.
Jeder Datenpunkt ist mit seinem zugehörigen Datentyp sowie seinen Berechtigungen aufgehführt. Insofern es sich um einen Button
handelt, wird auf die Beschreibung des Typs und der Rechte verzichtet.
Berechtigungen können lesend (R) sowie schreibend (W) sein. Jeder Datenpunkt kann mindestens gelesen (R) werden, während
andere ebenfalls beschrieben werden können. Zur Suche nach einem bestimmten Datenpunkt empfiehlt sich die Suche mittels
der Tastenkombination "STRG + F".

### Channel: Info

* info.connection

    |Datentyp|Berechtigung|
    |:---:|:---:|
    |boolean|R|
   
   *Nur lesbarer Indikator, der true ist, wenn der ioBroker mit der Xbox verbunden ist.*

* info.currentTitles

    |Datentyp|Berechtigung|
    |:---:|:---:|
    |string|R|

   *Nur lesbarer JSON string, welcher aus Key-Value Paaren besteht. Der Key ist der Name eines laufenden Titels,
   und der Value die ID des Titels konvertiert ins Hexadezimalsystem. Diese ID kann genutzt werden, um mittels dem
   settings.launchTitle State den gewünschten Titel zu starten.*

* info.activeTitleName

    |Datentyp|Berechtigung|
    |:---:|:---:|
    |string|R|

    *Enthält den Namen des aktiven Titel (Titel im Vordergrund), in Form eines Strings.*

* info.activeTitleId

    |Datentyp|Berechtigung|
    |:---:|:---:|
    |string|R|

    *Enthält die ins Hexadezimalsystem konvertierte ID des Titels im Vordergrund als String.*

* info.activeTitleImage

    |Datentyp|Berechtigung|
    |:---:|:---:|
    |string|R|

    *Enthält den Link zum Coverbild des Titels im Vordergrund in Form eines Strings.
    Der State ist nur vorhanden sowie funktional wenn die Authentifizierung in den Adaptereinstellungen aktiviert wurde.*

* info.activeTitleType

    |Datentyp|Berechtigung|
    |:---:|:---:|
    |string|R|

    *Enthält die Art des Titels, welcher sich im Vordergrund befindet, in Form eines nur lesbaren Strings, z. B. 'Game'.*

* info.gamertag

    |Datentyp|Berechtigung|
    |:---:|:---:|
    |string|R|

    *String Wert, der den Gamertag des aktuell authentifizierten Accounts enthält.
    Der State ist nur vorhanden sowie funktional wenn die Authentifizierung in den Adaptereinstellungen aktiviert wurde.*

* info.authenticated

    |Datentyp|Berechtigung|
    |:---:|:---:|
    |boolean|R|

    *Boolscher Wert, welcher true ist, wenn die Authentifizierung mit Xbox Live erfolgreich war, ansonsten false.
    Der State ist nur vorhanden sowie funktional wenn die Authentifizierung in den Adaptereinstellungen aktiviert wurde.*
   
### Channel: Settings

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

### Channel: Gamepad

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
   
### Channel: Media

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
