import {
	InstanceBase,
	InstanceStatus,
	runEntrypoint,
	type CompanionVariableDefinition,
	type SomeCompanionConfigField,
} from '@companion-module/base'
import { UpdateActions } from './actions.js'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { UpdateFeedbacks } from './feedbacks.js'
import { UpdatePresets } from './presets.js'
import {
	discoverDevices,
	getDeviceInfo,
	setAssignedName,
	setDeviceChannel,
	setReceiverChannel,
	type DeviceDescription,
} from './protocol.js'
import { UpgradeScripts } from './upgrades.js'

interface ChannelConfig {
	id: number
	label: string
}

export function formatChannelId(channelId: number): string {
	return channelId.toString().padStart(2, '0')
}

function parseChannelList(raw: string | undefined): ChannelConfig[] {
	const channels: ChannelConfig[] = []
	for (const entry of (raw ?? '').split(',')) {
		const trimmed = entry.trim()
		if (!trimmed) continue
		const [idRaw, labelRaw] = trimmed.includes('=') ? trimmed.split('=', 2) : [trimmed, trimmed]
		const id = Number.parseInt(idRaw.trim(), 10)
		if (!Number.isInteger(id) || id < 0 || id > 255) continue
		channels.push({ id, label: (labelRaw ?? idRaw).trim() || `Channel ${formatChannelId(id)}` })
	}
	return channels
}

function numberText(value: number | undefined): string {
	return value === undefined ? '' : String(value)
}

export class ModuleInstance extends InstanceBase<ModuleConfig> {
	config!: ModuleConfig
	isReady = false
	lastError = ''
	lastCommand = ''
	lastResponse = ''
	rxInfo: DeviceDescription | undefined
	devices: DeviceDescription[] = []

