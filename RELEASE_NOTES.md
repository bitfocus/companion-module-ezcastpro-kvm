# v0.1.2

Initial Companion module for EZCastPro / EZCast Pro POE IP KVM extenders, including Actions Micro AM8270 and PWAY/PWAYTek ProAV POE IP KVM rebrands.

## Highlights

- Controls ER02 / ProAVRx receivers using the CMS JSON-RPC API.
- Switches receiver channels with `set_channel_id`.
- Generates presets for channels `01` through `99`.
- Discovers RX/TX units by scanning a configured subnet.
- Supports manual RX IP entry or selecting a discovered RX.
- Shows active-channel feedback with a default background color of `0,90,180`.
- Exposes variables for receiver state, active TX, firmware, resolution, HDMI state, and derived multicast groups.
- Allows RX/TX assigned-name changes via `set_assigned_name`.
- Includes guarded TX channel/ID changes for lab setup and recovery workflows.

## Package

Attach `ezcastpro-kvm-0.1.2.tgz` to this release.

## Discovery Notes

This module was built from reverse engineering of devices sold as 150m HDMI POE KVM extenders over IP / many-to-many extenders, including listings found by searching:

```text
150m hdmi POE KVM extender over ip many-to-many
```

Reference listing:

```text
https://www.aliexpress.com/item/1005007442824141.html
```
