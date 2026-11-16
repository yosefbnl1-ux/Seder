// קוד משותף לטופס ולאתר המנהל: הגדרת השדות, שמירה, תצוגת דוח ויצירת PDF
const ORG = 'משמר הכנסת · מערך האבטחה החיצוני';
const TITLE = 'טופס העברת משמרת';
const SUBTITLE = 'בדיקת תקינות רכב ואמצעים';
const SHIFTS = ['בוקר', 'צהריים', 'לילה', 'שלדי יום', 'שלדי לילה'];
const OTHER = 'אחר'; // בבחירת "אחר" המאבטח כותב את סוג המשמרת בעצמו
const FUEL = ['מלא', 'חצי', 'רבע'];

// type: 'ok' = תקין/לא תקין, 'fuel' = מלא/חצי/רבע
// photo: true = ליקוי חדש בסעיף הזה חייב צילום (או סיבה למה אי אפשר לצלם)
const VEHICLE = [
  { k: 'v1', t: 'בדיקה חזותית של הרכב ואיתור נזקים', photo: true },
  { k: 'v2', t: 'צמיגים ולחץ אוויר – בדיקה חזותית', photo: true },
  { k: 'v3', t: 'תאורה חיצונית – פנסי תאורה, וינקרים', photo: true },
  { k: 'v4', t: 'מראות, שמשות', photo: true },
  { k: 'v5', t: 'צופר ומערכת התרעה בנסיעה לאחור' },
  { k: 'fuel', t: 'מצב מיכל הדלק', type: 'fuel' },
  { k: 'v6', t: 'נוריות אזהרה בלוח המחוונים', photo: true },
  { k: 'v7', t: 'ניקיון הרכב והיעדר חפצים חריגים', photo: true },
  { k: 'v8', t: 'שלמות הריפודים ומושבים', photo: true },
];
const EQUIP = [
  { k: 'e1', t: 'מכשיר קשר – תקינות וקליטה' },
  { k: 'e2', t: 'אורות כחולים מהבהבים – תקינות לחצנים וכריזה' },
  { k: 'e3', t: 'ציוד חירום בהתאם לרשמ"צ' },
  { k: 'e4', t: 'מאסטר שערים' },
];
const STATUS = [
  { k: 'ok', t: 'הרכב והאמצעים תקינים ללא ליקויים חדשים' },
  { k: 'unreported', t: 'קיימים ליקויים חדשים שטרם דווחו' },
  { k: 'reported', t: 'קיימים ליקויים שדווחו' },
];
const REMINDERS = [
  'מיקום הנשק הארוך יהיה מקדימה במושב שסמוך לנהג.',
  'חל איסור להסיע אזרחים ברכב הסיור.',
  'חובת הצבת מכוון אחורי בעת נסיעה לאחור.',
  'יש לדווח למפקד תורן על כל דבר חריג/לא תקין.',
  'באחריות המאבטח המסיים למסור את הרכב נקי, מסודר וללא אשפה.',
];
const CHECKS = [...VEHICLE, ...EQUIP].filter(c => c.type !== 'fuel');

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = d => d ? d.split('-').reverse().join('.') : '';
const pad = n => String(n).padStart(2, '0');
const todayISO = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) };
const nowHM = () => { const d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()) };
const badList = r => CHECKS.filter(c => r.checks && r.checks[c.k] === 'bad');
const statusText = k => (STATUS.find(s => s.k === k) || {}).t || '';
const itemText = k => (CHECKS.find(c => c.k === k) || {}).t || k;
const shortText = k => itemText(k).split(' – ')[0];
// מפתח רכב: רק הספרות, כדי ש-12-345-67 ו-1234567 ייחשבו אותו רכב
const vKey = v => (String(v || '').match(/\d/g) || []).join('') || String(v || '').trim().toLowerCase().replace(/[^\w\u0590-\u05FF-]/g, '_');
const fmtTs = t => { const d = new Date(t); return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear() };

