import moment from 'moment'
import fetch from 'node-fetch'
import { config } from 'dotenv'

config()

const MATTERMOST_WEBHOOK_URL = process.env.MATTERMOST_WEBHOOK_URL
const API_URL = process.env.JAEGAR_API_URL
const MATTERMOST_CHANNEL_ID = process.env.MATTERMOST_CHANNEL_ID
const JAEGAR_DOMAIN_URL = process.env.JAEGAR_DOMAIN_URL

const traceIdStorage = new Map()
const previousErrors = new Map()
let previousErrorsArray = []

const defaults = {
	backInverval: 2 * 60000,
	requestInterval: 1 * 60000,
	limit: 5 //Prevent spam when there is a lot of errors
}
defaults.start = new Date().getTime() - defaults.backInverval

async function fetchJaegerData(opts){
	const options = { ...defaults, ...opts }
	await _fetchJaegerData(options)
	return _fetchInterval(options)
}

function _fetchInterval(options){
	const interval = setInterval(async () => {
		console.log(`[${moment().add(3, 'hours').format('DD.MM.YYYY HH:mm:ss')}] Checking messages.`)
		await _fetchJaegerData(options)
		options.start = new Date().getTime() - options.backInverval
	}, options.requestInterval)
	return interval
}

async function _fetchJaegerData(options) {
	try {
		const requestUrl = `${API_URL}&start=${options.start * 1000}&limit=${options.limit}`
		const response = await fetch(requestUrl)
		if (!response.ok) {
			throw new Error(`Error! [${response.status}]:${response.statusText}`)
		}
		const data = await response.json()
		let isOverLimit = false

		if (data?.data.length > 0) {
			let sentCount = 0
			if (data.data.length > options.limit) {
				isOverLimit = true
			}

			for await(let error of data.data){
				const errorData = {
					traceID: error.traceID.toLowerCase()
				}
				if (traceIdStorage.get(errorData.traceID)) {
					console.log(`Found same traceID: ${errorData.traceID}, skip.`)
					continue
				}

				const errorItemList = error?.spans.filter(obj => obj.tags.some(tag => tag.key === 'error' && tag.value === true))
				if (errorItemList?.length > 0){
					const errObj = errorItemList[0]
					errorData.date = moment(errObj.startTime/1000).add(3, 'hours').format('DD.MM.YYYY HH:mm:ss')
					errorData.type = errObj.operationName
					const errorMessage = errObj.logs[0].fields.find(obj => obj.key === 'message')
					errorData.errorMessage = errorMessage.value
					const errorStack = errObj.logs[0].fields.find(obj => obj.key === 'stack')
					errorData.stack = errorStack.value
					const uuid = errObj.tags.find(obj => obj.key === 'uuid')
					errorData.uuid = uuid.value.toLowerCase()
				} else {
					console.log(`Trace do not contains any error messages. Invalid trace?`)
					continue
				}
				
				if (previousErrors.get(errorData.uuid)) {
					console.log(`Found same UUID: ${errorData.uuid}, skip.`)
					continue
				}
				if (isSameError(errorData)) continue

				const message = {
					channel_id: MATTERMOST_CHANNEL_ID,
					attachments: [
						{
							fallback: `${errorData.type}:\n ${errorData.errorMessage}`,
							color: "#d11111",
							title: `${errorData.type}`,
							title_link: `${JAEGAR_DOMAIN_URL}/trace/${errorData.traceID}`,
							text: `__${errorData.date}__\n\r${errorData.errorMessage}`,
							fields: [
								{
									short: false,
									value: "```\n" + errorData.stack + "\n```"
								}
							]
						}
					]
				}

				if (sentCount < options.limit) {
					await sendMessage(message)
				}
				sentCount++
				traceIdStorage.set(errorData.traceID)
				if (errorData.uuid){
					previousErrors.set(errorData.uuid)
				}
			}

			console.log(`Sent ${sentCount} messages.`)

			if (isOverLimit){
				const message = {
					text: 'Attention! More than 5 error messages have been registered, but only the first five have been sent. There may be technical issues with the server.'
				}
				await sendMessage(message)
			}
		}
	} catch (error){
		throw new Error(error)
	}
}

function isSameError(error){
	let isTrue = false
	const currentTime = moment()

	for (const err of previousErrorsArray) {
		const oneHourAgo = currentTime.subtract(1, 'hour')
		const isOlderThanOneHour = moment(err.creationDate).isBefore(oneHourAgo)
		if (isOlderThanOneHour){
			const index = previousErrorsArray.indexOf(err)
			previousErrorsArray.splice(index, 1)
			continue
		}
		if (
			err.type === error.type &&
			err.errorMessage === error.errorMessage ||
			err.stack === error.stack) {
				console.log('Got the same stack trace for error, skip.')
				isTrue = true
				break
		}
	}

	error.creationDate = moment()
	previousErrorsArray.push(error)
	if (previousErrorsArray.length > 5){
		previousErrorsArray = previousErrorsArray.slice(1)
	}

	return isTrue
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
