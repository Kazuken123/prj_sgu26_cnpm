import { test } from 'node:test';
import assert from 'node:assert/strict';
import { breadcrumbFor } from '../src/components/InternalNavigation.tsx';

const labels = path => breadcrumbFor(path).map(crumb => crumb.label);

test('every internal section maps to its group and page label', () => {
  assert.deepEqual(labels('/internal/today'), ['Tổng quan', 'Bảng điều khiển']);
  assert.deepEqual(labels('/internal/cash'), ['Quầy vé', 'Thu ngân']);
  assert.deepEqual(labels('/internal/reissue'), ['Quầy vé', 'Cấp lại vé']);
  assert.deepEqual(labels('/internal/knowledge'), ['Nội dung', 'Kho tri thức']);
  assert.deepEqual(labels('/internal/audit-logs'), ['Hệ thống', 'Lịch sử thao tác']);
  assert.deepEqual(labels('/internal/account'), ['Cá nhân', 'Tài khoản']);
});
test('nested POI and tour routes add detail, create and edit crumbs with working links', () => {
  assert.deepEqual(labels('/internal/pois/new'), ['Nội dung', 'Điểm tham quan', 'Thêm mới']);
  assert.deepEqual(labels('/internal/pois/12'), ['Nội dung', 'Điểm tham quan', 'Chi tiết #12']);
  const edit = breadcrumbFor('/internal/pois/12/edit');
  assert.deepEqual(edit.map(c => c.label), ['Nội dung', 'Điểm tham quan', '#12', 'Chỉnh sửa']);
  assert.equal(edit[1].to, '/internal/pois'); assert.equal(edit[2].to, '/internal/pois/12');
  assert.equal(breadcrumbFor('/internal/tours/3/edit')[2].to, undefined, 'tours have no detail page to link to');
});
test('the staff creation page is not labelled as a generic "new" record and unknown paths yield no trail', () => {
  assert.deepEqual(labels('/internal/staff/new'), ['Hệ thống', 'Thêm nhân viên']);
  assert.deepEqual(labels('/internal/unknown'), []);
  assert.deepEqual(labels('/internal/cashier'), [], 'prefix match requires a path boundary');
});
