# jaeger-to-mattermost

A small Node.js service that polls Jaeger for new error traces and posts them to a Mattermost channel.

## Requirements

* Node.js 20 or Docker
* A running Jaeger instance
* A Mattermost incoming webhook

## Installation

### Docker

```bash
docker build . -t jaeger-to-mattermost
# Set the environment variables listed below and run
# Example:
# docker run -d --env-file .env -p 3005:3005 jaeger-to-mattermost
```

### Node.js

```bash
npm install
```

Create a `.env` file with the variables shown in the [Configuration](#configuration) section and start the service:

```bash
node ./index.mjs
```

## Usage

The service exposes a simple HTTP API (default port `3005`).

* `GET /start` – begin polling Jaeger and sending messages
* `GET /stop` – stop polling

You may also check the root endpoint `GET /` for a simple status message.

## Configuration

The service relies on the following environment variables:

```
MATTERMOST_WEBHOOK_URL  - URL of your Mattermost incoming webhook
JAEGAR_API_URL          - Jaeger API URL (query must include service and tags)
JAEGAR_DOMAIN_URL       - Base URL to Jaeger UI (used in message links)
MATTERMOST_CHANNEL_ID   - Channel ID used by the webhook
PORT                    - (optional) HTTP port, default is 3005
```

Additional runtime options are defined in `lib/app.mjs`:

```javascript
start: Date.now() - backInterval, // initial timestamp to query from
backInterval: 2 * 60000,          // how far back to look for traces
requestInterval: 1 * 60000,       // how often to query Jaeger
limit: 5                          // maximum number of messages per cycle
```

## Testing

Run the unit tests with:

```bash
npm test
```

## Contributing

1. Fork this repository
2. Create your feature branch: `git checkout -b my-feature`
3. Commit your changes: `git commit -am 'Add my feature'`
4. Push to the branch: `git push origin my-feature`
5. Open a pull request

## License

This project is licensed under the [MIT License](LICENSE).
