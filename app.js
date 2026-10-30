// Stufen: Mineralien-Katalog. Läuft komplett im Browser; Daten liegen nur in IndexedDB auf dem Gerät.
(() => {
  const $ = (id) => document.getElementById(id);

  let items = [];
  let filter = "Alle";
  let current = null;      // geöffnetes Stück
  let editing = null;      // Stück im Bearbeiten-Modus, sonst null (= neues Stück)
  let pendingPhoto = null; // { full: Blob, thumb: Blob } aus dem Formular
  const urls = new Map();  // id -> { thumb, full } Objekt-URLs

  const inv = (n) => "M" + String(n).padStart(4, "0");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtDate = (d) => {
    if (!d) return "–";
    const [y, m, t] = d.split("-");
    return `${t}.${m}.${y}`;
  };
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  // ---------- Fotos ----------

  async function photoUrls(id) {
    if (urls.has(id)) return urls.get(id);
    const rec = await DB.getPhoto(id);
    const u = rec ? { thumb: URL.createObjectURL(rec.thumb), full: URL.createObjectURL(rec.full) } : { thumb: "", full: "" };
    urls.set(id, u);
    return u;
  }

  function forgetUrls(id) {
    const u = urls.get(id);
    if (u) { URL.revokeObjectURL(u.thumb); URL.revokeObjectURL(u.full); urls.delete(id); }
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Bild konnte nicht gelesen werden")); };
      img.src = url;
    });
  }

  function scaled(img, max, quality) {
    const ratio = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * ratio);
    canvas.height = Math.round(img.naturalHeight * ratio);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  }

  // Fotos werden verkleinert gespeichert, damit der Speicher auf dem iPhone nicht vollläuft.
  async function preparePhoto(file) {
    const img = await loadImage(file);
    const [full, thumb] = await Promise.all([scaled(img, 1600, 0.85), scaled(img, 520, 0.8)]);
    return { full, thumb };
  }

  // ---------- Navigation ----------

  function show(name, push = true) {
    for (const n of ["list", "detail", "form"]) $("s-" + n).hidden = n !== name;
    const el = $("s-" + name);
    el.classList.remove("enter");
    void el.offsetWidth;
    el.classList.add("enter");
    if (push) history.pushState({ view: name, id: current && current.id }, "");
  }

  window.addEventListener("popstate", (e) => {
    const view = (e.state && e.state.view) || "list";
    if (view === "detail" && current) { renderDetail(); show("detail", false); }
    else { renderList(); show("list", false); }
  });

  // ---------- Sammlung ----------

  function renderList() {
    const arts = [...new Set(items.map((i) => i.art))].sort((a, b) => a.localeCompare(b, "de"));
    if (filter !== "Alle" && !arts.includes(filter)) filter = "Alle";
    const chips = ["Alle", ...arts];
    $("chips").hidden = items.length === 0;
    $("chips").innerHTML = chips.map((a) => `<button class="chip" aria-pressed="${a === filter}">${esc(a)}</button>`).join("");
    [...$("chips").children].forEach((b, k) => (b.onclick = () => { filter = chips[k]; renderList(); }));

    $("count").textContent = items.length === 1 ? "1 Stück" : `${items.length} Stücke`;

    const q = $("q").value.trim().toLowerCase();
    const list = items.filter((i) =>
      (filter === "Alle" || i.art === filter) &&
      (!q || `${i.name} ${i.art} ${inv(i.number)}`.toLowerCase().includes(q)));

    const grid = $("grid");
    if (items.length === 0) {
      grid.innerHTML = `<div class="empty"><h3>Noch leer</h3><p>Tippe auf das Plus, fotografiere dein erstes Stück und gib Name, Art und Kaufdatum ein.</p></div>`;
      return;
    }
    if (list.length === 0) {
      grid.innerHTML = `<div class="empty"><p>Keine Stücke gefunden.</p></div>`;
      return;
    }
    grid.innerHTML = list.map((i) =>
      `<button class="tile" data-id="${i.id}"><div class="ph"><img alt="" decoding="async"></div><b>${esc(i.name)}</b><small><span>${esc(i.art)}</span><span>${inv(i.number)}</span></small></button>`
    ).join("");
    grid.querySelectorAll(".tile").forEach(async (t) => {
      const item = items.find((i) => i.id === t.dataset.id);
      t.onclick = () => openDetail(item);
      const u = await photoUrls(item.id);
      if (u.thumb) t.querySelector("img").src = u.thumb;
    });
  }

  // ---------- Stück ----------

  function openDetail(item) {
    current = item;
    renderDetail();
    show("detail");
  }

  async function renderDetail() {
    const i = current;
    $("detail").innerHTML = `<div class="hero"><img alt="${esc(i.name)}"></div>
      <div class="specimen">
        <div class="inv">${inv(i.number)}</div>
        <h2>${esc(i.name)}</h2>
        <div class="art">${esc(i.art)}</div>
        <dl class="facts">
          <dt>Kaufdatum</dt><dd>${fmtDate(i.date)}</dd>
          <dt>Art</dt><dd>${esc(i.art)}</dd>
          <dt>Inventarnummer</dt><dd>${inv(i.number)}</dd>
        </dl>
      </div>`;
    $("detail").scrollTop = 0;
    const u = await photoUrls(i.id);
    const img = $("detail").querySelector(".hero img");
    if (u.full) img.src = u.full; else img.hidden = true;
  }

  // ---------- Formular ----------

  async function openForm(item) {
    editing = item || null;
    pendingPhoto = null;
    $("form").reset();
    $("form-title").textContent = editing ? "Bearbeiten" : "Neues Stück";
    $("form-hint").textContent = editing ? `Inventarnummer ${inv(editing.number)}` : "Die Inventarnummer wird automatisch vergeben.";
    $("delete").hidden = !editing;
    $("f-name").value = editing ? editing.name : "";
    $("f-art").value = editing ? editing.art : "";
    $("f-date").value = editing ? editing.date : today();
    setPreview(editing ? (await photoUrls(editing.id)).full : "");
    renderSuggest();
    validate();
    show("form");
    $("form").scrollTop = 0;
  }

  function setPreview(src) {
    const img = $("preview");
    img.hidden = !src;
    if (src) img.src = src; else img.removeAttribute("src");
    $("photo-actions").hidden = !!src;
    $("replace").hidden = !src;
  }

  function renderSuggest() {
    const counts = {};
    for (const i of items) counts[i.art] = (counts[i.art] || 0) + 1;
    const arts = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b, "de")).slice(0, 12);
    $("suggest").innerHTML = arts.map((a) => `<button type="button" class="chip">${esc(a)}</button>`).join("");
    [...$("suggest").children].forEach((b, k) => (b.onclick = () => { $("f-art").value = arts[k]; validate(); }));
  }

  function validate() {
    const hasPhoto = !!pendingPhoto || !!editing;
    const ok = hasPhoto && $("f-name").value.trim() && $("f-art").value.trim() && $("f-date").value;
    $("save").setAttribute("aria-disabled", ok ? "false" : "true");
    return !!ok;
  }

  async function onPhoto(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    $("drop").classList.add("busy");
    try {
      pendingPhoto = await preparePhoto(file);
      setPreview(URL.createObjectURL(pendingPhoto.full));
    } catch (err) {
      toast("Foto konnte nicht geladen werden. Bitte ein anderes wählen.");
    } finally {
      $("drop").classList.remove("busy");
      validate();
    }
  }

  async function save() {
    if (!validate()) {
      toast(!pendingPhoto && !editing ? "Bitte zuerst ein Foto aufnehmen" : "Bitte Name, Art und Kaufdatum ausfüllen");
      return;
    }
    const fields = { name: $("f-name").value.trim(), art: $("f-art").value.trim(), date: $("f-date").value };
    try {
      if (editing) {
        const updated = { ...editing, ...fields };
        await DB.updateItem(updated, pendingPhoto);
        if (pendingPhoto) forgetUrls(updated.id);
        items = items.map((i) => (i.id === updated.id ? updated : i));
        current = updated;
        renderDetail();
        history.back();
        toast("Gesichert");
      } else {
        const item = await DB.addItem(fields, pendingPhoto);
        items.unshift(item);
        current = item;
        renderDetail();
        history.replaceState({ view: "detail", id: item.id }, "");
        show("detail", false);
        toast(`${inv(item.number)} gesichert`);
      }
      pendingPhoto = null;
    } catch (err) {
      toast("Speichern fehlgeschlagen. Ist der Speicher voll?");
    }
  }

  // ---------- Löschen ----------

  function askDelete() { $("confirm").hidden = false; $("confirm-no").focus(); }

  async function doDelete() {
    $("confirm").hidden = true;
    const id = editing.id;
    await DB.deleteItem(id);
    forgetUrls(id);
    items = items.filter((i) => i.id !== id);
    editing = current = null;
    renderList();
    history.replaceState({ view: "list" }, "");
    show("list", false);
    toast("Gelöscht");
  }

  // ---------- Kleinkram ----------

  function toast(text) {
    const el = $("toast");
    el.textContent = text;
    el.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(() => (el.hidden = true), 2000);
  }

  // ---------- Start ----------

  $("add").onclick = () => openForm(null);
  $("back").onclick = () => history.back();
  $("edit").onclick = () => openForm(current);
  $("cancel").onclick = () => history.back();
  $("save").onclick = save;
  $("form").onsubmit = (e) => { e.preventDefault(); save(); };
  $("cam").onchange = onPhoto;
  $("lib").onchange = onPhoto;
  ["f-name", "f-art", "f-date"].forEach((id) => ($(id).oninput = validate));
  $("f-name").onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); $("f-art").focus(); } };
  $("f-art").onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } };
  $("q").oninput = renderList;
  $("delete").onclick = askDelete;
  $("confirm-no").onclick = () => ($("confirm").hidden = true);
  $("confirm-yes").onclick = doDelete;

  history.replaceState({ view: "list" }, "");

  DB.allItems()
    .then((all) => {
      items = all.sort((a, b) => b.created - a.created);
      renderList();
    })
    .catch(() => {
      $("grid").innerHTML = `<div class="empty"><p>Der Speicher ist nicht verfügbar. Im privaten Safari-Modus kann die App nichts sichern.</p></div>`;
    });

  // Bittet iOS, die Daten nicht automatisch zu löschen.
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();
