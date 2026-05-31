# companion-module-EZCAST-PRO-DT214M-AM8270-KVM

Bitfocus Companion v3 module for EZCast Pro / Actions Micro AM8270 / PWAY/PWAYTek ProAV POE IP KVM devices such as:

![DT214M / AM8270 POE IP KVM extender](assets/device.jpg)

- ER02 / ProAVRx receiver
- ET01 / ProAVTx transmitter
- DT214M / DT241M-IR-200M-KVM-POE-style extenders
- AM8270 chipset ProAV extenders

## Features

- Poll receiver state with `get_device_info_proav`
- Switch receiver source/channel with `set_channel_id`
- Set assigned names on RX/TX units with `set_assigned_name`
- Set TX hardware ID / channel remotely with a guarded action
- Discover RX/TX devices on a configured subnet
- Variables for current channel, active discovered TX, firmware, resolution, and derived multicast groups
- Feedbacks for connection state, active channel, and HDMI active state
- Presets generated for channels `01` through `99`, using discovered TX names or configured labels when available

## Local Test Setup

Default config matches the current lab:

```text
Receiver: 192.168.96.101
Channels: blank by default; presets are generated for 01-99
Discovery subnet: 192.168.96.0/24
```

## Device Listing Notes

The device family has been found on AliExpress by searching for `150m hdmi POE KVM extender over ip many-to-many`.

Reference listing used during reverse engineering:

```text
https://www.aliexpress.com/item/1005007442824141.html
```

## Development

```sh
npm install
npm run build
npm run lint
npm run package
```

The package command writes `ezcast-pro-dt214m-am8270-kvm-0.1.0.tgz`.
