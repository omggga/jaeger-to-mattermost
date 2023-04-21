// my-jaeger-app.js

import moment from 'moment'
import fetch from 'node-fetch'
import { config } from 'dotenv'

config()

const MATTERMOST_WEBHOOK_URL = process.env.MATTERMOST_WEBHOOK_URL
const API_URL = process.env.JAEGAR_API_URL

const defaults = {
	start: new Date().getTime(),
	backInverval: 5 * 60000,
	requestInterval: 5 * 60000,
	limit: 5 //Prevent spam when there is a lot of errors
}

async function fetchJaegerData(opts){
	const options = { ...defaults, ...opts }
	await _fetchJaegerData(options)
	return _fetchInterval(options)
}

function _fetchInterval(options){
	const interval = setInterval(async () => {
		console.log(`[${moment().format('DD.MM.YYYY HH:mm:ss')}] Checking messages...`)
		await _fetchJaegerData(options)
		options.start += options.backInverval
	}, options.requestInterval)
	return interval
}

async function _fetchJaegerData(options) {
	try {
		const requestUrl = `${API_URL}&start=${(options.start - options.backInverval) * 1000}&limit=${options.limit}`
		const response = await fetch(requestUrl)
		if (!response.ok) {
			throw new Error(`Error! [${response.status}]:${response.statusText}`)
		}
		const data = await response.json()
		let isOverLimit = false

		if (data?.data.length > 0) {
	
			if (data.data.length > options.limit) {
				isOverLimit = true
			}
			for await(let error of data.data){
				const errorData = {
					traceID: error.traceID
				}
				const errorItemList = error?.spans.filter(obj => obj.tags.some(tag => tag.key === 'error' && tag.value === true))
				if (errorItemList?.length > 0){
					const errObj = errorItemList[0]
					errorData.date = moment(errObj.startTime/1000).format('DD.MM.YYYY HH:mm:ss')
					errorData.type = errObj.operationName
					const errorMessage = errObj.logs[0].fields.find(obj => obj.key === 'message')
					errorData.errorMessage = errorMessage.value
					const errorStack = errObj.logs[0].fields.find(obj => obj.key === 'stack')
					errorData.stack = errorStack.value
				}
				const message = {
					channel_id: '1a4odz5ybbyzzdk4rx7u3as6kh',
					attachments: [
						{
							color: "#d11111",
							title: `[${errorData.date}] ${errorData.type}`,
							title_link: `http://tracing.frsd.ru:16686/trace/${errorData.traceID}`,
							text: `${errorData.errorMessage}`,
							fields: [
								{
									short: false,
									title: "Stack trace",
									value: errorData.stack
								}
							]
						}
					]
				}

				await sendMessage(message)
			}

			console.log(`Sent ${data.data.length > options.limit? options.limit+1 : data.data.length} messages.`)

			if (isOverLimit){
				const message = {
					text: 'Внимание! Во избежание спама показаны только первые 5 ошибок!'
				}
				await sendMessage(message)
			}
		}
	} catch (error){
		throw new Error(error)
	}
}

async function sendMessage(message) {
	const response = await fetch(MATTERMOST_WEBHOOK_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(message)
	})
	if (!response.ok) {
		throw new Error(`Error! [${response.status}]:${response.statusText}`)
	}
}

export default fetchJaegerData
