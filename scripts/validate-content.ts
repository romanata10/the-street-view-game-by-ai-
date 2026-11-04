import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { CITIES, LOCATIONS, getCityLocations } from '../shared/data';

const root = process.cwd();
assert.ok(CITIES.length >= 8, 'Expected at least eight cities');
assert.ok(LOCATIONS.length >= CITIES.length * 2, 'Every city needs at least two scenes');
assert.equal(new Set(CITIES.map((city) => city.id)).size, CITIES.length, 'City IDs must be unique');
assert.equal(new Set(LOCATIONS.map((location) => location.id)).size, LOCATIONS.length, 'Location IDs must be unique');

for (const city of CITIES) {
  const locations = getCityLocations([city.id]);
  assert.ok(locations.length >= 2, `${city.name}: add at least two locations`);
  assert.ok(city.name.length >= 2 && city.country.length >= 2, `${city.id}: incomplete city card`);
  assert.ok(Math.abs(city.center[0]) <= 90 && Math.abs(city.center[1]) <= 180, `${city.id}: invalid map center`);
  for (const location of locations) {
    assert.ok(location.name.length >= 5, `${location.id}: missing place name`);
    assert.ok(location.hint.length >= 30, `${location.id}: hint is too short`);
    assert.ok(Math.abs(location.lat) <= 85 && Math.abs(location.lng) <= 180, `${location.id}: invalid coordinates`);
    const imagePath = path.join(root, 'public', location.image.replace(/^\//, ''));
    assert.ok(existsSync(imagePath), `${location.id}: missing ${location.image}`);
    assert.ok(statSync(imagePath).size > 10_000, `${location.id}: panorama is empty or too small`);
  }
}

console.log(`✓ Content validated: ${CITIES.length} cities, ${LOCATIONS.length} panoramas, ${new Set(LOCATIONS.map((location) => location.hint)).size} unique hints.`);