// ---------- שמירה: Firebase אם הוגדר, אחרת במכשיר בלבד ----------
const LOCAL_KEY = 'handoverReports';
const Store = {
  cloud: !!window.FIREBASE_CONFIG,
  db: null, auth: null,
  async init(withAuth) {
    if (!this.cloud) return;
    const v = '10.12.2', base = `https://www.gstatic.com/firebasejs/${v}/`;
    await loadScript(base + 'firebase-app-compat.js');
    await loadScript(base + 'firebase-firestore-compat.js');
    if (withAuth) await loadScript(base + 'firebase-auth-compat.js');
    firebase.initializeApp(window.FIREBASE_CONFIG);
    this.db = firebase.firestore();
    // הטופס שומר דוחות במכשיר כדי לשלוח גם בלי קליטה; באתר המנהל לא שומרים עותק של הדוחות בדפדפן
    if (!withAuth) try { await this.db.enablePersistence({ synchronizeTabs: true }) } catch (e) { }
    if (withAuth) this.auth = firebase.auth();
  },
  // שולח דוח + תמונות + ליקויים חדשים בפעולה אחת (הכול או כלום).
  // מחזיר true אם אושר בשרת, 'queued' אם נשמר וישלח כשיחזור חיבור
  async submit(r, photos, newItems) {
    const now = r.createdAt, key = r.vehicleKey;
    const issue = k => ({ vehicleKey: key, vehicle: r.vehicle, item: k, itemText: itemText(k), status: 'open', openedAt: now,
      reportId: r.id, giver: r.giver, receiver: r.receiver });
    if (!this.cloud) {
      r.id = 'L' + Date.now().toString(36);
      const L = localGet(); L.unshift(r); lsSet(LOCAL_KEY, L);
      lsSet('handoverPhotos', [...lsGet('handoverPhotos', []), ...photos.map((p, i) => ({ id: r.id + 'p' + i, reportId: r.id, item: p.item, data: p.data, createdAt: now }))]);
      const I = lsGet('handoverIssues', []), O = lsGet('handoverOpen', {}), items = (O[key] ||= { items: {} }).items;
      newItems.forEach((k, i) => { const id = r.id + 'i' + i; I.unshift({ ...issue(k), id }); items[k] = { since: now, issueId: id } });
      lsSet('handoverIssues', I); lsSet('handoverOpen', O); return true;
    }
    const db = this.db, b = db.batch(), ref = db.collection('reports').doc();
    r.id = ref.id;
    b.set(ref, { ...r, serverAt: firebase.firestore.FieldValue.serverTimestamp() });
    photos.forEach(p => b.set(db.collection('photos').doc(), { reportId: r.id, item: p.item, data: p.data, createdAt: now }));
    if (newItems.length) {
      const items = {};
      newItems.forEach(k => { const iref = db.collection('issues').doc(); b.set(iref, issue(k)); items[k] = { since: now, issueId: iref.id } });
      b.set(db.collection('openByVehicle').doc(key), { items }, { merge: true });
    }
    const p = b.commit();
    return Promise.race([p.then(() => true), new Promise(res => setTimeout(() => res('queued'), 10000))]);
  },
  // הליקויים הפתוחים של רכב אחד: { v3: {since, issueId}, ... } - רק שם הסעיף ותאריך
  async openIssues(key) {
    if (!key) return {};
    if (!this.cloud) return (lsGet('handoverOpen', {})[key] || {}).items || {};
    try { const d = await this.db.collection('openByVehicle').doc(key).get(); return (d.exists && d.data().items) || {} } catch (e) { return {} }
  },
  async vehicles() {
    const def = { list: [], main: '' };
    if (!this.cloud) return lsGet('handoverVehicles', def);
    try { const d = await this.db.collection('settings').doc('vehicles').get(); return d.exists ? { ...def, ...d.data() } : def } catch (e) { return def }
  },
  async saveVehicles(v) {
    if (!this.cloud) { lsSet('handoverVehicles', v); return }
    await this.db.collection('settings').doc('vehicles').set(v);
  },
  subscribe(cb, onErr) {
    if (!this.cloud) { cb(localGet()); window.addEventListener('storage', () => cb(localGet())); return }
    return this.db.collection('reports').orderBy('createdAt', 'desc').limit(2000)
      .onSnapshot(s => cb(s.docs.map(d => ({ ...d.data(), id: d.id }))), onErr);
  },
  subscribeIssues(cb, onErr) {
    if (!this.cloud) { cb(lsGet('handoverIssues', [])); window.addEventListener('storage', () => cb(lsGet('handoverIssues', []))); return }
    return this.db.collection('issues').orderBy('openedAt', 'desc').limit(1000)
      .onSnapshot(s => cb(s.docs.map(d => ({ ...d.data(), id: d.id }))), onErr);
  },
  // המנהל מסמן ליקוי כתוקן: הוא עובר להיסטוריה ונעלם מהטופס.
  // fix = {by: מי תיקן, at: תאריך התיקון, note}; approver = המנהל שאישר
  async fixIssue(is, fix, approver) {
    const upd = { status: 'fixed', fixedAt: fix.at || Date.now(), fixedBy: fix.by || '', fixNote: fix.note || '', approvedBy: approver || '', approvedAt: Date.now() };
    if (!this.cloud) {
      lsSet('handoverIssues', lsGet('handoverIssues', []).map(x => x.id === is.id ? { ...x, ...upd } : x));
      const O = lsGet('handoverOpen', {}), it = O[is.vehicleKey]?.items;
      if (it && it[is.item]?.issueId === is.id) { delete it[is.item]; lsSet('handoverOpen', O) }
      return;
    }
    const db = this.db, b = db.batch(), oref = db.collection('openByVehicle').doc(is.vehicleKey);
    b.update(db.collection('issues').doc(is.id), upd);
    const o = await oref.get();
    if (o.exists && o.data().items?.[is.item]?.issueId === is.id) b.update(oref, { ['items.' + is.item]: firebase.firestore.FieldValue.delete() });
    await b.commit();
  },
  // כל התמונות, מהחדשה לישנה, 24 בכל פעם (after = createdAt של האחרונה שנטענה)
  async photosPage(after, n = 24) {
    if (!this.cloud) return lsGet('handoverPhotos', []).sort((a, b) => b.createdAt - a.createdAt).filter(p => !after || p.createdAt < after).slice(0, n);
    let q = this.db.collection('photos').orderBy('createdAt', 'desc');
    if (after) q = q.startAfter(after);
    const s = await q.limit(n).get();
    return s.docs.map(d => ({ ...d.data(), id: d.id }));
  },
  async photosFor(reportId) {
    if (!this.cloud) return lsGet('handoverPhotos', []).filter(p => p.reportId === reportId);
    const s = await this.db.collection('photos').where('reportId', '==', reportId).get();
    return s.docs.map(d => ({ ...d.data(), id: d.id }));
  },
  async remove(id) {
    if (!this.cloud) {
      lsSet(LOCAL_KEY, localGet().filter(r => r.id !== id));
      lsSet('handoverPhotos', lsGet('handoverPhotos', []).filter(p => p.reportId !== id)); return;
    }
    const b = this.db.batch();
    (await this.db.collection('photos').where('reportId', '==', id).get()).docs.forEach(d => b.delete(d.ref));
    b.delete(this.db.collection('reports').doc(id));
    await b.commit();
  },
};
function lsGet(k, def) { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? def } catch (e) { return def } }
function lsSet(k, v) { localStorage.setItem(k, JSON.stringify(v)) }
function localGet() { return lsGet(LOCAL_KEY, []) }
function loadScript(src) {
  return new Promise((ok, bad) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => bad(new Error('טעינה נכשלה: ' + src)); document.head.appendChild(s) });
}

