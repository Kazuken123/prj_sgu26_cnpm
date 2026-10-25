import { test } from 'node:test';
import assert from 'node:assert/strict';
import { visitorMarkerHtml, handleMarkerPhotoError } from '../src/components/visitorMapMarker.ts';
import { POI_PHOTOS } from '../src/data/poiPhotos.ts';

const poi = { originalName: 'Hươu cao cổ', category: 'ANIMAL', avatarUrl: null, text: { name: 'Giraffe' } };

test('map markers use the same species and place thumbnails as the directory across translations', () => {
  for (const [originalName, photo] of Object.entries(POI_PHOTOS)) {
    const html = visitorMarkerHtml({ ...poi, originalName });
    assert.ok(html.includes(`src="${photo.thumbnail.src}"`));
    assert.ok(html.includes(`${photo.label}: Giraffe`));
    assert.ok(html.includes('width="38" height="38"'));
  }
});

test('API photo wins and unrecognized locations retain their category marker', () => {
  const custom = visitorMarkerHtml({ ...poi, avatarUrl: '/approved-photo.webp' });
  assert.ok(custom.includes('src="/approved-photo.webp"'));
  assert.ok(!custom.includes('Ảnh minh họa loài'));
  for (const category of ['ANIMAL', 'PLANT', null]) {
    const html = visitorMarkerHtml({ ...poi, originalName: 'Unknown', category });
    assert.ok(!html.includes('<img'));
    assert.ok(html.includes('<svg'));
  }
});

test('POI names and image attributes cannot inject HTML into a map marker', () => {
  const html = visitorMarkerHtml({ ...poi, avatarUrl: '/photo.webp" onerror="bad()', text: { name: '<img src=x onerror=bad()>' } });
  assert.ok(html.includes('/photo.webp&quot; onerror=&quot;bad()'));
  assert.ok(html.includes('alt="&lt;img src=x onerror=bad()&gt;"'));
  assert.equal((html.match(/<img /g) || []).length, 1);
});

test('a broken marker photo is removed to reveal the icon without removing the clickable marker', () => {
  let callback, removed = false;
  const image = { addEventListener(event, listener, options) {
    assert.equal(event, 'error'); assert.equal(options.once, true); callback = listener;
  }, remove() { removed = true; } };
  handleMarkerPhotoError({ getElement: () => ({ querySelector: () => image }) });
  assert.equal(removed, false);
  callback();
  assert.equal(removed, true);
  assert.doesNotThrow(() => handleMarkerPhotoError({}));
  assert.doesNotThrow(() => handleMarkerPhotoError({ getElement: () => ({ querySelector: () => null }) }));
});
