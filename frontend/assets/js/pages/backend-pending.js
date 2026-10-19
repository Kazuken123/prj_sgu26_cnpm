(() => {
  "use strict";
  const ui = window.FoodTourUI;
  // This is the only page-specific configuration for all seven pending screens.
  // Requirements describe capabilities, not invented API URLs or payload contracts.
  const config = {
    cash: {
      title: "Xác nhận thanh toán tiền mặt", roles: ["STAFF", "ADMIN"],
      needs: [
        "API tạo phiên tham quan chờ và tìm/chọn phiên khách đã tạo; trả mã phiên và trạng thái thực tế.",
        "API xác nhận tiền mặt trên chính phiên chờ: giá do server xác định, mã tham chiếu thanh toán, người xác nhận, thời điểm và kết quả chống xác nhận lặp.",
        "Dữ liệu mã ngắn bàn giao cho khách, thời hạn mã, điều kiện đã thanh toán/đã kích hoạt và quy trình đối soát khi mất phản hồi.",
        "Hợp đồng phân quyền STAFF/ADMIN và lỗi phiên không tồn tại, không còn chờ hoặc đã được xác nhận."
      ], actions: ["Tạo phiên chờ", "Tìm phiên", "Xác nhận đã nhận tiền"]
    },
    pois: {
      title: "Quản lý điểm tham quan", roles: ["STAFF", "ADMIN"],
      needs: [
        "API danh sách/chi tiết POI có ID thật, tên, tọa độ, bán kính, ảnh, thứ tự và trạng thái; hợp đồng phân trang nếu có.",
        "API tạo, sửa và ngừng sử dụng POI; nội dung nguồn tiếng Việt, kịch bản đọc và kiểm tra dữ liệu theo trường.",
        "Dữ liệu nội dung theo ngôn ngữ, phiên bản nguồn, trạng thái bản dịch/audio và tác vụ xử lý sau khi lưu.",
        "Chốt quyền sửa trực tiếp bản dịch/audio đã sinh và cách nhập hoặc tải ảnh; chưa tự bổ sung chức năng đó."
      ], actions: ["Tạo POI", "Lưu thay đổi", "Ngừng sử dụng"]
    },
    "content-jobs": {
      title: "Trạng thái xử lý nội dung", roles: ["STAFF", "ADMIN"],
      needs: [
        "API xem tác vụ theo POI/ngôn ngữ: ID tác vụ, phiên bản nguồn, thời điểm cập nhật và lỗi được phép hiển thị.",
        "Trạng thái tác vụ PENDING, PROCESSING, COMPLETED, FAILED và trạng thái riêng của bản dịch/audio.",
        "API yêu cầu xử lý lại tác vụ FAILED thuộc phiên bản hiện hành; kiểm tra quyền, chống gửi lặp và ghi audit.",
        "Quy định chu kỳ tải lại trạng thái, xử lý tác vụ dở dang và lỗi tài nguyên đã đổi phiên bản."
      ], actions: ["Tải trạng thái", "Yêu cầu xử lý lại"]
    },
    tours: {
      title: "Quản lý tour mẫu", roles: ["STAFF", "ADMIN"],
      needs: [
        "API danh sách/chi tiết tour mẫu: ID, tên, mô tả và POI theo thứ tự.",
        "API tạo/sửa tour và thứ tự POI; danh sách POI có thể chọn, quy tắc chống trùng và xử lý POI ngừng hoạt động.",
        "Hợp đồng validation, quyền STAFF/ADMIN và kết quả lưu/ghi audit."
      ], actions: ["Tạo tour", "Lưu thứ tự POI"]
    },
    knowledge: {
      title: "Quản lý kho kiến thức", roles: ["STAFF", "ADMIN"],
      needs: [
        "API danh sách/chi tiết tài liệu: ID, tiêu đề, nội dung, nguồn, trạng thái và phiên bản.",
        "API tạo, sửa và ngừng sử dụng tài liệu với quyền STAFF/ADMIN.",
        "Dữ liệu trạng thái/lỗi xử lý phục vụ truy hồi; xác nhận nội dung cũ bị loại sau khi sửa hoặc ngừng sử dụng.",
        "Hợp đồng lỗi, phân trang và giới hạn dữ liệu; không tự gửi tài liệu đến dịch vụ ngoài từ frontend."
      ], actions: ["Tạo tài liệu", "Lưu tài liệu", "Ngừng sử dụng"]
    },
    audit: {
      title: "Nhật ký thao tác", roles: ["ADMIN"],
      needs: [
        "API chỉ đọc dành cho ADMIN để xem/lọc nhật ký theo thời gian, hành động và trang.",
        "Dữ liệu mã log, người thực hiện (có thể không còn liên kết), tài nguyên, thời điểm và chi tiết được phép hiển thị.",
        "Hợp đồng sắp xếp mới nhất trước, phân trang và validation bộ lọc. Không trả mật khẩu, raw token hay khóa API.",
        "Backend đã ghi audit khi tạo STAFF nhưng chưa có API đọc. Không yêu cầu chức năng sửa/xóa nhật ký."
      ], actions: ["Lọc nhật ký", "Tải nhật ký"]
    },
    monitoring: {
      title: "Thống kê sử dụng hệ thống", roles: ["ADMIN"],
      needs: [
        "API thống kê chỉ dành cho ADMIN; định nghĩa rõ khoảng thời gian, múi giờ, đơn vị và thời điểm cập nhật.",
        "Số phiên trả phí còn hiệu lực, giao dịch thành công và tổng tiền; chống đếm lặp doanh thu.",
        "Lượt tải bundle theo ngôn ngữ, tác vụ audio theo trạng thái và lượt hỏi chatbot. Lượt tải bundle không phải số khách duy nhất.",
        "Quy định polling và phản hồi lỗi. Chưa có dữ liệu thì không thay bằng số 0; health/readiness hiện có không thay thế thống kê."
      ], actions: ["Tải thống kê"], healthLink: true
    }
  };
  const page = config[document.body.dataset.pendingPage];
  const message = document.getElementById("pageMessage");
  const content = document.getElementById("pendingContent");
  let loading = false;
  async function load() {
    if (loading) return;
    loading = true; content.hidden = true;
    ui.state(message, { title: "Đang kiểm tra quyền truy cập…" });
    try {
      if (!page) throw ui.invalidResponse("Không tìm thấy cấu hình trang.");
      const user = await FoodTourNavigation.loadUser(); if (!user) return;
      if (!page.roles.includes(user.role)) { ui.notice(message, "Không đủ quyền. Trang này chỉ dành cho quản trị viên.", "error"); return; }
      const list = document.getElementById("backendNeeds"); list.replaceChildren();
      for (const requirement of page.needs) list.append(ui.element("li", requirement));
      const actions = document.getElementById("pendingActions"); actions.replaceChildren();
      for (const label of page.actions) {
        const button = ui.element("button", label, "button-secondary"); button.type = "button"; button.disabled = true;
        button.setAttribute("aria-describedby", "pendingLabel"); actions.append(button);
      }
      document.getElementById("healthLink").hidden = !page.healthLink;
      document.getElementById("pageTitle").textContent = page.title;
      message.hidden = true; content.hidden = false;
    } catch (error) {
      FoodTourNavigation.failure(error, load);
      ui.state(message, { type: "error", message: ui.errorText(error), retry: load });
    } finally { loading = false; }
  }
  load();
})();

