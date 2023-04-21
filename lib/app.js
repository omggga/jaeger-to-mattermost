// my-jaeger-app.js

import fetch from 'node-fetch'
import { config } from 'dotenv'

config()

const MATTERMOST_WEBHOOK_URL = process.env.MATTERMOST_WEBHOOK_URL
const API_URL = process.env.JAEGAR_API_URL

const defaults = {
	start: new Date().getTime(),
	backInverval: 5 * 60000,
	requestInveval: 5 * 60000
}

async function fetchJaegerData(options){
	const options = { ...defaults, ...options }

	const interval = setInterval(async () => { await _fetchJaegerData(options) }, options.requestInterval)
	return interval
}

async function _fetchJaegerData(options) {
	try {
		const requestUrl = `${API_URL}&start=${(options.start - options.backInverval) * 1000}`
		const response = await fetch(requestUrl)
		if (!response.ok) {
			throw new Error(`Error! [${response.status}]:${response.statusText}`)
		}
		const data = await response.json()
		console.log(data)

		if (data.length > 0) {
			const message = {
				text: `Jaeger traces found at ${new Date(start / 1000)}:\n${JSON.stringify(data, null, 2)}`
			}

			const mattermostResponse = await fetch(MATTERMOST_WEBHOOK_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(message)
			})
			if (!mattermostResponse.ok) {
				throw new Error(`Error! [${mattermostResponse.status}]:${mattermostResponse.statusText}`)
			}
		}

		options.start += 5 * 60000
	} catch (error){
		throw new Error(error)
	}
}

export default fetchJaegerData
