#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Mon Jun 25 15:11:21 2018

@author: moritz
"""

from uuid import UUID
from xbox.sg.console import Console
from xbox.sg.manager import InputManager
from xbox.sg.enum import GamePadButton, PrimaryDeviceFlag
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.backends import default_backend
from own_turn_on import turn_on

"""Configuration"""
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

"""Start Xbox and Connection"""
turn_on(ip_addr=xboxOne.address, live_id=xboxOne.liveid)

print('connected before: ', xboxOne.connected)
xboxOne.connect()
print('connected after: ', xboxOne.connected)

# wait after connection is established
xboxOne.wait(1)

"""Custom Commands"""
#xboxOne.power_off()

xboxOne.gamepad_input(GamePadButton.Menu)
xboxOne.wait(4)
xboxOne.gamepad_input(GamePadButton.DPadDown)
#xboxOne.power_on(tries=5)
