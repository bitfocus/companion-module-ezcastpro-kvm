import http from 'node:http'
import { isIPv4 } from 'node:net'
import crypto from 'node:crypto'

export interface CmsResponse<T = unknown> {
	jsonrpc: '2.0'
	id: number
	result?: T
	error?: {
		code?: number
		message?: string
		data?: unknown
	}
}

export interface DeviceInfo {
	dev_name?: string
	product_name?: string
	model?: string
	version?: string
	lan_ip_addr?: string
	lan_mac_addr?: string
	channel_id?: number
	resolution?: string
	hdmi?: number
	hdmi_video?: number
	display_mode?: number
	swsp_mode?: string
	linkInNum?: number
	capability?: Record<string, { enable?: boolean; range?: string }>
}

export interface DeviceDescription {
	host: string
	role: 'rx' | 'tx' | 'unknown'
	deviceName: string
	productName: string
	model: string
	version: string
	ip: string
	mac: string
	channelId?: number
	resolution: string
	hdmi?: number
	hdmiVideo?: number
	streamIp?: string
	streamPort?: number
	kvmControlIp?: string
	kvmControlPort?: number
	conferenceControlIp?: string
}

function multipartBody(fields: Record<string, string>): { boundary: string; body: Buffer } {
	const boundary = `----poekvm-${crypto.randomUUID().replace(/-/g, '')}`
	const chunks: Buffer[] = []
	for (const [name, value] of Object.entries(fields)) {
		chunks.push(Buffer.from(`--${boundary}\r\n`))
		chunks.push(Buffer.from(`Content-Disposition: form-data; name="${name}"\r\n\r\n`))
		chunks.push(Buffer.from(value))
		chunks.push(Buffer.from('\r\n'))
	}
	chunks.push(Buffer.from(`--${boundary}--\r\n`))
	return { boundary, body: Buffer.concat(chunks) }
}

export async function cmsCall<T = unknown>(
	host: string,
	method: string,
	params: Record<string, unknown> = {},
	timeoutMs = 3000,
): Promise<CmsResponse<T>> {
	const payload = JSON.stringify({
		jsonrpc: '2.0',
		method,
		params,
		id: 1,
	})
	const { boundary, body } = multipartBody({ data: payload })

	return new Promise((resolve, reject) => {
		const req = http.request(
			{
				host,
				port: 80,
				path: '/cgi-bin/proav.cgi',
				method: 'POST',
				timeout: timeoutMs,
				headers: {
					'Content-Type': `multipart/form-data; boundary=${boundary}`,
					'Content-Length': body.length,
					'User-Agent': 'companion-module-ezcast-pro-dt214m-am8270-kvm/0.1.0',
				},
			},
			(res) => {
				const chunks: Buffer[] = []
				res.on('data', (chunk: Buffer) => chunks.push(chunk))
				res.on('end', () => {
					const text = Buffer.concat(chunks).toString('utf8')
					try {
						const parsed = JSON.parse(text) as CmsResponse<T>
						if (parsed.error) {
							reject(new Error(parsed.error.message || `CMS error ${parsed.error.code ?? ''}`.trim()))
						} else {
							resolve(parsed)
						}
					} catch (error) {
						reject(new Error(`Invalid CMS response from ${host}: ${String(error)}: ${text.slice(0, 120)}`))
					}
				})
			},
		)
		req.on('timeout', () => req.destroy(new Error(`Request timed out after ${timeoutMs} ms`)))
		req.on('error', reject)
		req.end(body)
	})
}

export function multicastForChannel(
	channel: number,
): Pick<DeviceDescription, 'streamIp' | 'streamPort' | 'conferenceControlIp' | 'kvmControlIp' | 'kvmControlPort'> {
	const group = 100 + channel
	return {
		streamIp: `224.0.200.${group}`,
		streamPort: 12425 + channel,
		conferenceControlIp: `224.0.201.${group}`,
		kvmControlIp: `224.0.202.${group}`,
		kvmControlPort: 12425 + channel + 512,
	}
}

export function describeDevice(host: string, info: DeviceInfo): DeviceDescription {
	const text = `${info.dev_name ?? ''} ${info.product_name ?? ''} ${info.model ?? ''}`.toLowerCase()
	const role = text.includes('rx') ? 'rx' : text.includes('tx') ? 'tx' : 'unknown'
	const channelId = typeof info.channel_id === 'number' ? info.channel_id : undefined
	return {
		host,
		role,
		deviceName: info.dev_name ?? '',
		productName: info.product_name ?? '',
		model: info.model ?? '',
		version: info.version ?? '',
		ip: info.lan_ip_addr ?? host,
		mac: info.lan_mac_addr ?? '',
		channelId,
		resolution: info.resolution ?? '',
		hdmi: info.hdmi,
		hdmiVideo: info.hdmi_video,
		...(channelId === undefined ? {} : multicastForChannel(channelId)),
	}
}

export async function getDeviceInfo(host: string, timeoutMs: number): Promise<DeviceDescription> {
	const response = await cmsCall<DeviceInfo>(host, 'get_device_info_proav', {}, timeoutMs)
	return describeDevice(host, response.result ?? {})
}

export async function setReceiverChannel(
	host: string,
	channelId: number,
	password: string,
	timeoutMs: number,
): Promise<void> {
	await cmsCall(host, 'set_channel_id', { pswd: password, channel_id: channelId }, timeoutMs)
}

export async function setAssignedName(
	host: string,
	assignedName: string,
	password: string,
	timeoutMs: number,
): Promise<void> {
	await cmsCall(host, 'set_assigned_name', { pswd: password, assigned_name: assignedName }, timeoutMs)
}

export async function setDeviceChannel(
	host: string,
	channelId: number,
	password: string,
	timeoutMs: number,
): Promise<void> {
	await cmsCall(host, 'set_channel_id', { pswd: password, channel_id: channelId }, timeoutMs)
}

function ipv4ToInt(ip: string): number {
	return ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0
}

function intToIpv4(value: number): string {
	return [24, 16, 8, 0].map((shift) => (value >>> shift) & 255).join('.')
}

export function hostsFromCidr(cidr: string): string[] {
	const [base, prefixRaw] = cidr.trim().split('/')
	const prefix = Number(prefixRaw)
	if (!isIPv4(base) || !Number.isInteger(prefix) || prefix < 1 || prefix > 32) return []

	const baseInt = ipv4ToInt(base)
	const mask = prefix === 32 ? 0xffffffff : (0xffffffff << (32 - prefix)) >>> 0
	const network = baseInt & mask
	const broadcast = network | (~mask >>> 0)
	const first = prefix === 32 ? network : network + 1
	const last = prefix === 32 ? network : broadcast - 1
	const hosts: string[] = []
	for (let current = first; current <= last; current += 1) hosts.push(intToIpv4(current))
	return hosts
}

export async function discoverDevices(cidr: string, timeoutMs: number): Promise<DeviceDescription[]> {
	const hosts = hostsFromCidr(cidr)
	const concurrency = 64
	const results: DeviceDescription[] = []
	let index = 0

	async function worker(): Promise<void> {
		for (;;) {
			const host = hosts[index++]
			if (!host) return
			try {
				results.push(await getDeviceInfo(host, timeoutMs))
			} catch {
				// Ignore non-devices and offline hosts.
			}
		}
	}

	await Promise.all(Array.from({ length: Math.min(concurrency, hosts.length) }, async () => worker()))
	return results.sort((a, b) => ipv4ToInt(a.host) - ipv4ToInt(b.host))
}
