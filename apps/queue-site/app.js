/* Denta Kids — queue check. Polls /api/queue on the main app every 15 s.
   Zero dependencies; config.js sets window.QUEUE_API. */

(function () {
  var API = (window.QUEUE_API || "").replace(/\/$/, "");
  var POLL_MS = 15000;
  var BANGKOK = "Asia/Bangkok";

  var elServing = document.getElementById("serving");
  var elWaiting = document.getElementById("waiting");
  var elScheduled = document.getElementById("scheduled");
  var elDone = document.getElementById("done");
  var elUpdated = document.getElementById("updated");
  var elOffline = document.getElementById("offline");
  var elMine = document.getElementById("mine");
  var elClock = document.getElementById("clock");
  var elDay = document.getElementById("day");
  var elDoc = document.getElementById("doc");
  var elDayLabel = document.getElementById("dayLabel");
  var form = document.getElementById("findForm");
  var input = document.getElementById("findInput");

  /* selected day + doctor — the two filters the URL carries */
  var state = {
    day: new Date().toLocaleDateString("en-CA", { timeZone: BANGKOK }),
    doc: "",
  };
  elDay.value = state.day;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* clinic clock on the phone — display only; positions come from the server */
  function tickClock() {
    elClock.textContent = new Date().toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: BANGKOK,
    });
  }
  tickClock();
  setInterval(tickClock, 10000);

  function dayLabel() {
    var label = new Date(state.day + "T00:00:00").toLocaleDateString("th-TH", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    var today = new Date().toLocaleDateString("en-CA", { timeZone: BANGKOK });
    elDayLabel.textContent = label + (state.day === today ? " (วันนี้)" : "");
  }

  /* dentist dropdown — rebuilt from the API's list, selection survives */
  function fillDocs(dentists) {
    var keep = state.doc;
    elDoc.innerHTML = '<option value="">ทุกท่าน</option>';
    dentists.forEach(function (d) {
      var o = document.createElement("option");
      o.value = d.slug;
      o.textContent = d.name;
      elDoc.appendChild(o);
    });
    elDoc.value = keep;
    if (elDoc.value !== keep) state.doc = ""; // slug vanished — fall back to all
  }

  /* name + meta + ref, shared by the waiting / scheduled / done rows */
  function rowInner(w, extraMeta) {
    return (
      "<span>" +
      '<span class="who">' +
      esc(w.name) +
      '</span><div class="meta">' +
      (w.kind === "walkin" ? "Walk-in" : "นัด " + esc(w.time || "") + " น.") +
      (w.dentistName ? " · " + esc(w.dentistName) : "") +
      (extraMeta || "") +
      '</div></span><span class="ref">' +
      esc(w.ref) +
      "</span>"
    );
  }

  function render(data) {
    fillDocs(data.dentists || []);

    elServing.innerHTML = data.serving.length
      ? data.serving
          .map(function (s) {
            return (
              '<div class="srv"><span class="ref">' +
              esc(s.ref) +
              '</span><span class="who">' +
              esc(s.name) +
              '</span><span class="dr">' +
              esc(s.dentistName || "") +
              "</span></div>"
            );
          })
          .join("")
      : '<div class="q-none">ตอนนี้ยังไม่มีคิวที่กำลังตรวจ</div>';

    elWaiting.innerHTML = data.waiting.length
      ? data.waiting
          .map(function (w) {
            return '<li><span class="pos">' + w.position + "</span>" + rowInner(w) + "</li>";
          })
          .join("")
      : '<li class="q-none" style="border:none">ไม่มีคิวรอ — เดินเข้าได้เลย</li>';

    elScheduled.innerHTML = data.scheduled.length
      ? data.scheduled
          .map(function (w) {
            return "<li>" + rowInner(w) + "</li>";
          })
          .join("")
      : '<li class="q-none" style="border:none">ไม่มีนัดในวันนี้</li>';

    elDone.innerHTML = data.done.length
      ? data.done
          .map(function (w) {
            return "<li>" + rowInner(w, w.state === "no_show" ? " · ไม่มาตามนัด" : "") + "</li>";
          })
          .join("")
      : '<li class="q-none" style="border:none">ยังไม่มี</li>';

    elUpdated.textContent = "อัปเดตล่าสุด " + data.now + " น.";
    dayLabel();
  }

  function boardUrl() {
    var u = API + "/api/queue?date=" + encodeURIComponent(state.day);
    if (state.doc) u += "&dentist=" + encodeURIComponent(state.doc);
    return u;
  }

  function fetchBoard() {
    fetch(boardUrl())
      .then(function (r) {
        if (!r.ok) throw new Error("bad status");
        return r.json();
      })
      .then(function (data) {
        elOffline.hidden = true;
        render(data);
      })
      .catch(function () {
        elOffline.hidden = false;
      });
  }

  elDay.addEventListener("change", function () {
    if (elDay.value) {
      state.day = elDay.value;
      fetchBoard();
    }
  });
  elDoc.addEventListener("change", function () {
    state.doc = elDoc.value;
    fetchBoard();
  });

  /* "check my queue" — booking ref (DK-/W-) or guardian phone, on the picked day */
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var v = input.value.trim();
    if (!v) return;
    var isPhone = /^0?[0-9 -]{9,}$/.test(v);
    var url =
      API +
      "/api/queue?date=" +
      encodeURIComponent(state.day) +
      (isPhone ? "&phone=" : "&ref=") +
      encodeURIComponent(v);

    fetch(url)
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        elMine.hidden = false;
        if (!d.found) {
          elMine.className = "q-mine";
          elMine.innerHTML = "ไม่พบคิววันที่เลือกสำหรับ <strong>" + esc(v) + "</strong> — ถ้าจองวันอื่นไว้ ลองเปลี่ยนวันที่ด้านล่าง";
          return;
        }
        var msg;
        var ok = false;
        switch (d.state) {
          case "serving":
            msg = "ถึงคิวแล้ว! <strong>" + esc(d.ref) + "</strong> กำลังเข้าตรวจ";
            ok = true;
            break;
          case "waiting":
            msg =
              "<strong>" + esc(d.ref) + "</strong> เช็คอินแล้ว — เหลืออีก <span class=\"big\">" +
              d.ahead +
              "</span> คิวก่อนถึง " + esc(d.name);
            break;
          case "scheduled":
            msg = "<strong>" + esc(d.ref) + "</strong> นัด " + esc(d.time) + " น. — มาถึงแล้วแจ้งเช็คอินที่เคาน์เตอร์นะคะ";
            break;
          case "done":
            msg = "<strong>" + esc(d.ref) + "</strong> ตรวจเสร็จแล้ว";
            break;
          case "cancelled":
            msg = "<strong>" + esc(d.ref) + "</strong> ถูกยกเลิกแล้ว";
            break;
          case "no_show":
            msg = "<strong>" + esc(d.ref) + "</strong> ถูกบันทึกว่าไม่มาตามนัด — จองใหม่ได้ใน LINE";
            break;
          default:
            msg = "<strong>" + esc(d.ref) + "</strong>";
        }
        elMine.className = "q-mine" + (ok ? " ok" : "");
        elMine.innerHTML = msg;
      })
      .catch(function () {
        elMine.hidden = false;
        elMine.className = "q-mine";
        elMine.textContent = "เช็คคิวไม่ได้ตอนนี้ — ลองอีกครั้ง";
      });
  });

  dayLabel();
  fetchBoard();
  setInterval(fetchBoard, POLL_MS);
})();