// ---------- תצוגת דוח מלא (משמשת לצפייה ול-PDF) ----------
// photos: התמונות של הדוח (נטענות בנפרד, רק באתר המנהל)
function reportHTML(r, photos) {
  const known = r.known || {}, noPh = r.noPhoto || {};
  const mark = (v, k) => v === 'ok' ? '<b class="rk ok">✓ תקין</b>' : v === 'bad' ? `<b class="rk bad">✗ לא תקין${known[k] ? ' (ידוע)' : ''}</b>` : '<b class="rk">—</b>';
  const rows = list => list.map(c => `<tr><td>${esc(c.t)}</td><td>${c.type === 'fuel' ? `<b class="rk">${esc(r.fuel || '—')}</b>` : mark(r.checks?.[c.k], c.k)}</td></tr>`).join('');
  const kn = Object.keys(known).map(k => esc(shortText(k))).join(' · ');
  const ph = (photos || []).map(p => `<figure><img src="${esc(p.data)}" alt=""><figcaption>${esc(shortText(p.item))}</figcaption></figure>`).join('')
    + Object.keys(noPh).map(k => `<figure class="rnoph"><div>לא ניתן לצלם:<br>${esc(noPh[k])}</div><figcaption>${esc(shortText(k))}</figcaption></figure>`).join('');
  const sig = (img, ok, who) => `<div class="rsig"><div class="rsl">חתימת ${who}</div>${img ? `<img src="${esc(img)}" alt="">` : '<div class="rnone">לא נחתם</div>'}<div class="rsc">${ok ? '☑' : '☐'} מאשר שביצע את הבדיקות וקיבל את המידע הנדרש</div></div>`;
  const bad = badList(r).length;
  return `<div class="rep">
  <div class="rh"><img src="logo.jpg" alt=""><div><div class="ro">${ORG}</div><div class="rt">${TITLE}</div><div class="rst">${SUBTITLE}</div></div>
   <div class="rbadge ${bad ? 'bad' : 'ok'}">${bad ? bad + ' ליקויים' : 'תקין'}</div></div>
  <div class="rsec">01 · פרטי העברת המשמרת</div>
  <table class="rgrid"><tr><th>תאריך</th><td>${fmtDate(r.date)}</td><th>שעה</th><td>${esc(r.time)}</td></tr>
   <tr><th>סוג משמרת</th><td>${esc(r.shift)}</td><th>מספר רכב</th><td>${esc(r.vehicle)}</td></tr>
   <tr><th>מאבטח מוסר</th><td>${esc(r.giver)}</td><th>מאבטח מקבל</th><td>${esc(r.receiver)}</td></tr></table>
  <div class="rsec">02 · בדיקת תקינות הרכב</div><table class="rchk">${rows(VEHICLE)}</table>
  ${r.vNotes ? `<div class="rnote"><b>הערות / נזקים קיימים ברכב:</b> ${esc(r.vNotes)}</div>` : ''}
  <div class="rsec">03 · בדיקת ציוד ואמצעים</div><table class="rchk">${rows(EQUIP)}</table>
  <div class="rsec">04 · תיעוד ליקויים והעברת מידע</div>
  ${kn ? `<div class="rnote"><b>ליקויים פתוחים מדוחות קודמים (ממתינים לתיקון):</b> ${kn}</div>` : ''}
  <div class="rnote"><b>פירוט התקלה / הליקוי, מועד גילוי ופעולות שננקטו:</b> ${esc(r.details) || '—'}</div>
  <table class="rgrid"><tr><th>גורם שאליו דווח</th><td>${esc(r.reportedTo) || '—'}</td><th>שעת הדיווח</th><td>${esc(r.reportTime) || '—'}</td></tr>
   <tr><th>אופן הדיווח</th><td colspan="3">${esc(r.reportMethod) || '—'}</td></tr></table>
  <div class="rsec">05 · סטטוס כשירות</div><div class="rnote">${esc(statusText(r.status)) || '—'}</div>
  <div class="rsec">06 · אישור העברת משמרת</div>
  <div class="rsigs">${sig(r.sigReceiver, r.receiverOk, 'המאבטח המקבל')}</div>
  ${ph ? `<div class="rsec">תמונות ליקויים</div><div class="rph">${ph}</div>` : ''}
  <div class="rfoot">נשלח: ${r.createdAt ? new Date(r.createdAt).toLocaleString('he-IL') : ''} · מזהה: ${esc(r.id || '')}</div>
 </div>`;
}

