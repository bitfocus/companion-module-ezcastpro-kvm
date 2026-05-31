# EZCAST PRO DT214M AM8270 KVM

Controls EZCast Pro / Actions Micro AM8270 / PWAY DT214M ProAV POE IP KVM receivers using the CMS JSON-RPC API exposed at:

```text
http://<receiver-ip>/cgi-bin/proav.cgi
```

## Known Working Control

- Set receiver channel ID with `set_channel_id`
- Set RX/TX assigned names with `set_assigned_name`
- Set TX device ID/channel with `set_channel_id` on the transmitter
- Poll receiver state with `get_device_info_proav`
- Discover devices by scanning a subnet for `get_device_info_proav`

For the local test rig:

| Channel | Device | IP |
| --- | --- | --- |
| 21 | ET01_BF00DB2C | 192.168.96.113 |
| 22 | ET01_28D83585 | 192.168.96.169 |

## Notes

This module does not use keyboard HID hotkeys for switching. Current reverse engineering shows source switching is handled by the CMS `set_channel_id` method.

Changing a TX ID can move a transmitter out of the known channel map. Run discovery again after changing any TX ID.
