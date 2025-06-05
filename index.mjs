import express from 'express'
import jaegerToMattermost from './lib/app.mjs'

const app = express()
let timer

app.get('/', (_req, res) => res.send('Hello, Jaeger-to-Mattermost!'))

app.get('/start', async (_req, res) => {
  timer = await jaegerToMattermost()
  res.send('Starting service...')
})

app.get('/stop', (_req, res) => {
  clearTimeout(timer)
  res.send('Service has been stopped.')
})

/* eslint-disable-next-line no-unused-vars */
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).send('Internal Server Error')
})

const port = process.env.PORT || 3005
app.listen(port, () => console.log(`Server listening on port ${port}...`))