const REPORT_CSS = `
.rep{direction:rtl;background:#fff;color:#14233a;font:14px/1.45 "Segoe UI",Arial,"Helvetica Neue",system-ui,sans-serif;padding:30px 34px;width:794px;box-sizing:border-box}
.rep *{box-sizing:border-box}
.rh{display:flex;align-items:center;gap:16px;border-bottom:3px solid #1f3a5c;padding-bottom:12px;margin-bottom:6px}
.rh img{width:58px;height:64px;object-fit:contain}.rh>div:nth-child(2){flex:1}
.ro{color:#6b7a8f;font-size:12px;font-weight:700}.rt{font-size:22px;font-weight:800;color:#1f3a5c}.rst{color:#3d6a9e;font-weight:700;font-size:13px}
.rbadge{padding:6px 14px;border-radius:20px;font-weight:800;font-size:13px}.rbadge.ok{background:#e3f4ea;color:#17683f}.rbadge.bad{background:#fde6e3;color:#b3261e}
.rsec{margin:14px 0 6px;font-weight:800;color:#1f3a5c;font-size:14px;background:#eef2f7;padding:5px 10px;border-radius:6px}
.rep table{width:100%;border-collapse:collapse}
.rgrid th,.rgrid td{border:1px solid #d5dde8;padding:5px 8px;text-align:right;font-size:13px}.rgrid th{background:#f6f8fb;width:16%;font-weight:700;color:#4a5a70}
.rchk td{border-bottom:1px solid #e3e8ef;padding:4px 8px;font-size:13px}.rchk td:last-child{width:110px;text-align:left}
.rk{font-weight:800}.rk.ok{color:#17683f}.rk.bad{color:#b3261e}
.rnote{border:1px solid #d5dde8;border-radius:6px;padding:7px 10px;font-size:13px;white-space:pre-wrap;margin-bottom:6px}
.rsigs{display:flex;gap:14px}.rsig{flex:0 1 50%;border:1px solid #d5dde8;border-radius:8px;padding:8px}
.rsl{font-weight:700;font-size:12px;color:#4a5a70}.rsig img{display:block;width:100%;height:95px;object-fit:contain}
.rnone{height:95px;display:flex;align-items:center;justify-content:center;color:#b3261e;font-weight:700}
.rsc{font-size:11.5px;color:#4a5a70}
.rph{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.rph figure{margin:0;border:1px solid #d5dde8;border-radius:6px;padding:4px;break-inside:avoid}
.rph img,.rnoph div{display:block;width:100%;height:160px;object-fit:cover;border-radius:4px}
.rnoph div{display:flex;align-items:center;justify-content:center;text-align:center;background:#f6f8fb;color:#4a5a70;font-size:12px;padding:6px}
.rph figcaption{font-size:11px;font-weight:700;color:#4a5a70;padding-top:3px}.rfoot{margin-top:14px;color:#8a97a8;font-size:11px;text-align:center}`;

