import type { SomeCompanionConfigField } from '@companion-module/base'

export interface ModuleConfig {
	rxSelectionMode: 'manual' | 'discovered'
	manualRxHost: string
	discoveredRxHost: string
	rxHost: string
	password: string
	pollIntervalMs: number
	requestTimeoutMs: number
	discoverySubnet: string
	autoDiscover: boolean
	channelList: string
}

export function GetConfigFields(rxChoices: Array<{ id: string; label: string }> = []): SomeCompanionConfigField[] {
	return [
		{
			type: 'dropdown',
			id: 'rxSelectionMode',
			label: 'Receiver selection',
			width: 4,
			default: 'manual',
			choices: [
				{ id: 'manual', label: 'Manual IP / hostname' },
				{ id: 'discovered', label: 'Discovered RX list' },
			],
		},
		{
			type: 'textinput',
			id: 'manualRxHost',
			label: 'Manual receiver IP / hostname',
			width: 8,
			default: '192.168.96.101',
			tooltip: 'ER02 / ProAVRx receiver address.',
		},
		{
			type: 'dropdown',
			id: 'discoveredRxHost',
			label: 'Discovered receiver',
			width: 8,
			default: '',
			choices:
				rxChoices.length > 0
					? [{ id: '', label: 'Auto-select first discovered RX' }, ...rxChoices]
					: [{ id: '', label: 'No RX discovered yet - use Discover action or reconnect' }],
			tooltip:
				'Choose a discovered receiver, or leave as auto-select. Discovery runs on startup when enabled and can also be triggered by action.',
		},
		{
			type: 'textinput',
			id: 'password',
			label: 'Admin password',
			width: 4,
			default: '',
			tooltip: 'Leave blank when the receiver has no admin password for CMS control.',
		},
		{
			type: 'number',
			id: 'pollIntervalMs',
			label: 'Poll interval (ms)',
			width: 4,
			min: 500,
			max: 60000,
			default: 2000,
		},
		{
			type: 'number',
			id: 'requestTimeoutMs',
			label: 'Request timeout (ms)',
			width: 4,
			min: 250,
			max: 15000,
			default: 3000,
		},
		{
			type: 'textinput',
			id: 'discoverySubnet',
			label: 'Discovery subnet',
			width: 4,
			default: '192.168.96.0/24',
			tooltip: 'Subnet scanned by the discovery action. Example: 192.168.96.0/24.',
		},
		{
			type: 'checkbox',
			id: 'autoDiscover',
			label: 'Discover devices on startup',
			width: 4,
			default: true,
		},
		{
			type: 'textinput',
			id: 'channelList',
			label: 'Channels',
			width: 12,
			default: '',
			tooltip:
				'Optional comma-separated channel labels. Presets are always generated for 01-99. Example: 21=Lectern,22=Rack PC,23=Spare.',
		},
	]
}
