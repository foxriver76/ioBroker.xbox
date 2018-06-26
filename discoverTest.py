#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Mon Jun 25 21:41:27 2018

@author: moritz
"""

import sys
from xbox.sg.console import Console
from xbox.sg.enum import ConnectionState

discovered = Console.discover(timeout=1)
if len(discovered):
    console = discovered[0]
    console.connect()
    if console.connection_state != ConnectionState.Connected:
        print("Connection failed")
        sys.exit(1)
    console.wait(1)

    try:
        console.protocol.serve_forever()
    except KeyboardInterrupt:
        pass
else:
    print("No consoles discovered")
    sys.exit(1)
    
"""
#xboxOne.power_on(tries=5)
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
            

"""