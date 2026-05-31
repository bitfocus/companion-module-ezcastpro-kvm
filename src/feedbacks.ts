import { combineRgb, type CompanionFeedbackDefinitions } from '@companion-module/base'
import type { ModuleInstance } from './main.js'

export function UpdateFeedbacks(self: ModuleInstance): void {
	const channelChoices = self.getChannelChoices()
	const defaultChannel = channelChoices[0]?.id ?? '22'

	const feedbacks: CompanionFeedbackDefinitions = {
		connected: {
			name: 'Receiver connected',
			type: 'boolean',
			defaultStyle: {
				bgcolor: combineRgb(0, 120, 0),
				color: combineRgb(255, 255, 255),
			},
			options: [],
			callback: () => self.isReady,
		},
		active_channel: {
			name: 'Receiver is on channel',
			type: 'boolean',
			defaultStyle: {
				bgcolor: combineRgb(0, 90, 180),
				color: combineRgb(255, 255, 255),
			},
			options: [
				{
					id: 'channel',
					type: 'dropdown',
					label: 'Channel',
					default: defaultChannel,
					choices: channelChoices,
				},
			],
			callback: (feedback) => {
				const channel = Number.parseInt(String(feedback.options.channel ?? ''), 10)
				return self.rxInfo?.channelId === channel
			},
		},
		hdmi_active: {
			name: 'HDMI output active',
			type: 'boolean',
			defaultStyle: {
				bgcolor: combineRgb(120, 80, 0),
				color: combineRgb(255, 255, 255),
			},
			options: [],
			callback: () => self.rxInfo?.hdmi === 1 || self.rxInfo?.hdmiVideo === 1,
		},
	}

	self.setFeedbackDefinitions(feedbacks)
}