	private pollTimer: NodeJS.Timeout | undefined

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: ModuleConfig): Promise<void> {
		this.config = config
		this.updateActions()
		this.updateFeedbacks()
		this.updatePresets()
		this.updateVariableDefinitions()
		this.updateVariables()
		await this.start()
	}

	async destroy(): Promise<void> {
		this.stopPolling()
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		this.config = config
		this.updateActions()
		this.updateFeedbacks()
		this.updatePresets()
		this.updateVariableDefinitions()
		this.updateVariables()
		await this.start()
	}

	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields(this.getRxChoices())
	}

	updateActions(): void {
		UpdateActions(this)
	}

	updateFeedbacks(): void {
		UpdateFeedbacks(this)
	}

	updatePresets(): void {
		UpdatePresets(this)
	}

	getConfiguredChannels(): ChannelConfig[] {
		return parseChannelList(this.config?.channelList)
	}

	getPresetChannels(): ChannelConfig[] {
		const configured = new Map(this.getConfiguredChannels().map((channel) => [channel.id, channel.label]))
		return Array.from({ length: 99 }, (_, index) => {
			const id = index + 1
			return { id, label: configured.get(id) ?? `Channel ${formatChannelId(id)}` }
		})
	}

	getChannelChoices(): Array<{ id: string; label: string }> {
		return this.getPresetChannels().map((channel) => ({
			id: String(channel.id),
			label: `${formatChannelId(channel.id)} - ${channel.label}`,
		}))
	}

	getTxForChannel(channelId: number | undefined): DeviceDescription | undefined {
		if (channelId === undefined) return undefined
		return this.devices.find((device) => device.role === 'tx' && device.channelId === channelId)
	}

	getRxChoices(): Array<{ id: string; label: string }> {
		return this.devices
			.filter((device) => device.role === 'rx')
			.map((device) => ({
				id: device.host,
				label: `${device.host} - ${device.deviceName || device.productName || 'RX'}`,
			}))
	}

	getEffectiveRxHost(): string {
		const mode = this.config?.rxSelectionMode ?? 'manual'
		const manualHost = (this.config?.manualRxHost || this.config?.rxHost || '').trim()
		if (mode !== 'discovered') return manualHost

		const selected = (this.config?.discoveredRxHost ?? '').trim()
		if (selected) return selected
		return this.devices.find((device) => device.role === 'rx')?.host ?? manualHost
	}

	getDeviceChoices(): Array<{ id: string; label: string }> {
		const choices = new Map<string, string>()
		const rxHost = this.getEffectiveRxHost()
		if (rxHost) choices.set(rxHost, `Selected RX (${rxHost})`)
		for (const device of this.devices) {
			choices.set(device.host, `${device.host} - ${device.role.toUpperCase()} ${device.deviceName}`)
		}
		return [...choices.entries()].map(([id, label]) => ({ id, label }))
	}

	updateVariableDefinitions(): void {
		const definitions: CompanionVariableDefinition[] = [
			{ variableId: 'connected', name: 'Connected' },
			{ variableId: 'connection_status', name: 'Connection status' },
			{ variableId: 'last_error', name: 'Last error' },
			{ variableId: 'last_command', name: 'Last command sent' },
			{ variableId: 'last_response', name: 'Last response summary' },
			{ variableId: 'rx_host', name: 'Receiver host' },
			{ variableId: 'rx_name', name: 'Receiver device name' },
			{ variableId: 'rx_product', name: 'Receiver product' },
			{ variableId: 'rx_model', name: 'Receiver model' },
			{ variableId: 'rx_version', name: 'Receiver firmware version' },
			{ variableId: 'rx_mac', name: 'Receiver MAC address' },
			{ variableId: 'channel_id', name: 'Current receiver channel ID' },
			{ variableId: 'active_tx_name', name: 'Active TX name from discovery' },
			{ variableId: 'active_tx_ip', name: 'Active TX IP from discovery' },
			{ variableId: 'active_tx_mac', name: 'Active TX MAC from discovery' },
			{ variableId: 'resolution', name: 'Receiver output resolution' },
			{ variableId: 'hdmi', name: 'HDMI status' },
			{ variableId: 'stream_ip', name: 'Derived video multicast IP' },
			{ variableId: 'stream_port', name: 'Derived video multicast port' },
			{ variableId: 'kvm_control_ip', name: 'Derived KVM control multicast IP' },
			{ variableId: 'kvm_control_port', name: 'Derived KVM control multicast port' },
			{ variableId: 'discovered_devices', name: 'Discovered device summary' },
			{ variableId: 'discovered_count', name: 'Discovered device count' },
		]
		this.setVariableDefinitions(definitions)
	}

	updateVariables(): void {
		const activeTx = this.getTxForChannel(this.rxInfo?.channelId)
		this.setVariableValues({
			connected: this.isReady ? 'true' : 'false',
			connection_status: this.isReady ? 'Connected' : 'Disconnected',
			last_error: this.lastError,
			last_command: this.lastCommand,
			last_response: this.lastResponse,
			rx_host: this.getEffectiveRxHost(),
			rx_name: this.rxInfo?.deviceName ?? '',
			rx_product: this.rxInfo?.productName ?? '',
			rx_model: this.rxInfo?.model ?? '',
			rx_version: this.rxInfo?.version ?? '',
			rx_mac: this.rxInfo?.mac ?? '',
			channel_id: numberText(this.rxInfo?.channelId),
			active_tx_name: activeTx?.deviceName ?? '',
			active_tx_ip: activeTx?.host ?? '',
			active_tx_mac: activeTx?.mac ?? '',
			resolution: this.rxInfo?.resolution ?? '',
			hdmi: numberText(this.rxInfo?.hdmi),
			stream_ip: this.rxInfo?.streamIp ?? '',
			stream_port: numberText(this.rxInfo?.streamPort),
			kvm_control_ip: this.rxInfo?.kvmControlIp ?? '',
			kvm_control_port: numberText(this.rxInfo?.kvmControlPort),
			discovered_devices: this.devices
				.map((device) => `${device.host} ${device.role} ${numberText(device.channelId)} ${device.deviceName}`.trim())
				.join(', '),
			discovered_count: String(this.devices.length),
		})
	}

	async start(): Promise<void> {
		this.stopPolling()
		this.updateStatus(InstanceStatus.Connecting)
		if (this.config.autoDiscover || this.config.rxSelectionMode === 'discovered') await this.discover()

		const rxHost = this.getEffectiveRxHost()
		if (!rxHost) {
			this.isReady = false
			this.lastError = 'Receiver host is not configured or discovered'
			this.updateStatus(InstanceStatus.BadConfig, this.lastError)
			this.updateVariables()
			return
		}

		await this.refreshStatus()
		this.startPolling()
	}

	startPolling(): void {
		this.stopPolling()
		const interval = Math.max(500, Number(this.config.pollIntervalMs ?? 2000))
		this.pollTimer = setInterval(() => {
			void this.refreshStatus()
		}, interval)
	}

	stopPolling(): void {
		if (this.pollTimer) clearInterval(this.pollTimer)
		this.pollTimer = undefined
	}

	async refreshStatus(): Promise<void> {
		try {
			const rxHost = this.getEffectiveRxHost()
			if (!rxHost) throw new Error('Receiver host is not configured or discovered')
			this.lastCommand = 'get_device_info_proav'
			this.rxInfo = await getDeviceInfo(rxHost, Number(this.config.requestTimeoutMs ?? 3000))
			this.lastResponse = `${this.rxInfo.productName} channel ${numberText(this.rxInfo.channelId)}`.trim()
			this.isReady = true
			this.lastError = ''
			this.updateStatus(InstanceStatus.Ok)
		} catch (error) {
			this.isReady = false
			this.lastError = error instanceof Error ? error.message : String(error)
			this.updateStatus(InstanceStatus.ConnectionFailure, this.lastError)
		}
		this.updateVariables()
		this.checkFeedbacks('connected', 'active_channel', 'hdmi_active')
	}

	async discover(): Promise<void> {
		try {
			this.lastCommand = `discover ${this.config.discoverySubnet}`
			this.devices = await discoverDevices(
				this.config.discoverySubnet || '192.168.96.0/24',
				Number(this.config.requestTimeoutMs ?? 3000),
			)
			this.lastResponse = `Discovered ${this.devices.length} device(s)`
			this.lastError = ''
		} catch (error) {
			this.lastError = error instanceof Error ? error.message : String(error)
		}
		this.updateVariables()
		this.updateActions()
		this.updateFeedbacks()
		this.updatePresets()
		this.checkFeedbacks('active_channel')
	}

	async setChannel(channelId: number): Promise<void> {
		if (!Number.isInteger(channelId) || channelId < 0 || channelId > 255) {
			throw new Error('Channel ID must be between 0 and 255')
		}
		const rxHost = this.getEffectiveRxHost()
		if (!rxHost) throw new Error('Receiver host is not configured or discovered')
		this.lastCommand = `set_channel_id ${channelId}`
		await setReceiverChannel(
			rxHost,
			channelId,
			this.config.password ?? '',
			Number(this.config.requestTimeoutMs ?? 3000),
		)
		await new Promise((resolve) => setTimeout(resolve, 300))
		await this.refreshStatus()
	}

	async setName(host: string, assignedName: string): Promise<void> {
		const cleanHost = host.trim()
		const cleanName = assignedName.trim()
		if (!cleanHost) throw new Error('Device host is required')
		if (!cleanName) throw new Error('Assigned name is required')
		this.lastCommand = `set_assigned_name ${cleanHost} ${cleanName}`
		await setAssignedName(
			cleanHost,
			cleanName,
			this.config.password ?? '',
			Number(this.config.requestTimeoutMs ?? 3000),
		)
		await this.discover()
		if (cleanHost === this.getEffectiveRxHost()) await this.refreshStatus()
	}

	async setRemoteDeviceChannel(host: string, channelId: number): Promise<void> {
		const cleanHost = host.trim()
		if (!cleanHost) throw new Error('Device host is required')
		if (!Number.isInteger(channelId) || channelId < 0 || channelId > 255) {
			throw new Error('Channel ID must be between 0 and 255')
		}
		this.lastCommand = `set_channel_id ${cleanHost} ${channelId}`
		await setDeviceChannel(
			cleanHost,
			channelId,
			this.config.password ?? '',
			Number(this.config.requestTimeoutMs ?? 3000),
		)
		await this.discover()
		if (cleanHost === this.getEffectiveRxHost()) await this.refreshStatus()
	}
}

runEntrypoint(ModuleInstance, UpgradeScripts)
