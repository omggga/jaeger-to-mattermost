import express from 'express'
import jaegerToMattermost from './lib/app.js'

const app = express()
let timer

app.get('/', (req, res) => {
	res.send('Hello, Express!')
})

// Stop app from fetching data
app.post('/stop', (req, res) => {
	clearTimeout(timer)
	res.send('Jaeger data fetching stopped!')
})

app.use((err, req, res, next) => {
	res.status(500).send('Internal Server Error')
})

const port = process.env.PORT || 6000
app.listen(port, () => {
	console.log(`Server listening on port ${port}...`)
	const interval = jaegerToMattermost()
	timer = interval
});
