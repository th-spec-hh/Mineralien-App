// Lokale Speicherung in IndexedDB. Alle Daten bleiben auf dem Gerät; nichts wird hochgeladen.
// Stores: "items" (Einträge), "photos" (Foto + Vorschaubild als Blob, bei neutralem Hintergrund zusätzlich
// das Originalfoto und der gewählte Hintergrund), "meta" (Zähler für Inventarnummern)
const DB = (() => {
  const NAME = "stufen";
  const VERSION = 1;
  let dbPromise;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("items")) db.createObjectStore("items", { keyPath: "id" });
        if (!db.objectStoreNames.contains("photos")) db.createObjectStore("photos", { keyPath: "id" });
        if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta", { keyPath: "key" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  function done(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  function request(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function allItems() {
    const db = await open();
    return request(db.transaction("items").objectStore("items").getAll());
  }

  async function getPhoto(id) {
    const db = await open();
    return request(db.transaction("photos").objectStore("photos").get(id));
  }

  // Neuer Eintrag: Inventarnummer wird in derselben Transaktion vergeben, damit sie nie doppelt vorkommt.
  async function addItem(fields, photo) {
    const db = await open();
    const tx = db.transaction(["items", "photos", "meta"], "readwrite");
    const meta = tx.objectStore("meta");
    const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
    const item = { id, ...fields, created: Date.now() };
    meta.get("counter").onsuccess = (e) => {
      const next = (e.target.result ? e.target.result.value : 0) + 1;
      meta.put({ key: "counter", value: next });
      item.number = next;
      tx.objectStore("items").put(item);
      if (photo) tx.objectStore("photos").put({ id, ...photo });
    };
    await done(tx);
    return item;
  }

  async function updateItem(item, photo) {
    const db = await open();
    const tx = db.transaction(["items", "photos"], "readwrite");
    tx.objectStore("items").put(item);
    if (photo) tx.objectStore("photos").put({ id: item.id, ...photo });
    await done(tx);
    return item;
  }

  async function deleteItem(id) {
    const db = await open();
    const tx = db.transaction(["items", "photos"], "readwrite");
    tx.objectStore("items").delete(id);
    tx.objectStore("photos").delete(id);
    await done(tx);
  }

  return { allItems, getPhoto, addItem, updateItem, deleteItem };
})();
