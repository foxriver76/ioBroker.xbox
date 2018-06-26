#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Tue Jun 26 20:07:04 2018

@author: moritz
"""

import sys, socket, select, time

XBOX_PORT = 5050
XBOX_PING = "dd00000a000000000000000400000002"

py3 = sys.version_info[0] > 2


def turn_on(ip_addr, live_id, pingonly=False, forever=True):

    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.setblocking(0)
    s.bind(("", 0))
    s.connect((ip_addr, XBOX_PORT))

    if isinstance(live_id, str):
        live_id = live_id.encode()
    else:
        live_id = live_id

    if not pingonly:
        power_payload = b'\x00' + chr(len(live_id)).encode() + live_id.upper() + b'\x00'
        power_header = b'\xdd\x02\x00' + chr(len(power_payload)).encode() + b'\x00\x00'
        power_packet = power_header + power_payload
        print("Sending power on packets to {0}".format(ip_addr))
        send_power(s, power_packet)

        print("Xbox should turn on now, pinging to make sure...")
    ping_result = send_ping(s)

    if ping_result:
        print("Ping successful!")
    else:
        print("Failed to ping Xbox :(")
        result = ""
        if not forever and not pingonly:
            while result not in ("y", "n"):
                result = True
        if forever or result == "y":
            if not pingonly:
                print("Sending power packets and pinging until Xbox is on...")
            else:
                print("Sending pinging until Xbox is on...")
            while not ping_result:
                if not pingonly:
                    send_power(s, power_packet)
                ping_result = send_ping(s)
                print("Failed to ping Xbox :(")
            print("Ping successful!")

    s.close()


def send_power(s, data, times=5):
    for i in range(0, times):
        s.send(data)
        time.sleep(1)


def send_ping(s):
    s.send(bytearray.fromhex(XBOX_PING))
    return select.select([s], [], [], 5)[0]

