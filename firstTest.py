#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Wed Jun 27 00:56:53 2018

@author: moritz
"""

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Mon Jun 25 15:11:21 2018
@author: moritz
"""

from uuid import UUID
from xbox.sg.console import Console
from xbox.sg.manager import InputManager, Manager
from xbox.sg.enum import GamePadButton, PrimaryDeviceFlag
from cryptography.hazmat.primitives.asymmetric import ec
from xbox.sg.enum import PublicKeyType
from cryptography.hazmat.backends import default_backend


testCurve = ec.SECP256R1()
xboxKey = ec.EllipticCurvePublicNumbers(curve=testCurve, 
x=29205441515073923487559868131118644438058724507779850563188099066744850429792, 
y=65978933634580207595475043557351594754297380965211948229701265706146817682936)

#print(xboxKey.public_key(default_backend()))

xboxOne = Console(address='192.168.178.78', name='XboxOneX', 
                  uuid=UUID('571a48af-6109-157f-1b3f-dd189ccab114'), 
                  liveid='FD003F65D1219026', 
                  flags=PrimaryDeviceFlag.AllowAnonymousUsers, 
                  public_key=xboxKey.public_key(default_backend()))
xboxOne.add_manager(InputManager) # add Input Manager for Gamepad Actions
#print('xbox available before: ', xboxOne.available)
print('connected before: ', xboxOne.connected)
xboxOne.connect()
#print('xbox available after: ', xboxOne.available)
print('connected after: ', xboxOne.connected)

xboxOne.wait(1)
xboxOne.power_off()

xboxOne.gamepad_input(GamePadButton.Menu)
xboxOne.wait(4)
xboxOne.gamepad_input(GamePadButton.DPadDown)

#xboxOne.power_on()


"""
#-01
#xboxOne.power_
#xboxOne.power_on(tries=5)
#xboxOne.connect()
#print(xboxOne.connection_state)
#print(xboxOne.available)
while(xboxOne.connected == False):
    discovered = Console.discover(timeout=3)
    
    if(len(discovered) > 0):
    #    print("%d console/s discovered" % (len(discovered)))
        print(discovered[0])
        xboxOne = discovered[0]
        discovered[0].connect()
        print(xboxOne.connection_state)
        #xboxOne.power_off()
        xboxOne.add_manager(InputManager)
    else:
        print("no console discovered")
        
    xboxOne.wait(7)
            
print('Trying to power off the console')
    
xboxOne.gamepad_input(GamePadButton.DPadDown)
xboxOne.wait(1)
xboxOne.gamepad_input(GamePadButton.DPadRight)
xboxOne.wait(1)
xboxOne.gamepad_input(GamePadButton.PadA)
xboxOne.wait(1)
xboxOne.gamepad_input(GamePadButton.PadA)
#xboxOne.power_off()
xboxOne.disconnect()
"""