// ---------- PDF ----------
async function reportsToPDF(list, filename) {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const W = 210, H = 297;
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px';
  document.body.appendChild(host);
  try {
    for (let i = 0; i < list.length; i++) {
      let photos = list[i]._photos;
      if (!photos) try { photos = await Store.photosFor(list[i].id) } catch (e) { photos = [] }
      host.innerHTML = reportHTML(list[i], photos);
      await Promise.all([...host.querySelectorAll('img')].map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r })));
      const cv = await html2canvas(host.firstElementChild, { scale: 2, backgroundColor: '#fff', useCORS: true });
      const pageH = Math.floor(cv.width * H / W); // גובה עמוד בפיקסלים של הקנבס
      if (i > 0) pdf.addPage();
      if (cv.height <= pageH * 1.3) { // דוח רגיל: מקטינים מעט כדי שייכנס לעמוד אחד
        const s = Math.min(1, pageH / cv.height), w = W * s;
        pdf.addImage(cv.toDataURL('image/jpeg', 0.92), 'JPEG', (W - w) / 2, 0, w, cv.height * w / cv.width);
        continue;
      }
      for (let y = 0; y < cv.height; y += pageH) { // דוח ארוך במיוחד: מחלקים לכמה עמודים
        if (y > 0) pdf.addPage();
        const part = document.createElement('canvas');
        part.width = cv.width; part.height = Math.min(pageH, cv.height - y);
        part.getContext('2d').drawImage(cv, 0, -y);
        pdf.addImage(part.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, W, part.height * W / cv.width);
      }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(pdf.output('blob')); a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  } finally { host.remove() }
}
// שם קובץ באנגלית בלבד - חלק מהדפדפנים מחליפים שם בעברית ב-"download"
const pdfName = r => `shift-handover_${r.date}_${(r.time || '').replace(':', '')}_${(r.vehicle || '').replace(/[^\w-]/g, '')}.pdf`;
