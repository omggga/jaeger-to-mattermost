import express from 'express'
import jaegerToMattermost from './lib/app.mjs'

const app = express()
let timer

app.get('/', (req, res) => {
	res.send('Hello, Jaeger-to-Mattermost!')
})

app.get('/start', async (req, res) => {
	timer = await jaegerToMattermost()
	res.send('Starting service...')
})

app.get('/stop', (req, res) => {
	clearTimeout(timer)
	res.send('Service has been stopped.')
})

app.use((err, req, res, next) => {
	res.status(500).send('Internal Server Error')
})

const port = process.env.PORT || 3005
app.listen(port, () => {
	console.log(`Server listening on port ${port}...`)
});
