(() => {
  "use strict";
  const ui = window.FoodTourUI;
  function create({ choices, select, selected, status, applyButton }) {
    let data = null, language = "vi", ids = [];
    function renderSelection() {
      selected.replaceChildren();
      if (!ids.length) { ui.state(status, { type: "empty", title: "Chưa chọn điểm dừng", message: "Chọn các điểm trong danh sách minh họa để xem bố cục lộ trình." }); return; }
      for (const id of ids) { const poi = data.pois.find(p => p.id === id); if (poi) selected.append(ui.element("li", poi.text[language].name)); }
      ui.state(status, { type: "success", title: "Lộ trình minh họa", message: "Chỉ là thứ tự bạn đã chọn. Chưa có tọa độ, đường nối, khoảng cách hay chỉ đường đi bộ." });
    }
    function renderChoices() {
      choices.replaceChildren();
      for (const poi of data.pois) {
        const label = ui.element("label", undefined, "poi-choice");
        const checkbox = ui.element("input"); checkbox.type = "checkbox"; checkbox.checked = ids.includes(poi.id);
        checkbox.addEventListener("change", () => { if (checkbox.checked) { if (!ids.includes(poi.id)) ids.push(poi.id); } else ids = ids.filter(id => id !== poi.id); renderSelection(); });
        label.append(checkbox, ui.element("span", poi.text[language].name)); choices.append(label);
      }
    }
    function setData(next, lang) {
      language = lang; data = next;
      if (!data?.sample) {
        select.disabled = applyButton.disabled = true;
        ui.state(status, { type: "empty", title: "Chức năng đang chờ backend", message: "Lộ trình sẽ có sau khi hệ thống cung cấp điểm tham quan và tour mẫu." }); return;
      }
      select.replaceChildren();
      const blank = ui.element("option", "Chọn tour bố cục minh họa"); blank.value = ""; select.append(blank);
      for (const tour of data.tours) { const option = ui.element("option", tour.name); option.value = tour.id; select.append(option); }
      select.disabled = false; applyButton.disabled = true;
      renderChoices(); renderSelection();
    }
    select.addEventListener("change", () => { applyButton.disabled = !select.value; });
    applyButton.addEventListener("click", () => {
      const tour = data?.tours.find(t => t.id === select.value); if (!tour) return;
      ids = [...new Set(tour.poiIds)].filter(id => data.pois.some(p => p.id === id)); renderChoices(); renderSelection();
    });
    return { setData };
  }
  window.GuestTour = Object.freeze({ create });
})();

