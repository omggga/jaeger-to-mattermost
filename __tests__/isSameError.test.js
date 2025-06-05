import { isSameError } from '../lib/app.mjs';

function makeError(msg) {
  return { type: 'Error', errorMessage: msg, stack: msg };
}

test('deduplicates errors and limits history to five entries', () => {
  expect(isSameError(makeError('first'))).toBe(false);
  expect(isSameError(makeError('first'))).toBe(true);

  for (let i = 2; i <= 5; i++) {
    expect(isSameError(makeError(`e${i}`))).toBe(false);
  }

  expect(isSameError(makeError('e6'))).toBe(false);
  expect(isSameError(makeError('first'))).toBe(false);
});

