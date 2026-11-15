import assert from 'node:assert/strict';
import test from 'node:test';

const resources = [{ testId: 'resource-academic', href: '/academic' }];
function getByTestId(id) {
  const resource = resources.find(resource => resource.testId === id);
  assert.ok(resource, `Missing ${id}`);
  return resource;
}
test('academic resource exists', () => {
  const resource = getByTestId('resource-academic');
  assert.equal(resource.testId, 'resource-academic');
});
