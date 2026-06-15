# v0.1.3

Review follow-up for the initial EZCastPro KVM submission.

## Fixes

- Restored required Companion TypeScript template scaffold files, Yarn config, package scripts, Husky, and lint-staged setup.
- Removed low-value/banned manifest keywords.
- Stopped redundant variable parsing in action callbacks for auto-parsed text inputs.
- Removed the dead legacy `rxHost` config fallback.
- Added destroy/config-generation guards so stale discovery and status requests cannot update torn-down state.
- Tracked and clear the channel-settle timer during destroy/config changes.
- Prevented overlapping status polls.
- Added CMS HTTP status checks and a response-size cap.
- Made discovery failures visible in logs and status when discovery is the selected receiver source.

## Validation

- Ran `yarn format`
- Ran `yarn lint`
- Ran `yarn build`
- Ran `yarn package`
- Ran `npx --no-install companion-module-check`

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
