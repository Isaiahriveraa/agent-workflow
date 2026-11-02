import assert from 'node:assert/strict';
import test from 'node:test';

// Production renderer; the tests below use its public HTML output.
export function renderResource(title) {
  return `<a data-testid="resource-academic" href="/academic">${title}</a>`;
}

function getByTestId(html, id) {
  const match = html.match(new RegExp(`<a [^>]*data-testid="(${id})" href="([^"]+)">([^<]+)</a>`));
  assert.ok(match, `Missing resource ${id}`);
  return { testId: match[1], href: match[2], text: match[3] };
}

test('resource displays the supplied title and destination', () => {
  const resource = getByTestId(renderResource('Academic support'), 'resource-academic');
  assert.equal(resource.testId, 'resource-academic');
  assert.equal(resource.text, 'Academic support');
  assert.equal(resource.href, '/academic');
});

// Hardener addition: no migration or compatibility requirement for these tokens.
test('old card implementation is absent', () => {
  const html = renderResource('Academic support');
  assert.ok(!html.includes('card--open'));
  assert.ok(!html.includes('card-content'));
});
