import type { CompanionActionDefinitions } from '@companion-module/base'
import type { ModuleInstance } from './main.js'

function parseChannel(value: string): number {
	const channel = Number.parseInt(value.trim(), 10)
	if (!Number.isInteger(channel) || channel < 0 || channel > 255) throw new Error('Channel ID must be 0-255')
	return channel
}

export function UpdateActions(self: ModuleInstance): void {
	const channelChoices = self.getChannelChoices()
	const defaultChannel = channelChoices[0]?.id ?? '22'
	const deviceChoices = self.getDeviceChoices()
	const defaultDevice = deviceChoices[0]?.id ?? self.getEffectiveRxHost() ?? '192.168.96.101'
	const txChoices = deviceChoices.filter((choice) => choice.label.includes('TX'))
	const defaultTx = txChoices[0]?.id ?? defaultDevice

	const actions: CompanionActionDefinitions = {
		set_channel: {
			name: 'Set receiver channel',
			options: [
				{
					id: 'channel',
					type: 'dropdown',
					label: 'Channel',
					default: defaultChannel,
					choices: channelChoices,
				},
			],
			callback: async (action) => {
				await self.setChannel(parseChannel(String(action.options.channel ?? defaultChannel)))
			},
		},
		set_custom_channel: {
			name: 'Set receiver channel by number',
			options: [
				{
					id: 'channel',
					type: 'textinput',
					label: 'Channel ID',
					default: '22',
					useVariables: true,
				},
			],
			callback: async (action) => {
				await self.setChannel(parseChannel(String(action.options.channel ?? '')))
			},
		},
		refresh_status: {
			name: 'Refresh receiver status',
			options: [],
			callback: async () => {
				await self.refreshStatus()
			},
		},
		discover_devices: {
			name: 'Discover devices on subnet',
			options: [],
			callback: async () => {
				await self.discover()
			},
		},
		set_receiver_name: {
			name: 'Set receiver assigned name',
			options: [
				{
					id: 'name',
					type: 'textinput',
					label: 'Assigned name',
					default: 'Receiver',
					useVariables: true,
				},
			],
			callback: async (action) => {
				await self.setName(self.getEffectiveRxHost(), String(action.options.name ?? ''))
			},
		},
		set_device_name: {
			name: 'Set device assigned name',
			options: [
				{
					id: 'host',
					type: 'dropdown',
					label: 'Device',
					default: defaultDevice,
					choices: deviceChoices,
				},
				{
					id: 'customHost',
					type: 'textinput',
					label: 'Custom host override',
					default: '',
					useVariables: true,
					tooltip: 'Optional. If set, this IP/hostname is used instead of the dropdown.',
				},
				{
					id: 'name',
					type: 'textinput',
					label: 'Assigned name',
					default: 'KVM Device',
					useVariables: true,
				},
			],
			callback: async (action) => {
				const customHost = String(action.options.customHost ?? '').trim()
				const host = customHost || String(action.options.host ?? defaultDevice)
				await self.setName(host, String(action.options.name ?? ''))
			},
		},
		set_tx_channel_id: {
			name: 'Set TX device ID / channel',
			options: [
				{
					id: 'host',
					type: 'dropdown',
					label: 'TX device',
					default: defaultTx,
					choices: txChoices.length > 0 ? txChoices : deviceChoices,
				},
				{
					id: 'customHost',
					type: 'textinput',
					label: 'Custom TX host override',
					default: '',
					useVariables: true,
					tooltip: 'Optional. If set, this IP/hostname is used instead of the dropdown.',
				},
				{
					id: 'channel',
					type: 'textinput',
					label: 'New TX ID / channel',
					default: '22',
					useVariables: true,
				},
				{
					id: 'confirm',
					type: 'checkbox',
					label: 'I understand this changes the transmitter ID',
					default: false,
					tooltip: 'Changing a TX ID can move it out of the known channel map. Use discovery again after changing it.',
				},
			],
			callback: async (action) => {
				if (action.options.confirm !== true) {
					throw new Error('Enable the confirmation checkbox before changing a TX device ID')
				}
				const customHost = String(action.options.customHost ?? '').trim()
				const host = customHost || String(action.options.host ?? defaultTx)
				const channel = parseChannel(String(action.options.channel ?? ''))
				await self.setRemoteDeviceChannel(host, channel)
			},
		},
	}

	self.setActionDefinitions(actions)
}
