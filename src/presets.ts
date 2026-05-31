import { combineRgb, type CompanionPresetDefinitions } from '@companion-module/base'
import { formatChannelId, type ModuleInstance } from './main.js'

function labelLines(lines: string[]): string {
	return lines.join('\\n')
}

export function UpdatePresets(self: ModuleInstance): void {
	const presets: CompanionPresetDefinitions = {
		refresh_status: {
			type: 'button',
			category: 'Control',
			name: 'Refresh status',
			style: {
				text: labelLines(['KVM', 'Refresh']),
				size: '14',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(40, 40, 40),
				show_topbar: false,
			},
			steps: [{ down: [{ actionId: 'refresh_status', options: {} }], up: [] }],
			feedbacks: [],
		},
		discover_devices: {
			type: 'button',
			category: 'Control',
			name: 'Discover devices',
			style: {
				text: labelLines(['KVM', 'Discover']),
				size: '14',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(30, 70, 70),
				show_topbar: false,
			},
			steps: [{ down: [{ actionId: 'discover_devices', options: {} }], up: [] }],
			feedbacks: [],
		},
	}

	for (const channel of self.getPresetChannels()) {
		const tx = self.getTxForChannel(channel.id)
		const channelText = formatChannelId(channel.id)
		const name = tx?.deviceName || channel.label
		presets[`channel_${channelText}`] = {
			type: 'button',
			category: 'Channels 01-99',
			name: `Channel ${channelText} - ${name}`,
			style: {
				text: labelLines([name, channelText]),
				size: '14',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(20, 20, 20),
				show_topbar: false,
			},
			steps: [{ down: [{ actionId: 'set_channel', options: { channel: String(channel.id) } }], up: [] }],
			feedbacks: [
				{
					feedbackId: 'active_channel',
					options: { channel: String(channel.id) },
					style: {
						bgcolor: combineRgb(0, 90, 180),
						color: combineRgb(255, 255, 255),
					},
				},
			],
		}
	}

	self.setPresetDefinitions(presets)
}
