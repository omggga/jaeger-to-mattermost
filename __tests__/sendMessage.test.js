import { jest } from '@jest/globals'

const url = 'http://example.com'
process.env.MATTERMOST_WEBHOOK_URL = url

let sendMessage

describe('sendMessage', () => {
  beforeEach(async () => {
    ({ sendMessage } = await import('../lib/app.mjs'));
    global.fetch = jest.fn();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  test('does not throw when response is ok', async () => {
    fetch.mockResolvedValue({ ok: true });
    await expect(sendMessage({ text: 'hi' })).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledWith(url, expect.objectContaining({ method: 'POST' }));
  });

  test('throws when response is not ok', async () => {
    fetch.mockResolvedValue({ ok: false, status: 500, statusText: 'err' });
    await expect(sendMessage({ text: 'hi' })).rejects.toThrow('Mattermost API error: [500] err');
  });
});
