import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { create, act } from 'react-test-renderer';
import { VisitorPoiPhoto, resolveVisitorPhoto } from '../src/components/VisitorPoiPhoto.tsx';
import { POI_PHOTOS } from '../src/data/poiPhotos.ts';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const props = { originalName: 'Hươu cao cổ', name: 'Giraffe', avatarUrl: null, category: 'ANIMAL' };
async function mount(t, overrides = {}) {
  let view;
  await act(async () => { view = create(React.createElement(VisitorPoiPhoto, { ...props, ...overrides })); });
  t.after(async () => { await act(async () => view.unmount()); });
  return view;
}

test('giraffe illustration uses the stable original name across all translated display names', () => {
  const selected = resolveVisitorPhoto('Hươu cao cổ', null);
  assert.match(selected.thumbnail, /giraffe-thumb\.webp$/);
  assert.match(selected.detail, /giraffe-detail\.webp$/);
  assert.match(resolveVisitorPhoto('Voi châu Á', null).detail, /elephant-detail\.webp$/);
  assert.equal(resolveVisitorPhoto('Điểm chưa có trong bộ ảnh', null), null);
  assert.equal(resolveVisitorPhoto('Giraffe', null), null, 'a translated title is not an authoritative POI identity');
});
test('an explicit image from the API takes precedence without borrowing illustration attribution', () => {
  const selected = resolveVisitorPhoto('Hươu cao cổ', '/approved-real-photo.webp');
  assert.equal(selected.thumbnail, '/approved-real-photo.webp');
  assert.equal(selected.credit, null);
});
test('thumbnail is lazy, reserves dimensions and labels the species illustration truthfully', async t => {
  const view = await mount(t);
  const img = view.root.findByType('img');
  assert.equal(img.props.loading, 'lazy');
  assert.equal(img.props.width, 128);
  assert.equal(img.props.height, 192);
  assert.match(img.props.alt, /Ảnh minh họa loài: Giraffe/);
});
test('species detail keeps attribution and source while omitting the two removed UI phrases', async t => {
  const view = await mount(t, { variant: 'detail' });
  const text = JSON.stringify(view.toJSON());
  assert.match(text, /Stano Novak/);
  assert.match(text, /CC BY 2.5/);
  assert.match(text, /Ảnh minh họa loài/);
  assert.doesNotMatch(text, /không xác nhận cá thể tại Thảo Cầm Viên|đã thu nhỏ\/nén WebP/);
  assert.ok(view.root.findAllByType('a').some(a => a.props.href === 'https://commons.wikimedia.org/wiki/File:Giraffe_01.jpg'));
  assert.ok(view.root.findAllByType('a').some(a => a.props.href === '/images/pois/SOURCES.md'));
});
test('image failure leaves a usable icon and a changed API source can recover', async t => {
  const view = await mount(t);
  await act(async () => view.root.findByType('img').props.onError());
  assert.equal(view.root.findAllByType('img').length, 0);
  assert.equal(view.root.findAllByType('svg').length, 1);
  await act(async () => view.update(React.createElement(VisitorPoiPhoto, { ...props, avatarUrl: '/updated.webp' })));
  assert.equal(view.root.findByType('img').props.src, '/updated.webp');
});
test('failed detail image reports the failure without removing the surrounding POI content', async t => {
  const view = await mount(t, { variant: 'detail' });
  await act(async () => view.root.findByType('img').props.onError());
  assert.match(JSON.stringify(view.toJSON()), /vẫn có thể đọc giới thiệu/);
  assert.equal(view.root.findByType('p').props.role, 'status');
});

test('all ten approved original names have separate thumbnail/detail assets and stable translated names', async t => {
  const expected = ['Hươu cao cổ','Voi châu Á','Hà mã','Tê giác trắng','Trầm hương','Ngọc lan','Trám trắng','Cát anh','Bảo tàng Động–Thực vật','Quán Nhan Hương'];
  assert.deepEqual(Object.keys(POI_PHOTOS), expected);
  for (const originalName of expected) {
    const photo = resolveVisitorPhoto(originalName, null);
    assert.ok(photo);
    assert.notEqual(photo.thumbnail,photo.detail);
    const view = await mount(t,{originalName,name:'Translated POI title'});
    assert.equal(view.root.findByType('img').props.src, photo.thumbnail);
    assert.match(view.root.findByType('img').props.alt,/Translated POI title/);
  }
});

for (const originalName of ['Bảo tàng Động–Thực vật','Quán Nhan Hương']) {
  test('place photo omits author/license UI without labelling it as a species illustration: '+originalName, async t => {
    const view = await mount(t,{originalName,name:originalName,variant:'detail'});
    const text = JSON.stringify(view.toJSON());
    assert.match(text,/Ảnh tư liệu địa điểm/);
    assert.doesNotMatch(text,/Ảnh minh họa loài|CC BY|đã thu nhỏ|không xác nhận cá thể/);
    assert.equal(resolveVisitorPhoto(originalName,null).credit,null);
    assert.deepEqual(view.root.findAllByType('a').map(a=>a.props.href),['/images/pois/SOURCES.md']);
  });
}

test('all packaged photos are real WebP, within the size budget, with credits and source records', () => {
  const base = new URL('../public',import.meta.url);
  const manifest = JSON.parse(readFileSync(new URL('../public/images/pois/manifest.json',import.meta.url),'utf8'));
  assert.equal(manifest.photos.length,10);
  let total=0;
  for (const [name,photo] of Object.entries(POI_PHOTOS)) {
    const record=manifest.photos.find(item=>item.poiName===name);
    assert.ok(record?.source?.startsWith('https://'));
    if(photo.credit) { assert.ok(photo.credit.author); assert.ok(photo.credit.licenseUrl.startsWith('https://')); }
    for(const size of ['thumbnail','detail']) {
      const asset=photo[size], bytes=readFileSync(fileURLToPath(new URL('.'+asset.src,base.href+'/')));
      assert.equal(bytes.toString('ascii',0,4),'RIFF');
      assert.equal(bytes.toString('ascii',8,12),'WEBP');
      assert.equal(bytes.length,asset.bytes);
      assert.ok(bytes.length<350000);
      total+=bytes.length;
    }
  }
  assert.ok(total<1500000);
});
