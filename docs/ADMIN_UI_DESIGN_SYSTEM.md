# Hệ thống thiết kế giao diện quản trị (ADMIN)

Áp dụng cho toàn bộ `/internal/*`. Giao diện khách (`.visitor-shell`) **không** dùng và **không** bị ảnh hưởng.

## Nguyên tắc cô lập

- CSS nằm trong `frontend/src/internal.css`. Mọi quy tắc đều dưới `.internal-workspace` hoặc dùng tiền tố riêng của phân hệ quản trị (`adm-`, `ops-`, `analytics-`, `knowledge-`).
- Class dùng chung với trang khách (`tcv-card`, `btn-primary`, `panel`, `status-pill`…) chỉ được re-skin **dưới** `.internal-workspace`.
- Thành phần React dùng chung của admin: `frontend/src/components/admin/AdminUI.tsx`. Trang khách không import module này.
- `Icon.tsx` chỉ được **bổ sung** icon mới; không sửa icon đang dùng.

## Token

| Nhóm | Token chính |
|---|---|
| Nền / bề mặt | `--adm-bg`, `--adm-surface`, `--adm-surface-2`, `--adm-surface-3` |
| Viền | `--adm-border`, `--adm-border-strong` |
| Chữ | `--adm-text`, `--adm-text-2`, `--adm-text-3` |
| Thương hiệu | `--adm-brand`, `--adm-brand-hover`, `--adm-brand-50`, `--adm-brand-100`, `--adm-brand-700` |
| Trạng thái | `--adm-success*`, `--adm-warning*`, `--adm-danger*`, `--adm-info*` (mỗi nhóm có màu chữ, nền `-bg`, viền `-border`) |
| Chữ | `--adm-font` (Plus Jakarta Sans), `--adm-mono`; cỡ `--adm-fs-xs` 12 → `--adm-fs-2xl` 26 |
| Khoảng cách | lưới 4px: `--adm-s1` 4 … `--adm-s10` 40 |
| Bo góc / bóng | `--adm-r-sm/md/lg/xl`, `--adm-shadow-xs/sm/lg`, `--adm-ring` (focus) |

## Bố cục

- `InternalNavigation` render **sidebar** (`.adm-sidebar`) và **topbar** (`.adm-topbar`). Khi đã đăng nhập, `.internal-workspace:has(> .adm-sidebar)` chuyển thành lưới hai cột.
- Nhóm điều hướng: Tổng quan · Quầy vé · Nội dung thuyết minh · Quản lý hệ thống (chỉ ADMIN). Mục chỉ dành cho ADMIN bị ẩn với STAFF; route vẫn được `InternalProtectedRoute` và backend bảo vệ.
- Topbar: breadcrumb (`breadcrumbFor(pathname)`), tài khoản, đăng xuất. Tiêu đề tab trình duyệt theo trang hiện tại.
- ≤ 1024px: sidebar thành ngăn kéo (`.is-open`), nút menu có `aria-expanded`, đóng bằng Esc, lớp phủ hoặc khi chuyển trang.
- Đường dẫn `/internal/*` không tồn tại hiển thị `InternalNotFoundPage`.

## Thành phần (`AdminUI.tsx`)

| Thành phần | Dùng khi |
|---|---|
| `AdminPage` (`width`: default / narrow / wide) | Khung trang |
| `PageHeader` (`eyebrow`, `title`, `description`, `actions`) | Đầu trang |
| `Card` (`title`, `description`, `actions`, `flush`) | Khối nội dung; `flush` cho bảng có toolbar |
| `StatCard` / `button.adm-stat` | Chỉ số KPI; bản button có `aria-pressed` để lọc |
| `Badge`, `StatusBadge`, `toneForStatus` | Nhãn trạng thái thống nhất (PAID/ACTIVE → success, PENDING → warning, FAILED/REVOKED → danger…) |
| `Alert` (`tone`, `onDismiss`, `action`) | Thông báo; `danger` dùng `role="alert"`, còn lại `role="status"` |
| `Field` (`label`, `hint`, `error`, `required`) | Ô nhập: nhãn gắn `htmlFor`, lỗi thay thế gợi ý |
| `DescriptionList` | Cặp nhãn / giá trị |
| `Pagination` | Phân trang, tự khóa nút đầu/cuối |
| `EmptyState`, `LoadingState` | Trạng thái rỗng / đang tải |
| `ConfirmDialog` (`tone`, `busy`) | Xác nhận thao tác quan trọng thay cho `window.confirm` |

Class tiện ích: `adm-btn` (+ `--primary/--secondary/--ghost/--danger/--danger-soft`, `--sm/--lg/--block`), `adm-toolbar`, `adm-search`, `adm-segmented`, `adm-table` (+ `adm-num`, `adm-center`, `adm-actions-cell`), `adm-grid--2/3/4/main-aside`, `adm-form`, `adm-form-grid`, `adm-form-actions`, `adm-steps`.

## Quy ước

- Không dùng màu cứng trong inline style; dùng token (`var(--adm-…)`).
- Mỗi thao tác phá hủy hoặc không hoàn tác (ngừng POI/tài liệu, thu hồi vé) phải qua `ConfirmDialog`.
- Lỗi máy chủ hiển thị thông điệp server và mã hỗ trợ (`code`); không thay số liệu lỗi bằng 0.
- Form dài có cảnh báo khi rời trang chưa lưu (`useUnsavedChangesGuard`).
- Ô nhập 16px trên màn hình ≤ 720px (tránh iOS zoom); tôn trọng `prefers-reduced-motion`.

## Thêm trang quản trị mới

1. Tạo trang trong `frontend/src/pages/Internal*.tsx`, bọc bằng `AdminPage` + `PageHeader`.
2. Thêm route trong `App.tsx` với `InternalProtectedRoute` (`requireAdmin` nếu cần).
3. Thêm mục vào `groups` và `sections` của `InternalNavigation.tsx` để có sidebar, breadcrumb và tiêu đề tab.
4. Viết test trong `frontend/test/` (react-test-renderer) cho phân quyền và trạng thái lỗi.
