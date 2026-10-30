"use strict";
/* Qomat: vazn, kaloriya va suvni kuzatish. Ma'lumotlar telefonda (localStorage), AI esa serverda. */

const CFG = window.VZ_CONFIG || { api: "", key: "" };

// Telegram Mini App ichida ochilganmi: imzolangan ma'lumot manzilning # qismida keladi
const TG = (() => {
  const raw = new URLSearchParams(location.hash.slice(1)).get("tgWebAppData") || "";
  if (!raw) return null;
  let user = {};
  try { user = JSON.parse(new URLSearchParams(raw).get("user") || "{}"); } catch {}
  const s = document.createElement("script");
  s.src = "https://telegram.org/js/telegram-web-app.js";
  s.onload = () => {
    const w = window.Telegram?.WebApp;
    if (!w) return;
    w.ready();
    w.expand();
    w.disableVerticalSwipes?.(); // pastdan chiqadigan oynani surganda ilova yopilmasin
    w.setHeaderColor?.("#F3F1EC");
    w.setBackgroundColor?.("#F3F1EC");
  };
  document.head.appendChild(s);
  return { initData: raw, user };
})();
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (n) => Math.round(n).toLocaleString("ru-RU").replace(/,/g, " ");
const kg = (n) => (Math.round(n * 10) / 10).toString().replace(".", ",");
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ── Ma'lumotlar ─────────────────────────────────────
const KEY = "vaznim:v1";
let S = load();

function load() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(KEY)); } catch {}
  s = s && typeof s === "object" ? s : {};
  s.profile ??= null;
  s.days ??= {};
  s.weights ??= [];
  s.chat ??= [];
  s.device ??= uid() + uid();
  // qoldiqni solishtirish uchun o'rtacha surat faqat bugungi ovqatlarda turadi
  const today = dkey();
  Object.entries(s.days).forEach(([k, d]) => { if (k !== today) d.food?.forEach((f) => delete f.mid); });
  return s;
}
/** Faqat telefonga yozadi (serverga yuboriladigan ma'lumot o'zgarmaganda). */
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch { toast("Xotira to'ldi: eski suratlar o'chiriladi"); dropOldThumbs(); }
}
/** Ma'lumot o'zgardi: telefonga yozadi, serverga yuborishni va eslatmalarni rejalashtiradi. */
function save() {
  S.updatedAt = Date.now();
  persist();
  planSoon();
  pushSoon();
}
function dropOldThumbs() {
  const keys = Object.keys(S.days).sort().slice(0, -7);
  keys.forEach((k) => S.days[k].food?.forEach((f) => delete f.img));
  S.chat.forEach((m) => { delete m.img; delete m.foodImg; });
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {}
}

function dkey(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function day(k = dkey()) {
  S.days[k] ??= { food: [], act: [], water: 0 };
  return S.days[k];
}
function ddays(n) { const d = new Date(); d.setDate(d.getDate() - n); return d; }
// Kundalik qaysi kunni ko'rsatyapti: null — bugun, aks holda o'tgan kun kaliti. Eslatma va maslahatlar doim bugun bilan ishlaydi.
let viewDay = null, editDay = null; // editDay: Tarix'da tahrirlash oynasi ochiq kun
const curKey = () => editDay || viewDay || dkey();
const isPast = () => !!viewDay && viewDay < dkey();
const dayName = (k) => { const d = new Date(k + "T12:00"); return `${d.getDate()}-${MONTHS[d.getMonth()]}`; };
function setDay(k) {
  viewDay = !k || k >= dkey() ? null : k;
  tab = "kundalik";
  closeSheet();
  render();
  scrollTo(0, 0);
}

// ── Hisob-kitob ─────────────────────────────────────
const ACTIVITY = [
  { v: 1.2, t: "Kam harakat", d: "Asosan o'tirib ishlayman" },
  { v: 1.375, t: "Yengil", d: "Haftada 1-3 marta mashq yoki ko'p yuraman" },
  { v: 1.55, t: "O'rtacha", d: "Haftada 3-5 marta mashq" },
  { v: 1.725, t: "Yuqori", d: "Har kuni sport yoki og'ir jismoniy ish" },
];

function age(p = S.profile) {
  const now = new Date();
  if (!p.bdate) return now.getFullYear() - p.birth;
  const [y, m, d] = p.bdate.split("-").map(Number);
  return now.getFullYear() - y - (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d) ? 1 : 0);
}
const fmtDate = (s) => s.split("-").reverse().join(".");

// Allergiya va cheklovlar: AI ovqat bahosida, chatda va maslahatda hisobga oladi. S.profile.health: id ro'yxati
const HEALTH = [
  ["Allergiya va ko'tara olmaslik", [["gluten", "Glyuten"], ["lactose", "Laktoza (sut)"], ["peanut", "Yeryong'oq"], ["nuts", "Yong'oqlar"], ["egg", "Tuxum"],
    ["fish", "Baliq"], ["seafood", "Dengiz mahsulotlari"], ["soy", "Soya"], ["sesame", "Kunjut"], ["honey", "Asal"], ["citrus", "Tsitrus mevalar"],
    ["strawberry", "Qulupnay"], ["choco", "Shokolad"]]],
  ["Kasalliklar", [["diab1", "Diabet 1-tur"], ["diab2", "Diabet 2-tur"], ["gastritis", "Gastrit"], ["ulcer", "Oshqozon yarasi"], ["reflux", "Reflyuks (jig'ildon)"],
    ["hyper", "Gipertoniya"], ["heart", "Yurak-qon tomir"], ["chol", "Yuqori xolesterin"], ["gout", "Podagra"], ["kidney", "Buyrak"],
    ["liver", "Jigar yoki o't pufagi"], ["thyroid", "Qalqonsimon bez"], ["ibs", "Ichak (IBS)"]]],
  ["Holat va ovqatlanish tarzi", [["pregnant", "Homiladorlik"], ["breastfeed", "Emizish"], ["vegetarian", "Vegetarian"], ["vegan", "Vegan"],
    ["lowsalt", "Kam tuz"], ["lowsugar", "Kam shakar"]]],
];
const HEALTH_NAME = Object.fromEntries(HEALTH.flatMap(([, list]) => list));
/** Tanlangan cheklovlar matni (AI uchun va Profilda). */
function healthText(p = S.profile) {
  const list = (p?.health || []).map((id) => HEALTH_NAME[id]).filter(Boolean);
  if (p?.healthOther) list.push(p.healthOther);
  return list.join(", ");
}
const hasDiabetes = () => (S.profile?.health || []).some((id) => id.startsWith("diab"));
const stepGoal = () => S.profile?.stepGoal || 10000;
const burnGoal = () => S.profile?.burnGoal || 250;
function curWeight() { return S.weights.length ? S.weights[S.weights.length - 1].kg : S.profile.weight; }
function goalType(p = S.profile) {
  const w = curWeight();
  return p.goal < w - 0.5 ? "ozish" : p.goal > w + 0.5 ? "semirish" : "saqlash";
}
/** Bazal almashinuv (kkal/kun): Mifflin-St Jeor (1990). */
function bmr(p = S.profile) { return 10 * curWeight() + 6.25 * p.height - 5 * age(p) + (p.sex === "m" ? 5 : -161); }
function norms() {
  const p = S.profile, w = curWeight();
  let kcal = bmr(p) * p.activity;
  const g = goalType();
  if (g === "ozish") kcal = Math.max(kcal - 500, p.sex === "m" ? 1500 : 1200);
  if (g === "semirish") kcal += 300;
  kcal = Math.round(kcal / 10) * 10;
  return {
    kcal,
    protein: Math.round((kcal * 0.25) / 4),
    fat: Math.round((kcal * 0.3) / 9),
    carbs: Math.round((kcal * 0.45) / 4),
    water: Math.round((w * 30) / 250), // stakan (250 ml)
  };
}
/** burn: harakatda yoqilgan (qadam + mashqlar, to'liq). move: shuning tinch holatdan ortig'i (sof).
 *  bonus: normaga qo'shiladigani — faollik koeffitsientida hisobga olingan harakatdan (activeIncl) ortig'i,
 *  aks holda o'sha harakat ikki marta sanalardi. "Kam harakat" (1,2) da bonus = move. */
function totals(k = dkey()) {
  const d = S.days[k] || { food: [], act: [], water: 0 };
  const sum = (arr, f) => arr.reduce((a, x) => a + (+x[f] || 0), 0);
  const steps = d.steps || 0, stepBurn = stepKcal(steps);
  const move = stepBurn + d.act.reduce((a, x) => a + actNet(x), 0);
  return { eat: sum(d.food, "kcal"), burn: sum(d.act, "kcal") + stepBurn, move, bonus: Math.max(0, move - activeIncl()),
    steps, stepBurn, p: sum(d.food, "p"), f: sum(d.food, "f"), c: sum(d.food, "c"), water: d.water || 0, n: d.food.length };
}

// ── Energiya sarfi (AI'siz) ─────────────────────────
// Kun davomida yoqilgan = tinch holat (uyquda va uyg'oq) + ovqat hazmi + harakat (qadam va mashqlar, sof).
// Manbalar: Mifflin va boshq. (1990) — BMR; Katayose va boshq. (2009) — uyquda sarf ≈ BMR × 0,95;
// FAO/WHO/UNU (2004) — kam harakatli kun PAL ≈ 1,2: uyg'oq, o'tirib-turib yurgan payt BMR × 1,2 bo'lsa, uyqu va
// hazm bilan kun jami ≈ BMR × 1,2 chiqadi; Westerterp (2004) — ovqat hazmi (TEF) ≈ yeyilganning 10%;
// Ainsworth va boshq. (2011) — mashq: MET × vazn × soat.
const SLEEP_K = 0.95, AWAKE_K = 1.2, TEF = 0.1;
/** Mashqning tinch holatdan ortig'i: (MET − 1) × vazn × soat. Daqiqasi nomida ("Yurish, 30 daq") yoki min da. */
function actNet(a) {
  const min = +(a.min ?? /(\d+)\s*daq/.exec(a.name || "")?.[1]) || 0;
  return S.profile ? Math.max(0, Math.round((+a.kcal || 0) - (curWeight() * min) / 60)) : +a.kcal || 0;
}
/** Faollik koeffitsienti kunlik normada hisobga olgan harakat (kkal): BMR × (koeffitsient − 1,2). */
function activeIncl() { return S.profile ? Math.max(0, Math.round(bmr() * (S.profile.activity - 1.2))) : 0; }
/** Shu kuni yoqilgan kaloriya qismlari. full: bugun uchun ham butun kun (kun oxirigacha taxmin). */
function burnParts(k = dkey(), full = false) {
  const t = totals(k), b = bmr(), now = new Date(), today = k === dkey();
  const span = k > dkey() ? 0 : today && !full ? now.getHours() * 60 + now.getMinutes() : 1440; // o'tgan daqiqalar
  const sleptLog = sleepTotal(k), slept = Math.min(sleptLog || sleepNeed(), span); // yozilmagan bo'lsa: normasi
  const sleep = Math.round((b * SLEEP_K * slept) / 1440), awake = Math.round((b * AWAKE_K * (span - slept)) / 1440);
  const tef = Math.round(t.eat * TEF), move = t.move;
  return { sleep, awake, tef, move, total: sleep + awake + tef + move, bmr: Math.round(b), slept, guessed: !sleptLog };
}

// ── Qadamlar (faqat APK: telefonning qadam datchigi) ──
const NATIVE = !!window.Capacitor?.isNativePlatform?.();
let stepInfo = null; // { available, granted }
const stepCall = (m, o = {}) => window.Capacitor.nativePromise("Steps", m, o);
function stepKm(n) { return (n * S.profile.height * 0.415) / 100000; } // qadam uzunligi ≈ bo'y × 0,415
function stepKcal(n) { return n && S.profile ? Math.round(0.5 * curWeight() * stepKm(n)) : 0; } // yurish: 1 km ga ≈ 0,5 kkal × vazn
async function syncSteps(ask) {
  if (!NATIVE || !S.profile) return;
  try {
    if (ask) await stepCall("enable");
    const r = await stepCall("get");
    let changed = stepInfo?.available !== r.available || stepInfo?.granted !== r.granted;
    stepInfo = { available: r.available, granted: r.granted };
    for (const [k, n] of Object.entries(r.days || {})) {
      if (!n && !S.days[k]) continue;
      if (day(k).steps !== n) { day(k).steps = n; changed = true; }
    }
    if (!changed) return;
    save();
    if (tab === "kundalik" || tab === "tarix") render();
  } catch {}
}
function bmi() { const h = S.profile.height / 100; return curWeight() / (h * h); }
function bmiLabel(b) {
  if (b < 18.5) return ["Vazn yetishmaydi", "#E8F1FB", "#3C7CC0"];
  if (b < 25) return ["Normal vazn", "#E5F4EA", "#23914A"];
  if (b < 30) return ["Ortiqcha vazn", "#FFF5D9", "#B58A12"];
  if (b < 35) return ["Semizlik I", "#FDEEDD", "#C6741B"];
  return ["Semizlik II", "#FBE9E9", "#C24646"];
}
/** Kun bali (0-100): suv, ovqat yozilgani, kaloriya normasi, faollik va (yozilgan bo'lsa) uyqu. */
function lifeScore(k = dkey()) {
  if (!S.profile) return 0;
  const t = totals(k), n = norms(), sl = validSleep(S.days[k]?.sleep);
  // uyqu yozilmagan kun eski formula bo'yicha (35/15/30/20), yozilganda 25/15/25/15 + uyqu 20
  const [wW, wF, wK, wA] = sl ? [25, 15, 25, 15] : [35, 15, 30, 20];
  let s = 0;
  s += wW * clamp(t.water / n.water, 0, 1);
  s += t.n ? wF : 0;
  if (t.n) s += wK * clamp(1 - Math.abs(t.eat - t.bonus - n.kcal) / n.kcal, 0, 1);
  s += wA * clamp(t.burn / burnGoal(), 0, 1);
  if (sl) s += 20 * sleepScore(k) / 100;
  return Math.round(s);
}

// ── Uyqu (AI'siz, ilmiy tavsiyalar asosida) ─────────
// Manbalar: National Sleep Foundation (2015) va AASM/SRS (2015) — kattalarga 7-9 soat;
// Windred va boshq., Sleep (2024) — muntazamlik davomiylikdan ham muhim; Al Khatib va boshq. (2017) —
// kam uyqudan keyin ~385 kkal ko'p yeyiladi; Spiegel va boshq. (2004) — leptin -18%, grelin +28%;
// Drake va boshq. (2013) — yotishdan 6 soat oldingi kofe ham uyquni ~1 soatga qisqartiradi.
// Uyqu turgan kunga yoziladi: S.days[k].sleep = { bed: "23:30", wake: "07:00", q: 1..5, wakes }.
const LATENCY = 15;  // o'rtacha uxlab qolish vaqti, daqiqa
const CYCLE = 90;    // uyqu sikli, daqiqa
const hm2m = (s) => { const [h, m] = String(s).split(":").map(Number); return h * 60 + m; };
const m2hm = (m) => { m = ((Math.round(m) % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };
const fromNoon = (m) => (m - 720 + 1440) % 1440; // yarim tundan o'tadigan vaqtlarni solishtirish uchun
function fmtDur(m) {
  m = Math.max(0, Math.round(m));
  const h = Math.floor(m / 60), r = m % 60;
  return h ? `${h} soat${r ? ` ${r} daq` : ""}` : `${r} daq`;
}
const HM = /^([01]\d|2[0-3]):[0-5]\d$/;
const validSleep = (sl) => !!sl && HM.test(sl.bed) && HM.test(sl.wake);
/** Buzuq uyqu yozuvlarini (masalan "NaN:NaN") o'chiradi. Biror narsa o'chsa true. */
function cleanSleep(days) {
  let bad = false;
  Object.values(days || {}).forEach((d) => { if (d.sleep && !validSleep(d.sleep)) { delete d.sleep; bad = true; } });
  return bad;
}
/** Uxlangan vaqt, daqiqa (yotishdan turishgacha, uxlab qolish vaqtisiz). */
function sleepDur(sl) { return validSleep(sl) ? Math.max(0, ((hm2m(sl.wake) - hm2m(sl.bed) + 1440) % 1440) - LATENCY) : 0; }
// Kunduzgi mizg'ish: S.days[k].naps = [{ from: "14:00", to: "14:40" }]. O'sha kun uyqusiga (davomiylik, qarz, ball)
// qo'shiladi, lekin muntazamlik va uyqu vaqti faqat tungi uyqudan hisoblanadi; grafik va tarixda alohida ko'rinadi.
const napDur = (n) => (HM.test(n?.from) && HM.test(n?.to) ? Math.max(0, hm2m(n.to) - hm2m(n.from)) : 0);
const napMin = (k) => (S.days[k]?.naps || []).reduce((a, n) => a + napDur(n), 0);
const sleepTotal = (k) => sleepDur(S.days[k]?.sleep) + napMin(k);
/** Shaxsiy norma (daqiqa): yoshga qarab yoki sozlamadan. */
function sleepNeed() {
  if (S.sleepCfg?.need) return S.sleepCfg.need;
  const a = S.profile ? age() : 30;
  return a < 18 ? 540 : a >= 65 ? 450 : 480;
}
const sleepWake = () => S.sleepCfg?.wake || "07:00";
/** Maqsad turish vaqti uchun eng yaxshi yotish vaqti: normaga eng yaqin butun sikllar soni. */
function bestBed(wake = sleepWake()) {
  const c = clamp(Math.round(sleepNeed() / CYCLE), 4, 7);
  return { at: m2hm(hm2m(wake) - LATENCY - c * CYCLE), cycles: c, alt: m2hm(hm2m(wake) - LATENCY - (c + 1) * CYCLE) };
}
const stdev = (a) => { const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length); };
/** Oxirgi 7 kun: o'rtacha uyqu, qarz, muntazamlik (± daqiqa) va dam olish kunlaridagi siljish. */
function sleepStats(k = dkey()) {
  const end = new Date(k + "T12:00");
  const recs = [...Array(7)].map((_, i) => { const d = new Date(end); d.setDate(d.getDate() - i); return { d, sl: S.days[dkey(d)]?.sleep }; }).filter((x) => validSleep(x.sl));
  const need = sleepNeed(), durs = recs.map((x) => sleepTotal(dkey(x.d)));
  const st = { n: recs.length, avg: durs.length ? durs.reduce((a, b) => a + b, 0) / durs.length : 0, debt: durs.reduce((a, d) => a + Math.max(0, need - d), 0), reg: null, jetlag: null };
  if (recs.length >= 3) st.reg = Math.round((stdev(recs.map((x) => fromNoon(hm2m(x.sl.bed)))) + stdev(recs.map((x) => fromNoon(hm2m(x.sl.wake))))) / 2);
  const mid = (sl) => fromNoon(hm2m(sl.bed)) + (sleepDur(sl) + LATENCY) / 2;
  const we = recs.filter((x) => [0, 6].includes(x.d.getDay())), wd = recs.filter((x) => ![0, 6].includes(x.d.getDay()));
  if (we.length && wd.length) st.jetlag = Math.round(we.reduce((a, x) => a + mid(x.sl), 0) / we.length - wd.reduce((a, x) => a + mid(x.sl), 0) / wd.length);
  return st;
}
/** Uyqu balli (0-100): davomiylik 40 + muntazamlik 30 + sifat 20 + vaqt 10. */
function sleepScore(k = dkey()) {
  const sl = S.days[k]?.sleep;
  if (!validSleep(sl)) return 0;
  const d = sleepDur(sl), need = sleepNeed(), st = sleepStats(k);
  const lack = need - d - napMin(k); // mizg'ish davomiylikka qo'shiladi
  const pDur = lack > 0 ? 40 * clamp(1 - lack / 180, 0, 1) : clamp(40 - Math.max(0, -lack - 90) / 6, 20, 40);
  const pReg = st.reg == null ? 20 : 30 * clamp(1 - (st.reg - 30) / 60, 0, 1);
  const pQ = sl.q ? ((sl.q - 1) / 4) * 20 : 12;
  const midClock = (hm2m(sl.bed) + (d + LATENCY) / 2) % 1440, off = Math.min(Math.abs(fromNoon(midClock) - fromNoon(195)), 720); // eng yaxshi o'rta nuqta ~03:15
  const pT = 10 * clamp(1 - Math.max(0, off - 75) / 120, 0, 1);
  return Math.round(pDur + pReg + pQ + pT);
}
const regLabel = (r) => (r == null ? "ma'lumot kam" : r <= 30 ? "a'lo" : r <= 60 ? "o'rtacha" : "yomon");
const CAFFEINE = /kofe|qahva|coffee|espresso|kapuchino|cappuccino|latte|energetik|energy|kola|cola|pepsi/i;
/** Uyqu bo'yicha tavsiyalar: [{p: muhimlik, t: matn}]. */
function sleepTips() {
  if (!S.profile) return [];
  const h = new Date().getHours(), now = h * 60 + new Date().getMinutes(), k = dkey(), sl = S.days[k]?.sleep;
  const st = sleepStats(), need = sleepNeed(), d = sleepDur(sl), bed = bestBed(), tips = [];
  if (sl && d < need - 60 && h < 18) tips.push({ p: 95, t: `😴 Bugun ${fmtDur(d)} uxladingiz. Kam uyqudan keyin ishtaha ~300-400 kkal oshadi: oqsilli nonushta qiling, shirinlik va un mahsulotlariga ehtiyot bo'ling.` });
  if (sl && d < 360 && h >= 12 && h < 15) tips.push({ p: 70, t: "☕ Tushdan keyin charchasangiz, 10-20 daqiqa mizg'ib oling (soat 15:00 gacha). Kofeni 15:00 dan keyin ichmang." });
  if (st.debt >= 240 && h >= 12) tips.push({ p: 80, t: `📉 Haftalik uyqu qarzi ${fmtDur(st.debt)}. Bugun 30-45 daqiqa erta yoting. Dam olish kuni 2 soatdan ortiq ko'p uxlamang.` });
  if (st.n >= 4 && st.reg > 60) tips.push({ p: 75, t: `🕰 Bu hafta yotish va turish vaqtingiz ±${st.reg} daqiqaga o'zgarib turdi. Har kuni bir vaqtda yotish (±30 daq) uyqu davomiyligidan ham muhim.` });
  if (st.jetlag != null && Math.abs(st.jetlag) >= 90) tips.push({ p: 60, t: `📅 Dam olish kunlari uyqungiz ish kunlaridan ${fmtDur(Math.abs(st.jetlag))} ${st.jetlag > 0 ? "kech" : "erta"}. Bu "ijtimoiy jetlag": dushanba kungi charchoqning sababi.` });
  if (sl && d > need + 120) tips.push({ p: 50, t: "🛏 Uzoq uxladingiz. Ko'p uxlash ham charchatishi mumkin: turish vaqtini har kuni bir xil saqlang." });
  const lowQ = [...Array(3)].filter((_, i) => (S.days[dkey(ddays(i))]?.sleep?.q || 5) <= 2).length;
  if (lowQ >= 2) tips.push({ p: 72, t: "😕 Oxirgi kunlarda uyqu sifati past. Xona salqin (16-19°C), qorong'i va jim bo'lsin. 20 daqiqada uxlay olmasangiz, turib tinch ish qiling." });
  const bedM = hm2m(bed.at), toBed = (bedM - now + 1440) % 1440;
  if (h >= 20 && toBed <= 150) tips.push({ p: 85, t: `🌙 ${sleepWake()} da turish uchun eng yaxshi yotish vaqti ${bed.at}. Bir soat oldin ekranni qo'ying, chiroqni xiralashtiring.` });
  const foods = day().food, last = foods.length ? Math.max(...foods.map((f) => f.t)) : 0;
  if (last && h >= 19) {
    const lm = new Date(last).getHours() * 60 + new Date(last).getMinutes();
    if ((bedM - lm + 1440) % 1440 < 120) tips.push({ p: 65, t: "🍽 Oxirgi ovqat yotish vaqtiga 2 soatdan kam qolganda bo'ldi: og'ir ovqat uyquni buzadi. Kechki ovqatni ertaroq yeng." });
  }
  const cof = foods.find((f) => CAFFEINE.test(f.name) && new Date(f.t).getHours() >= 15);
  if (cof && h >= 15) tips.push({ p: 68, t: `☕ «${cof.name}» 15:00 dan keyin: kofein 6 soatgacha ta'sir qiladi va uyquni qisqartiradi.` });
  if (sl && h < 11) tips.push({ p: 30, t: "☀️ Ertalab 10-30 daqiqa kun yorug'ida bo'ling: bu ichki soatni to'g'rilaydi va kechqurun tezroq uxlashga yordam beradi." });
  if (st.n >= 5 && st.reg != null && st.reg <= 30 && Math.abs(st.avg - need) <= 45) tips.push({ p: 20, t: "🌟 Uyqu rejimingiz a'lo: muntazam va yetarli. Shunday davom eting!" });
  if (!sl && h >= 6 && h < 12 && ![1, 2].some((i) => S.days[dkey(ddays(i))]?.sleep)) tips.push({ p: 40, t: "😴 Uyqungizni yozib boring: Qomat uyqu va ishtaha bog'liqligini ko'rsatadi." });
  return tips;
}

// ── Yordamchi UI ────────────────────────────────────
let toastTimer;
function toast(t) {
  const el = $("#toast");
  el.textContent = t;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

const ICONS = {
  chat: '<path d="M4 12a8 8 0 1 1 3.3 6.5L4 19.5l1-3.4A8 8 0 0 1 4 12Z"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10C19.5 15.4 12 20 12 20Z"/><path d="M7.5 12h2.2l1.3-2 2 4 1.3-2h2.2"/>',
  chart: '<path d="M4 19h16M7 16V10M12 16V6M17 16v-4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
  pen: '<path d="M4 20h4L19 9l-4-4L4 16v4ZM14 6l4 4"/>',
  scale: '<path d="M12 4v16M5 20h14M5 8h14M5 8l-2.5 6a2.5 2.5 0 0 0 5 0L5 8Zm14 0-2.5 6a2.5 2.5 0 0 0 5 0L19 8Z"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  send: '<path d="M5 12h13M13 6l6 6-6 6"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  back: '<path d="M15 5 8 12l7 7"/>',
  trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  arrow: '<path d="m9 5 7 7-7 7"/>',
};
function ico(name, size = 22, color = "currentColor") {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
}
$$(".tabs .ico").forEach((el) => (el.innerHTML = ico(el.dataset.i)));

/** Olmacha: ilovaning maskoti. mood: 0..100, outfit: bog'da ochiladigan kiyim. */
function mascot(mood, outfit = S.garden?.outfit) {
  const happy = mood >= 60, sleepy = mood < 25;
  const mouth = happy ? "M86 128 Q100 144 114 128" : sleepy ? "M93 132 Q100 136 107 132" : "M88 130 Q100 138 112 130";
  return `<svg class="mascot" viewBox="0 0 200 200" aria-hidden="true">
    <ellipse cx="100" cy="186" rx="52" ry="7" fill="#000" opacity=".06"/>
    <path d="M100 44c-10-14-30-16-44-8-26 15-30 58-18 94 12 36 36 54 62 50 26 4 50-14 62-50 12-36 8-79-18-94-14-8-34-6-44 8Z" fill="#7BCB6A"/>
    <path d="M100 44c-10-14-30-16-44-8-14 8-22 24-24 44 10-26 40-30 68-14 28-16 58-12 68 14-2-20-10-36-24-44-14-8-34-6-44 8Z" fill="#9BDB86"/>
    <path d="M100 46c0-14 4-24 12-32" stroke="#7A5233" stroke-width="7" stroke-linecap="round" fill="none"/>
    <path d="M112 22c14-10 32-8 40 2-12 10-30 10-40-2Z" fill="#4CAF50"/>
    ${sleepy ? '<path d="M71 106q9 7 18 0M111 106q9 7 18 0" stroke="#2B2A28" stroke-width="4.5" stroke-linecap="round" fill="none"/>'
      : `<ellipse cx="80" cy="104" rx="${happy ? 9 : 8}" ry="11" fill="#2B2A28"/><ellipse cx="120" cy="104" rx="${happy ? 9 : 8}" ry="11" fill="#2B2A28"/>
    <circle cx="83" cy="100" r="3.4" fill="#fff"/><circle cx="123" cy="100" r="3.4" fill="#fff"/>`}
    <ellipse cx="66" cy="124" rx="10" ry="6" fill="#F59A9A" opacity=".55"/>
    <ellipse cx="134" cy="124" rx="10" ry="6" fill="#F59A9A" opacity=".55"/>
    <path d="${mouth}" stroke="#2B2A28" stroke-width="5" stroke-linecap="round" fill="${happy ? "#C94F4F" : "none"}"/>
    ${OUTFIT_SVG[outfit] || ""}
  </svg>`;
}

const OUTFIT_SVG = {
  doppi: `<path d="M62 52 Q64 26 100 21 Q136 26 138 52 Q100 42 62 52Z" fill="#22303A"/>
    <path d="M76 42q5-9 11 0q-6 4-11 0ZM113 42q5-9 11 0q-6 4-11 0ZM95 34q5-8 10 0q-5 4-10 0Z" fill="#fff"/>`,
  sport: `<path d="M37 76 Q100 54 163 76 L161 91 Q100 70 39 91Z" fill="#E85D5D"/><path d="M40 84 Q100 63 160 84" stroke="#fff" stroke-width="3" fill="none"/>`,
  glasses: `<rect x="62" y="91" width="34" height="26" rx="10" fill="#1E2328"/><rect x="104" y="91" width="34" height="26" rx="10" fill="#1E2328"/>
    <path d="M96 100h8M62 99l-14-6M138 99l14-6" stroke="#1E2328" stroke-width="4" stroke-linecap="round"/>
    <path d="M70 97l8 0M112 97l8 0" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>`,
};

// ── Pastdan chiqadigan oyna ──────────────────────────
let sheetKind = ""; // "day": Tarix'dagi kunni tahrirlash oynasi
function openSheet(html, onMount, kind = "") {
  sheetKind = kind;
  $("#sheetBody").innerHTML = html;
  $("#sheetWrap").classList.add("open");
  onMount?.($("#sheetBody"));
}
function closeSheet() {
  $("#sheetWrap").classList.remove("open");
  if (!editDay) return;
  if (sheetKind === "day") { editDay = null; render(); return; } // kun oynasining o'zi yopildi
  // ichidagi oyna (tahrirlash, qo'shish) yopildi: kun oynasi qaytadi
  setTimeout(() => { if (editDay && !$("#sheetWrap").classList.contains("open")) dayEditSheet(editDay); }, 280);
}
$(".sheet-bg").onclick = closeSheet;

// Pastga surib yopish: oyna barmoqqa ergashadi, yetarlicha tortilsa yopiladi
(() => {
  const sh = $(".sheet");
  let x0, y0, dy, t0, drag = null; // drag: null — hali noma'lum, true — pastga surish, false — boshqa harakat
  sh.addEventListener("touchstart", (e) => {
    [x0, y0, dy, t0] = [e.touches[0].clientX, e.touches[0].clientY, 0, Date.now()];
    drag = sh.scrollTop > 0 ? false : null; // ichi aylantirilgan bo'lsa odatiy aylantirish
  }, { passive: true });
  sh.addEventListener("touchmove", (e) => {
    if (drag === false) return;
    const dx = e.touches[0].clientX - x0;
    dy = e.touches[0].clientY - y0;
    if (drag === null) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      drag = dy > 0 && dy > Math.abs(dx); // chizg'ichni yonga surish yoki yuqoriga aylantirish emas
      if (!drag) return;
    }
    e.preventDefault();
    sh.style.transition = "none";
    sh.style.transform = `translateY(${Math.max(0, dy)}px)`;
  }, { passive: false });
  const end = () => {
    if (!drag) return;
    drag = null;
    sh.style.transition = sh.style.transform = "";
    if (dy > 110 || (dy > 40 && dy / (Date.now() - t0) > 0.5)) closeSheet(); // uzoq yoki tez tortilgan
  };
  sh.addEventListener("touchend", end);
  sh.addEventListener("touchcancel", end);
})();

/** Chizg'ich bilan qiymat tanlash (videodagidek). */
function ruler(el, { min, max, step, value, unit, px = 10, label = 10, major = 5, dec = 0, onChange }) {
  const n = Math.round((max - min) / step);
  const labels = [];
  for (let i = 0; i <= n; i += label) labels.push(`<span style="left:${i * px}px">${+(min + i * step).toFixed(dec)}</span>`);
  el.innerHTML = `<div class="ruler">
    <div class="rv"><b></b><span>${esc(unit)}</span></div>
    <div class="rs"><div class="sp"></div><div class="rt" style="width:${n * px + 1}px">${labels.join("")}</div><div class="sp"></div></div>
    <div class="rc"></div></div>`;
  const rs = $(".rs", el), rt = $(".rt", el), out = $(".rv b", el);
  rt.style.backgroundImage = "linear-gradient(to right,#CFCAC0 1.5px,transparent 1.5px),linear-gradient(to right,#9D978C 2px,transparent 2px)";
  rt.style.backgroundSize = `${px}px 20px, ${px * major}px 34px`;
  rt.style.backgroundPosition = "0 10px, 0 3px";
  let cur = value, ready = false;
  const show = () => (out.textContent = cur.toFixed(dec).replace(".", ","));
  requestAnimationFrame(() => {
    const half = rs.clientWidth / 2;
    $$(".sp", el).forEach((s) => (s.style.width = half + "px"));
    rs.scrollLeft = ((value - min) / step) * px;
    ready = true;
  });
  rs.addEventListener("scroll", () => {
    if (!ready) return; // boshlang'ich joylashuvgacha kelgan hodisalar qiymatni buzmasin
    cur = clamp(+(min + Math.round(rs.scrollLeft / px) * step).toFixed(dec), min, max);
    show();
    onChange?.(cur);
  }, { passive: true });
  // sichqoncha bilan sudrash (kompyuterda sinash uchun)
  let drag = null;
  rs.addEventListener("pointerdown", (e) => { if (e.pointerType === "mouse") drag = { x: e.clientX, s: rs.scrollLeft }; });
  addEventListener("pointermove", (e) => { if (drag) rs.scrollLeft = drag.s - (e.clientX - drag.x); });
  addEventListener("pointerup", () => (drag = null));
  show();
  return () => cur;
}

const PICKERS = {
  weight: { title: "Joriy vazn", min: 30, max: 200, step: 0.1, px: 8, label: 50, major: 10, dec: 1, unit: "kg" },
  goal: { title: "Maqsad vazni", min: 30, max: 200, step: 0.5, px: 12, label: 10, major: 2, dec: 1, unit: "kg" },
  height: { title: "Bo'y", min: 120, max: 220, step: 1, px: 12, label: 10, unit: "sm" },
};
function pick(kind, value, done) {
  const c = PICKERS[kind];
  let get;
  openSheet(`<h2>${c.title}</h2><div id="rl"></div><button class="btn" id="ok">${ico("check", 20, "#fff")} Saqlash</button>`, (b) => {
    get = ruler($("#rl", b), { ...c, value });
    $("#ok", b).onclick = () => { closeSheet(); done(get()); };
  });
}

function setWeight(v, k = curKey()) {
  S.weights = S.weights.filter((w) => w.d !== k);
  S.weights.push({ d: k, kg: v });
  S.weights.sort((a, b) => (a.d < b.d ? -1 : 1));
  save();
  render();
  toast(`Vazn saqlandi${k === dkey() ? "" : ` (${dayName(k)})`}: ${kg(v)} kg`);
}

// ── Server (AI) ─────────────────────────────────────
async function api(path, data) {
  // APK: umumiy kalit (kirish va yangilanish uchun) + foydalanuvchi kirish kaliti; Mini App: Telegram imzosi
  const auth = TG ? { "X-Init-Data": TG.initData }
    : CFG.key ? { "X-Vazn-Key": CFG.key, ...(S.auth?.token ? { "X-Vazn-Token": S.auth.token } : {}) } : null;
  if (!CFG.api || !auth) throw new Error("AI serveri hali ulanmagan");
  let r;
  try {
    r = await fetch(CFG.api + path, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth },
      body: JSON.stringify(data),
    });
  } catch {
    throw new Error("Internet yo'q yoki server javob bermadi");
  }
  let j = {};
  try { j = await r.json(); } catch {}
  if (j.limit) setLimit(j.limit);
  if (r.status === 401 && j.login) {
    // kirish kaliti eskirgan yoki raqam tasdiqlanmagan: kirish oynasiga qaytariladi
    S.auth = null;
    persist();
    if (j.bot) tgBot = j.bot;
    render();
  }
  if (!r.ok) throw Object.assign(new Error(j.error || `Server xatosi (${r.status})`), { status: r.status, data: j });
  return j;
}

// ── AI limiti ───────────────────────────────────────
function setLimit(l) {
  S.limit = { left: l.left, total: l.total, d: dkey() };
  persist();
  const el = $("#lim");
  if (el) el.outerHTML = limitBar();
}
function limitBar() {
  const l = S.limit?.d === dkey() ? S.limit : null;
  if (!l) return `<div class="lim" id="lim"><div class="between"><span class="muted">Bugungi Qomat AI so'rovlari</span><span class="muted">…</span></div></div>`;
  const pct = clamp((l.left / l.total) * 100, 0, 100), low = l.left <= 3;
  return `<div class="lim" id="lim"><div class="between"><span class="muted">Bugungi Qomat AI so'rovlari</span>
    <b style="${low ? "color:var(--red)" : ""}">${l.left} / ${l.total} qoldi</b></div>
    <div class="bar"><i style="width:${pct}%;${low ? "background:var(--red)" : ""}"></i></div>
    ${!l.left ? `<small class="muted">Limit tugadi. Ertaga soat 00:00 da yangilanadi.</small>` : low ? `<small class="muted">Limit tugashiga oz qoldi.</small>` : ""}</div>`;
}
// ── Kirish (telefon raqami Telegram orqali tasdiqlanadi) ──
// APK: kod olinadi, Qomat boti ochiladi, foydalanuvchi raqamini yuboradi, ilova kirish kalitini oladi.
// Mini App: foydalanuvchi Telegram orqali taniladi, raqamini bir marta botga yuboradi.
let tgBot = "", loginCode = null, loginUrl = "", loginTimer = null, loginSince = 0;
const signedIn = () => !!(TG ? S.auth : S.auth?.token);

function loginView() {
  const waiting = !!loginCode, web = !TG && !NATIVE;
  $("#screen").innerHTML = `<div class="onb">
    <div style="text-align:center">${mascot(85)}</div>
    <h1>Qomat'ga xush kelibsiz!</h1>
    <p class="lead">${web ? "Qomat'ni Telegram'dagi bot orqali yoki Android ilovasi orqali oching."
      : "Telefon raqamingiz bilan kiring. Ma'lumotlaringiz shu raqamga bog'lanadi: telefon almashsangiz ham hammasi saqlanib qoladi."}</p>
    <div class="grow">${waiting ? `<div class="loader"></div><p class="sub" style="text-align:center">Telegram'da <b>«📱 Raqamni yuborish»</b> tugmasini bosing, so'ng shu yerga qayting.</p>` : ""}</div>
    ${web ? "" : `<button class="btn" id="lgn">${waiting ? "🔄 Telegram'ni qayta ochish" : TG ? "📱 Raqamni tasdiqlash" : "📱 Telegram orqali kirish"}</button>
    <p class="muted" style="text-align:center;font-size:12px;margin:12px 0 0">Raqamingiz faqat kirish va ma'lumotlaringizni saqlash uchun ishlatiladi.</p>`}
  </div>`;
  $("#lgn")?.addEventListener("click", TG ? tgVerify : startLogin);
}

async function startLogin() {
  try {
    if (!loginCode || Date.now() - loginSince > 14 * 60000) {
      const r = await api("/login/start", {});
      [loginCode, loginUrl, loginSince] = [r.code, r.url, Date.now()];
    }
    await upCall("open", { url: loginUrl });
    render();
    pollLogin();
  } catch (e) { toast(e.message); }
}
function pollLogin(now) {
  clearTimeout(loginTimer);
  if (!loginCode || Date.now() - loginSince > 15 * 60000) return;
  loginTimer = setTimeout(async () => {
    try {
      const r = await api("/login/check", { code: loginCode });
      if (r.status === "ok") return loggedIn({ token: r.token, ...r.user });
    } catch {}
    pollLogin();
  }, now ? 0 : 2000);
}

function tgVerify() {
  const w = window.Telegram?.WebApp;
  if (w?.requestContact) w.requestContact(() => waitTgUser());
  else if (tgBot) w?.openTelegramLink ? w.openTelegramLink(tgBot) : open(tgBot);
  waitTgUser();
}
let tgWait;
function waitTgUser(n = 0) {
  clearTimeout(tgWait);
  if (n < 90) tgWait = setTimeout(async () => { if (!(await checkTgUser())) waitTgUser(n + 1); }, 2000);
}
async function checkTgUser() {
  try {
    const r = await api("/me", {});
    if (!S.auth) await loggedIn({ ...r.user, tg: true });
    else await syncPull(); // Mini App'dagi nusxa eskirgan bo'lishi mumkin: avval serverdagisi olinadi
    return true;
  } catch { return false; }
}

async function loggedIn(auth) {
  loginCode = null;
  clearTimeout(loginTimer);
  clearTimeout(tgWait);
  S.auth = auth;
  persist();
  await syncPull();
  render();
  scrollTo(0, 0);
  toast(`Xush kelibsiz! ${auth.phone}`);
  checkInbox();
}

async function logout() {
  if (!confirm("Hisobdan chiqilsinmi? Ma'lumotlaringiz serverda saqlangan, qayta kirganingizda tiklanadi.")) return;
  await pushNow();
  if (S.syncedAt !== S.updatedAt && !confirm("Oxirgi o'zgarishlar serverga yuborilmadi (internet yo'qmi?). Baribir chiqilsinmi?")) return;
  api("/logout", {}).catch(() => {});
  const device = S.device;
  localStorage.removeItem(KEY);
  S = load();
  S.device = device;
  persist();
  render();
}

// ── Sinxronlash: ma'lumotlar raqamga bog'lab serverda ham saqlanadi (suratlarsiz) ──
// Bir hisobga APK ham, Mini App ham kiradi. Server nusxasi qurilma oxirgi ko'rganidan keyin o'zgargan
// bo'lsa (409), ustidan yozilmaydi: ikkala nusxa birlashtiriladi. Qaysi qism o'zgarganini bilish uchun
// oxirgi sinxronlashdagi har bo'lim (va har kun) xeshi `S.syncSig` da turadi.
const SYNC_KEYS = ["profile", "days", "weights", "memory", "advice", "chat", "chatDay", "sleepCfg", "remind", "garden", "gone", "fav"];
function pack() {
  const o = {};
  for (const k of SYNC_KEYS) o[k] = S[k];
  return JSON.parse(JSON.stringify(o, (k, v) => (k === "img" || k === "mid" || k === "foodImg" ? undefined : v)));
}
function hash(v) {
  const s = JSON.stringify(v ?? null);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return h | 0;
}
const OBJ_KEYS = ["profile", "sleepCfg", "remind", "garden"]; // ikkala qurilmada o'zgarsa maydonma-maydon birlashadi
function sigOf(p) {
  const g = { days: {}, f: {} };
  for (const k of SYNC_KEYS) if (k !== "days") g[k] = hash(p[k]);
  for (const [k, d] of Object.entries(p.days || {})) g.days[k] = hash(d);
  for (const k of OBJ_KEYS) if (p[k] && typeof p[k] === "object") g.f[k] = Object.fromEntries(Object.entries(p[k]).map(([f, v]) => [f, hash(v)]));
  return g;
}
/** Suv: har qurilma o'z hisoblagichini yuritadi (wd), jami — yig'indi. Eski versiya faqat water ni o'zgartirgan bo'lsa, farq "_" ga yoziladi. */
const wsum = (wd) => Object.values(wd || {}).reduce((a, n) => a + (+n || 0), 0);
function wfix(d) {
  if (!d) return d;
  d = { ...d, wd: { ...(d.wd || {}) } };
  const diff = (d.water || 0) - wsum(d.wd);
  if (diff) d.wd._ = (d.wd._ || 0) + diff;
  return d;
}
/** Ikkala qurilmada o'zgargan suv: shu qurilmaniki — telefondagi, boshqalarniki — serverdagi (o'zlari yuborgan). */
function mergeWater(l, r) {
  l = wfix(l); r = wfix(r);
  const wd = { ...l.wd, ...r.wd, [S.device]: l.wd[S.device] || 0 };
  if (!(S.device in l.wd)) delete wd[S.device];
  return { wd, water: clamp(wsum(wd), 0, 30) };
}
/** Chat: bir kunda ikkala joyda yozishilsa, xabarlar vaqt bo'yicha qo'shiladi. */
function mergeChat(a = [], b = []) {
  const key = (m) => `${m.t || ""}|${m.role}|${String(m.text).slice(0, 40)}`, seen = new Set(a.map(key));
  return [...a, ...b.filter((m) => !seen.has(key(m)))].map((m, i) => [m, i])
    .sort((x, y) => (x[0].t || 0) - (y[0].t || 0) || x[1] - y[1]).map((x) => x[0]);
}
/** Ro'yxatlarni id bo'yicha qo'shadi (bir xil yozuvda telefondagisi qoladi), vaqt bo'yicha tartiblaydi. */
function byId(a = [], b = []) {
  const m = new Map();
  [...b, ...a].forEach((x) => m.set(x.id ?? JSON.stringify(x), x));
  return [...m.values()].sort((x, y) => (x.t || 0) - (y.t || 0));
}
/** Telefondagi (loc) va serverdagi (rem) nusxani birlashtiradi. O'zgarmagan qism serverdagisi bilan almashadi. */
function mergeData(loc, rem) {
  const sig = S.syncSig || { days: {} };
  rem = { ...rem };
  for (const k of SYNC_KEYS) if (!(k in rem)) rem[k] = loc[k]; // eski versiya bu bo'limni bilmaydi (masalan saqlanganlar): o'zgarmagan deb olinadi
  const mine = (v, h) => h == null || hash(v) !== h; // shu qurilmada o'zgargan (yoki bilib bo'lmaydi)
  const out = {};
  for (const k of SYNC_KEYS) {
    if (k === "days") continue;
    out[k] = loc[k] == null || !mine(loc[k], sig[k]) ? rem[k] : rem[k] == null || hash(rem[k]) === sig[k] ? loc[k] : null;
  }
  // ikkala qurilmada o'zgargan bo'limlar
  if (out.weights === null) {
    const m = new Map();
    [...(rem.weights || []), ...(loc.weights || [])].forEach((w) => m.set(w.d, w));
    out.weights = [...m.values()].sort((a, b) => (a.d < b.d ? -1 : 1));
  }
  if (out.gone === null) out.gone = { ...rem.gone, ...loc.gone };
  for (const k of ["memory", "advice"]) if (out[k] === null) out[k] = (rem[k]?.d || "") > (loc[k]?.d || "") ? rem[k] : loc[k];
  if (out.chat === null || out.chatDay === null) {
    if ((rem.chatDay || "") === (loc.chatDay || "")) { out.chat = mergeChat(loc.chat, rem.chat); out.chatDay = loc.chatDay; }
    else { const r = (rem.chatDay || "") > (loc.chatDay || ""); out.chat = r ? rem.chat : loc.chat; out.chatDay = r ? rem.chatDay : loc.chatDay; }
  }
  for (const k of OBJ_KEYS) {
    const fs = sig.f?.[k];
    if (out[k] !== null || !fs || !loc[k] || !rem[k]) continue; // maydonlar asosi yo'q: pastdagi umumiy qoida
    const o = {};
    for (const f of new Set([...Object.keys(rem[k]), ...Object.keys(loc[k])])) {
      const lv = loc[k][f], rv = rem[k][f], h = fs[f];
      const lc = hash(lv) !== h, rc = hash(rv) !== h; // shu maydon qaysi qurilmada o'zgargan
      const v = lc ? lv : rc ? rv : lv;
      if (v !== undefined) o[f] = v;
    }
    out[k] = o;
  }
  if (out.fav === null) out.fav = { ...rem.fav, ...loc.fav }; // saqlanganlar ikkala qurilmada o'zgargan: qo'shiladi
  // ikkala nusxa o'zgargan: shu qurilmada o'zgargani aniq bo'lsa (asos bor) telefondagisi, asos yo'q bo'lsa
  // (eski versiyadan keyin birinchi birlashtirish) serverdagisi — aks holda eskirgan profil yoki sozlama ustun keladi
  for (const k of SYNC_KEYS) if (out[k] === null) out[k] = sig[k] == null && rem[k] != null ? rem[k] : loc[k];
  const old = Date.now() - 90 * 864e5;
  out.gone = Object.fromEntries(Object.entries(out.gone || {}).filter(([, t]) => t > old));
  if (out.fav) out.fav = Object.fromEntries(Object.entries(out.fav).filter(([k, v]) => !(out.gone[`fav:${k}`] > (v.at || 0))));
  out.days = {};
  for (const k of new Set([...Object.keys(rem.days || {}), ...Object.keys(loc.days || {})])) {
    const l = loc.days?.[k], r = rem.days?.[k], h = sig.days?.[k];
    if (!l || !r) out.days[k] = l || r;
    else if (!mine(l, h)) out.days[k] = r;
    else if (h != null && hash(r) === h) out.days[k] = l;
    else out.days[k] = { ...r, ...l, food: byId(l.food, r.food), act: byId(l.act, r.act), ...mergeWater(l, r),
      ...(l.steps || r.steps ? { steps: Math.max(l.steps || 0, r.steps || 0) } : {}) };
    const d = out.days[k];
    for (const x of ["food", "act"]) if (d[x]) d[x] = d[x].filter((i) => !out.gone[i.id]);
  }
  return out;
}
/** Qaysi ilova (egasining /vazn statistikasi uchun): APK versiya kodi, Mini App'da "tg". */
async function myVer() {
  if (!NATIVE) return "tg";
  try { appVer ??= await upCall("info"); } catch {}
  return appVer?.code || 0;
}
/** Serverdan kelgan ma'lumotni qo'yadi, telefondagi suratlarni id bo'yicha qaytaradi. */
function adopt(data) {
  const imgs = {}; // suratlar serverga yuborilmaydi
  Object.values(S.days).forEach((d) => d.food?.forEach((f) => { if (f.img) imgs[f.id] = { img: f.img, mid: f.mid }; }));
  for (const k of SYNC_KEYS) if (k in data) S[k] = data[k];
  S.days ??= {};
  S.weights ??= [];
  S.chat ??= [];
  Object.values(S.days).forEach((d) => d.food?.forEach((f) => Object.assign(f, imgs[f.id] || {})));
}
/** Server nusxasi telefon oxirgi ko'rganidan keyin o'zgargan: birlashtirib, yangi nusxa sifatida belgilaydi. */
function mergeIn(r) {
  adopt(mergeData(pack(), { days: {}, weights: [], ...r.data }));
  S.syncedAt = r.updated;
  S.syncSig = sigOf(r.data);
  S.updatedAt = Date.now();
  cleanSleep(S.days);
  persist();
  render();
}
let pushTimer, pushing = false, pulled = false; // pulled: serverdagi nusxa olingan, endi yuborsa bo'ladi
let pullTried = false; // shu ochilishda serverdan olishga urinib ko'rildi (kunlik maslahat shundan keyin)
function pushSoon(delay = 4000) {
  if (!signedIn()) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushNow, delay);
}
async function pushNow() {
  clearTimeout(pushTimer);
  if (!signedIn() || !S.updatedAt || S.syncedAt === S.updatedAt || pushing || !pulled) return;
  pushing = true;
  try {
    for (let i = 0; i < 3; i++) {
      const at = S.updatedAt, p = pack();
      try {
        await api("/sync/put", { data: p, updated: at, base: S.syncedAt || 0, ver: await myVer() });
        S.syncedAt = at;
        S.syncSig = sigOf(p);
        persist();
        if (S.updatedAt !== at) pushSoon(); // yuborilayotganda yana o'zgardi
        break;
      } catch (e) {
        if (e.status !== 409 || !e.data?.data) break;
        mergeIn(e.data); // boshqa qurilma ham yozgan: birlashtirib qayta yuboriladi
      }
    }
  } catch {}
  pushing = false;
}
/** Serverdagi nusxani oladi: telefonda o'zgarish bo'lmasa uni qo'yadi, bo'lsa ikkalasini birlashtiradi. */
async function syncPull() {
  if (!signedIn()) return;
  try { await syncPullOnce(); } finally {
    pullTried = true; // muvaffaqiyatsiz bo'lsa ham (internet yo'q): maslahat telefondagi ma'lumot bilan
    if (tab === "kundalik") loadAdvice();
  }
}
async function syncPullOnce() {
  try {
    // have: telefondagi nusxa vaqti. Serverda o'zgarmagan bo'lsa, ma'lumot qayta yuklanmaydi (trafik tejaladi)
    const r = await api("/sync/get", { ver: await myVer(), have: S.syncedAt || 0 });
    pulled = true;
    if (r.same) {
      if (!S.syncSig && S.updatedAt === S.syncedAt) { S.syncSig = sigOf(pack()); persist(); } // yangilanishdan keyin birinchi marta
      return pushNow();
    }
    if (!r.data) {
      if (!S.profile) return;
      S.updatedAt ||= Date.now(); // yangilanishdan oldingi ma'lumot: birinchi marta serverga yuboriladi
      persist();
      return pushNow();
    }
    if (r.updated === S.syncedAt) {
      if (!S.syncSig && S.updatedAt === S.syncedAt) { S.syncSig = sigOf(r.data); persist(); } // yangilanishdan keyin birinchi marta
      return pushNow();
    }
    const had = !!S.profile;
    if (!S.profile || S.updatedAt === S.syncedAt) {
      adopt(r.data);
      S.updatedAt = S.syncedAt = r.updated;
      S.syncSig = sigOf(r.data);
      if (cleanSleep(S.days)) S.updatedAt = Date.now(); // serverdagi buzuq yozuv tozalanib, qaytib yuboriladi
      persist();
      render();
    } else mergeIn(r);
    pushSoon(500);
    if (!had && S.profile) toast("Ma'lumotlaringiz tiklandi ✅");
  } catch {}
}

let limitAsked = "";
function refreshLimit() {
  if (S.limit?.d === dkey() || limitAsked === dkey()) return;
  limitAsked = dkey();
  api("/limit", {}).catch(() => {});
}

// ── 💬 Yordam: Qomat yordamchisi (AI) va jamoa bilan yozishma ──
// Botdagi va ilovadagi xabarlar serverda bitta suhbat. Avval AI javob beradi (m.ai), kerak bo'lsa jamoa qo'shiladi.
// S.supSeen: ko'rilgan oxirgi javob id (faqat telefonda), S.supToast: haqida xabar berilgan oxirgi javob.
// supInfo: human — «👤 Mutaxassis» tugmasi (faqat pullik tarif), escalated — chaqirilgan, ai_on — AI hozir javob beradi.
let sup = [], supAt = 0, supTimer, supInfo = {}, supWait = 0; // supWait: AI javobini shu vaqtgacha kutamiz ("yozmoqda…")
const supUnread = () => sup.filter((m) => m.dir === "out" && m.id > (S.supSeen || 0)).length;
function supSeen() {
  const last = Math.max(0, ...sup.filter((m) => m.dir === "out").map((m) => m.id));
  if (last > (S.supSeen || 0)) { S.supSeen = last; persist(); }
}
function supTake(r) {
  sup = r.items || sup;
  supInfo = r;
  const last = sup[sup.length - 1];
  if (!last || last.dir === "out" || !r.ai_on) supWait = 0; // javob keldi yoki AI jim (jamoa javob beradi)
}
async function loadSup(force) {
  if (!signedIn() || (!force && Date.now() - supAt < 60000)) return;
  supAt = Date.now();
  try { supTake(await api("/support/get", {})); } catch { supAt = 0; return; }
  if (tab === "yordam") return supDraw();
  const fresh = sup.filter((m) => m.dir === "out" && m.id > (S.supSeen || 0));
  if (fresh.length && S.supToast !== fresh[fresh.length - 1].id) {
    S.supToast = fresh[fresh.length - 1].id;
    persist();
    toast("💬 Yordamdan javob keldi: Profil → Yordam");
  }
  if (tab === "profil") render();
}
const supTime = (t) => `${t.slice(0, 10) === dkey() ? "" : fmtDate(t.slice(0, 10)) + " "}${t.slice(11, 16)}`;
function supDraw() {
  const box = $("#supMsgs");
  if (!box) return;
  const typing = supWait > Date.now();
  box.innerHTML = (sup.length ? sup.map((m) => `<div class="msg ${m.dir === "in" ? "user" : "ai"}">${m.dir === "out" ? `<b>${m.ai ? "Qomat yordamchisi 🤖" : "Qomat jamoasi"}</b>\n` : ""}${esc(m.text)}<small class="st">${supTime(m.t)}</small></div>`).join("")
    : `<div class="msg ai">Assalomu alaykum! 👋 Savol, taklif yoki muammo bo'lsa shu yerga yozing. Qomat yordamchisi 🤖 darhol javob beradi, kerak bo'lsa jamoamiz ham qo'shiladi.</div>`)
    + (typing ? `<div class="msg ai muted">Qomat yordamchisi yozmoqda…</div>` : "");
  const hb = $("#supHuman");
  if (hb) hb.innerHTML = supInfo.escalated ? `<p class="muted" style="font-size:13px;margin:10px 0 0">👤 Mutaxassis chaqirildi: tez orada shu yerda javob beradi.</p>`
    : supInfo.human ? `<button class="btn soft" id="supHumanGo" style="margin-top:8px">👤 Mutaxassis bilan gaplashish</button>` : "";
  $("#supHumanGo")?.addEventListener("click", supHuman);
  supSeen();
  scrollTo(0, document.body.scrollHeight);
}
async function supHuman() {
  try { supTake(await api("/support/human", {})); supDraw(); toast("Mutaxassisga yetkazildi ✅"); } catch (e) { toast(e.message); }
}
function viewSupport() {
  return `${subHead("Yordam", "Qomat yordamchisi va jamoasi")}
  <div class="chat" id="supMsgs" style="padding-bottom:12px"></div>
  <section class="card"><label class="field"><textarea id="supTxt" rows="3" maxlength="2000" placeholder="Xabaringizni yozing…"></textarea></label>
    <button class="btn" id="supGo">Yuborish</button><div id="supHuman"></div>
    <p class="muted" style="font-size:12.5px;margin:10px 0 0">Ilova ishlashi, xatolar va takliflar uchun. Ovqat va parhez haqidagi savollarni Chat bo'limidagi Qomat AI ga bering: u kundaligingizni ko'radi.</p></section>`;
}
function bindSupport() {
  $("#back").onclick = () => history.back();
  supDraw();
  loadSup(true);
  $("#supGo").onclick = async () => {
    const text = $("#supTxt").value.trim();
    if (!text) return toast("Xabaringizni yozing");
    $("#supGo").disabled = true;
    sup = [...sup, { id: 0, dir: "in", text, t: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString() }];
    supWait = Date.now() + 60000;
    $("#supTxt").value = "";
    supDraw();
    try {
      supTake(await api("/support/send", { text })); // server AI javobini 20 soniyagacha kutadi
      if (supWait) setTimeout(() => loadSup(true), 6000); // kechiksa: keyingi tekshiruvlarda keladi
      else if (!sup[sup.length - 1]?.ai) toast("Yuborildi ✅ Javob shu yerda va Telegram'da keladi");
    } catch (e) {
      sup = sup.filter((m) => m.id); supWait = 0;
      $("#supTxt").value = text;
      toast(e.message);
    }
    supDraw();
    $("#supGo").disabled = false;
  };
  clearInterval(supTimer);
  supTimer = setInterval(() => { if (tab !== "yordam") return clearInterval(supTimer); if (!document.hidden) loadSup(true); }, 20000);
}

// ── Qomat jamoasidan xabarlar (📬) ──────────────────
// Ilova ochilganda tekshiriladi (ko'pi bilan 10 daqiqada bir marta), o'qilmaganlari oynada bir marta chiqadi
let inbox = [], inboxAt = 0;
async function checkInbox() {
  loadSup();
  if (!signedIn() || !S.profile || Date.now() - inboxAt < 600000) return;
  inboxAt = Date.now();
  try { inbox = (await api("/inbox", {})).items || []; } catch { inboxAt = 0; return; }
  if (tab === "profil") render();
  const fresh = inbox.filter((m) => !m.read);
  if (fresh.length && !$("#sheetWrap").classList.contains("open") && !$(".cam")) inboxSheet(fresh);
}
const msgHtml = (m) => `<div class="card" style="margin-bottom:10px"><p style="margin:0 0 6px;white-space:pre-wrap">${esc(m.text)}</p><small class="hint">${fmtDate(m.t.slice(0, 10))}</small></div>`;
function inboxSheet(list = inbox) {
  openSheet(`<h2>📬 Qomat jamoasidan</h2>${list.length ? list.map(msgHtml).join("") : `<p class="sub">Hozircha xabar yo'q</p>`}
    <button class="btn" id="ok">Tushunarli</button>`, (s) => ($("#ok", s).onclick = () => { closeSheet(); if (tab === "profil") render(); }));
  const ids = list.filter((m) => !m.read).map((m) => m.id);
  if (!ids.length) return;
  list.forEach((m) => (m.read = true));
  api("/inbox/read", { ids }).catch(() => {});
}

/** Rasmni kichraytirib JPEG (data URL) qiladi. */
function shrink(file, max, q = 0.82) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res(c.toDataURL("image/jpeg", q));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("Rasm ochilmadi")); };
    img.src = url;
  });
}

function aiContext() {
  const p = S.profile, n = norms(), t = totals();
  const last7 = [...Array(7)].map((_, i) => { const k = dkey(ddays(6 - i)); const x = totals(k); return `${k}: ${x.eat} kkal yeyildi, harakatda ${x.burn} kkal`; });
  const b = burnParts(), be = burnParts(dkey(), true);
  const foods = day().food.map((f) => `${f.name} (${f.kcal} kkal)`).join(", ") || "hali yo'q";
  return `Jinsi: ${p.sex === "m" ? "erkak" : "ayol"}, yoshi: ${age()}, bo'yi: ${p.height} sm, vazni: ${kg(curWeight())} kg, maqsad: ${kg(p.goal)} kg (${goalType()}).
Faollik: ${ACTIVITY.find((a) => a.v === p.activity)?.t}. BMI: ${bmi().toFixed(1)}.
Sog'lig'i bo'yicha cheklovlar: ${healthText() || "yo'q"}.
Kunlik norma: ${n.kcal} kkal, oqsil ${n.protein} g, yog' ${n.fat} g, uglevod ${n.carbs} g, suv ${n.water} stakan.
Bugun: ${t.eat} kkal yeyildi, harakatda ${t.burn} kkal yoqildi (shundan ${t.steps} qadam yurishda ${t.stepBurn} kkal), oqsil ${t.p} g, yog' ${t.f} g, uglevod ${t.c} g, suv ${t.water} stakan.
Normada kuniga ~${activeIncl()} kkal harakat hisobga olingan, normaga undan ortig'i qo'shiladi: bugun +${t.bonus} kkal, normaga ${n.kcal - t.eat + t.bonus} kkal qoldi.
Bugungi umumiy sarf (taxminiy, hozirgacha): ${b.total} kkal (uyquda ${b.sleep}, uyg'oq tinch holatda ${b.awake}, hazm ${b.tef}, harakat sof ${b.move}); kun oxirigacha ~${be.total} kkal. Bazal almashinuv ${b.bmr} kkal.
Bugungi ovqatlar: ${foods}.
Oxirgi 7 kun: ${last7.join("; ")}.
Vazn tarixi: ${S.weights.slice(-10).map((w) => `${w.d}: ${kg(w.kg)}`).join(", ") || "yo'q"}.
${sleepContext()}${S.memory?.text ? `\nUning odatlari haqida xulosa:\n${S.memory.text}` : ""}`;
}
/** AI dietolog uchun uyqu xulosasi (uyqu bo'limining o'zi AI ishlatmaydi). */
function sleepContext() {
  const sl = day().sleep, st = sleepStats();
  if (!st.n) return "Uyqu: yozilmagan.";
  const nap = napMin(dkey());
  return `Uyqu: ${sl ? `bugun ${fmtDur(sleepDur(sl))} (${sl.bed}–${sl.wake}${sl.q ? `, sifati ${sl.q}/5` : ""})` : "bugun yozilmagan"}${nap ? `, kunduzi ${fmtDur(nap)} mizg'idi` : ""}, norma ${fmtDur(sleepNeed())}, 7 kunlik o'rtacha ${fmtDur(st.avg)}, haftalik qarz ${fmtDur(st.debt)}, muntazamlik ${regLabel(st.reg)}${st.reg != null ? ` (±${st.reg} daq)` : ""}.`;
}

// ── Shaxsiy maslahatchi ─────────────────────────────
/** Oxirgi 14 kun kundaligi (AI uchun matn). */
function historyText() {
  const hm = (t) => new Date(t).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  return [...Array(14)].map((_, i) => {
    const k = dkey(ddays(13 - i)), d = S.days[k];
    if (!d) return `${k}: ma'lumot yo'q`;
    const t = totals(k);
    const foods = d.food.map((f) => `${hm(f.t)} ${f.name} ${f.kcal} kkal${f.pct != null && f.pct < 100 ? ` (${f.pct}% yedi)` : ""}`).join("; ") || "ovqat yozilmagan";
    const acts = d.act.map((a) => a.name).join(", ");
    return `${k}: ${foods}. Jami ${t.eat} kkal, oqsil ${t.p} g, suv ${t.water} stakan, ${t.steps} qadam${acts ? `, faollik: ${acts}` : ""}${
      d.sleep ? `, uyqu ${fmtDur(sleepDur(d.sleep))} (${d.sleep.bed}–${d.sleep.wake})` : ""}${napMin(k) ? `, kunduzi mizg'ish ${fmtDur(napMin(k))}` : ""}`;
  }).join("\n");
}

/** AI'siz tezkor maslahatlar (limit sarflanmaydi). */
function quickTips() {
  const t = totals(), n = norms(), h = new Date().getHours(), left = n.kcal - t.eat + t.bonus, tips = sleepTips();
  const add = (p, text) => tips.push({ p, t: text });
  if (h >= 12 && t.water < n.water * 0.4) add(78, `💧 Bugun hali ${t.water} stakan suv. Hozir 1 stakan iching.`);
  if (h >= 14 && !t.n) add(76, "📸 Bugun hali ovqat yozilmadi. Tushlikni suratga oling.");
  if (left < 0) add(90, `⚠️ Norma ${fmt(-left)} kkal oshdi. 30 daqiqa yurish taxminan ${Math.round(4 * curWeight() * 0.5)} kkal yoqadi.`);
  else if (t.n && left < 400 && h < 19) add(66, `🥗 Normaga ${fmt(left)} kkal qoldi: kechki ovqat yengil bo'lsin (salat, qatiq, tovuq).`);
  if (h >= 17 && t.n && t.p < n.protein * 0.5) add(64, `🥩 Oqsil kam (${t.p} / ${n.protein} g): tuxum, tvorog, tovuq yoki loviya qo'shing.`);
  if (stepInfo?.granted && h >= 17 && t.steps < 5000) add(62, `🚶 Bugun ${fmt(t.steps)} qadam. Kechki 20 daqiqalik sayr yana ~2000 qadam.`);
  const lastW = S.weights[S.weights.length - 1];
  if (!lastW || lastW.d < dkey(ddays(7))) add(45, "⚖️ Vazningizni bir haftadan beri yozmadingiz.");
  return tips.sort((a, b) => b.p - a.p).slice(0, 3).map((x) => x.t);
}

let adviceBusy = false, adviceFailed = "";
async function loadAdvice() {
  const today = dkey();
  // pullTried: avval serverdagi nusxa olinsin, aks holda boshqa qurilmada yozilgan kechagi ovqatlarni AI ko'rmaydi
  if (!S.profile || adviceBusy || S.advice?.d === today || adviceFailed === today || (signedIn() && !pullTried)) return;
  adviceBusy = true;
  const update = !S.memory || S.memory.d < dkey(ddays(7));
  try {
    const r = await api("/advice", { context: aiContext(), history: historyText(), memory: S.memory?.text || "", update_memory: update });
    S.advice = { d: today, tip: r.tip };
    if (update && r.memory) S.memory = { d: today, text: r.memory };
    save();
  } catch { adviceFailed = today; }
  adviceBusy = false;
  if (tab === "kundalik") render();
}

function adviceCard() {
  const tip = S.advice?.d === dkey() ? S.advice.tip : "";
  const quick = quickTips();
  const ask = NATIVE && S.notif == null;
  if (!tip && !quick.length && !adviceBusy && !ask) return "";
  return `<section class="card advice">
    <div class="between"><p class="cap">🍏 Bugungi maslahat</p>${S.memory?.text ? `<button class="muted" id="memInfo" style="font-size:12px">Men haqimda</button>` : ""}</div>
    ${tip ? `<p class="tip">${mdLite(tip)}</p>` : adviceBusy ? `<p class="tip muted">Maslahat tayyorlanmoqda…</p>` : ""}
    ${quick.length ? `<ul>${quick.map((q) => `<li>${esc(q)}</li>`).join("")}</ul>` : ""}
    ${ask ? `<button class="btn soft" id="notifOn" style="margin-top:12px">🔔 Eslatmalarni yoqish</button>` : ""}
  </section>`;
}

// ── Ovqat qo'shish ──────────────────────────────────
function addMenu(meal = null) {
  const k = curKey(), past = k !== dkey();
  pendMeal = meal;
  const all = [
    ["fav", "⭐", "Saqlangan va oxirgilar", "Bir bosishda, AI so'rovisiz"],
    ["db", "📖", "Ovqatlar ro'yxati", `${FOODS.length} ta taom, AI so'rovisiz`],
    ["cam", "📷", "Ovqatni suratga olish", "AI kaloriyasini hisoblaydi"],
    ["gal", "🖼️", "Galereyadan surat", past ? "O'sha kuni olingan surat, AI hisoblaydi" : "Oldin olingan surat"],
    ["text", "✍️", "Yozib qo'shish", "Masalan: \"1 kosa osh va choy\""],
    ["manual", "🍽️", "Qo'lda kiritish", "Kaloriyani o'zim bilaman"],
    ["act", "🏃", "Faollik", "Yurish, sport, ish"],
    ["water", "💧", "1 stakan suv", "250 ml"],
    ["sleep", "😴", "Uyqu", "Yotgan va turgan vaqt"],
    ["weight", "⚖️", "Vaznni yozish", past ? "Shu kungi vazn" : "Bugungi vazn"],
  ].filter(([a]) => !(past && a === "cam") && !(meal && ["act", "water", "sleep", "weight"].includes(a)));
  const title = meal ? `${mealName(meal)}${past ? ` · ${dayName(k)}` : ""}` : past ? `${dayName(k)}ga qo'shish` : "Qo'shish";
  openSheet(`<h2>${title}</h2>${past ? `<p class="sub" style="margin-top:-6px">O'tgan kunga yoziladi${meal ? `, soat ${stamp(k, meal) && clock(new Date(stamp(k, meal)))}` : ""}</p>` : ""}<div class="opts">
    ${all.map(([a, ic, t, sub]) => `<button class="opt" data-a="${a}"><span class="ic">${ic}</span><span><b>${t}</b><small>${sub}</small></span></button>`).join("")}
  </div>`, (b) => {
    $$("[data-a]", b).forEach((x) => (x.onclick = () => {
      const a = x.dataset.a;
      if ((a === "fav" || a === "db") && editDay) { viewDay = editDay; editDay = null; } // sahifa ochiladi: o'sha kunga qo'shadi, orqaga Tarix'ga
      if (a === "fav") openFavs(meal);
      if (a === "db") openFoods(meal);
      if (a === "cam") { closeSheet(); takePhoto("#fileCam", "food"); }
      if (a === "gal") { closeSheet(); takePhoto("#fileGal", "food"); }
      if (a === "text") textFood();
      if (a === "manual") manualFood();
      if (a === "act") activityForm();
      if (a === "water") { closeSheet(); addWater(1); }
      if (a === "sleep") sleepForm(k);
      if (a === "weight") pick("weight", S.weights.find((w) => w.d === k)?.kg || curWeight(), (v) => setWeight(v, k));
    }));
  });
}

// ── Saqlanganlar: ⭐ belgilanganlar, oxirgi va ko'p yeyilgan ovqatlar. AI'siz, bir bosishda qo'shiladi ──
const favKey = (name) => String(name || "").trim().toLowerCase().replace(/[ʻʼ`’‘]/g, "'").replace(/\s+/g, " ");
const isFav = (name) => !!S.fav?.[favKey(name)];
/** Kundalik yozuvidan qayta qo'shiladigan nusxa: to'liq porsiya (foizsiz), suratsiz, vaqtsiz. */
function favCopy(f) {
  const b = { kcal: f.kcal, p: f.p, f: f.f, c: f.c, ...(f.base || {}) };
  const o = { name: f.name, kcal: Math.round(+b.kcal || 0), p: Math.round(+b.p || 0), f: Math.round(+b.f || 0), c: Math.round(+b.c || 0) };
  if (f.items?.length) o.items = f.items.map((i) => ({ ...i }));
  for (const k of ["score", "why", "tip", "warn"]) if (f[k]) o[k] = f[k];
  return o;
}
function toggleFav(f, quiet) {
  const k = favKey(f.name);
  S.fav ??= {};
  if (S.fav[k]) {
    delete S.fav[k];
    (S.gone ??= {})[`fav:${k}`] = Date.now(); // boshqa qurilmadan qaytib kelmasin
    if (!quiet) toast("Saqlanganlardan olib tashlandi");
  } else {
    S.fav[k] = { ...favCopy(f), at: Date.now() };
    if (!quiet) toast(`⭐ Saqlandi: endi bir bosishda qo'shiladi`);
  }
  save();
}
/** Oxirgi 60 kun ovqatlari nomi bo'yicha: necha marta yeyilgan, oxirgi marta qachon va o'sha yozuv. */
function foodStats() {
  const m = new Map(), since = dkey(ddays(60));
  Object.keys(S.days).filter((k) => k >= since).sort().forEach((k) => S.days[k].food?.forEach((f) => {
    const key = favKey(f.name);
    if (!key) return;
    const x = m.get(key) || { n: 0, t: 0 };
    x.n++;
    if (f.t >= x.t) { x.t = f.t; x.f = f; }
    m.set(key, x);
  }));
  return m;
}
/** Porsiyani o'zgartiradi (tarkibi ham mutanosib). */
function scaleFood(f, m) {
  if (m === 1) return { ...f, items: f.items?.map((i) => ({ ...i })) };
  const r = (v) => Math.round((+v || 0) * m), o = { ...f, kcal: r(f.kcal), p: r(f.p), f: r(f.f), c: r(f.c) };
  if (f.items) o.items = f.items.map((i) => ({ ...i, g: r(i.g), k: r(i.k), ...(i.p != null ? { p: r1(i.p * m), f: r1(i.f * m), c: r1(i.c * m) } : {}) }));
  return o;
}

let favTab = "fav", favQ = "", favMeal = null, favRows = [];
function openFavs(meal = null) {
  favMeal = meal;
  favQ = "";
  if (favTab === "fav" && !Object.keys(S.fav || {}).length) favTab = "recent"; // hali saqlangan yo'q: oxirgilar ko'rinsin
  closeSheet();
  openSub("saqlangan");
}
function viewFavs() {
  const K = curKey(), st = foodStats(), q = favKey(favQ);
  let rows;
  if (favTab === "fav") {
    rows = Object.entries(S.fav || {}).map(([key, f]) => ({ key, f, n: st.get(key)?.n || 0, t: f.at || 0, img: st.get(key)?.f.img }))
      .sort((a, b) => b.n - a.n || b.t - a.t);
  } else {
    rows = [...st.entries()].map(([key, x]) => ({ key, f: favCopy(x.f), n: x.n, t: x.t, img: x.f.img }));
    if (favTab === "often") rows = rows.filter((x) => x.n >= 2).sort((a, b) => b.n - a.n || b.t - a.t);
    else rows.sort((a, b) => b.t - a.t);
  }
  if (q) rows = rows.filter((x) => x.key.includes(q));
  favRows = rows.slice(0, 80);
  // kechagi shu ovqat vaqtini takrorlash (masalan, har kuni bir xil nonushta)
  const m = favMeal || mealOf({ t: Date.now() }), prev = new Date(K + "T12:00");
  prev.setDate(prev.getDate() - 1);
  const pk = dkey(prev), again = (S.days[pk]?.food || []).filter((f) => mealOf(f) === m);
  const where = `${favMeal ? mealName(favMeal) : "Kundalik"} · ${K === dkey() ? "bugun" : dayName(K)}`;
  const empty = { fav: ["⭐", "Hali saqlangan ovqat yo'q", "Kundalikdagi ovqat yonidagi ☆ ni yoki AI natijasidagi «⭐ Saqlash»ni bosing. Tez-tez yeydiganlaringiz shu yerda turadi."],
    recent: ["🕘", "Hali ovqat yozilmagan", "Ovqat qo'shganingizdan keyin ular shu yerda chiqadi va bir bosishda qayta qo'shiladi."],
    often: ["🔁", "Hali takrorlangan ovqat yo'q", "Kamida ikki marta yozilgan ovqatlar shu yerda chiqadi."] }[favTab];
  return `${subHead("Saqlanganlar", `AI so'rovi sarflanmaydi · ${where}ga qo'shiladi`)}
  <div class="seg-toggle fav-tabs">${[["fav", "⭐ Saqlangan"], ["recent", "🕘 Oxirgi"], ["often", "🔁 Tez-tez"]].map(([k, t]) => `<button data-ft="${k}" class="${favTab === k ? "on" : ""}">${t}</button>`).join("")}</div>
  <label class="field"><input id="favQ" placeholder="🔎 Qidirish: osh, somsa…" value="${esc(favQ)}" autocomplete="off"></label>
  ${again.length && !q ? `<section class="card again"><div><b>🔁 ${pk === dkey(ddays(1)) && K === dkey() ? "Kechagi" : `${dayName(pk)}dagi`} ${mealName(m).toLowerCase()}</b>
    <small>${esc(again.map((f) => f.name).join(", "))} · ${fmt(again.reduce((a, f) => a + (+f.kcal || 0), 0))} kkal</small></div>
    <button class="btn" id="favAgain">Takrorlash</button></section>` : ""}
  ${favRows.length ? `<section class="card" style="padding:4px 16px">${favRows.map((x, i) => `<div class="item fav-row" data-fp="${i}">
      <span class="th" style="${x.img ? `background-image:url(${x.img})` : ""}">${x.img ? "" : "🍽️"}</span>
      <div><b>${esc(x.f.name)}</b><small>${fmt(x.f.kcal)} kkal${x.f.items?.length > 1 ? ` · ${x.f.items.length} xil` : ""}${x.n > 1 ? ` · ${x.n} marta` : ""}</small></div>
      <div class="row" style="gap:6px"><button class="star ${isFav(x.f.name) ? "on" : ""}" data-fs="${i}" aria-label="Saqlash">${isFav(x.f.name) ? "★" : "☆"}</button>
        <button class="fadd" data-fa="${i}" aria-label="Qo'shish">+</button></div></div>`).join("")}</section>`
    : `<section class="card empty"><div class="ill">${empty[0]}</div><b>${q ? "Topilmadi" : empty[1]}</b><p>${q ? "Boshqacha yozib ko'ring yoki AI bilan hisoblating." : empty[2]}</p></section>`}
  <button class="btn soft" id="toDb" style="margin-top:4px">📖 Ovqatlar ro'yxatidan qidirish${q ? ` «${esc(favQ)}»` : ""}</button>
  <p class="muted" style="text-align:center;font-size:12px;margin:10px 0 0">Qatorni bosing: porsiyani tanlab qo'shasiz</p>`;
}
function bindFavs() {
  $("#toDb").onclick = () => openFoods(favMeal, favQ);
  $("#back").onclick = () => history.back();
  $$("[data-ft]").forEach((b) => (b.onclick = () => { favTab = b.dataset.ft; render(); }));
  const qi = $("#favQ");
  qi.oninput = () => {
    favQ = qi.value;
    const pos = qi.selectionStart;
    render();
    const n = $("#favQ");
    n.focus();
    n.setSelectionRange(pos, pos);
  };
  const add = (f, m = 1) => addFood(scaleFood(f, m), curKey(), favMeal);
  $$("[data-fa]").forEach((b) => (b.onclick = (e) => { e.stopPropagation(); add(favRows[+b.dataset.fa].f); }));
  $$("[data-fs]").forEach((b) => (b.onclick = (e) => { e.stopPropagation(); toggleFav(favRows[+b.dataset.fs].f); render(); }));
  $$("[data-fp]").forEach((b) => (b.onclick = () => {
    const f = favRows[+b.dataset.fp].f;
    let m = 1;
    openSheet(`<h2 style="margin-bottom:2px">${esc(f.name)}</h2><p class="sub">To'liq porsiya ${fmt(f.kcal)} kkal</p>
      <p class="cap">Qancha?</p><div class="pct4" id="pm">${[[0.5, "Yarim"], [1, "1 porsiya"], [1.5, "1,5"], [2, "2 porsiya"]].map(([v, t]) => `<button data-pm="${v}">${t}</button>`).join("")}</div>
      <div class="tot2" id="pt"></div>
      ${f.items?.length ? `<ul class="plist">${f.items.map((i) => `<li><span>${esc(i.n)}${grams(i)}</span><b>${i.k} kkal</b></li>`).join("")}</ul>` : ""}
      <button class="btn" id="pa">${ico("check", 20, "#fff")} Qo'shish</button>`, (sb) => {
      const show = () => {
        const g = scaleFood(f, m);
        $$("[data-pm]", sb).forEach((x) => x.classList.toggle("on", +x.dataset.pm === m));
        $("#pt", sb).innerHTML = [["kcal", "kkal"], ["p", "oqsil, g"], ["f", "yog', g"], ["c", "uglevod, g"]].map(([k, t]) => `<div><b>${fmt(g[k])}</b><small>${t}</small></div>`).join("");
      };
      $$("[data-pm]", sb).forEach((x) => (x.onclick = () => { m = +x.dataset.pm; show(); }));
      $("#pa", sb).onclick = () => { closeSheet(); add(f, m); };
      show();
    });
  }));
  $("#favAgain")?.addEventListener("click", () => {
    const m = favMeal || mealOf({ t: Date.now() }), prev = new Date(curKey() + "T12:00");
    prev.setDate(prev.getDate() - 1);
    const list = (S.days[dkey(prev)]?.food || []).filter((f) => mealOf(f) === m);
    list.forEach((f) => day(curKey()).food.push({ id: uid(), t: stamp(curKey(), m), meal: m, ...favCopy(f) }));
    save();
    history.back();
    toast(`🔁 ${list.length} ta ovqat qayta qo'shildi`);
  });
}

// ── Ovqatlar ro'yxati (foods.js): AI'siz, internetsiz qo'shish ──
const CYR = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "x", ц: "ts", ч: "ch", ш: "sh", щ: "sh", ъ: "", ы: "i", ь: "", э: "e", ю: "yu", я: "ya", ў: "o", қ: "q", ғ: "g", ҳ: "h" };
/** Qidiruv uchun: kichik harf, kirill → lotin, tutuq belgisiz, h = x ("hasip" = "xasip"), sh/ch saqlanadi. */
const fnorm = (t) => String(t || "").toLowerCase().replace(/[а-яёўқғҳ]/g, (c) => CYR[c] ?? c)
  .replace(/[ʻʼ'’‘`]/g, "").replace(/(^|[^sc])h/g, "$1x").replace(/\s+/g, " ").trim();
const FOODS = (() => {
  const out = [];
  let cat = "";
  for (const line of (window.FOODS_RAW || "").split("\n")) {
    if (!line.trim()) continue;
    if (line.startsWith("#")) { cat = line.slice(1).trim(); continue; }
    const [name, alias, k, p, f, c, por] = line.split("|").map((x) => x.trim());
    out.push({ id: out.length, name, cat, k: +k, p: +p, f: +f, c: +c, key: fnorm(`${name} ${alias}`), nk: fnorm(name),
      por: por.split(",").map((x) => { const [l, g] = x.trim().split(":"); return [l, +g]; }) });
  }
  return out;
})();
const FCAT = Object.fromEntries((window.FOOD_CATS || []).map(([c, ic, t]) => [c, { ic, t }]));
/** Ro'yxatdagi taomdan kundalik yozuvi: gramm bo'yicha hisob, tarkibida bitta qator (grammini keyin o'zgartirsa bo'ladi). */
function dbFood(x, g) {
  const v = (n) => (n * g) / 100;
  return { name: x.name, kcal: Math.round(v(x.k)), p: Math.round(v(x.p)), f: Math.round(v(x.f)), c: Math.round(v(x.c)),
    items: [{ n: x.name, g: Math.round(g), k: Math.round(v(x.k)), p: r1(v(x.p)), f: r1(v(x.f)), c: r1(v(x.c)) }], src: "db" };
}

let dbQ = "", dbCat = "", dbMeal = null, dbRows = [];
function openFoods(meal = pendMeal, q = "") {
  dbMeal = meal;
  dbQ = q;
  dbCat = "";
  closeSheet();
  if (SUBS[tab]) { tab = "royxat"; render(); scrollTo(0, 0); } // Saqlanganlardan o'tilsa, orqaga Kundalikka qaytadi
  else openSub("royxat");
}
/** Ro'yxatdan qidirish: avval so'z boshidan mos kelganlar ("osh" → palov, "go'shtli" emas), bo'lmasa so'z ichidan.
 * Bo'sh so'rovda ko'p qo'shganlaringiz tepada, qolgani bo'lim tartibida. */
function foodSearch(text, cat = "", st = foodStats(), loose = true) {
  const q = fnorm(text), words = q.split(" ").filter(Boolean);
  const used = (x) => st.get(favKey(x.name))?.n || 0;
  const starts = (t, w) => t.startsWith(w) || t.includes(" " + w) || t.includes("(" + w);
  const pool = FOODS.filter((x) => !cat || x.cat === cat);
  let rows = pool.filter((x) => words.every((w) => starts(x.key, w)));
  if (!rows.length && loose) rows = pool.filter((x) => words.every((w) => x.key.includes(w)));
  const score = (x) => (x.nk.startsWith(q) ? 3 : words.every((w) => starts(x.nk, w)) ? 2 : 1);
  if (q) rows.sort((a, b) => score(b) - score(a) || used(b) - used(a) || a.name.localeCompare(b.name));
  else rows.sort((a, b) => used(b) - used(a) || 0);
  return rows;
}
function viewFoods() {
  const K = curKey(), st = foodStats(), q = fnorm(dbQ);
  const used = (x) => st.get(favKey(x.name))?.n || 0;
  const rows = foodSearch(dbQ, dbCat, st);
  dbRows = rows;
  const where = `${dbMeal ? mealName(dbMeal) : "Kundalik"} · ${K === dkey() ? "bugun" : dayName(K)}`;
  const row = (x) => { const [l, g] = x.por[0]; return `<div class="item fdb" data-fd="${x.id}"><span class="th">${FCAT[x.cat]?.ic || "🍽️"}</span>
    <div><b>${esc(x.name)}</b><small>${esc(l)} (${g} g) · ${fmt((x.k * g) / 100)} kkal${used(x) ? ` · ${used(x)} marta` : ""}</small></div>
    <button class="fadd" data-fda="${x.id}" aria-label="Qo'shish">+</button></div>`; };
  return `${subHead("Ovqatlar ro'yxati", `${FOODS.length} ta taom · AI so'rovi sarflanmaydi · ${where}ga qo'shiladi`)}
  <label class="field"><input id="fq" placeholder="🔎 Qidirish: osh, somsa, qatiq…" value="${esc(dbQ)}" autocomplete="off"></label>
  <div class="fcats"><button data-fc="" class="${dbCat ? "" : "on"}">Hammasi</button>${(window.FOOD_CATS || []).map(([c, ic, t]) => `<button data-fc="${c}" class="${dbCat === c ? "on" : ""}">${ic} ${t}</button>`).join("")}</div>
  ${q ? `<p class="muted" style="margin:0 4px 8px;font-size:13px">${rows.length} ta taom topildi</p>` : ""}
  ${rows.length ? `<section class="card" style="padding:4px 16px">${rows.map(row).join("")}</section>`
    : `<section class="card empty"><div class="ill">🔎</div><b>Topilmadi</b><p>Boshqacha yozib ko'ring yoki AI bilan hisoblating: u istalgan ovqatni taniydi.</p>
      <button class="btn soft" id="fAi" style="margin-top:12px">✍️ AI bilan hisoblash (1 so'rov)</button></section>`}
  <p class="muted" style="text-align:center;font-size:12px;margin:4px 0 0">Qiymatlar o'rtacha. Qatorni bosing: porsiya yoki grammni tanlaysiz</p>`;
}
function bindFoods() {
  $("#back").onclick = () => history.back();
  const qi = $("#fq");
  qi.oninput = () => {
    dbQ = qi.value;
    const pos = qi.selectionStart;
    render();
    const n = $("#fq");
    n.focus();
    n.setSelectionRange(pos, pos);
  };
  $$("[data-fc]").forEach((b) => (b.onclick = () => { dbCat = b.dataset.fc; render(); }));
  const add = (x, g) => addFood(dbFood(x, g), curKey(), dbMeal);
  $$("[data-fda]").forEach((b) => (b.onclick = (e) => { e.stopPropagation(); const x = FOODS[+b.dataset.fda]; add(x, x.por[0][1]); }));
  $$("[data-fd]").forEach((b) => (b.onclick = () => portionSheet(FOODS[+b.dataset.fd], add)));
  $("#fAi")?.addEventListener("click", () => { pendMeal = dbMeal; textFood(dbQ); });
}
/** Porsiya: o'lchov (kosa, dona…) × soni yoki aniq gramm. */
function portionSheet(x, add) {
  let u = 0, m = 1, g = x.por[0][1];
  openSheet(`<h2 style="margin-bottom:2px">${FCAT[x.cat]?.ic || ""} ${esc(x.name)}</h2>
    <p class="sub">100 g da ${x.k} kkal · oqsil ${x.p} · yog' ${x.f} · uglevod ${x.c} g</p>
    ${x.por.length > 1 ? `<p class="cap">O'lchov</p><div class="choice" style="grid-template-columns:1fr 1fr">${x.por.map(([l, gr], i) => `<button data-pu="${i}">${esc(l)} <small>${gr} g</small></button>`).join("")}</div>` : ""}
    <p class="cap">Nechta? <span class="muted" style="text-transform:none;letter-spacing:0">(${esc(x.por[0][0])} = ${x.por[0][1]} g)</span></p>
    <div class="pct4" style="grid-template-columns:repeat(5,1fr)">${[0.5, 1, 1.5, 2, 3].map((v) => `<button data-pn="${v}">${String(v).replace(".", ",")}</button>`).join("")}</div>
    <div class="between gstep"><span class="muted">Aniq gramm</span><div class="step"><button data-gs="-10" aria-label="Kamaytirish">−</button><input id="pg" inputmode="numeric"><span>g</span><button data-gs="10" aria-label="Ko'paytirish">+</button></div></div>
    <div class="tot2" id="pt"></div>
    <button class="btn" id="pa">${ico("check", 20, "#fff")} Qo'shish</button>`, (b) => {
    const show = (fromInput) => {
      const f = dbFood(x, g);
      $$("[data-pu]", b).forEach((y) => y.classList.toggle("on", +y.dataset.pu === u));
      $$("[data-pn]", b).forEach((y) => y.classList.toggle("on", +y.dataset.pn === m && Math.round(x.por[u][1] * m) === g));
      if (!fromInput) $("#pg", b).value = g;
      $("#pt", b).innerHTML = [["kcal", "kkal"], ["p", "oqsil, g"], ["f", "yog', g"], ["c", "uglevod, g"]].map(([k, t]) => `<div><b>${fmt(f[k])}</b><small>${t}</small></div>`).join("");
      $(".cap .muted", b).textContent = `(${x.por[u][0]} = ${x.por[u][1]} g)`;
    };
    const set = () => { g = Math.round(x.por[u][1] * m); show(); };
    $$("[data-pu]", b).forEach((y) => (y.onclick = () => { u = +y.dataset.pu; set(); }));
    $$("[data-pn]", b).forEach((y) => (y.onclick = () => { m = +y.dataset.pn; set(); }));
    $$("[data-gs]", b).forEach((y) => (y.onclick = () => { g = clamp(g + +y.dataset.gs, 5, 3000); show(); }));
    $("#pg", b).oninput = (e) => { g = clamp(+e.target.value || 0, 0, 3000); show(true); };
    $("#pa", b).onclick = () => { if (!(g > 0)) return toast("Grammni kiriting"); closeSheet(); add(x, g); };
    show();
  });
}

/** Kalendar: istalgan o'tgan kunni tanlash. Ovqat yozilgan kunlar nuqta bilan belgilanadi. */
function calSheet(k, month, onPick = setDay) {
  const today = dkey(), base = month || new Date(k + "T12:00");
  const y = base.getFullYear(), m = base.getMonth(), first = (new Date(y, m, 1).getDay() + 6) % 7, nd = new Date(y, m + 1, 0).getDate();
  const key = (d) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const cells = Array(first).fill("<span></span>").concat([...Array(nd)].map((_, i) => {
    const dk = key(i + 1), dd = S.days[dk];
    const has = dd && (dd.food?.length || dd.act?.length || dd.water);
    return `<button class="${dk === k ? "sel" : ""} ${dk === today ? "today" : ""}" data-cd="${dk}" ${dk > today ? "disabled" : ""}>${i + 1}${has ? "<i></i>" : ""}</button>`;
  })).join("");
  const next = new Date(y, m + 1, 1) <= new Date();
  openSheet(`<div class="between" style="margin-bottom:10px"><button class="icon-btn" id="cPrev" aria-label="Oldingi oy">‹</button>
      <h2 style="margin:0">${MONTHS[m][0].toUpperCase() + MONTHS[m].slice(1)}, ${y}</h2>
      <button class="icon-btn" id="cNext" aria-label="Keyingi oy" ${next ? "" : "disabled"}>›</button></div>
    <div class="cal wd">${["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"].map((x) => `<span>${x}</span>`).join("")}</div>
    <div class="cal">${cells}</div>
    <p class="muted" style="font-size:13px;margin:12px 0">Nuqta: shu kuni yozuv bor. ${onPick === setDay ? "Kunni bosing: Kundalik o'sha kunni ko'rsatadi." : "Kunni bosing: shu yerda tahrirlaysiz."}</p>
    <button class="btn" id="cToday">${onPick === setDay ? "Bugunga qaytish" : "Bugun"}</button>`, (b) => {
    $$("[data-cd]", b).forEach((x) => (x.onclick = () => onPick(x.dataset.cd)));
    $("#cPrev", b).onclick = () => calSheet(k, new Date(y, m - 1, 1), onPick);
    $("#cNext", b).onclick = () => next && calSheet(k, new Date(y, m + 1, 1), onPick);
    $("#cToday", b).onclick = () => onPick(onPick === setDay ? null : dkey());
  });
}

async function onPhoto(file) {
  if (!file) return;
  let big, thumb, mid;
  try {
    big = await shrink(file, 1024);
    thumb = await shrink(file, 180, 0.7);
    mid = await shrink(file, 640, 0.72);
  } catch (e) { return toast(e.message); }
  openSheet(`<div class="food-res"><img class="photo" src="${big}"><div class="loader"></div><p class="sub">Qomat AI ovqatni tahlil qilmoqda…</p></div>`);
  try {
    const r = await askFood({ image: big });
    showFood(r, { thumb, big, mid });
  } catch (e) {
    openSheet(`<h2>Tahlil bo'lmadi</h2><p class="sub">${esc(e.message)}</p><div class="opts">
      <button class="btn" id="m">Qo'lda kiritish</button><button class="btn ghost" id="c">Yopish</button></div>`, (b) => {
      $("#m", b).onclick = () => manualFood();
      $("#c", b).onclick = closeSheet;
    });
  }
}
// surat qayerga ketadi: "food" (kundalik), "chat" yoki "left" (ovqat qoldig'i)
let photoMode = "food";
function photoDone(file) {
  if (photoMode === "chat") chatPhoto(file);
  else if (photoMode === "left") leftPhoto(file);
  else onPhoto(file);
}
// Kamera ilovaning o'zida ochiladi (APK va Telegram): limit, chiroq, ramka va tezkor yo'llar ko'rinadi.
// Telegram'da <input capture> ko'pincha kamera o'rniga galereyani ochadi. Ochilmasa telefonning kamera ilovasi.
let camFail = false; // shu safar ilova ichidagi kamera ochilmadi: keyingisi darrov telefon kamerasi
function liveCamera(stream, mode) {
  return new Promise((resolve) => {
    const box = document.createElement("div");
    box.className = "cam";
    const l = S.limit?.d === dkey() ? S.limit : null;
    const title = mode === "left" ? "Qolgan ovqatni suratga oling" : mode === "chat" ? "Suratga oling"
      : pendMeal ? `${mealName(pendMeal)}ni suratga oling` : "Ovqatni suratga oling";
    const chips = mode === "food" ? [["gal", "🖼️", "Galereya"], ["fav", "⭐", "Saqlangan"], ["db", "📖", "Ro'yxat"], ["text", "✍️", "Yozish"]] : [["gal", "🖼️", "Galereya"]];
    box.innerHTML = `<video autoplay playsinline muted></video>
      <div class="cam-top"><button class="cam-x" aria-label="Yopish">${ico("back", 22, "#fff")}</button>
        <div class="cam-t"><b>${title}</b>${l ? `<span>🍏 Qomat AI: bugun ${l.left} ta qoldi</span>` : ""}</div>
        <button class="cam-fl" aria-label="Chiroq" hidden>🔦</button></div>
      <div class="cam-frame"><i></i><i></i><i></i><i></i></div>
      <p class="cam-hint">${mode === "left" ? "Avvalgi suratdagidek, xuddi shu likopchani oling" : "Likopcha to'liq ramkaga sig'sin, yorug' joyda oling"}</p>
      <div class="cam-chips">${chips.map(([a, ic, t]) => `<button data-ca="${a}">${ic} ${t}</button>`).join("")}</div>
      <button class="cam-shot" aria-label="Suratga olish"></button>`;
    document.body.appendChild(box);
    const v = $("video", box), track = stream.getVideoTracks()[0];
    v.srcObject = stream;
    const finish = (file) => { stream.getTracks().forEach((t) => t.stop()); box.remove(); resolve(file); };
    $(".cam-x", box).onclick = () => finish(null);
    // chiroq: telefon qo'llasa (Android Chrome/WebView)
    let torch = false;
    setTimeout(() => { try { if (track?.getCapabilities?.().torch) $(".cam-fl", box).hidden = false; } catch {} }, 600);
    $(".cam-fl", box).onclick = () => {
      torch = !torch;
      track.applyConstraints({ advanced: [{ torch }] }).catch(() => {});
      $(".cam-fl", box).classList.toggle("on", torch);
    };
    $$("[data-ca]", box).forEach((b) => (b.onclick = () => {
      const a = b.dataset.ca;
      finish(null);
      if (a === "gal") $("#fileGal").click();
      if (a === "fav") openFavs(pendMeal);
      if (a === "db") openFoods(pendMeal);
      if (a === "text") textFood();
    }));
    $(".cam-shot", box).onclick = () => {
      if (!v.videoWidth) return;
      const c = Object.assign(document.createElement("canvas"), { width: v.videoWidth, height: v.videoHeight });
      c.getContext("2d").drawImage(v, 0, 0);
      c.toBlob((b) => finish(b && new File([b], "kamera.jpg", { type: "image/jpeg" })), "image/jpeg", 0.9);
    };
  });
}

const takePhoto = async (sel, mode) => {
  photoMode = mode;
  if (sel !== "#fileCam" || !(TG || NATIVE) || camFail || !navigator.mediaDevices?.getUserMedia) return $(sel).click();
  refreshLimit();
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia(
      { video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
  } catch {
    camFail = true;
    // telefon kamerasini dastur o'zi ocha olmaydi (bosish kerak): tugma bilan taklif qilinadi
    return openSheet(`<h2>Kamera ochilmadi</h2><p class="sub">${TG ? "Telegram sozlamalarida kameraga ruxsat bering yoki telefonning kamerasidan foydalaning."
      : "Ovqatni suratga olish uchun Qomat'ga kamera ruxsati kerak. Quyidagi tugmani bosing va «Ruxsat berish»ni tanlang. So'ramasa: Sozlamalar → Ilovalar → Qomat → Ruxsatlar → Kamera."}</p>
      <button class="btn" id="sysCam">📷 ${TG ? "Telefon kamerasini ochish" : "Kamerani ochish"}</button>
      <button class="btn ghost" id="sysGal" style="margin-top:8px">🖼️ Galereyadan tanlash</button>`, (b) => {
      $("#sysCam", b).onclick = () => { closeSheet(); $("#fileCam").click(); };
      $("#sysGal", b).onclick = () => { closeSheet(); $("#fileGal").click(); };
    });
  }
  const file = await liveCamera(stream, mode);
  if (file) photoDone(file);
};
$$("#fileCam, #fileGal").forEach((i) => (i.onchange = (e) => {
  const f = e.target.files[0];
  e.target.value = "";
  photoDone(f);
}));

// Yozib kiritish: tezkor so'zlar, miqdor bo'yicha maslahat va ro'yxatda bor bo'lsa AI'siz qo'shish taklifi
const TWORDS = ["+ 1 kosa", "+ 1 likopcha", "+ 1 dona", "+ 2 bo'lak non", "+ 1 piyola choy", "+ 1 stakan", "shakarsiz", "yarim porsiya", "qovurilgan", "yog'li"];
function textFood(pre = "") {
  const meal = pendMeal;
  openSheet(`<h2>${meal ? `${mealName(meal)}: nima yedingiz?` : "Nima yedingiz?"}</h2>
    <label class="field"><textarea id="t" rows="3" placeholder="Masalan: 2 ta tandir somsa va 1 piyola ko'k choy">${esc(pre)}</textarea></label>
    <div class="tw">${TWORDS.map((w) => `<button data-tw="${esc(w)}">${esc(w)}</button>`).join("")}</div>
    <div id="tsug"></div>
    <div class="thint"><b>💡 Miqdorini yozing: hisob aniqroq chiqadi</b>
      <span class="no">✗ Somsa va choy</span><span class="ok">✓ 2 ta tandir somsa, 1 piyola shakarsiz choy</span></div>
    <button class="btn" id="go">🍏 Qomat AI bilan hisoblash</button>
    <small class="hint" style="display:block;text-align:center;margin-top:8px">${aiCost()}</small>`, (b) => {
    const t = $("#t", b);
    // ro'yxatda bor taom: AI'siz qo'shish taklifi (yozilgan matn qisqa bo'lsa)
    const suggest = () => {
      const v = t.value.trim(), short = v && v.split(/\s+/).length <= 3 && !/[,+]| va /.test(v);
      const rows = short ? foodSearch(v, "", foodStats(), false).slice(0, 3) : [];
      $("#tsug", b).innerHTML = rows.length ? `<p class="cap" style="margin:4px 0 6px">Ro'yxatda bor: AI so'rovisiz</p>${rows.map((x) => {
        const [l, g] = x.por[0];
        return `<button class="tsug" data-ts="${x.id}"><span>${FCAT[x.cat]?.ic || "🍽️"} <b>${esc(x.name)}</b></span><small>${esc(l)} · ${fmt((x.k * g) / 100)} kkal</small></button>`;
      }).join("")}` : "";
      $$("[data-ts]", b).forEach((x) => (x.onclick = () => portionSheet(FOODS[+x.dataset.ts], (f, g) => addFood(dbFood(f, g), curKey(), meal))));
      // hammasi ro'yxatda topilsa, tugma AI'siz hisoblaydi
      const loc = localFood(v);
      $("#go", b).textContent = loc ? `✅ Hisoblash: ${fmt(loc.reduce((a, x) => a + x.k, 0))} kkal, AI so'rovisiz` : "🍏 Qomat AI bilan hisoblash";
      $(".hint", b).textContent = loc ? "Hammasi ovqatlar ro'yxatida topildi" : aiCost();
    };
    t.oninput = suggest;
    $$("[data-tw]", b).forEach((x) => (x.onclick = () => {
      const w = x.dataset.tw, v = t.value.trim();
      // "+ 1 kosa" yangi qism sifatida (vergul bilan), "shakarsiz" oldingi so'zga qo'shiladi
      t.value = !v ? w.replace(/^\+ /, "") : w.startsWith("+") ? `${v.replace(/,$/, "")}, ${w.slice(2)}` : `${v} ${w}`;
      t.focus();
      suggest();
    }));
    setTimeout(() => t.focus(), 300);
    suggest();
    $("#go", b).onclick = async () => {
      const text = t.value.trim();
      if (!text) return t.focus();
      const loc = localFood(text);
      if (loc) return localSheet(text, loc, meal);
      aiTextFood(text);
    };
  });
}
async function aiTextFood(text) {
  openSheet(`<div class="loader"></div><p class="sub">Qomat AI hisoblamoqda…</p>`);
  try { showFood(await askFood({ text }), { text }); }
  catch (e) { closeSheet(); toast(e.message); }
}

// ── Yozilgan ovqatni AI'siz hisoblash ───────────────
// "2 ta somsa, 1 piyola ko'k choy" → qismlarga bo'linadi, har birida miqdor, o'lchov va taom ro'yxatdan topiladi.
// Biror qism topilmasa yoki o'lchovi noma'lum bo'lsa null: matn AI'ga yuboriladi (taxminiy emas, aniq mos kelsagina).
const NUMW = { bir: 1, ikki: 2, uch: 3, tort: 4, besh: 5, olti: 6, yetti: 7, sakkiz: 8, toqqiz: 9, on: 10, yarim: 0.5, chorak: 0.25 };
const UNITW = { ta: "dona", tarelka: "likopcha", qoshiq: "osh qoshiq", chashka: "piyola" }; // so'zlashuvdagi o'lchovlar
const UNIT_G = { kosa: 350, likopcha: 300, piyola: 150, stakan: 250, chashka: 200, "osh qoshiq": 15, "choy qoshiq": 5 };
const MASS = { g: 1, gr: 1, gramm: 1, ml: 1, kg: 1000, l: 1000, litr: 1000 };
const STOPW = new Set(["yedim", "ichdim", "yegandim", "edi", "bilan", "porsiya", "porsiyasi", "taxminan"]);
let UNITS = null;
const UNIT_SHOW = {}; // o'lchovning yozilishi: "bolak" → "bo'lak"
function unitList() {
  if (UNITS) return UNITS;
  const all = new Set(Object.keys(UNIT_G));
  FOODS.forEach((x) => x.por.forEach(([l]) => {
    const u = fnorm(l);
    if (/\d/.test(l) || NUMW[u]) return; // "yarim", "chorak" son sifatida
    all.add(u);
    UNIT_SHOW[u] ??= l;
  }));
  return (UNITS = [...all].sort((a, b) => b.split(" ").length - a.split(" ").length)); // "osh qoshiq" "osh" dan oldin
}
function localPart(part, st) {
  let w = fnorm(part).replace(/(\d)[.,](\d)/g, "$1.$2").replace(/(\d)([a-z])/g, "$1 $2").split(" ").filter(Boolean);
  let qty = null, unit = "", mass = 0, massW = "";
  const units = unitList();
  for (let i = 0; i < w.length;) {
    const two = w.slice(i, i + 2).join(" "), x = w[i];
    if (/^\d+(\.\d+)?$/.test(x)) { qty = (qty ?? 1) * +x; i++; continue; }
    if (NUMW[x] != null && !(x === "yarim" || x === "chorak") ) { qty = (qty ?? 1) * NUMW[x]; i++; continue; }
    if (MASS[x] && qty != null && !mass) { mass = qty * MASS[x]; massW = x; i++; continue; }
    const u = units.includes(two) ? two : units.includes(x) || UNITW[x] ? x : "";
    if (u && !unit) { unit = UNITW[u] || u; i += u.split(" ").length; continue; }
    i++;
  }
  // taom nomi: son, o'lchov va keraksiz so'zlarsiz qolgan so'zlar
  const skip = new Set([...Object.keys(MASS), ...Object.keys(UNITW), ...STOPW]);
  let name = ` ${w.join(" ")} `;
  if (unit) name = name.replace(` ${unit} `, " ");
  const q = name.split(" ").filter((x) => x && !/^\d/.test(x) && !(NUMW[x] != null && x !== "yarim" && x !== "chorak") && !skip.has(x) && x !== unit);
  const half = q.filter((x) => x === "yarim" || x === "chorak");
  const words = q.filter((x) => x !== "yarim" && x !== "chorak");
  if (!words.length) return null;
  const opts = foodSearch(words.join(" "), "", st, false).slice(0, 4);
  if (!opts.length) return null;
  const grams = (x) => {
    if (mass) return mass;
    const n = qty ?? 1, por = (l) => x.por.find(([pl]) => fnorm(pl) === l)?.[1];
    if (half.length && !unit) { const g = por(half[0]); if (g) return g * n; } // obi non: "yarim" o'zi o'lchov
    const m = half.reduce((a, h) => a * NUMW[h], 1);
    if (unit) { const g = por(unit) || UNIT_G[unit]; return g ? g * n * m : 0; }
    return (por("dona") || x.por[0][1]) * n * m;
  };
  const label = mass ? `${String(qty).replace(".", ",")} ${massW}`
    : [qty != null ? String(qty).replace(".", ",") : "", ...half, UNIT_SHOW[unit] || unit].filter(Boolean).join(" ");
  const pick = opts.find((x) => grams(x) > 0);
  if (!pick) return null;
  return { text: part.trim(), opts: opts.filter((x) => grams(x) > 0), grams, label };
}
function localFood(text) {
  const parts = String(text || "").split(/(?<!\d),|,(?!\d)|[;+\n]| va /i).map((x) => x.trim()).filter(Boolean);
  if (!parts.length || parts.length > 8) return null;
  const st = foodStats(), out = [];
  for (const p of parts) {
    const r = localPart(p, st);
    if (!r) return null;
    const x = r.opts[0], g = Math.round(r.grams(x));
    out.push({ ...r, x, g, k: (x.k * g) / 100 });
  }
  return out;
}
/** AI'siz hisob natijasi: har qatorda taomni almashtirsa bo'ladi, xohlasa AI bilan qayta hisoblaydi. */
function localSheet(text, rows, meal) {
  const sum = () => {
    const items = rows.map((r) => dbFood(r.x, r.g).items[0]);
    const tot = (k) => Math.round(items.reduce((a, i) => a + i[k], 0));
    const names = rows.map((r) => r.x.name.replace(/ \(.*\)$/, ""));
    return { name: names.length > 3 ? `${names.slice(0, 3).join(", ")} va boshqalar` : names.join(", "), kcal: tot("k"), p: tot("p"), f: tot("f"), c: tot("c"), items, src: "db" };
  };
  openSheet(`<div class="food-res"><h2 style="margin-bottom:4px">Ro'yxatdan hisoblandi</h2>
    <p class="sub" style="margin:0">AI so'rovi sarflanmadi. Taom boshqacha bo'lsa, tanlab almashtiring.</p>
    <div class="tot" id="lt"></div>
    <div id="lrows">${rows.map((r, i) => `<label class="field"><span>${esc(r.text)}</span><select data-li="${i}">${r.opts.map((x, j) => `<option value="${j}">${esc(x.name)}</option>`).join("")}</select><small class="muted" id="lg${i}"></small></label>`).join("")}</div>
    <button class="btn" id="add">${ico("check", 20, "#fff")} Kundalikka qo'shish</button>
    <button class="btn ghost" id="lai" style="margin-top:8px">🍏 Baribir Qomat AI bilan hisoblash</button>
    <small class="hint" style="display:block;text-align:center;margin-top:6px">${aiCost()}</small></div>`, (b) => {
    const show = () => {
      const f = sum();
      $("#lt", b).innerHTML = [["kcal", "kkal"], ["p", "oqsil, g"], ["f", "yog', g"], ["c", "uglevod, g"]].map(([k, t]) => `<div><b>${fmt(f[k])}</b><small>${t}</small></div>`).join("");
      rows.forEach((r, i) => ($(`#lg${i}`, b).textContent = `${r.label ? r.label + " · " : ""}${fmt(r.g)} g · ${fmt(Math.round((r.x.k * r.g) / 100))} kkal`));
    };
    $$("[data-li]", b).forEach((el) => (el.onchange = () => {
      const r = rows[+el.dataset.li];
      r.x = r.opts[+el.value];
      r.g = Math.round(r.grams(r.x));
      show();
    }));
    $("#add", b).onclick = () => { addFood(sum(), curKey(), meal); closeSheet(); };
    $("#lai", b).onclick = () => { pendMeal = meal; aiTextFood(text); };
    show();
  });
}

const askFood = (o) => api("/food", { ...o, profile: healthText() });
const r1 = (v) => Math.round((+v || 0) * 10) / 10;
const grams = (i) => (i.g ? ` · ${i.g} g` : "");
/** AI javobini kundalik yozuviga o'tkazadi (m: porsiya). Tarkib, baho va izoh ham saqlanadi. */
function foodFromAI(r, m = 1) {
  return {
    name: r.name, kcal: Math.round(r.kcal * m), p: Math.round(r.protein * m), f: Math.round(r.fat * m), c: Math.round(r.carbs * m),
    items: (r.items || []).slice(0, 12).map((i) => ({
      n: i.name, g: Math.round((+i.grams || 0) * m), k: Math.round((+i.kcal || 0) * m),
      ...(i.protein != null ? { p: r1(i.protein * m), f: r1(i.fat * m), c: r1(i.carbs * m) } : {}), // 2-yangilanishgacha faqat jami bor edi
    })),
    ...(r.score ? { score: r.score, why: r.score_note || "" } : {}),
    ...(r.comment ? { tip: r.comment } : {}),
    ...(r.warning ? { warn: r.warning } : {}),
  };
}
/** Oldingi hisob (to'liq porsiya): AI izoh bo'yicha shuni to'g'irlaydi. */
function foodPrev(f) {
  const items = (f.items || []).map((i) => `${i.n}${i.g ? ` ${i.g} g` : ""} ${i.k} kkal`).join(", ");
  return `${f.name}: ${items || "tarkibi yozilmagan"}. Jami ${f.kcal} kkal, oqsil ${f.p} g, yog' ${f.f} g, uglevod ${f.c} g.`;
}
const SCORE_T = ["", "zararli", "past", "o'rtacha", "yaxshi", "a'lo"];
/** Foydalilik bahosi: 1-5 ta olma. */
function apples(n) {
  return `<span class="apples" title="Foydaliligi: ${SCORE_T[n]}">${"🍏".repeat(n)}${"<i>🍏</i>".repeat(5 - n)}</span>`;
}
const xe = (c) => String(Math.round((c / 12) * 10) / 10).replace(".", ","); // 1 XE = 12 g uglevod
/** Bitta AI so'rovi qancha qolganini oldindan ko'rsatadi. */
function aiCost() {
  const l = S.limit?.d === dkey() ? S.limit : null;
  return `1 ta AI so'rovi${l ? ` · bugun ${l.left} ta qoldi` : ""}`;
}
function redoBox() {
  return `<div class="redo"><b>✏️ AI nimanidir sezmadimi?</b>
    <textarea id="note" rows="2" maxlength="300" placeholder="Masalan: non kepakli, ustiga sariyog' surilgan"></textarea>
    <button class="btn soft" id="redo">🔄 Izoh bilan qayta hisoblash</button><small class="hint" style="text-align:center">${aiCost()}</small></div>`;
}
/** "Qayta hisoblash" tugmasi: izoh bo'sh bo'lsa so'raydi, kutish paytida tugmani o'chirib turadi. */
function bindRedo(b, run) {
  const btn = $("#redo", b), note = $("#note", b);
  btn.onclick = async () => {
    const t = note.value.trim();
    if (!t) { note.focus(); return toast("Avval izoh yozing: AI nimani hisobga olmadi?"); }
    btn.disabled = true;
    btn.textContent = "AI qayta hisoblamoqda…";
    try { await run(t); } catch (e) {
      toast(e.message);
      btn.disabled = false;
      btn.textContent = "🔄 Izoh bilan qayta hisoblash";
    }
  };
}
function foodWarn(f) { return f.warn ? `<div class="warn">⚠️ ${esc(f.warn)}</div>` : ""; }

/** AI natijasi: tasdiqlash (kerak bo'lsa izoh bilan qayta hisoblash) va kundalikka qo'shish. */
function showFood(r, ctx = {}) {
  if (!r.is_food) {
    return openSheet(`<h2>Ovqat topilmadi</h2><p class="sub">Suratda ovqat ko'rinmadi. Boshqa surat olib ko'ring yoki qo'lda kiriting.</p>
      <button class="btn" id="m">Qo'lda kiritish</button>`, (b) => ($("#m", b).onclick = () => manualFood()));
  }
  const f = foodFromAI(r);
  openSheet(`<div class="food-res">${ctx.big ? `<img class="photo" src="${ctx.big}">` : ""}
    <h2 style="margin-bottom:4px">${esc(f.name)}</h2>
    ${f.score ? `<p class="sub" style="margin:0">${apples(f.score)} ${esc(f.why)}</p>` : ""}
    <div class="tot"><div><b>${f.kcal}</b><small>kkal</small></div><div><b>${f.p}</b><small>oqsil, g</small></div><div><b>${f.f}</b><small>yog', g</small></div><div><b>${f.c}</b><small>uglevod, g</small></div></div>
    <ul>${f.items.map((i) => `<li><span>${esc(i.n)}${grams(i)}</span><b>${i.k} kkal</b></li>`).join("")}</ul>
    ${foodWarn(f)}
    ${f.tip ? `<div class="tip">💡 ${esc(f.tip)}</div>` : ""}
    ${redoBox()}
    <label class="field"><span>Porsiya</span><select id="por"><option value=".5">Yarim porsiya</option><option value="1" selected>To'liq (AI taxmini)</option><option value="1.5">1,5 porsiya</option><option value="2">2 porsiya</option></select></label>
    <button class="btn" id="add">${ico("check", 20, "#fff")} Kundalikka qo'shish</button>
    <button class="btn ghost" id="fst" style="margin-top:8px"></button></div>`, (b) => {
    let star = isFav(r.name);
    const stl = () => ($("#fst", b).textContent = star ? "★ Saqlanganlarda turadi" : "☆ Saqlanganlarga ham qo'shish");
    $("#fst", b).onclick = () => { star = !star; stl(); };
    stl();
    bindRedo(b, async (note) => {
      // matn bilan kiritilgan bo'lsa, asl matn izoh bilan birga qayta yuboriladi
      const text = [ctx.text, note].filter(Boolean).join(". ");
      const r2 = await askFood({ ...(ctx.big ? { image: ctx.big } : {}), text, prev: foodPrev(f) });
      showFood(r2, { ...ctx, ...(ctx.text ? { text } : {}) });
      if (r2.is_food) toast(`Qayta hisoblandi: ${f.kcal} → ${Math.round(r2.kcal)} kkal`);
    });
    $("#add", b).onclick = () => {
      if (star !== isFav(r.name)) toggleFav(foodFromAI(r), true); // to'liq porsiya saqlanadi
      addFood({ ...foodFromAI(r, +$("#por", b).value), img: ctx.thumb || undefined, mid: ctx.mid });
      closeSheet();
    };
  });
}

// Ovqat vaqtlari: kunlik normaning ulushi (dietologlarning odatiy tavsiyasi) va o'tgan kunga yozilganda sukut vaqti
const MEAL4 = [["b", "🍳", "Nonushta", 0.25, "08:30"], ["l", "🍲", "Tushlik", 0.35, "13:00"], ["d", "🍽️", "Kechki ovqat", 0.25, "19:00"], ["s", "🥜", "Tamaddi", 0.15, "16:30"]];
const mealName = (m) => MEAL4.find((x) => x[0] === m)?.[2] || "";
/** Ovqat qaysi vaqtga tegishli: tanlangan bo'lsa shu, aks holda yozilgan soatiga qarab. */
function mealOf(f) {
  if (f.meal) return f.meal;
  const h = new Date(f.t).getHours();
  return h >= 4 && h < 11 ? "b" : h >= 11 && h < 16 ? "l" : h >= 18 ? "d" : "s";
}
/** Yozuv vaqti: bugun — hozir; o'tgan kun — o'sha kun, ovqat vaqtining odatiy soatida (yoki hozirgi soatda). */
function stamp(k, meal) {
  if (k === dkey()) return Date.now();
  const at = (meal && (S.remind?.meals?.[meal]?.at || MEAL4.find((x) => x[0] === meal)[4])) || clock(new Date());
  const [y, m, d] = k.split("-").map(Number), [h, mi] = at.split(":").map(Number);
  return new Date(y, m - 1, d, h, mi).getTime();
}
let pendMeal = null; // "+" qaysi ovqat vaqtidan bosilgan
function addFood(f, k = curKey(), meal = pendMeal) {
  day(k).food.push({ id: uid(), t: stamp(k, meal), ...(meal ? { meal } : {}), ...f });
  pendMeal = null;
  save();
  render();
  toast(`Qo'shildi${k === dkey() ? "" : ` (${dayName(k)})`}: ${f.name}, ${f.kcal} kkal`);
}

/** Ovqatning necha foizi yeyilgani: kaloriya va makrolar to'liq porsiyadan qayta hisoblanadi. */
function setEaten(f, pct) {
  f.base ??= { kcal: f.kcal, p: f.p, f: f.f, c: f.c };
  f.pct = pct;
  for (const k of ["kcal", "p", "f", "c"]) f[k] = Math.round((f.base[k] || 0) * pct / 100);
}

/** Tarkib muharriri uchun ishchi nusxa: g0/k0/p0... — boshlang'ich qiymatlar, gramm o'zgarsa ular mutanosib o'zgaradi (AI'siz).
 * Grammi noma'lum (tarkibi saqlanmagan eski yozuv yoki qo'lda) qism "fix": faqat olib tashlash mumkin. */
function edItems(f) {
  const b = { kcal: f.kcal, p: f.p, f: f.f, c: f.c, ...(f.base || {}) };
  const list = f.items?.length ? f.items : [{ n: f.name, g: 0, k: b.kcal, p: b.p, f: b.f, c: b.c }];
  // makrolar faqat jami bo'lsa: yog' va shakar o'zi aniq, qolgani boshqa qismlarga kaloriyasiga qarab taqsimlanadi
  const known = list.map((i) => (i.p != null ? i : PURE_FAT.test(i.n) ? { p: 0, f: i.k / 9, c: 0 } : PURE_SUGAR.test(i.n) ? { p: 0, f: 0, c: i.k / 4 } : null));
  const rest = { p: b.p, f: b.f, c: b.c };
  known.forEach((m) => m && ["p", "f", "c"].forEach((k) => (rest[k] = Math.max(0, rest[k] - m[k]))));
  const ks = list.reduce((a, i, n) => a + (known[n] ? 0 : +i.k || 0), 0) || 1;
  return list.map((i, n) => {
    const m = known[n] || { p: (rest.p * i.k) / ks, f: (rest.f * i.k) / ks, c: (rest.c * i.k) / ks };
    return { n: i.n, g0: i.g || 0, g: i.g || 0, k0: +i.k || 0, p0: +m.p || 0, f0: +m.f || 0, c0: +m.c || 0, fix: !i.g, gone: false };
  });
}
const edRatio = (i) => (i.gone ? 0 : i.fix ? 1 : i.g / i.g0);
const edVal = (i, k) => i[k + "0"] * edRatio(i);
function edTotal(list) {
  const t = { kcal: 0, p: 0, f: 0, c: 0 };
  for (const i of list) { t.kcal += edVal(i, "k"); t.p += edVal(i, "p"); t.f += edVal(i, "f"); t.c += edVal(i, "c"); }
  return { kcal: Math.round(t.kcal), p: Math.round(t.p), f: Math.round(t.f), c: Math.round(t.c) };
}
const PURE_FAT = /sariyog|moy\b|o'simlik yog|zaytun|mayonez|cho'chqa yog'|dumba/i;
const PURE_SUGAR = /shakar|asal|murabbo|sirop/i;
/** Qo'shiladigan mahsulot matnidan gramm: "choy 250 g", "250ml sut". */
const gramsIn = (t) => +(t.match(/(\d+(?:[.,]\d+)?)\s*(?:g|gr|gramm|ml)\b/i)?.[1] || "0").replace(",", ".");

function eatenForm(id, pct, comment) {
  const f = day(curKey()).food.find((x) => x.id === id);
  if (!f) return;
  const orig = { kcal: f.kcal, p: f.p, f: f.f, c: f.c, ...(f.base || {}) }, photo = f.mid || f.img;
  const ed = edItems(f);
  let cur = pct ?? f.pct ?? 100, added = false, adding = false, meal = mealOf(f);
  const dirty = () => added || ed.some((i) => i.gone || i.g !== i.g0);
  const base = () => (dirty() ? edTotal(ed) : orig);
  openSheet(`${photo ? `<img class="eat-photo" src="${photo}">` : ""}<h2 style="margin-bottom:4px">${esc(f.name)}</h2>
    <p class="sub" style="margin:0 0 12px">To'liq porsiya <b id="fk"></b> kkal</p>
    ${comment ? `<div class="tip">🤖 ${esc(comment)}</div>` : ""}
    <p class="cap" style="margin:0 0 2px">Tarkibi</p><div id="ed"></div>
    <p class="cap" style="margin:16px 0 0">Qancha yedingiz?</p>
    <div class="pct4">${[25, 50, 75, 100].map((v) => `<button data-v="${v}">${v}%</button>`).join("")}</div>
    <label class="field"><span>Aniq: <b id="pv"></b></span><input id="pr" type="range" min="0" max="100" step="5"></label>
    ${f.mid ? `<button class="btn soft" id="lf" style="margin-bottom:10px">📷 Qoldiqni suratga olish (AI hisoblaydi)</button>` : ""}
    <p class="cap" style="margin:6px 0 8px">Ovqat vaqti</p>
    <div class="choice" id="ml" style="grid-template-columns:1fr 1fr">${MEAL4.map(([k, ic, t]) => `<button data-ml="${k}">${ic} ${t}</button>`).join("")}</div>
    ${redoBox()}
    <button class="btn" id="ok">${ico("check", 20, "#fff")} Saqlash</button>`, (b) => {
    const show = () => {
      const B = base();
      $("#fk", b).textContent = fmt(B.kcal);
      $("#pr", b).value = cur;
      $("#pv", b).textContent = `${cur}% · ${fmt(Math.round(B.kcal * cur / 100))} kkal`;
      $$(".pct4 button", b).forEach((x) => x.classList.toggle("on", +x.dataset.v === cur));
      $$("[data-ml]", b).forEach((x) => x.classList.toggle("on", x.dataset.ml === meal));
      const T = edTotal(ed), d = dirty();
      $("#edt", b).innerHTML = [["kcal", "kkal"], ["p", "oqsil, g"], ["f", "yog', g"], ["c", "uglevod, g"]].map(([k, t]) =>
        `<div><b>${T[k]}</b><small>${t}</small>${d && T[k] !== Math.round(orig[k] || 0) ? `<s>${Math.round(orig[k] || 0)}</s>` : ""}</div>`).join("");
    };
    const row = (i, n) => `<div class="it ${i.gone ? "gone" : i.g !== i.g0 || i.add ? "changed" : ""}" data-i="${n}">
        <div><b>${esc(i.n)}</b><small>${i.add ? "yangi qo'shildi" : i.fix ? "grammi noma'lum" : `${String(r1(i.k0 / i.g0)).replace(".", ",")} kkal / g`}${
          !i.fix && i.g !== i.g0 ? ` · <span style="color:#B58A12">${i.g0} g edi</span>` : ""}</small></div>
        ${i.fix ? `<span></span>` : `<div class="step"><button data-st="-5" aria-label="Kamaytirish">−</button><input data-g inputmode="numeric" value="${i.g}"><span>g</span><button data-st="5" aria-label="Ko'paytirish">+</button></div>`}
        <b class="ik">${Math.round(edVal(i, "k"))}</b>
        <button class="x" data-rm aria-label="${i.gone ? "Qaytarish" : "Olib tashlash"}">${i.gone ? "↺" : "×"}</button></div>`;
    const draw = () => {
      $("#ed", b).innerHTML = `${ed.map(row).join("")}
        ${adding ? `<div class="addp"><input id="an" maxlength="80" placeholder="Masalan: choy shakar bilan, 250 g">
          <div class="row"><input id="ak" type="number" inputmode="numeric" placeholder="kkal (bilsangiz)"><button class="btn" id="ago">Qo'shish</button></div>
          <small class="hint">Kaloriyani yozsangiz AI ishlatilmaydi. Aks holda AI hisoblaydi: ${aiCost()}</small></div>`
        : `<button class="btn ghost" id="addp" style="margin-top:10px;padding:11px;font-size:14px">+ Mahsulot qo'shish</button>`}
        <div class="tot2" id="edt"></div><small class="hint" style="text-align:center;margin-top:-4px">Grammni o'zgartirish AI limitini sarflamaydi</small>`;
      $$("[data-i]", b).forEach((r) => {
        const i = ed[+r.dataset.i];
        // 5 ga karrali keyingi qiymat: 3 g → + → 5 g, 12 g → − → 10 g
        $$("[data-st]", r).forEach((x) => (x.onclick = () => { i.g = +x.dataset.st > 0 ? Math.floor(i.g / 5) * 5 + 5 : Math.max(0, Math.ceil(i.g / 5) * 5 - 5); draw(); }));
        const inp = $("[data-g]", r);
        if (inp) inp.oninput = () => { // yozish paytida faqat raqamlar yangilanadi (klaviatura yopilmasin)
          i.g = clamp(Math.round(+inp.value.replace(",", ".") || 0), 0, 5000);
          $(".ik", r).textContent = Math.round(edVal(i, "k"));
          r.classList.toggle("changed", i.g !== i.g0);
          show();
        };
        if (inp) inp.onchange = draw;
        $("[data-rm]", r).onclick = () => { i.gone = !i.gone; draw(); };
      });
      $("#addp", b)?.addEventListener("click", () => { adding = true; draw(); $("#an", b).focus(); });
      $("#ago", b)?.addEventListener("click", addItem);
      show();
    };
    async function addItem() {
      const t = $("#an", b).value.trim(), k = +$("#ak", b).value;
      if (!t) return $("#an", b).focus();
      const g = gramsIn(t);
      if (k > 0) ed.push({ n: t.replace(/,?\s*\d+([.,]\d+)?\s*(g|gr|gramm|ml)\b/i, "").trim() || t, g0: g, g, k0: k, p0: 0, f0: 0, c0: 0, fix: !g, gone: false, add: true });
      else {
        const btn = $("#ago", b);
        btn.disabled = true;
        btn.textContent = "AI hisoblamoqda…";
        try {
          const r = await askFood({ text: t });
          if (!r.is_food) throw new Error("AI buni ovqat deb tanimadi. Boshqacha yozib ko'ring");
          for (const i of foodFromAI(r).items) ed.push({ ...edItems({ items: [i], kcal: i.k, p: 0, f: 0, c: 0 })[0], add: true });
        } catch (e) {
          btn.disabled = false;
          btn.textContent = "Qo'shish";
          return toast(e.message);
        }
      }
      added = true; adding = false;
      draw();
    }
    $$(".pct4 button", b).forEach((x) => (x.onclick = () => { cur = +x.dataset.v; show(); }));
    $("#pr", b).oninput = (e) => { cur = +e.target.value; show(); };
    $$("[data-ml]", b).forEach((x) => (x.onclick = () => { meal = x.dataset.ml; show(); }));
    $("#lf", b)?.addEventListener("click", () => { leftTarget = id; closeSheet(); takePhoto("#fileCam", "left"); });
    bindRedo(b, async (note) => {
      // o'rtacha surat faqat bugungi ovqatlarda turadi: bo'lmasa nomi, oldingi hisob va izoh bo'yicha
      const r = await askFood({ ...(f.mid ? { image: f.mid } : {}), text: f.mid ? note : `${f.name}. ${note}`, prev: foodPrev({ ...f, ...(f.base || {}) }) });
      if (!r.is_food) throw new Error("AI ovqatni aniqlay olmadi. Izohni boshqacha yozib ko'ring");
      const old = f.kcal;
      for (const k of ["base", "score", "why", "tip", "warn"]) delete f[k];
      Object.assign(f, foodFromAI(r));
      setEaten(f, cur);
      save(); render();
      eatenForm(f.id, cur);
      toast(`Yangilandi: ${old} → ${f.kcal} kkal`);
    });
    $("#ok", b).onclick = () => {
      if (dirty()) {
        const keep = ed.filter((i) => !i.gone && (i.fix || i.g > 0));
        if (!keep.length) return toast("Kamida bitta mahsulot qolsin");
        f.items = keep.map((i) => ({ n: i.n, g: i.fix ? 0 : i.g, k: Math.round(edVal(i, "k")), p: r1(edVal(i, "p")), f: r1(edVal(i, "f")), c: r1(edVal(i, "c")) }));
        delete f.base;
        Object.assign(f, edTotal(keep));
      }
      if (meal !== mealOf(f)) f.meal = meal;
      setEaten(f, cur);
      save(); closeSheet(); render();
      toast(`${f.name}: ${cur}% · ${f.kcal} kkal`);
    };
    draw();
  });
}

let leftTarget = null;
async function leftPhoto(file) {
  const f = day(curKey()).food.find((x) => x.id === leftTarget);
  if (!file || !f?.mid) return;
  let after;
  try { after = await shrink(file, 640, 0.72); } catch (e) { return toast(e.message); }
  openSheet(`<div class="food-res"><img class="photo" src="${after}"><div class="loader"></div><p class="sub">Qomat AI qoldiqni solishtirmoqda…</p></div>`);
  try {
    const r = await api("/leftover", { before: f.mid, after, name: f.name });
    eatenForm(f.id, r.eaten_percent, r.comment);
  } catch (e) {
    toast(e.message);
    eatenForm(f.id);
  }
}

function manualFood() {
  openSheet(`<h2>Qo'lda kiritish</h2>
    <label class="field"><span>Nomi</span><input id="n" placeholder="Masalan: Somsa"></label>
    <label class="field"><span>Kaloriya (kkal)</span><input id="k" type="number" inputmode="numeric" placeholder="0"></label>
    <div class="f4" style="grid-template-columns:repeat(3,1fr)">
      <label class="field"><span>Oqsil, g</span><input id="p" type="number" inputmode="numeric" placeholder="0"></label>
      <label class="field"><span>Yog', g</span><input id="f" type="number" inputmode="numeric" placeholder="0"></label>
      <label class="field"><span>Uglevod, g</span><input id="c" type="number" inputmode="numeric" placeholder="0"></label>
    </div>
    <button class="btn" id="ok">Qo'shish</button>`, (b) => {
    $("#ok", b).onclick = () => {
      const name = $("#n", b).value.trim() || "Ovqat", kcal = +$("#k", b).value;
      if (!(kcal > 0)) return toast("Kaloriyani kiriting");
      addFood({ name, kcal: Math.round(kcal), p: +$("#p", b).value || 0, f: +$("#f", b).value || 0, c: +$("#c", b).value || 0 });
      closeSheet();
    };
  });
}

const ACTS = [["🚶", "Yurish", 4], ["🏃", "Yugurish", 10], ["🚴", "Velosiped", 7], ["🏋️", "Sport zal", 7], ["🏊", "Suzish", 9], ["🧹", "Uy ishlari", 3.5]];
function activityForm() {
  let sel = 0;
  openSheet(`<h2>Faollik</h2><div class="choice" id="ch">${ACTS.map((a, i) => `<button data-i="${i}" class="${i ? "" : "on"}">${a[0]} ${a[1]}</button>`).join("")}</div>
    <label class="field"><span>Necha daqiqa?</span><input id="m" type="number" inputmode="numeric" value="30"></label>
    <p class="sub" id="est"></p><button class="btn" id="ok">Qo'shish</button>`, (b) => {
    const est = () => {
      // kkal ≈ MET × vazn × soat
      const kcal = Math.round(ACTS[sel][2] * curWeight() * ((+$("#m", b).value || 0) / 60));
      $("#est", b).textContent = `Taxminan ${kcal} kkal yoqiladi`;
      return kcal;
    };
    $$("#ch button", b).forEach((x) => (x.onclick = () => { sel = +x.dataset.i; $$("#ch button", b).forEach((y) => y.classList.toggle("on", y === x)); est(); }));
    $("#m", b).oninput = est;
    est();
    $("#ok", b).onclick = () => {
      const kcal = est();
      if (!kcal) return;
      day(curKey()).act.push({ id: uid(), t: stamp(curKey()), name: `${ACTS[sel][1]}, ${$("#m", b).value} daq`, icon: ACTS[sel][0], kcal });
      save(); closeSheet(); render();
      toast(`${kcal} kkal yoqildi 💪`);
    };
  });
}

function addWater(n) {
  const d = day(curKey());
  if (n < 0 && !(d.water > 0)) return;
  Object.assign(d, wfix(d)); // eski yozuvdagi suv "_" hisoblagichiga o'tadi
  d.wd[S.device] = (d.wd[S.device] || 0) + n; // har qurilma o'zinikini sanaydi: ikki joyda qo'shilsa yig'iladi
  d.water = clamp(wsum(d.wd), 0, 30);
  save();
  render();
}

function removeEntry(kind, id) {
  const d = day(curKey());
  d[kind] = d[kind].filter((x) => x.id !== id);
  (S.gone ??= {})[id] = Date.now(); // boshqa qurilmadagi nusxa bilan birlashtirganda qaytib chiqmasin
  save();
  render();
}

// ── Ekranlar ────────────────────────────────────────
let tab = "kundalik";
let histMode = "kcal";

function render() {
  // suhbat har kuni yangidan boshlanadi (odatlar AI xotirasida qoladi: S.memory)
  if (S.chatDay !== dkey()) {
    if (S.chatDay) S.chat = [];
    S.chatDay = dkey();
    save();
  }
  if (isBlocked()) { // majburiy yangilash: yangilamaguncha faqat shu ekran
    document.body.classList.add("onboarding");
    return blockScreen();
  }
  if (!signedIn()) {
    document.body.classList.add("onboarding");
    return loginView();
  }
  document.body.classList.toggle("onboarding", !S.profile);
  if (!S.profile) return onboarding();
  $$(".tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === (SUBS[tab] ? subFrom : tab)));
  $("#fab").classList.toggle("hide", tab !== "kundalik" && tab !== "tarix");
  $("#screen").innerHTML = { kundalik: viewDaily, chat: viewChat, tarix: viewHistory, profil: viewProfile, ...SUBS }[tab]();
  ({ kundalik: bindDaily, chat: bindChat, tarix: bindHistory, profil: bindProfile, eslatma: bindRemind, bog: bindGarden, saqlangan: bindFavs, royxat: bindFoods, yordam: bindSupport, nima: bindNima }[tab])();
}
// Ichki sahifalar: telefonning "orqaga" tugmasi ilovadan chiqib ketmasin, oldingi bo'limga qaytsin
const SUBS = { eslatma: () => viewRemind(), bog: () => viewGarden(), saqlangan: () => viewFavs(), royxat: () => viewFoods(), yordam: () => viewSupport(), nima: () => viewNima() };
let subFrom = "profil";
function openSub(name) {
  subFrom = SUBS[tab] ? subFrom : tab;
  tab = name;
  history.pushState({ sub: name }, "");
  render();
  scrollTo(0, 0);
}
addEventListener("popstate", () => { if (SUBS[tab]) { tab = subFrom; render(); scrollTo(0, 0); } });
// Telefonning "orqaga" tugmasi (APK, MainActivity chaqiradi): oyna → ichki sahifa → o'tgan kun → Kundalik → chiqishni so'rash.
// true qaytarsa ilova ochiq qoladi.
window.onNativeBack = () => {
  if ($("#sheetWrap").classList.contains("open")) { closeSheet(); return true; }
  if (isBlocked()) return false; // blok ekranidan faqat chiqib ketish mumkin
  if ($(".cam")) { $(".cam-x")?.click(); return true; }
  if (SUBS[tab]) { history.back(); return true; }
  if (tab === "kundalik" && viewDay) { setDay(null); return true; }
  if (tab !== "kundalik" && S.profile && signedIn()) { tab = "kundalik"; render(); scrollTo(0, 0); return true; }
  openSheet(`<h2>Ilovadan chiqasizmi?</h2><p class="sub">Ma'lumotlaringiz saqlangan.</p>
    <button class="btn" id="exY">Ha, chiqish</button><button class="btn ghost" id="exN" style="margin-top:8px">Yo'q</button>`, (b) => {
    $("#exN", b).onclick = closeSheet;
    $("#exY", b).onclick = async () => {
      closeSheet();
      await Promise.race([pushNow(), new Promise((r) => setTimeout(r, 1500))]); // oxirgi o'zgarish serverga ketsin
      upCall("exit").catch(() => {});
    };
  });
  return true;
};
const subHead = (title, sub = "") => `<div class="head"><div class="row"><button class="icon-btn" id="back" aria-label="Orqaga">${ico("back", 20)}</button>
  <div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ""}</div></div></div>`;
// chat o'zi eng pastki xabarga tushadi (bindChat), qolgan bo'limlar tepadan ochiladi
$$(".tabs button").forEach((b) => (b.onclick = () => {
  if (SUBS[tab]) history.replaceState(null, "");
  if (b.dataset.tab === "kundalik") viewDay = null; // pastki menyudan Kundalik doim bugundan ochiladi
  tab = b.dataset.tab; render(); if (tab !== "chat") scrollTo(0, 0);
}));
$("#fab").onclick = () => {
  if (tab !== "kundalik") viewDay = null; // Tarix'dagi "+" doim bugunga yozadi
  addMenu();
};

const MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];

function viewDaily() {
  viewDay = null; // Kundalik doim bugun: o'tgan kunlar Tarix'dagi oynada tahrirlanadi
  const K = curKey(), past = isPast();
  const n = norms(), t = totals(K), w = curWeight(), p = S.profile;
  const score = lifeScore(), yscore = lifeScore(dkey(ddays(1)));
  const left = n.kcal - t.eat + t.bonus;
  const pct = clamp((t.eat - t.bonus) / n.kcal, 0, 1);
  const week = [...Array(7)].reduce((a, _, i) => a + totals(dkey(ddays(i))).eat, 0);
  const now = new Date();

  // vazn ko'rsatkichi: boshlang'ich vazndan maqsadgacha
  const start = p.weight, prog = start === p.goal ? 1 : clamp((start - w) / (start - p.goal), 0, 1);
  const A = (a) => [100 + 78 * Math.cos((a * Math.PI) / 180), 100 - 78 * Math.sin((a * Math.PI) / 180)];
  const [sx, sy] = A(200), [ex, ey] = A(-20), end = 200 - 220 * prog, [px, py] = A(end);
  const wk = weekChange();

  const b = bmi(), [bl, bbg, bfg] = bmiLabel(b);
  const bpos = ((clamp(b, 15, 40) - 15) / 25) * 100;
  const water = t.water, wn = n.water;

  return `${blockBanner()}
  <div class="head"><div><h1>Kundalik</h1><p>${now.getDate()}-${MONTHS[now.getMonth()]}, salom!</p></div>
    <div class="row" style="gap:6px"><button class="date-chip" id="toGarden">🌳 ${gardenTotal(gardenLines())}</button><span class="date-chip">🔥 ${streak()} kun</span></div></div>
${past ? "" : `
  <section class="card">
    <div class="between"><p class="cap">Bugungi kun bali</p>
      <span class="score-up">${score >= yscore ? "↗" : "↘"} kechagidan ${score >= yscore ? "+" : ""}${score - yscore}</span></div>
    <div class="life">${mascot(score)}
      <div class="battery"><div class="bat"><i style="height:calc(${score}% - 8px * ${score / 100})"></i></div>
      <div><div class="big">${score}</div><span class="muted">100 dan</span></div></div></div>
  </section>

  ${p.health ? "" : `<section class="card">
    <b>🛡️ Allergiya yoki cheklovlaringiz bormi?</b>
    <p class="muted" style="margin:6px 0 12px;font-size:13px">Masalan diabet, gastrit, glyuten yoki gipertoniya. Belgilasangiz, AI ovqatni shunga qarab baholaydi va ogohlantiradi.</p>
    <div class="grid2"><button class="btn soft" id="hOn">Belgilash</button><button class="btn ghost" id="hNo">Yo'q</button></div></section>`}

  ${adviceCard()}
`}

  <section class="card">
    <div class="between"><p class="cap">Kaloriyalar</p><button class="icon-btn" id="editAct" aria-label="Faollik">${ico("pen", 18)}</button></div>
    <div class="kcal" style="margin-top:12px">
      <div class="ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" fill="none" stroke="#EFECE6" stroke-width="12"/>
        ${pct > 0 ? `<circle cx="60" cy="60" r="52" fill="none" stroke="${left < 0 ? "#E06464" : "#2EAD5B"}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${326.7 * pct} 400"/>` : ""}</svg>
        <div class="in"><b>${fmt(Math.abs(left))}</b><span>${left < 0 ? "kkal ortiqcha" : "kkal qoldi"}</span></div></div>
      <div class="legend">
        <div><small style="--c:#CFCAC0">Norma</small><b>${fmt(n.kcal)}</b></div>
        <div><small style="--c:#2EAD5B">Yeyildi</small><b>−${fmt(t.eat)}</b></div>
        <div><small style="--c:#F4CB4C">Harakat</small><b>+${fmt(t.bonus)}</b></div>
      </div></div>
    ${t.move && activeIncl() ? `<p class="muted" style="font-size:12px;margin:8px 2px 0">Normangizda kuniga ~${fmt(activeIncl())} kkal harakat bor (faollik: ${ACTIVITY.find((a) => a.v === p.activity)?.t.toLowerCase()}). Bugun ${fmt(t.move)} kkal: ${t.bonus ? `ortig'i ${fmt(t.bonus)} kkal normaga qo'shildi` : "hali shu chegarada"}.</p>` : ""}
    <div class="weekly">HAFTALIK &nbsp;<b>${fmt(week)}</b> / ${fmt(n.kcal * 7)} kkal</div>
    <div style="margin-top:8px">
      ${macro("🥩", "Oqsillar", t.p, n.protein)}
      ${macro("🫒", "Yog'lar", t.f, n.fat)}
      ${macro("🌾", "Uglevodlar", t.c, n.carbs)}
    </div>
  </section>

  ${burnCard(K, past)}

  ${past ? "" : nimaCard()}

  ${past ? pastExtras(K, t) : `${stepsCard(t)}

  ${sleepCard()}

  <section class="card">
    <p class="cap">Vazn</p>
    <div class="weight">
      <div class="gauge"><svg viewBox="0 0 200 160">
        <path d="M${sx} ${sy} A78 78 0 1 1 ${ex} ${ey}" fill="none" stroke="#EFECE6" stroke-width="16" stroke-linecap="round"/>
        ${prog > 0.003 ? `<path d="M${sx} ${sy} A78 78 0 ${220 * prog > 180 ? 1 : 0} 1 ${px} ${py}" fill="none" stroke="#2EAD5B" stroke-width="16" stroke-linecap="round"/>` : ""}
        <circle cx="${px}" cy="${py}" r="10" fill="#fff" stroke="#2EAD5B" stroke-width="4"/></svg>
        <div class="val"><b>${kg(w)}</b><span>kg</span></div></div>
      <div class="wstat">
        <div class="between"><div><small>Maqsad</small><b>${kg(p.goal)} kg</b></div><button class="icon-btn" id="editGoal">${ico("pen", 18)}</button></div>
        <div><small>Bir haftada</small><b style="color:${wk <= 0 ? "#23914A" : "#C6741B"}">${wk > 0 ? "+" : wk < 0 ? "−" : "−"}${kg(Math.abs(wk))} kg</b></div>
      </div>
    </div>
    <button class="btn soft" id="editWeight" style="margin-top:8px">${ico("scale", 20)} Joriy vaznni o'zgartirish</button>
    <hr style="border:0;border-top:1px solid var(--line);margin:18px 0 14px">
    <div class="between"><span class="row"><b>Tana vazni indeksi</b><button id="bmiInfo" class="muted">${ico("info", 18)}</button></span>
      <span class="row"><b style="font-size:18px">${b.toFixed(1)}</b><span class="badge" style="background:${bbg};color:${bfg}">${bl}</span></span></div>
    <div class="bmi-scale">
      <div class="nums">${[15, 18.5, 25, 30, 35, 40].map((v) => `<span style="left:${((v - 15) / 25) * 100}%">${String(v).replace(".", ",")}</span>`).join("")}</div>
      <div class="seg"><i style="flex:3.5;background:var(--blue)"></i><i style="flex:6.5;background:#8CCB7E"></i><i style="flex:5;background:var(--yellow)"></i><i style="flex:5;background:var(--orange)"></i><i style="flex:5;background:var(--red)"></i></div>
      <div class="mark" style="left:${bpos}%"></div>
    </div>
  </section>`}

  <section class="card">
    <div class="between"><p class="cap">💧 Suv</p><b>${water} / ${wn} stakan</b></div>
    <p class="muted" style="margin:8px 0 0;font-size:13px">${kg(w)} kg vazn uchun kuniga ${kg((wn * 250) / 1000)} litr suv ichish kerak (1 stakan 250 ml)</p>
    <div class="glasses">${[...Array(Math.max(wn, water))].map((_, i) => `<span class="glass ${i < water ? "on" : ""}"></span>`).join("")}</div>
    <div class="grid2" style="margin-top:14px"><button class="btn ghost" id="wMinus">− 1 stakan</button><button class="btn soft" id="wPlus">+ 1 stakan</button></div>
  </section>

  <h2 style="font-size:20px;margin:22px 4px 10px">${past ? "Shu kungi ovqatlar" : "Bugungi ovqatlar"}</h2>
  ${day(K).food.length ? `<p class="muted" style="margin:-4px 4px 10px;font-size:13px">Ovqatni bosib, qancha yeganingizni yoki ovqat vaqtini o'zgartiring.</p>` : ""}
  ${dayList(K)}
  `;
}

// ── Ilovani yangilash (faqat APK) ───────────────────
const upCall = (m, o = {}) => window.Capacitor.nativePromise("Updater", m, o);
let appVer = null; // { code, name }
async function checkUpdate(manual) {
  if (!NATIVE) return;
  try {
    appVer ??= await upCall("info");
    const srv = await api("/version", { code: appVer.code }); // server o'tkazib yuborilgan versiyalar yozuvlarini qo'shib beradi
    const was = isBlocked();
    blockSave(srv);
    if (isBlocked()) {
      if (!was) { pushNow(); closeSheet(); render(); } else if (manual) toast("Hali eski versiya: «Yangilash» tugmasini bosing");
      return;
    }
    if (was) render(); // blok olib tashlangan
    if (!(srv.code > appVer.code)) { if (manual) toast(`Sizda eng yangi versiya: ${appVer.name}`); return; }
    if (!manual && !srv.force && S.upSkip?.code === srv.code && S.upSkip.d === dkey()) return; // "Keyinroq" bosilgan, ertaga yana
    updateSheet(srv);
  } catch (e) { if (manual) toast(e.message); }
}
function updateSheet(srv) {
  openSheet(`<h2>🎉 Yangi versiya: ${esc(srv.name)}</h2>
    ${srv.notes ? `<p class="sub">Nimalar yangi:</p><p>${mdLite(srv.notes).replace(/\n/g, "<br>")}</p>` : ""}
    <p class="muted" style="font-size:13px">${srv.force ? "Bu versiya Qomat AI ishlashi uchun kerak. " : ""}Ma'lumotlaringiz saqlanib qoladi.</p>
    <button class="btn" id="up">⬇️ Yangilash</button>
    ${srv.force ? "" : `<button class="btn ghost" id="later" style="margin-top:8px">Keyinroq</button>`}`, (b) => {
    $("#later", b)?.addEventListener("click", () => { S.upSkip = { code: srv.code, d: dkey() }; save(); closeSheet(); });
    $("#up", b).onclick = async () => {
      openSheet(`<div class="loader"></div><p class="sub" style="text-align:center">Yangi versiya yuklanmoqda…</p>`);
      try {
        // APK GitHub'dan (bepul trafik); eski server manzili zaxira sifatida
        const r = await upCall("install", { url: srv.url || CFG.api + "/app.apk", key: CFG.key });
        if (r.needPermission) {
          openSheet(`<h2>Bir martalik ruxsat</h2>
            <p>Ochilgan oynada <b>"Разрешить из этого источника"</b> (Shu manbadan ruxsat berish) tugmasini yoqing, so'ng ilovaga qayting va <b>Yangilash</b> ni yana bosing.</p>
            <button class="btn" id="again">⬇️ Yangilash</button>`, (s) => ($("#again", s).onclick = () => updateSheet(srv)));
        } else closeSheet();
      } catch (e) {
        closeSheet();
        toast(e.message || "Yangilab bo'lmadi");
      }
    };
  });
}

// ── Majburiy yangilash (1.3.37+) ────────────────────
// Panelda «ilova to'liq to'xtaydi» tanlansa, /version javobida block: {code, at} keladi. at gacha Kundalikda
// ogohlantirish turadi, keyin butun ilova yopiladi va faqat yangilash ekrani qoladi. Internetsiz ham ishlashi uchun
// telefonda eslab qolinadi; ilova yangilangach (versiya kodi block.code dan katta) o'zi o'chadi.
const BLOCK_KEY = "vaznim:block";
let blockInfo = null;
try { blockInfo = JSON.parse(localStorage.getItem(BLOCK_KEY)) || null; } catch {}
function blockSave(srv) {
  blockInfo = srv.block && appVer && appVer.code < srv.block.code ? { code: srv.block.code, at: srv.block.at, srv } : null;
  try { blockInfo ? localStorage.setItem(BLOCK_KEY, JSON.stringify(blockInfo)) : localStorage.removeItem(BLOCK_KEY); } catch {}
}
const blockPending = () => NATIVE && !!blockInfo && !!appVer && appVer.code < blockInfo.code;
const isBlocked = () => blockPending() && Date.now() >= Date.parse(blockInfo.at);
async function blockInit() {
  try { appVer ??= await upCall("info"); } catch { return; }
  if (blockInfo && appVer.code >= blockInfo.code) blockSave({});
  if (isBlocked()) render();
}
function blockBanner() {
  if (!blockPending() || isBlocked()) return "";
  const days = Math.max(1, Math.ceil((Date.parse(blockInfo.at) - Date.now()) / 864e5));
  return `<section class="card" style="background:#FFF6DC;border-color:#F3E2A6">
    <b>⚠️ ${days} kundan keyin bu versiya ishlamaydi</b>
    <p class="muted" style="margin:4px 0 10px;font-size:13px">Qomat'ni ${esc(blockInfo.srv.name)} ga yangilang. Ma'lumotlaringiz saqlanib qoladi.</p>
    <button class="btn" id="blkUp">⬇️ Hozir yangilash</button></section>`;
}
function blockScreen() {
  const srv = blockInfo.srv;
  $("#screen").innerHTML = `<div style="min-height:80vh;display:flex;flex-direction:column;justify-content:center;text-align:center;gap:12px;padding:20px 4px">
    <div style="margin:0 auto">${mascot(40)}</div>
    <h1 style="margin:0">Ilovani yangilang</h1>
    <p class="muted" style="margin:0">Sizda ${esc(appVer?.name || "eski versiya")}. Qomat ishlashi uchun ${esc(srv.name)} kerak.</p>
    ${srv.notes ? `<section class="card" style="text-align:left;margin:4px 0"><p class="cap">Nimalar yangi</p><p style="margin:6px 0 0">${mdLite(srv.notes).replace(/\n/g, "<br>")}</p></section>` : ""}
    <p class="muted" style="font-size:13px;margin:0">🔒 Ma'lumotlaringiz telefonda va serverda saqlangan: yangilangach hammasi joyida bo'ladi.</p>
    <button class="btn" id="blkUp">⬇️ Yangilash</button>
    ${srv.apk_bot ? `<button class="btn ghost" id="blkTg">📲 Telegram orqali yuklab olish</button>` : ""}
    <button class="muted" id="blkChk" style="font-size:13px;margin-top:4px">🔄 Qayta tekshirish</button>
  </div>`;
  $("#blkUp").onclick = () => updateSheet({ ...srv, force: true });
  $("#blkTg")?.addEventListener("click", () => open(srv.apk_bot));
  $("#blkChk").onclick = () => checkUpdate(true);
}

// ── Eslatmalar (faqat APK) ──────────────────────────
// Ma'lumot har o'zgarganda kunning qolgan eslatmalari qayta rejalashtiriladi, shuning uchun matni doim yangi
const LN = (m, o = {}) => window.Capacitor.nativePromise("LocalNotifications", m, o);
const NOTIF_IDS = [...Array(48)].map((_, i) => 1000 + i);
async function setNotif(on) {
  if (on) {
    try {
      const r = await LN("requestPermissions");
      if (r.display !== "granted") {
        S.notif = false; save(); render();
        return toast("Ruxsat berilmadi. Telefon sozlamalarida Qomat uchun bildirishnomalarni yoqing.");
      }
    } catch { return toast("Eslatmalarni yoqib bo'lmadi"); }
  }
  S.notif = on;
  save();
  stepCall("reminder", { on }).catch(() => {});
  await planNotifs();
  render();
  toast(on ? "Eslatmalar yoqildi 🔔" : "Eslatmalar o'chirildi");
}
let planTimer;
function planSoon() {
  if (!NATIVE || !S.notif) return;
  clearTimeout(planTimer);
  planTimer = setTimeout(planNotifs, 1500);
}
// Sozlamalar (S.remind): ovqat vaqtlari, suv oralig'i, Qomat maslahatlari va shaxsiy eslatmalar.
// "Aqlli" eslatmalar bugun va ertaga uchun rejalashtiriladi va kerak bo'lmasa chiqmaydi (ovqat yozilgan, suv normada);
// shaxsiy eslatmalar telefonning o'zida har kuni yoki tanlangan kunlarda takrorlanadi (ilova ochilmasa ham).
const MEALS = [["b", "🍳", "Nonushta", "08:30"], ["l", "🍲", "Tushlik", "13:00"], ["d", "🍽", "Kechki ovqat", "19:00"]];
const WDAYS = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"]; // 0 = dushanba
function remCfg() {
  const r = (S.remind ??= {});
  r.meals ??= Object.fromEntries(MEALS.map(([k, , , at]) => [k, { on: true, at }]));
  r.water ??= { on: true, from: "08:00", to: "22:00", every: 2 };
  r.tips ??= true;
  r.custom ??= [];
  return r;
}
async function planNotifs() {
  if (!NATIVE) return;
  try { await LN("cancel", { notifications: NOTIF_IDS.map((id) => ({ id })) }); } catch {}
  await planCustom();
  if (!S.notif || !S.profile) return;
  const r = remCfg(), t = totals(), n = norms(), now = Date.now(), list = [];
  const at = (off, h, m = 0) => { const d = new Date(); d.setDate(d.getDate() + off); d.setHours(h, m, 0, 0); return d; };
  const add = (d, title, body) => {
    if (d.getTime() > now + 60000 && list.length < NOTIF_IDS.length)
      list.push({ id: NOTIF_IDS[list.length], title, body, schedule: { at: d, allowWhileIdle: true }, isExactNotification: false });
  };
  const MEAL_TXT = { b: "Nonushtani yozing: suratga oling, AI hisoblaydi.", l: "Tushlikni suratga olishni unutmang.", d: "Kechki ovqatni yozing. Yotishdan 2-3 soat oldin yeyish yaxshi." };
  for (const off of [0, 1]) {
    for (const [k, ic, name] of MEALS) {
      const m = r.meals[k];
      if (!m.on || !HM.test(m.at)) continue;
      const d = at(off, 0, hm2m(m.at));
      // shu vaqt atrofida (2,5 soat ichida) ovqat yozilgan bo'lsa eslatma kerak emas
      if (!off && day().food.some((f) => f.t > d - 150 * 60000 && f.t <= d)) continue;
      add(d, `${ic} ${name} vaqti`, MEAL_TXT[k]);
    }
  }
  const w = r.water, wf = hm2m(w.from), wt = hm2m(w.to);
  if (w.on && HM.test(w.from) && HM.test(w.to) && wt > wf) {
    const slots = [];
    for (let m = wf; m <= wt; m += w.every * 60) slots.push(m);
    for (const m of slots) { // bugun: faqat normadan ortda qolsa
      const need = Math.max(1, Math.ceil((n.water * (m - wf)) / (wt - wf)));
      if (t.water < need) add(at(0, 0, m), "💧 Suv ichish vaqti", `Bugun ${t.water} / ${n.water} stakan. Hozir 1 stakan suv iching.`);
    }
    slots.slice(0, 3).forEach((m, i) => add(at(1, 0, m), "💧 Suv ichish vaqti", i ? "Bugungi suvni belgilab qo'ying." : "Kunni bir stakan suv bilan boshlang."));
  }
  if (r.tips) {
    if (t.n) {
      const left = n.kcal - t.eat + t.bonus;
      add(at(0, 20, 30), "🌙 Bugungi natija", left >= 0 ? `Normaga ${fmt(left)} kkal qoldi. Kechki ovqatni yozishni unutmang.` : `Norma ${fmt(-left)} kkal oshdi. Ertaga yengilroq kun qiling.`);
    }
    const lastW = S.weights[S.weights.length - 1];
    if (!lastW || lastW.d <= dkey(ddays(6))) add(at(1, 8, 0), "⚖️ Vazningizni yozing", "Haftalik tortilish natijani kuzatishga yordam beradi.");
    add(at(1, 8, 30), "☀️ Xayrli tong!", "Bugungi shaxsiy maslahatingiz tayyor. Qomatni oching.");
    // Qaytish eslatmalari: ilova har ochilganda surilib boradi, faqat bir necha kun ochilmasa chiqadi
    add(at(2, 12, 30), "🍽 Bugun nima yedingiz?", "Tushligingizni suratga oling: AI kaloriyasini bir zumda hisoblaydi.");
    add(at(4, 19, 30), "📊 Natijangizni yo'qotmang", "2-3 kun yozilmasa, kunlik hisob uziladi. Bugungi ovqatlaringizni yozib qo'ying.");
    add(at(7, 10, 0), "💪 Maqsadingiz kutyapti", "Bir haftadan beri ko'rinmadingiz. Bugungi vazningizni yozing: bir daqiqa ham ketmaydi.");
  }
  if (S.sleepCfg?.remind !== false) {
    const bed = bestBed(), bm = (((hm2m(bed.at) - 30) % 1440) + 1440) % 1440, wm = hm2m(sleepWake()) + 30;
    // yotish vaqti yarim tundan keyin bo'lsa, u ertangi sanaga tushadi
    for (const off of [0, 1]) // bugungi vaqt o'tib ketgan bo'lsa, add() uni tashlab yuboradi
      add(at(off + (bm < 720 ? 1 : 0), 0, bm), "🌙 30 daqiqadan keyin yotish vaqti", `${sleepWake()} da turish uchun ${bed.at} da yoting. Ekranni qo'yib, chiroqni xiralashtiring.`);
    if (!day().sleep) add(at(0, 0, wm), "☀️ Qanday uxladingiz?", "Uyqungizni yozib qo'ying: 5 soniya.");
    add(at(1, 0, wm), "☀️ Qanday uxladingiz?", "Uyqungizni yozib qo'ying: 5 soniya.");
  }
  list.sort((a, b) => a.schedule.at - b.schedule.at);
  if (list.length) try { await LN("schedule", { notifications: list }); } catch {}
}
/** Shaxsiy eslatmalar: telefonda takrorlanadigan qilib qo'yiladi, faqat sozlama o'zgarganda qayta yoziladi. */
const LN_KEY = "vaznim:ln";
async function planCustom() {
  const list = [];
  if (S.notif) remCfg().custom.forEach((c, i) => {
    if (!c.on || !c.text.trim() || !HM.test(c.at)) return;
    const [h, m] = c.at.split(":").map(Number);
    // Android'da hafta kuni: yakshanba 1, dushanba 2 … shanba 7
    (c.days.length === 7 ? [null] : c.days).forEach((d) => list.push({
      id: 3000 + i * 8 + (d ?? 7), title: `🔔 ${c.text.trim()}`, body: "Qomat eslatmasi",
      schedule: { on: d == null ? { hour: h, minute: m } : { weekday: d === 6 ? 1 : d + 2, hour: h, minute: m }, allowWhileIdle: true },
    }));
  });
  const sig = JSON.stringify(list);
  let old = {};
  try { old = JSON.parse(localStorage.getItem(LN_KEY)) || {}; } catch {}
  if (old.sig === sig) return;
  try { if (old.ids?.length) await LN("cancel", { notifications: old.ids.map((id) => ({ id })) }); } catch {}
  try { if (list.length) await LN("schedule", { notifications: list }); } catch { return; }
  try { localStorage.setItem(LN_KEY, JSON.stringify({ sig, ids: list.map((x) => x.id) })); } catch {}
}

// ── Eslatmalar sahifasi ─────────────────────────────
const sw = (id, on) => `<button class="sw ${on ? "on" : ""}" data-sw="${id}" role="switch" aria-checked="${on}"><i></i></button>`;
function viewRemind() {
  const r = remCfg(), on = !!S.notif;
  return `${subHead("Eslatmalar", "Qomat faqat kerak bo'lganda eslatadi")}
  ${NATIVE ? "" : `<p class="muted" style="margin:-6px 4px 12px;font-size:13px">Eslatmalar faqat Android ilovasida ishlaydi.</p>`}
  <section class="card between"><div><b>Eslatmalarni yoqish</b><small class="hint">Bildirishnomalar telefonga keladi</small></div>${sw("all", on)}</section>
  <div class="${on ? "" : "dim"}">
  <section class="card"><p class="cap">🍽 Ovqat vaqtlari</p><p class="hint">Shu vaqt atrofida ovqat yozilgan bo'lsa, eslatma chiqmaydi.</p>
    ${MEALS.map(([k, ic, t]) => `<div class="rrow"><span>${ic} ${t}</span><input type="time" data-meal="${k}" value="${r.meals[k].at}">${sw(`meal:${k}`, r.meals[k].on)}</div>`).join("")}</section>
  <section class="card"><div class="between"><p class="cap">💧 Suv</p>${sw("water", r.water.on)}</div>
    <p class="hint">Normadan ortda qolsangizgina eslatadi.</p>
    <div class="rrow"><span>Qachondan</span><input type="time" data-w="from" value="${r.water.from}"></div>
    <div class="rrow"><span>Qachongacha</span><input type="time" data-w="to" value="${r.water.to}"></div>
    <div class="mini">${[1, 1.5, 2, 3].map((v) => `<button data-every="${v}" class="${r.water.every === v ? "on" : ""}">har ${String(v).replace(".", ",")} soat</button>`).join("")}</div></section>
  <section class="card between"><div><p class="cap">😴 Uyqu</p><small class="hint">Yotishdan 30 daqiqa oldin va ertalab uyquni yozish uchun</small></div>${sw("sleep", S.sleepCfg?.remind !== false)}</section>
  <section class="card between"><div><p class="cap">🍏 Qomat maslahatlari</p><small class="hint">Ertalabki maslahat, kechki natija, haftalik tortilish; bir necha kun kirmasangiz eslatadi</small></div>${sw("tips", r.tips)}</section>
  <section class="card"><p class="cap">🔔 Shaxsiy eslatmalar</p><p class="hint">Dori, vitamin yoki mashg'ulot: tanlangan kunlarda takrorlanadi.</p>
    ${r.custom.map((c, i) => `<div class="cust">
      <div class="row"><input class="ctext" data-ct="${i}" maxlength="60" value="${esc(c.text)}" placeholder="Masalan: Vitamin D ichish">${sw(`c:${i}`, c.on)}</div>
      <div class="row" style="margin-top:8px"><input type="time" data-cat="${i}" value="${c.at}"><span class="muted" style="flex:1;font-size:13px">${c.days.length === 7 ? "har kuni" : `haftada ${c.days.length} kun`}</span>
        <button class="del" data-cdel="${i}" aria-label="O'chirish">${ico("trash", 16)}</button></div>
      <div class="days">${WDAYS.map((w, d) => `<button data-cd="${i}:${d}" class="${c.days.includes(d) ? "on" : ""}">${w}</button>`).join("")}</div></div>`).join("")}
    ${r.custom.length < 20 ? `<button class="btn soft" id="addC">+ Eslatma qo'shish</button>` : ""}</section>
  </div>`;
}
function bindRemind() {
  const r = remCfg();
  const again = () => { const y = scrollY; save(); render(); scrollTo(0, y); };
  $("#back").onclick = () => history.back();
  $$("[data-sw]").forEach((b) => (b.onclick = () => {
    const [k, a] = b.dataset.sw.split(":");
    if (k === "all") return setNotif(!S.notif);
    if (k === "meal") r.meals[a].on = !r.meals[a].on;
    if (k === "water") r.water.on = !r.water.on;
    if (k === "tips") r.tips = !r.tips;
    if (k === "sleep") S.sleepCfg = { ...S.sleepCfg, remind: S.sleepCfg?.remind === false };
    if (k === "c") r.custom[+a].on = !r.custom[+a].on;
    again();
  }));
  $$("[data-meal]").forEach((x) => (x.onchange = () => { if (HM.test(x.value)) { r.meals[x.dataset.meal].at = x.value; save(); } }));
  $$("[data-w]").forEach((x) => (x.onchange = () => {
    const v = { ...r.water, [x.dataset.w]: x.value };
    if (!HM.test(x.value) || hm2m(v.to) <= hm2m(v.from)) { x.value = r.water[x.dataset.w]; return toast("Oraliqni tekshiring: boshlanishi tugashidan oldin bo'lsin"); }
    r.water = v; save();
  }));
  $$("[data-every]").forEach((b) => (b.onclick = () => { r.water.every = +b.dataset.every; again(); }));
  $$("[data-ct]").forEach((x) => (x.onchange = () => { r.custom[+x.dataset.ct].text = x.value.trim(); save(); }));
  $$("[data-cat]").forEach((x) => (x.onchange = () => { if (HM.test(x.value)) { r.custom[+x.dataset.cat].at = x.value; save(); } }));
  $$("[data-cd]").forEach((b) => (b.onclick = () => {
    const [i, d] = b.dataset.cd.split(":").map(Number), c = r.custom[i];
    if (c.days.includes(d)) {
      if (c.days.length === 1) return toast("Kamida bitta kun qolsin");
      c.days = c.days.filter((x) => x !== d);
    } else c.days = [...c.days, d].sort();
    again();
  }));
  $$("[data-cdel]").forEach((b) => (b.onclick = () => {
    const c = r.custom[+b.dataset.cdel];
    if (c.text && !confirm(`«${c.text}» eslatmasi o'chirilsinmi?`)) return;
    r.custom.splice(+b.dataset.cdel, 1);
    again();
  }));
  $("#addC")?.addEventListener("click", () => {
    r.custom.push({ id: uid(), text: "", at: "09:00", days: [0, 1, 2, 3, 4, 5, 6], on: true });
    again();
    $$(".ctext").pop()?.focus();
  });
}

// ── Mening bog'im: har yo'nalish 4 bosqichda o'sadi (nihol → ko'chat → daraxt → hosil) ──
// Hammasi kundalik ma'lumotidan hisoblanadi; S.garden da faqat ko'rilgan bosqichlar (bayram bir marta chiqishi uchun) va kiyim.
const STAGES = [["🟫", "Ekilmagan"], ["🌱", "Nihol"], ["🌿", "Ko'chat"], ["🌳", "Daraxt"], ["🍎", "Hosil"]];
const OUTFITS = [["", "Oddiy", 0], ["doppi", "Do'ppi", 5], ["sport", "Sport", 12], ["glasses", "Ko'zoynak", 20]];
const isActive = (d) => !!d && !!(d.food?.length || d.act?.length || d.water || d.sleep || d.naps?.length);
function gardenLines() {
  const p = S.profile, n = norms(), today = dkey(), keys = Object.keys(S.days).filter((k) => k <= today).sort();
  const c = { walk: 0, food: 0, water: 0, bal: 0, sleep: 0, streak: 0 };
  for (const k of keys) {
    const t = totals(k);
    if (t.steps >= stepGoal()) c.walk++;
    if (t.n) c.food++;
    if (t.water >= n.water) c.water++;
    if (k < today && t.n && Math.abs(t.eat - t.bonus - n.kcal) <= n.kcal * 0.1) c.bal++; // tugagan kunlar
    if (validSleep(S.days[k].sleep) && sleepScore(k) >= 70) c.sleep++;
  }
  if (keys.length) { // eng uzun ketma-ket faol kunlar
    let run = 0;
    for (let d = new Date(keys[0] + "T12:00"); dkey(d) <= today; d.setDate(d.getDate() + 1)) {
      run = isActive(S.days[dkey(d)]) ? run + 1 : 0;
      c.streak = Math.max(c.streak, run);
    }
  }
  // maqsad sari: boshlang'ich vazndan maqsad tomon eng ko'p siljish; vaznni saqlash maqsadida — maqsad atrofidagi haftalar
  const kgs = S.weights.map((w) => w.kg), keep = Math.abs(p.goal - p.weight) < 0.5;
  const goal = keep ? new Set(S.weights.filter((w) => Math.abs(w.kg - p.goal) <= 1).map((w) => Math.floor(new Date(w.d) / 6048e5))).size
    : Math.max(0, p.goal < p.weight ? p.weight - Math.min(...kgs, p.weight) : Math.max(...kgs, p.weight) - p.weight);
  const L = [
    ...(NATIVE || c.walk ? [{ id: "walk", ic: "👣", t: "Yo'lchi", d: "Qadam maqsadiga yetgan kunlar", v: c.walk, at: [3, 10, 30, 100], u: "kun" }] : []),
    { id: "food", ic: "🍽", t: "Dasturxon", d: "Ovqat yozilgan kunlar", v: c.food, at: [3, 14, 50, 150], u: "kun" },
    { id: "water", ic: "💧", t: "Buloq", d: "Suv normasi bajarilgan kunlar", v: c.water, at: [3, 10, 30, 100], u: "kun" },
    { id: "bal", ic: "⚖️", t: "Muvozanat", d: "Kaloriya normasidan ±10% kunlar", v: c.bal, at: [3, 10, 30, 90], u: "kun" },
    { id: "sleep", ic: "🌙", t: "Tinch uyqu", d: "Uyqu bali 70+ bo'lgan tunlar", v: c.sleep, at: [3, 10, 30, 90], u: "tun" },
    keep ? { id: "goal", ic: "🎯", t: "Barqaror vazn", d: "Maqsad ±1 kg bo'lgan haftalar", v: goal, at: [1, 4, 12, 26], u: "hafta" }
      : { id: "goal", ic: "🎯", t: "Maqsad sari", d: p.goal < p.weight ? "Tashlangan vazn" : "Olingan vazn", v: Math.floor(goal * 2) / 2, at: [1, 3, 5, 10], u: "kg" },
    { id: "streak", ic: "🔥", t: "Barqarorlik", d: "Eng uzun ketma-ket faol kunlar", v: c.streak, at: [3, 7, 30, 100], u: "kun" },
  ];
  return L.map((x) => ({ ...x, lvl: x.at.filter((a) => x.v >= a).length }));
}
const gardenTotal = (L) => L.reduce((a, x) => a + x.lvl, 0);
function season(total) {
  return total < 7 ? { t: "Bahor", sky: "#E6F4FF", grass: "#C9EBB4" } : total < 15 ? { t: "Yoz", sky: "#D6EEFF", grass: "#9ED78A" }
    : { t: "Hosil fasli", sky: "#FFF0D6", grass: "#E3C98A" };
}
const plant = (lvl) => (lvl === 4 ? `🌳<b>🍎</b>` : STAGES[lvl][0]);
const gv = (v) => String(v).replace(".", ",");
function viewGarden() {
  const L = gardenLines(), total = gardenTotal(L), se = season(total);
  return `${subHead("Mening bog'im", `${total} / ${L.length * 4} bosqich · ${se.t}`)}
  <section class="card garden" style="--sky:${se.sky};--grass:${se.grass}">
    <div class="g-m">${mascot(85)}</div>
    <div class="plots">${L.map((x) => `<div class="plot"><span class="pl">${plant(x.lvl)}</span><small>${x.t}</small></div>`).join("")}</div>
  </section>
  <p class="muted" style="margin:-4px 4px 12px;font-size:13px">Har odatingiz bog'ingizda bitta daraxt: kundalikni yuritganingiz sari nihol ko'chatga, ko'chat daraxtga aylanib, hosil beradi.</p>
  <section class="card" style="padding:4px 16px">${L.map((x) => {
    const nx = x.at[x.lvl], from = x.lvl ? x.at[x.lvl - 1] : 0;
    return `<div class="gl"><span class="ic">${x.ic}</span><div>
      <div class="between"><b>${x.t}</b><span class="muted" style="font-size:12px">${STAGES[x.lvl][0]} ${STAGES[x.lvl][1]}</span></div>
      <small class="muted">${x.d}: <b style="color:var(--text)">${gv(x.v)}</b>${nx != null ? ` / ${nx} ${x.u} → ${STAGES[x.lvl + 1][1].toLowerCase()}` : " · to'liq hosil 🎉"}</small>
      <div class="bar"><i style="width:${nx != null ? clamp(((x.v - from) / (nx - from)) * 100, 0, 100) : 100}%"></i></div></div></div>`;
  }).join("")}</section>
  <p class="cap" style="margin:20px 4px 8px">Olmacha kiyimlari</p>
  <section class="card"><div class="outfits">${OUTFITS.map(([id, t, need]) => {
    const ok = total >= need, on = (S.garden?.outfit || "") === id;
    return `<button data-of="${id}" class="${on ? "on" : ""}" ${ok ? "" : "disabled"}>${mascot(85, id).replace('class="mascot"', 'class="mini-m"')}
      <b>${t}</b><small>${ok ? (on ? "Kiyilgan" : "Tanlash") : `🔒 ${need} bosqich`}</small></button>`;
  }).join("")}</div></section>`;
}
function bindGarden() {
  $("#back").onclick = () => history.back();
  $$("[data-of]").forEach((b) => (b.onclick = () => {
    S.garden = { ...S.garden, outfit: b.dataset.of || undefined };
    save(); render();
  }));
}
/** Yangi bosqichga chiqilganda bir marta tabriklaydi (ochiq oyna bo'lsa kutadi). */
function checkGarden() {
  if (!S.profile || tab !== "kundalik" || $("#sheetWrap").classList.contains("open")) return;
  const L = gardenLines(), total = gardenTotal(L), seen = S.garden?.seen;
  if (!seen) { // birinchi marta: bor yutuqlar jimgina hisobga olinadi, bog' bilan tanishtiriladi
    S.garden = { ...S.garden, seen: Object.fromEntries(L.map((x) => [x.id, x.lvl])) };
    save();
    if (!total) return;
    return openSheet(`<div class="celebrate">🌱🌿🌳</div><h2>Yangi: Mening bog'im</h2>
      <p class="sub">Har odatingiz bog'ingizda bitta daraxt bo'lib o'sadi. Siz allaqachon <b>${total}</b> bosqich o'stirgansiz!</p>
      <button class="btn" id="go">🌳 Bog'ni ko'rish</button>`, (b) => ($("#go", b).onclick = () => { closeSheet(); openSub("bog"); }));
  }
  const up = L.filter((x) => x.lvl > (seen[x.id] || 0));
  if (!up.length) return;
  const before = total - up.reduce((a, x) => a + x.lvl - (seen[x.id] || 0), 0);
  const outfit = OUTFITS.find(([, , need]) => need && before < need && total >= need);
  S.garden = { ...S.garden, seen: { ...seen, ...Object.fromEntries(up.map((x) => [x.id, x.lvl])) } };
  save();
  const x = up[0];
  openSheet(`<div class="celebrate">${plant(x.lvl)}</div>
    <h2>Bog'ingizda yangi ${STAGES[x.lvl][1].toLowerCase()}!</h2>
    <p class="sub">${x.ic} ${x.t}: ${x.d.toLowerCase()} ${gv(x.v)} ${x.u}${up.length > 1 ? `, yana ${up.length - 1} ta daraxt o'sdi` : ""}</p>
    ${outfit ? `<div class="tip" style="text-align:center">🎁 Olmacha uchun yangi kiyim: <b>${outfit[1]}</b></div>` : ""}
    <button class="btn" id="go">🌳 Bog'ni ko'rish</button>
    <button class="btn ghost" id="cl" style="margin-top:8px">Yopish</button>`, (b) => {
    $("#go", b).onclick = () => { closeSheet(); openSub("bog"); };
    $("#cl", b).onclick = closeSheet;
  });
}

// ── Uyqu: kartochka, kiritish, sozlamalar ───────────
const QEMO = ["😫", "😕", "😐", "🙂", "😄"];
const clock = (d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const sleepStarted = () => S.sleepStart && Date.now() - S.sleepStart < 20 * 3600e3;

function sleepCard() {
  const sl = day().sleep, st = sleepStats(), need = sleepNeed(), bed = bestBed(), h = new Date().getHours();
  const d = sleepDur(sl), sc = sl ? sleepScore() : 0, started = sleepStarted(), naps = day().naps || [], nap = napMin(dkey()), tot = d + nap;
  const day2 = [...(!sl ? [`<button class="btn soft" id="slEdit">✏️ Kechagi uyqu</button>`] : []), `<button class="btn ghost" id="slNap">😪 Mizg'ib oldim</button>`];
  const btn = started ? `<button class="btn" id="slWake">☀️ Turdim</button>`
    : h >= 19 || h < 4 ? `<div class="grid2"><button class="btn" id="slStart">😴 Uxlayapman</button><button class="btn ghost" id="slEdit">✏️ Qo'lda</button></div>`
    : day2.length > 1 ? `<div class="grid2">${day2.join("")}</div>` : day2[0];
  const napLine = naps.length ? `<div class="row" style="flex-wrap:wrap;gap:6px;margin-top:10px">${naps.map((n, i) => `<button class="date-chip" data-nap="${i}" style="background:var(--soft)">😪 ${n.from}–${n.to} · ${fmtDur(napDur(n))}</button>`).join("")}</div>` : "";
  return `<section class="card">
    <div class="between"><p class="cap">😴 Uyqu</p>${sl ? `<button class="icon-btn" id="slEdit2" aria-label="Tahrirlash">${ico("pen", 18)}</button>` : ""}</div>
    ${sl ? `<div class="between" style="margin-top:10px;align-items:flex-end">
        <div><div class="big" style="font-size:28px">${fmtDur(tot)}</div><span class="muted">${sl.bed} → ${sl.wake}${sl.q ? " · " + QEMO[sl.q - 1] : ""}${nap ? ` · tunda ${fmtDur(d)} + mizg'ish ${fmtDur(nap)}` : ""}</span></div>
        <div style="text-align:right"><b style="font-size:22px;color:${sc >= 70 ? "var(--green-d)" : sc >= 45 ? "#B58A12" : "var(--red)"}">${sc}</b><br><span class="muted">uyqu balli</span></div></div>
      <div class="bar" style="margin-top:12px"><i style="width:${clamp((tot / need) * 100, 0, 100)}%;${tot < need - 60 ? "background:var(--orange)" : ""}"></i></div>
      <p class="muted" style="margin:6px 0 0;font-size:12px">Norma ${fmtDur(need)}</p>${napLine}`
    : nap ? `<p class="sub" style="margin:10px 0 0">Kunduzi mizg'ish: <b>${fmtDur(nap)}</b>. Tungi uyquni ham yozsangiz, kunlik jami va uyqu balli chiqadi.</p>${napLine}`
    : started ? `<p class="sub" style="margin:10px 0">Yotgan vaqtingiz: <b>${clock(new Date(S.sleepStart))}</b>. Yaxshi dam oling 🌙</p>`
    : `<p class="muted" style="margin:8px 0 0;font-size:13px">Yotish va turish vaqtini yozing: Qomat uyqu balli, haftalik qarz va shaxsiy tavsiyalarni hisoblaydi.</p>`}
    ${st.n ? `<div class="sl-stats"><div><small>Haftalik qarz</small><b>${st.debt ? fmtDur(st.debt) : "yo'q 👍"}</b></div>
      <div><small>Muntazamlik</small><b>${regLabel(st.reg)}${st.reg != null ? ` · ±${st.reg} daq` : ""}</b></div></div>` : ""}
    <p class="muted" style="margin:12px 0 ${btn ? 12 : 0}px;font-size:13px">🌙 ${sleepWake()} da turish uchun eng yaxshi yotish vaqti: <b style="color:var(--text)">${bed.at}</b> yoki ${bed.alt}</p>
    ${btn}
  </section>`;
}
function bindSleep() {
  $("#slStart")?.addEventListener("click", () => { S.sleepStart = Date.now(); persist(); render(); toast("Yaxshi dam oling 🌙"); });
  $("#slWake")?.addEventListener("click", wakeUp);
  $("#slEdit")?.addEventListener("click", () => sleepForm());
  $("#slEdit2")?.addEventListener("click", () => sleepForm());
  $("#slNap")?.addEventListener("click", () => napForm());
  $$("[data-nap]").forEach((x) => (x.onclick = () => napForm(dkey(), +x.dataset.nap)));
}
/** Kunduzgi mizg'ishni qo'shish yoki tahrirlash (idx: mavjudining tartib raqami). */
function napForm(k = dkey(), idx = -1) {
  const naps = S.days[k]?.naps || [], ed = naps[idx];
  const end = k === dkey() ? clock(new Date()) : "15:00";
  const cur = ed ? { ...ed } : { from: m2hm(hm2m(end) - 30), to: end };
  openSheet(`<h2>😪 Kunduzi mizg'ish</h2><p class="sub">${k === dkey() ? "Bugun" : dayName(k)} · o'sha kun uyqusiga qo'shiladi, statistikada alohida ko'rinadi</p>
    <div class="choice" id="np">${[20, 30, 60, 90].map((m) => `<button data-m="${m}">${fmtDur(m)}</button>`).join("")}</div>
    <div class="grid2" style="margin-top:12px"><label class="field"><span>Uxladim</span><input id="nf" type="time"></label>
      <label class="field"><span>Uyg'ondim</span><input id="nt" type="time"></label></div>
    <p class="sub" id="nd" style="margin-top:0"></p>
    <p class="muted" style="font-size:12px;margin:0 0 12px">20-30 daqiqalik mizg'ish tetiklashtiradi; 1 soatdan uzun yoki soat 15:00 dan keyingi mizg'ish tungi uyquni qiyinlashtirishi mumkin.</p>
    <button class="btn" id="ok">Saqlash</button>${ed ? `<button class="btn danger" id="del" style="margin-top:8px">O'chirish</button>` : ""}`, (b) => {
    const show = () => {
      $("#nf", b).value = cur.from;
      $("#nt", b).value = cur.to;
      const d = napDur(cur);
      $("#nd", b).textContent = d ? `Mizg'ish: ${fmtDur(d)}` : "Vaqtni tekshiring";
    };
    $$("#np button", b).forEach((x) => (x.onclick = () => { cur.from = m2hm(hm2m(cur.to) - +x.dataset.m); show(); }));
    $("#nf", b).oninput = (e) => { if (e.target.value) { cur.from = e.target.value; show(); } };
    $("#nt", b).oninput = (e) => { if (e.target.value) { cur.to = e.target.value; show(); } };
    $("#ok", b).onclick = () => {
      const d = napDur(cur);
      if (d < 5 || d > 240) return toast("Mizg'ish 5 daqiqadan 4 soatgacha bo'lsin");
      const list = [...naps];
      if (ed) list[idx] = { from: cur.from, to: cur.to }; else list.push({ from: cur.from, to: cur.to });
      day(k).naps = list.sort((x, y) => hm2m(x.from) - hm2m(y.from));
      save(); closeSheet(); render();
      toast(`Mizg'ish saqlandi: ${fmtDur(d)}`);
    };
    $("#del", b)?.addEventListener("click", () => {
      const list = naps.filter((_, i) => i !== idx);
      if (list.length) day(k).naps = list; else delete day(k).naps;
      save(); closeSheet(); render();
    });
    show();
  });
}
/** "Turdim": yotgan va turgan vaqt tugmalardan olinadi, faqat sifati so'raladi. */
function wakeUp() {
  if (!sleepStarted()) return render(); // tugma ikki marta bosilsa ikkinchisi hech narsa qilmaydi
  const sl = { bed: clock(new Date(S.sleepStart)), wake: clock(new Date()) };
  delete S.sleepStart;
  persist();
  const d = sleepDur(sl);
  if (d < 120 || d > 960) return sleepForm(dkey(), sl); // g'alati davomiylik: qo'lda to'g'rilansin
  openSheet(`<h2>Xayrli tong! ☀️</h2><p class="sub">${fmtDur(d)} uxladingiz (${sl.bed} → ${sl.wake}). Qanday uxladingiz?</p>
    <div class="q5">${QEMO.map((e, i) => `<button data-q="${i + 1}">${e}</button>`).join("")}</div>
    <button class="btn ghost" id="fix" style="margin-top:12px">Vaqtni o'zgartirish</button>`, (b) => {
    $$("[data-q]", b).forEach((x) => (x.onclick = () => { closeSheet(); saveSleep(dkey(), { ...sl, q: +x.dataset.q }); }));
    $("#fix", b).onclick = () => sleepForm(dkey(), sl);
  });
}
function saveSleep(k, sl) {
  if (!validSleep(sl)) return toast("Yotgan va turgan vaqtni tekshiring");
  day(k).sleep = sl;
  save();
  render();
  toast(`Uyqu saqlandi: ${fmtDur(sleepDur(sl))}`);
}
function sleepForm(k = dkey(), init) {
  const last = [...Array(14)].map((_, i) => S.days[dkey(ddays(i))]?.sleep).find(Boolean);
  const vals = (key) => init || S.days[key]?.sleep || { bed: last?.bed || bestBed().at, wake: last?.wake || sleepWake() };
  let cur = { q: 0, wakes: 0, ...vals(k) };
  const opts = (k < dkey(ddays(6)) ? `<option value="${k}" selected>${dayName(k)} turgan</option>` : "") + // Kundalikda eskiroq kun tanlangan
    [...Array(7)].map((_, i) => { const d = ddays(i), key = dkey(d); return `<option value="${key}" ${key === k ? "selected" : ""}>${i === 0 ? "Bugun" : i === 1 ? "Kecha" : `${d.getDate()}-${MONTHS[d.getMonth()]}`} turgan</option>`; }).join("");
  openSheet(`<h2>😴 Uyqu</h2>
    <label class="field"><span>Qaysi kun (turgan kuningiz)</span><select id="sd">${opts}</select></label>
    <div class="grid2"><label class="field"><span>Yotgan vaqt</span><input id="sb" type="time"></label>
      <label class="field"><span>Turgan vaqt</span><input id="sw" type="time"></label></div>
    <p class="sub" id="sdur" style="margin-top:0"></p>
    <p class="cap" style="margin:4px 0 8px">Qanday uxladingiz?</p><div class="q5" id="sq">${QEMO.map((e, i) => `<button data-q="${i + 1}">${e}</button>`).join("")}</div>
    <p class="cap" style="margin:14px 0 8px">Tunda necha marta uyg'ondingiz?</p><div class="pct4" id="sn">${["0", "1", "2", "3+"].map((v, i) => `<button data-n="${i}">${v}</button>`).join("")}</div>
    <button class="btn" id="ok">${ico("check", 20, "#fff")} Saqlash</button>
    <button class="btn ghost" id="napAdd" style="margin-top:8px">😪 Kunduzi mizg'ishni qo'shish</button>
    <button class="btn danger" id="del" style="margin-top:8px">O'chirish</button>`, (b) => {
    $("#napAdd", b).onclick = () => napForm($("#sd", b).value);
    const show = () => {
      $("#sb", b).value = cur.bed;
      $("#sw", b).value = cur.wake;
      $("#sdur", b).textContent = `Uxlangan vaqt: taxminan ${fmtDur(sleepDur(cur))} (norma ${fmtDur(sleepNeed())})`;
      $$("#sq button", b).forEach((x) => x.classList.toggle("on", +x.dataset.q === cur.q));
      $$("#sn button", b).forEach((x) => x.classList.toggle("on", +x.dataset.n === cur.wakes));
      $("#del", b).style.display = S.days[$("#sd", b).value]?.sleep ? "" : "none";
    };
    $("#sd", b).onchange = (e) => { cur = { q: 0, wakes: 0, ...vals(e.target.value) }; init = null; show(); };
    $("#sb", b).oninput = (e) => { if (e.target.value) { cur.bed = e.target.value; show(); } };
    $("#sw", b).oninput = (e) => { if (e.target.value) { cur.wake = e.target.value; show(); } };
    $$("#sq button", b).forEach((x) => (x.onclick = () => { cur.q = +x.dataset.q; show(); }));
    $$("#sn button", b).forEach((x) => (x.onclick = () => { cur.wakes = +x.dataset.n; show(); }));
    $("#ok", b).onclick = () => {
      if (sleepDur(cur) < 30) return toast("Yotgan va turgan vaqtni tekshiring");
      closeSheet();
      saveSleep($("#sd", b).value, { bed: cur.bed, wake: cur.wake, ...(cur.q ? { q: cur.q } : {}), ...(cur.wakes ? { wakes: cur.wakes } : {}) });
    };
    $("#del", b).onclick = () => { if (!confirm("Uyqu yozuvi o'chirilsinmi?")) return; delete S.days[$("#sd", b).value].sleep; save(); closeSheet(); render(); };
    show();
  });
}
function sleepSettings() {
  const c = S.sleepCfg || {};
  const needs = [[0, `Yoshimga qarab (${fmtDur(S.profile && age() < 18 ? 540 : S.profile && age() >= 65 ? 450 : 480)})`], [420, "7 soat"], [450, "7,5 soat"], [480, "8 soat"], [510, "8,5 soat"], [540, "9 soat"]];
  let need = c.need || 0;
  openSheet(`<h2>😴 Uyqu sozlamalari</h2>
    <label class="field"><span>Odatda soat nechada turasiz?</span><input id="cw" type="time" value="${sleepWake()}"></label>
    <p class="cap" style="margin:4px 0 8px">Uyqu normasi</p>
    <div class="choice" id="cn">${needs.map(([v, t]) => `<button data-v="${v}" class="${v === need ? "on" : ""}">${t}</button>`).join("")}</div>
    <label class="row" style="margin:14px 0"><input type="checkbox" id="cr" ${c.remind !== false ? "checked" : ""} style="width:20px;height:20px;accent-color:var(--green)"> Yotish va turish eslatmalari</label>
    <p class="muted" style="font-size:12px;margin:0 0 12px">Kattalarga 7-9 soat tavsiya qilinadi (National Sleep Foundation). Eng muhimi: har kuni bir vaqtda yotish va turish.</p>
    <button class="btn" id="ok">Saqlash</button>`, (b) => {
    $$("#cn button", b).forEach((x) => (x.onclick = () => { need = +x.dataset.v; $$("#cn button", b).forEach((y) => y.classList.toggle("on", y === x)); }));
    $("#ok", b).onclick = () => {
      S.sleepCfg = { wake: $("#cw", b).value || "07:00", need: need || null, remind: $("#cr", b).checked };
      save(); closeSheet(); render();
      toast(`Eng yaxshi yotish vaqti: ${bestBed().at}`);
    };
  });
}
function sleepChart(days) {
  const vals = days.map((x) => sleepTotal(x.k) / 60), naps = days.map((x) => napMin(x.k) / 60);
  if (!vals.some(Boolean)) return `<div class="empty"><div class="ill">😴</div><b>Uyqu hali yozilmagan</b><p>Kundalikdagi "Uyqu" kartasidan yotish va turish vaqtini yozing</p></div>`;
  const need = sleepNeed() / 60, W = 320, H = 150, max = Math.max(10, ...vals), bw = 26;
  const y = (v) => H - 24 - (v / max) * (H - 40);
  // ustun: tungi uyqu (ko'k yoki to'q sariq) + ustida kunduzgi mizg'ish (binafsha), raqam — kunlik jami
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">
    <line x1="0" x2="${W}" y1="${y(need)}" y2="${y(need)}" stroke="#2EAD5B" stroke-dasharray="4 4" opacity=".6"/>
    <text x="2" y="${y(need) - 5}" font-size="10" font-weight="700" fill="#23914A">norma ${fmtDur(need * 60)}</text>
    ${naps.some(Boolean) ? `<rect x="${W - 92}" y="2" width="9" height="9" rx="2" fill="#B49BE6"/><text x="${W - 79}" y="10" font-size="10" fill="#8E897F">kunduzi mizg'ish</text>` : ""}
    ${days.map((x, i) => {
      const cx = 22 + i * ((W - 44) / 6), v = vals[i], nv = naps[i], top = y(v), mid = y(v - nv);
      return `<rect x="${cx - bw / 2}" y="${top}" width="${bw}" height="${Math.max(0, H - 24 - top)}" rx="8" fill="${!v ? "#EFECE6" : v < need - 1 ? "#F2A54A" : "#7FB2E5"}"/>
        ${nv ? `<rect x="${cx - bw / 2}" y="${top}" width="${bw}" height="${Math.max(3, mid - top)}" rx="${mid - top > 12 ? 8 : 3}" fill="#B49BE6"/>` : ""}
        ${v ? `<text x="${cx}" y="${top - 4}" text-anchor="middle" font-size="10" font-weight="700">${String(Math.round(v * 10) / 10).replace(".", ",")}</text>` : ""}
        <text x="${cx}" y="${H - 6}" text-anchor="middle" font-size="11" fill="#8E897F">${String(x.d.getDate()).padStart(2, "0")}.${String(x.d.getMonth() + 1).padStart(2, "0")}</text>`;
    }).join("")}</svg>`;
}

/** 🔥 Yoqilgan kaloriya: tinch holat, uyqu, hazm va harakat (bugun: hozirgacha, jonli o'sadi). */
const BURN_ROWS = [["sleep", "😴", "Uyquda", "var(--blue)"], ["awake", "🧍", "Tinch holatda (uyg'oq)", "#B9D8A6"],
  ["tef", "🍽", "Ovqat hazmi", "var(--yellow)"], ["move", "🚶", "Harakat (qadam, mashq)", "var(--orange)"]];
function burnBody(k, past) {
  const b = burnParts(k), end = past ? b : burnParts(k, true);
  return `<div class="between" style="align-items:baseline;margin-top:6px"><b style="font-size:30px">${fmt(b.total)}</b>
      <span class="muted" style="font-size:13px">kkal${past ? "" : ` · kun oxirigacha ~${fmt(end.total)}`}</span></div>
    <div class="bar" style="display:flex;height:10px;margin:10px 0 4px">${BURN_ROWS.map(([key, , , c]) => b[key] ? `<i style="width:${(b[key] / Math.max(1, b.total)) * 100}%;background:${c};border-radius:0"></i>` : "").join("")}</div>
    ${BURN_ROWS.map(([key, ic, name, c]) => `<div class="between" style="padding:5px 0;font-size:14px"><span><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${c};margin-right:6px"></i>${ic} ${name}</span><b>${fmt(b[key])}</b></div>`).join("")}
    ${b.guessed ? `<p class="muted" style="font-size:12px;margin:6px 0 0">Uyqu yozilmagan: ${fmtDur(sleepNeed())} deb olindi. Uyquni yozsangiz aniqroq bo'ladi.</p>` : ""}`;
}
function burnCard(k, past) {
  if (!S.profile) return "";
  return `<section class="card">
    <div class="between"><p class="cap">🔥 ${past ? "Shu kuni yoqildi" : "Bugun yoqildi"}</p><button class="muted" id="burnInfo" style="font-size:12px">Qanday hisoblanadi?</button></div>
    <div id="burnBody">${burnBody(k, past)}</div></section>`;
}
function burnInfo() {
  const b = burnParts(dkey(), true);
  openSheet(`<h2>Yoqilgan kaloriya</h2>
    <p class="sub">Tanangiz hech narsa qilmasa ham kun bo'yi energiya sarflaydi: nafas, yurak, miya, tana harorati.</p>
    <p>• <b>Bazal almashinuv</b> (Mifflin-St Jeor): sizda kuniga ~${fmt(b.bmr)} kkal.<br>
    • <b>😴 Uyquda</b>: bazalning ~95%.<br>
    • <b>🧍 Uyg'oq, tinch holatda</b> (o'tirish, turish, gaplashish): bazalning ~120%.<br>
    • <b>🍽 Ovqat hazmi</b>: yeganingizning ~10%.<br>
    • <b>🚶 Harakat</b>: qadamlar va mashqlar, tinch holatdan ortig'i.</p>
    <p class="muted" style="font-size:13px">Kunlik normangiz shu sarfdan kelib chiqqan. Faollik darajangizda kuniga ~${fmt(activeIncl())} kkal harakat allaqachon hisobga olingan, shuning uchun normaga faqat undan ortig'i qo'shiladi. Hisob taxminiy (±10–15%).</p>
    <button class="btn ghost" onclick="closeSheet()">Tushunarli</button>`);
}
let burnTimer;

function stepsCard(t) {
  if (!NATIVE || !stepInfo) return "";
  if (!stepInfo.available) {
    return `<section class="card"><p class="cap">🚶 Qadamlar</p><p class="muted" style="margin:8px 0 0;font-size:13px">Bu telefonda qadam sanaydigan datchik yo'q. Yurishni "Faollik" orqali qo'lda qo'shing.</p></section>`;
  }
  if (!stepInfo.granted) {
    return `<section class="card"><p class="cap">🚶 Qadamlar</p>
      <p class="muted" style="margin:8px 0 12px;font-size:13px">Telefon kun bo'yi qadamlaringizni sanaydi, yoqilgan kaloriya avtomatik qo'shiladi.</p>
      <button class="btn soft" id="stepsOn">Qadamlarni sanashni yoqish</button></section>`;
  }
  return `<section class="card">
    <div class="between"><p class="cap">🚶 Qadamlar</p><span class="muted" style="font-size:13px">maqsad ${fmt(stepGoal())}</span></div>
    <div class="between" style="margin-top:10px;align-items:flex-end">
      <div><div class="big" style="font-size:30px">${fmt(t.steps)}</div><span class="muted">${kg(stepKm(t.steps))} km</span></div>
      <div style="text-align:right"><b style="font-size:20px">+${fmt(t.stepBurn)}</b><br><span class="muted">kkal yoqildi</span></div></div>
    <div class="bar" style="margin-top:12px"><i style="width:${clamp((t.steps / stepGoal()) * 100, 0, 100)}%"></i></div>
    ${S.profile.activity > 1.2 ? `<p class="muted" style="margin:10px 0 0;font-size:12px">💡 Yurish endi alohida hisoblanadi. Kaloriya ikki marta hisoblanmasligi uchun Profilda faollikni "Kam harakat" qilib qo'ying.</p>` : ""}
  </section>`;
}

function macro(icon, name, v, max) {
  return `<div class="macro"><span class="ic">${icon}</span><div><div class="between"><b>${name}</b><span class="muted"><b style="color:var(--text)">${Math.round(v)}</b> / ${max} g</span></div>
    <div class="bar"><i style="width:${clamp((v / max) * 100, 0, 100)}%;${v > max * 1.1 ? "background:var(--orange)" : ""}"></i></div></div></div>`;
}

const openFood = new Set(); // kundalikda tarkibi ochilgan ovqatlar
/** Tanlangan kunning ovqatlari (vaqt bo'yicha guruhlab) va faolligi. */
function dayList(k) {
  const d = day(k), n = norms();
  const hm = (t) => new Date(t).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const act = (x) => `<div class="item"><span class="th">${x.icon || "🏃"}</span>
      <div><b>${esc(x.name)}</b><small>${hm(x.t)}</small></div>
      <div class="row"><span class="kc burn">+${x.kcal}</span>
      <button class="muted" data-del="act:${x.id}" aria-label="O'chirish">${ico("trash", 18)}</button></div></div>`;
  const food = (x) => {
    const open = openFood.has(x.id), more = x.items?.length || x.tip || x.warn;
    const part = x.pct != null && x.pct < 100;
    return `<div class="food">
      <div class="item" data-eat="${x.id}"><span class="th" style="${x.img ? `background-image:url(${x.img})` : ""}">${x.img ? "" : "🍽️"}</span>
        <div><b>${esc(x.name)}</b>${part ? `<span class="half">${x.pct}%</span>` : ""}<small>${hm(x.t)}${x.p || x.f || x.c ? ` · O ${x.p} · Y ${x.f} · U ${x.c}` : ""}</small>
          ${x.score || x.warn || (hasDiabetes() && x.c) ? `<div class="fmeta">${x.score ? `${apples(x.score)} ${esc(x.why || SCORE_T[x.score])}` : ""}
            ${hasDiabetes() && x.c ? `<span class="xe">XE ${xe(x.c)}</span>` : ""}${x.warn ? "<span>⚠️</span>" : ""}</div>` : ""}</div>
        <span class="kc">${x.kcal}</span></div>
      ${open ? `<div class="fx">
        ${x.items?.length ? `<ul>${x.items.map((i) => `<li><span>${esc(i.n)}${grams(i)}</span><b>${i.k} kkal</b></li>`).join("")}</ul>
          ${part ? `<small class="muted">Tarkibi to'liq porsiya uchun</small>` : ""}` : ""}
        ${foodWarn(x)}${x.tip ? `<div class="tip">💡 ${esc(x.tip)}</div>` : ""}</div>` : ""}
      <div class="tools"><button data-star="${x.id}" class="${isFav(x.name) ? "on" : ""}" aria-label="Saqlash">${isFav(x.name) ? "★" : "☆"}</button>
        ${more ? `<button data-x="${x.id}">${open ? "▴ Yopish" : "▾ Tarkibi"}</button>` : ""}
        <button data-edit="${x.id}">${ico("pen", 14)} Tahrirlash</button>
        <button data-del="food:${x.id}" aria-label="O'chirish">${ico("trash", 14)}</button></div></div>`;
  };
  const groups = MEAL4.map(([m, ic, name, share]) => {
    const list = d.food.filter((f) => mealOf(f) === m).sort((a, b) => a.t - b.t);
    const eat = list.reduce((a, f) => a + (+f.kcal || 0), 0), goal = Math.round((n.kcal * share) / 10) * 10;
    return `<div class="meal">
      <div class="mhead"><span class="th">${ic}</span>
        <div><b>${name}</b><small>${fmt(eat)} / ${fmt(goal)} kkal</small></div>
        <button class="madd" data-madd="${m}">+ Qo'shish</button></div>
      <div class="bar"><i style="width:${clamp((eat / goal) * 100, 0, 100)}%;${eat > goal * 1.15 ? "background:var(--orange)" : ""}"></i></div>
      ${list.map((x) => food({ ...x, kind: "food" })).join("")}</div>`;
  }).join("");
  const acts = d.act.slice().sort((a, b) => a.t - b.t);
  return `<section class="card meals">${groups}</section>
    ${acts.length ? `<section class="card" style="padding:6px 16px"><p class="cap" style="margin:10px 0 0">🏃 Faollik</p>${acts.map(act).join("")}</section>` : ""}`;
}

/** O'tgan kun uchun qisqa kartochka: qadamlar (telefon hisoblagan, o'zgartirilmaydi), uyqu va vazn. */
function pastExtras(k, t) {
  const sl = S.days[k]?.sleep, wt = S.weights.find((x) => x.d === k);
  return `<section class="card">
    <div class="between"><span>🚶 Qadamlar</span><b>${t.steps ? `${fmt(t.steps)} · ${t.stepBurn} kkal` : "yozilmagan"}</b></div>
    <div class="between" style="margin-top:12px"><span>😴 Uyqu</span><button class="date-chip" id="pSleep" style="background:var(--soft)">${sl && validSleep(sl) ? `${fmtDur(sleepDur(sl))} ✏️` : "+ Yozish"}</button></div>
    <div class="between" style="margin-top:12px"><span>⚖️ Vazn</span><button class="date-chip" id="pWeight" style="background:var(--soft)">${wt ? `${kg(wt.kg)} kg ✏️` : "+ Yozish"}</button></div>
  </section>`;
}

function weekChange() {
  if (!S.weights.length) return 0;
  const cur = curWeight(), weekAgo = dkey(ddays(7));
  const before = [...S.weights].reverse().find((x) => x.d <= weekAgo) || { kg: S.profile.weight };
  return cur - before.kg;
}
function streak() {
  let n = 0;
  for (let i = 0; i < 365; i++) {
    const d = S.days[dkey(ddays(i))];
    if (d && (d.food.length || d.act.length || d.water || d.sleep)) n++;
    else if (i > 0) break;
  }
  return n;
}

function bindDaily() {
  const K = curKey();
  $("#blkUp")?.addEventListener("click", () => updateSheet({ ...blockInfo.srv, force: true }));
  bindNimaCard();
  $$("[data-madd]").forEach((x) => (x.onclick = () => addMenu(x.dataset.madd)));
  $("#editAct").onclick = activityForm;
  $("#toGarden").onclick = () => openSub("bog");
  $("#pSleep")?.addEventListener("click", () => sleepForm(K));
  $("#pWeight")?.addEventListener("click", () => pick("weight", S.weights.find((x) => x.d === K)?.kg || curWeight(), (v) => setWeight(v, K)));
  $("#wPlus").onclick = () => addWater(1);
  $("#wMinus").onclick = () => addWater(-1);
  bindFoodList();
  $("#burnInfo")?.addEventListener("click", burnInfo);
  clearInterval(burnTimer);
  if (isPast()) return;
  // bugungi sarf daqiqa sayin o'sadi: faqat shu kartochka yangilanadi
  burnTimer = setInterval(() => {
    if (tab !== "kundalik" || isPast()) return clearInterval(burnTimer);
    if (!document.hidden && $("#burnBody")) $("#burnBody").innerHTML = burnBody(dkey(), false);
  }, 60000);
  $("#editWeight").onclick = () => pick("weight", curWeight(), setWeight);
  $("#editGoal").onclick = () => pick("goal", S.profile.goal, (v) => { S.profile.goal = v; save(); render(); });
  $("#hOn")?.addEventListener("click", healthSheet);
  $("#hNo")?.addEventListener("click", () => { S.profile.health = []; save(); render(); });
  bindSleep();
  loadAdvice();
  setTimeout(checkGarden, 3500); // yangilanish oynasidan keyin
  $("#notifOn")?.addEventListener("click", () => setNotif(true));
  $("#memInfo")?.addEventListener("click", () => openSheet(`<h2>Men haqimda</h2>
    <p class="sub">AI haftasiga bir marta kundaligingizdan shunday xulosa chiqaradi va maslahatlarda undan foydalanadi.</p>
    <p>${mdLite(S.memory.text).replace(/\n/g, "<br>")}</p>
    <button class="btn ghost" onclick="closeSheet()">Yopish</button>`));
  $("#stepsOn")?.addEventListener("click", async () => {
    await syncSteps(true);
    if (stepInfo && !stepInfo.granted) toast("Ruxsat berilmadi. Telefon sozlamalarida Qomat uchun \"Jismoniy faollik\" ruxsatini yoqing.");
  });
  $("#bmiInfo").onclick = () => openSheet(`<h2>Tana vazni indeksi (BMI)</h2>
    <p>BMI = vazn (kg) ÷ bo'y² (m). Sizda: ${kg(curWeight())} ÷ ${(S.profile.height / 100).toFixed(2).replace(".", ",")}² = <b>${bmi().toFixed(1)}</b></p>
    <p class="muted">18,5 dan kam: vazn yetishmaydi · 18,5–25: normal · 25–30: ortiqcha vazn · 30 dan yuqori: semizlik.<br>BMI mushak massasini hisobga olmaydi, shuning uchun taxminiy ko'rsatkich.</p>
    <button class="btn ghost" onclick="closeSheet()">Tushunarli</button>`);
}
/** Ovqat va faollik ro'yxatidagi tugmalar (bugun ham, o'tgan kunda ham). */
function bindFoodList(again = () => { const y = scrollY; render(); scrollTo(0, y); }, root = document) {
  $$("[data-star]", root).forEach((x) => (x.onclick = () => {
    const f = day(curKey()).food.find((i) => i.id === x.dataset.star);
    if (!f) return;
    toggleFav(f);
    again();
  }));
  $$("[data-eat]", root).forEach((x) => (x.onclick = () => eatenForm(x.dataset.eat)));
  $$("[data-edit]", root).forEach((x) => (x.onclick = () => eatenForm(x.dataset.edit)));
  $$("[data-x]", root).forEach((x) => (x.onclick = () => {
    const id = x.dataset.x;
    openFood.has(id) ? openFood.delete(id) : openFood.add(id);
    again();
  }));
  $$("[data-del]", root).forEach((x) => (x.onclick = () => {
    const [kind, id] = x.dataset.del.split(":");
    if (!confirm("O'chirilsinmi?")) return;
    removeEntry(kind, id);
    again();
  }));
}

/** Tarix'dagi kunni o'sha sahifaning o'zida tahrirlash oynasi. Har o'zgarish darrov saqlanadi, "Saqlash" oynani yopadi. */
function dayEditSheet(k) {
  editDay = k;
  const t = totals(k), n = norms(), sl = S.days[k]?.sleep;
  const scroll = sheetKind === "day" ? $(".sheet").scrollTop : 0; // qayta chizilganda joyida qolsin
  openSheet(`<h2 style="margin:0;text-align:left">📅 ${k === dkey() ? "Bugun, " : ""}${dayName(k)}</h2>
    <p class="sub" style="text-align:left;margin:6px 0 12px">${fmt(t.eat)} / ${fmt(n.kcal)} kkal yeyildi · ${fmt(t.burn)} kkal yoqildi · kun bali ${lifeScore(k)}</p>
    <div class="de-row"><span>💧 Suv: <b>${t.water}</b> stakan</span><div class="row" style="gap:6px"><button class="de-b" id="deWm">−</button><button class="de-b" id="deWp">+</button></div></div>
    <div class="de-row"><span>😴 Uyqu${sl && validSleep(sl) ? `: <b>${fmtDur(sleepDur(sl))}</b>` : ""}</span><button class="de-b wide" id="deS">${sl ? "✏️" : "+ Yozish"}</button></div>
    ${dayList(k)}
    <button class="btn" id="deOk" style="margin-top:6px">${ico("check", 20, "#fff")} Saqlash</button>`, (b) => {
    const again = () => dayEditSheet(k);
    bindFoodList(again, b);
    $$("[data-madd]", b).forEach((x) => (x.onclick = () => addMenu(x.dataset.madd)));
    $("#deWm", b).onclick = () => { addWater(-1); again(); };
    $("#deWp", b).onclick = () => { addWater(1); again(); };
    $("#deS", b).onclick = () => sleepForm(k);
    $("#deOk", b).onclick = () => { closeSheet(); toast(`✅ ${dayName(k)} saqlandi`); };
    $(".sheet").scrollTop = scroll;
  }, "day");
}

// Tarix
function viewHistory() {
  const n = norms();
  const days = [...Array(7)].map((_, i) => { const d = ddays(6 - i); return { d, k: dkey(d), t: totals(dkey(d)) }; });
  const wts = S.weights.slice(-14);
  const avg = Math.round(days.reduce((a, x) => a + x.t.eat, 0) / 7);
  return `<div class="head"><div><h1>Tarix</h1><p>Oxirgi kunlar natijalari</p></div></div>
  ${goalCard()}
  <section class="card">
    <div class="between"><p class="cap">Grafik</p><div class="seg-toggle"><button data-m="kcal" class="${histMode === "kcal" ? "on" : ""}">Kaloriya</button><button data-m="weight" class="${histMode === "weight" ? "on" : ""}">Vazn</button><button data-m="sleep" class="${histMode === "sleep" ? "on" : ""}">Uyqu</button></div></div>
    ${histMode === "kcal" ? barChart(days, n.kcal) : histMode === "sleep" ? sleepChart(days) : lineChart(wts)}
    ${histMode === "kcal" ? `<p class="muted" style="margin:6px 0 0;font-size:12px;text-align:center">Ustun yoki sanani bosing: o'sha kunni shu yerda tahrirlaysiz</p>` : ""}
  </section>
  <div class="grid2">
    <section class="card"><p class="cap">O'rtacha</p><div class="big" style="font-size:28px;margin-top:8px">${fmt(avg)}</div><span class="muted">kkal / kun</span></section>
    <section class="card"><p class="cap">Seriya</p><div class="big" style="font-size:28px;margin-top:8px">${streak()}</div><span class="muted">kun ketma-ket</span></section>
  </div>
  <section class="card" style="padding:6px 16px">${days.slice().reverse().map((x) => `
    <div class="item hday" data-hd="${x.k}"><span class="th">${x.t.n ? "✅" : "▫️"}</span>
      <div><div class="hrow"><b>${x.d.getDate()}-${MONTHS[x.d.getMonth()]}</b><button class="hedit" data-hd="${x.k}">✏️ Tahrirlash</button></div><small>💧 ${x.t.water} stakan · ${sleepTotal(x.k) ? `😴 ${fmtDur(sleepTotal(x.k))}${napMin(x.k) ? ` (shundan mizg'ish ${fmtDur(napMin(x.k))})` : ""} · ` : ""}${x.t.steps ? `🚶 ${fmt(x.t.steps)} qadam · ` : ""}🏃 ${x.t.burn} kkal · kun bali ${lifeScore(x.k)}</small></div>
      <span class="kc">${fmt(x.t.eat)}</span></div>`).join("")}</section>
  <button class="btn soft" id="hOther">📅 Boshqa sanani tanlash</button>`;
}
/** Maqsad kartochkasi: boshlang'ich, hozirgi va maqsad vazn, taxminiy muddat (oxirgi 3 hafta sur'atiga qarab). */
function goalCard() {
  const p = S.profile, start = p.weight, w = curWeight(), goal = p.goal;
  if (Math.abs(start - goal) < 0.5) return "";
  const prog = clamp((start - w) / (start - goal), 0, 1), down = goal < start;
  let eta;
  if (down ? w <= goal + 0.2 : w >= goal - 0.2) eta = `<b>🎉 Maqsadga yetdingiz!</b>`;
  else {
    const since = dkey(ddays(21)), rec = S.weights.filter((x) => x.d >= since);
    const days = rec.length > 1 ? (new Date(rec.at(-1).d) - new Date(rec[0].d)) / 864e5 : 0;
    const rate = days >= 7 ? ((rec[0].kg - rec.at(-1).kg) / days) * 7 * (down ? 1 : -1) : 0; // maqsad tomonga, kg/hafta
    const real = rate >= 0.1, wk = Math.min(real ? rate : 0.5, 1); // juda tez sur'at muddatni noto'g'ri qisqartirmasin
    const left = Math.abs(w - goal), total = Math.max(1, Math.round((left / wk) * 7)), at = new Date(Date.now() + total * 864e5);
    const mo = Math.floor(total / 30), dd = total % 30;
    eta = `<b>🎯 Maqsadga taxminan ${mo ? `${mo} oy` : ""}${mo && dd ? " " : ""}${dd ? `${dd} kun` : ""}da yetasiz</b>
      <p class="muted" style="margin:4px 0 0;font-size:13px">${real ? `Oxirgi haftalarda haftasiga ${kg(r1(rate))} kg ${down ? "tashladingiz" : "qo'shdingiz"}` : `Haftasiga 0,5 kg ${down ? "tashlasangiz" : "qo'shsangiz"} (sog'lom sur'at)`}. Shunda ${at.getDate()}-${MONTHS[at.getMonth()]}ga ${kg(goal)} kg bo'lasiz.</p>`;
  }
  return `<section class="card">
    <div class="grid2" style="grid-template-columns:repeat(3,1fr);text-align:center">
      <div><small class="muted">Boshida</small><div style="font-weight:800;font-size:19px">${kg(start)} kg</div></div>
      <div><small style="color:var(--green-d)">Hozir</small><div style="font-weight:800;font-size:19px;color:var(--green-d)">${kg(w)} kg</div></div>
      <div><small class="muted">Maqsad</small><div style="font-weight:800;font-size:19px">${kg(goal)} kg</div></div></div>
    <div class="bar" style="margin:12px 0"><i style="width:${prog * 100}%"></i></div>${eta}</section>`;
}
function barChart(days, norm) {
  const W = 320, H = 150, max = Math.max(norm * 1.2, ...days.map((x) => x.t.eat)), bw = 26;
  const y = (v) => H - 24 - (v / max) * (H - 40);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">
    <line x1="0" x2="${W}" y1="${y(norm)}" y2="${y(norm)}" stroke="#2EAD5B" stroke-dasharray="4 4" opacity=".6"/>
    <text x="2" y="${y(norm) - 5}" font-size="10" font-weight="700" fill="#23914A">norma ${fmt(norm)}</text>
    ${days.map((x, i) => {
      const cx = 22 + i * ((W - 44) / 6), v = x.t.eat, top = y(v);
      return `<g data-hd="${x.k}" style="cursor:pointer"><rect x="${cx - 20}" y="0" width="40" height="${H}" fill="transparent"/>
        <rect x="${cx - bw / 2}" y="${top}" width="${bw}" height="${Math.max(0, H - 24 - top)}" rx="8" fill="${v > norm * 1.1 ? "#F2A54A" : v ? "#2EAD5B" : "#EFECE6"}"/>
        <text x="${cx}" y="${H - 6}" text-anchor="middle" font-size="11" font-weight="700" fill="#23914A" text-decoration="underline">${String(x.d.getDate()).padStart(2, "0")}.${String(x.d.getMonth() + 1).padStart(2, "0")}</text></g>`;
    }).join("")}</svg>`;
}
function lineChart(wts) {
  if (wts.length < 2) return `<div class="empty"><div class="ill">⚖️</div><b>Ma'lumot kam</b><p>Vazningizni har kuni yoki haftada bir yozib boring, grafik shu yerda chiqadi</p></div>`;
  const W = 320, H = 150, vals = wts.map((w) => w.kg), goal = S.profile.goal;
  const lo = Math.min(...vals, goal) - 1, hi = Math.max(...vals, goal) + 1;
  const x = (i) => 20 + i * ((W - 40) / (wts.length - 1)), y = (v) => H - 26 - ((v - lo) / (hi - lo)) * (H - 46);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">
    <line x1="0" x2="${W}" y1="${y(goal)}" y2="${y(goal)}" stroke="#2EAD5B" stroke-dasharray="4 4" opacity=".6"/>
    <text x="2" y="${y(goal) - 5}" font-size="10" font-weight="700" fill="#23914A">maqsad ${kg(goal)}</text>
    <polyline points="${wts.map((w, i) => `${x(i)},${y(w.kg)}`).join(" ")}" fill="none" stroke="#F4CB4C" stroke-width="3" stroke-linejoin="round"/>
    ${wts.map((w, i) => `<circle cx="${x(i)}" cy="${y(w.kg)}" r="5" fill="#F4CB4C"/>
      ${i === 0 || i === wts.length - 1 ? `<text x="${x(i)}" y="${y(w.kg) - 10}" text-anchor="middle" font-size="11" font-weight="700">${kg(w.kg)}</text>` : ""}
      <text x="${x(i)}" y="${H - 6}" text-anchor="middle" font-size="10" fill="#8E897F">${w.d.slice(8)}.${w.d.slice(5, 7)}</text>`).join("")}</svg>`;
}
function bindHistory() {
  $$("[data-m]").forEach((b) => (b.onclick = () => { histMode = b.dataset.m; render(); }));
  // kun shu sahifaning o'zida, oynada tahrirlanadi (Kundalikka o'tib ketmaydi)
  $$("[data-hd]").forEach((b) => (b.onclick = (e) => { e.stopPropagation(); dayEditSheet(b.dataset.hd); }));
  $("#hOther").onclick = () => calSheet(dkey(), null, dayEditSheet);
}

// Chat
let chatBusy = false;
const SUGGEST = ["Bugun kechki ovqatga nima yesam bo'ladi?", "Ozish uchun haftalik menyu tuzib ber", "Oshning kaloriyasi qancha?", "Bugungi natijamni baholab ber"];

function mdLite(s) {
  return esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/^\s*[*-]\s+/gm, "• ");
}
function viewChat() {
  const msgs = S.chat.map((m, i) => `<div class="msg ${m.role}">${m.img ? `<img src="${m.img}">` : ""}${mdLite(m.text)}${
    m.food && !m.added ? `<div class="act"><button class="btn soft" data-addfood="${i}">+ Kundalikka qo'shish (${m.food.kcal} kkal)</button></div>` : ""}</div>`).join("");
  return `<div class="head"><div><h1>Qomat AI</h1><p>Savol bering yoki ovqat suratini yuboring</p></div>
    ${S.chat.length ? `<button class="icon-btn" id="clr" aria-label="Tozalash">${ico("trash", 18)}</button>` : ""}</div>
  ${limitBar()}
  <div class="chat" id="chat">
    ${S.chat.length ? msgs : `<div class="msg ai">Salom! Men Qomat AI, sizning dietologingizman 🍏 Ovqatingizni suratga olib yuboring, kaloriyasini hisoblayman. Yoki ovqatlanish, vazn va sog'lom turmush haqida so'rang.</div>
      <div class="suggest">${SUGGEST.map((s) => `<button data-s="${esc(s)}">${esc(s)}</button>`).join("")}</div>`}
    ${chatBusy ? `<div class="msg ai typing"><span></span><span></span><span></span></div>` : ""}
  </div>
  <div class="composer"><div class="in">
    <button id="cPhoto" aria-label="Surat">${ico("camera", 22, "#8E897F")}</button>
    <textarea id="cText" rows="1" placeholder="Xabar yozing…"></textarea>
    <button class="send" id="cSend" aria-label="Yuborish">${ico("send", 20, "#fff")}</button>
  </div></div>`;
}
function bindChat() {
  refreshLimit();
  const t = $("#cText");
  t.oninput = () => { t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; };
  t.onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey && matchMedia("(pointer:fine)").matches) { e.preventDefault(); $("#cSend").click(); } };
  $("#cSend").onclick = () => sendChat(t.value);
  $("#cPhoto").onclick = () => openSheet(`<h2>Ovqat surati</h2><div class="opts">
      <button class="opt" id="a"><span class="ic">📷</span><span><b>Kamera</b></span></button>
      <button class="opt" id="b"><span class="ic">🖼️</span><span><b>Galereya</b></span></button></div>`, (b) => {
    $("#a", b).onclick = () => { closeSheet(); takePhoto("#fileCam", "chat"); };
    $("#b", b).onclick = () => { closeSheet(); takePhoto("#fileGal", "chat"); };
  });
  $$("[data-s]").forEach((b) => (b.onclick = () => sendChat(b.dataset.s)));
  $("#clr")?.addEventListener("click", () => { if (confirm("Suhbat tozalansinmi?")) { S.chat = []; save(); render(); } });
  $$("[data-addfood]").forEach((b) => (b.onclick = () => {
    const m = S.chat[+b.dataset.addfood], f = m.food;
    m.added = true;
    addFood({ ...foodFromAI(f), img: m.foodImg, mid: m.foodImg }, dkey(), null); // chat doim bugungi kunga
  }));
  // suratlar keyinroq yuklanib balandlik o'zgarsa ham eng pastda qolsin
  const bottom = () => scrollTo(0, document.body.scrollHeight);
  bottom();
  $$("#chat img").forEach((i) => { if (!i.complete) i.onload = bottom; });
}
async function sendChat(text) {
  text = text.trim();
  if (!text || chatBusy) return;
  S.chat.push({ t: Date.now(), role: "user", text });
  chatBusy = true; save(); render();
  try {
    const r = await api("/chat", { messages: S.chat.slice(-12).map((m) => ({ role: m.role, text: m.text })), context: aiContext() });
    S.chat.push({ t: Date.now(), role: "ai", text: r.reply });
  } catch (e) {
    S.chat.push({ t: Date.now(), role: "ai", text: "⚠️ " + e.message });
  }
  chatBusy = false; save();
  if (tab === "chat") render();
}
async function chatPhoto(file) {
  if (!file || chatBusy) return;
  let big, thumb;
  try { big = await shrink(file, 1024); thumb = await shrink(file, 360, 0.7); } catch (err) { return toast(err.message); }
  S.chat.push({ t: Date.now(), role: "user", text: "Bu ovqatni tahlil qil", img: thumb });
  chatBusy = true; save(); render();
  try {
    const r = await askFood({ image: big });
    if (!r.is_food) S.chat.push({ t: Date.now(), role: "ai", text: "Suratda ovqat ko'rinmadi 🤔 Boshqa surat yuborib ko'ring." });
    else S.chat.push({
      t: Date.now(), role: "ai", foodImg: thumb,
      food: { name: r.name, kcal: r.kcal, protein: r.protein, fat: r.fat, carbs: r.carbs, items: r.items, score: r.score, score_note: r.score_note, comment: r.comment, warning: r.warning },
      text: `**${r.name}** — taxminan **${r.kcal} kkal**\nOqsil ${r.protein} g · Yog' ${r.fat} g · Uglevod ${r.carbs} g\n\n${(r.items || []).map((i) => `• ${i.name}, ${Math.round(i.grams)} g: ${Math.round(i.kcal)} kkal`).join("\n")}${r.warning ? `\n\n⚠️ ${r.warning}` : ""}${r.comment ? `\n\n💡 ${r.comment}` : ""}`,
    });
  } catch (err) {
    S.chat.push({ t: Date.now(), role: "ai", text: "⚠️ " + err.message });
  }
  chatBusy = false; save();
  if (tab === "chat") render();
}

// Profil
function viewProfile() {
  const p = S.profile, n = norms();
  const li = (id, icon, title, val) => `<button class="li" data-p="${id}"><span class="ic">${icon}</span><span><b>${title}</b><small>${val}</small></span>${ico("arrow", 16, "#B9B3A8")}</button>`;
  return `<div class="head"><div><h1>Profil</h1></div></div>
  <section class="card hello"><div class="avatar">${mascot(80).replace('class="mascot"', 'width="54" height="54"')}</div>
    <div><b style="font-size:18px">${esc(p.name || "Foydalanuvchi")}</b><br><span class="muted">Kunlik norma: ${fmt(n.kcal)} kkal</span></div></section>
  <p class="cap" style="margin:20px 4px 8px">Mening ma'lumotlarim</p>
  <section class="card list" style="padding:4px 16px">
    ${li("phone", "📱", "Telefon raqam", esc(S.auth?.phone || ""))}
    ${li("name", "🙂", "Ism", esc(p.name || "kiritilmagan"))}
    ${li("goal", "🎯", "Maqsad", `${goalType()} · ${kg(p.goal)} kg gacha`)}
    ${li("weight", "⚖️", "Vazn", `${kg(curWeight())} kg`)}
    ${li("height", "📏", "Bo'y", `${p.height} sm`)}
    ${li("birth", "📅", "Tug'ilgan sana", `${p.bdate ? fmtDate(p.bdate) : p.birth} (${age()} yosh)`)}
    ${li("sex", "👤", "Jins", p.sex === "m" ? "Erkak" : "Ayol")}
    ${li("activity", "🏃", "Faollik", ACTIVITY.find((a) => a.v === p.activity)?.t)}
    ${li("health", "🛡️", "Allergiya va cheklovlar", esc(healthText() || "Yo'q"))}
  </section>
  <p class="cap" style="margin:20px 4px 8px">Maqsadlar</p>
  <section class="card list" style="padding:4px 16px">
    ${NATIVE ? li("stepGoal", "👣", "Qadamlar", `kuniga ${fmt(stepGoal())} qadam`) : ""}
    ${li("burnGoal", "🔥", "Faollik", `kuniga ${fmt(burnGoal())} kkal yoqish`)}
    ${li("sleep", "😴", "Uyqu", `Turish ${sleepWake()} · norma ${fmtDur(sleepNeed())}`)}
  </section>
  <p class="cap" style="margin:20px 4px 8px">Ilova</p>
  <section class="card list" style="padding:4px 16px">
    ${inbox.length ? li("inbox", "📬", "Xabarlar", (n => n ? `${n} ta yangi xabar` : "Qomat jamoasidan")(inbox.filter((m) => !m.read).length)) : ""}
    ${li("support", "💬", "Yordam", supUnread() ? `<b style="color:var(--green)">${supUnread()} ta yangi javob</b>` : "Savol, taklif yoki muammo bo'lsa yozing")}
    ${li("garden", "🌳", "Mening bog'im", `${gardenTotal(gardenLines())} bosqich · olmacha kiyimlari`)}
    ${NATIVE ? li("notif", "🔔", "Eslatmalar", S.notif ? "Yoqilgan: ovqat, suv, uyqu va shaxsiy" : "O'chirilgan") : ""}
    ${li("export", "💾", "Zaxira nusxa", "Ma'lumotlarni faylga saqlash")}
    ${li("import", "📂", "Zaxiradan tiklash", "Saqlangan fayldan qaytarish")}
    ${li("about", "ℹ️", "Ilova haqida", `Qomat${appVer ? " " + esc(appVer.name) : ""} · bepul`)}
  </section>
  ${TG ? "" : `<button class="btn ghost" id="logout" style="margin-top:6px">Hisobdan chiqish</button>`}
  <button class="btn danger" id="reset" style="margin-top:10px">Barcha ma'lumotlarni o'chirish</button>
  <p class="muted" style="text-align:center;font-size:12px;margin:14px 0 0">Ma'lumotlaringiz telefonda va raqamingizga bog'lab serverda saqlanadi.<br>Maslahatlar shifokor ko'rigining o'rnini bosmaydi.</p>`;
}
function bindProfile() {
  const p = S.profile;
  const done = (k) => (v) => { p[k] = v; save(); render(); };
  $$("[data-p]").forEach((b) => (b.onclick = () => {
    const k = b.dataset.p;
    if (k === "weight") pick("weight", curWeight(), setWeight);
    else if (k === "goal" || k === "height") pick(k, p[k], done(k));
    else if (k === "birth") birthSheet();
    else if (k === "health") healthSheet();
    else if (k === "stepGoal") choose("Kunlik qadam maqsadi", [3000, 5000, 7000, 8000, 10000, 12000, 15000].map((v) => [v, `${fmt(v)} qadam`]), stepGoal(), done("stepGoal"));
    else if (k === "burnGoal") choose("Kunlik faollik maqsadi", [[150, "150 kkal", "Yengil: 30 daqiqa sayr"], [250, "250 kkal", "Odatiy"], [350, "350 kkal"], [500, "500 kkal", "Faol"], [700, "700 kkal", "Sportchi"]], burnGoal(), done("burnGoal"));
    else if (k === "sex") choose("Jins", [["m", "Erkak"], ["f", "Ayol"]], p.sex, done("sex"));
    else if (k === "activity") choose("Faollik", ACTIVITY.map((a) => [a.v, a.t, a.d]), p.activity, done("activity"));
    else if (k === "sleep") sleepSettings();
    else if (k === "name") openSheet(`<h2>Ismingiz</h2><label class="field"><input id="n" value="${esc(p.name || "")}" maxlength="30"></label><button class="btn" id="ok">Saqlash</button>`,
      (s) => ($("#ok", s).onclick = () => { closeSheet(); done("name")($("#n", s).value.trim()); }));
    else if (k === "notif") openSub("eslatma");
    else if (k === "garden") openSub("bog");
    else if (k === "support") openSub("yordam");
    else if (k === "inbox") inboxSheet();
    else if (k === "export") exportData();
    else if (k === "import") importData();
    else if (k === "about") openSheet(`<h2>Qomat</h2><p class="sub">Vazn, kaloriya, suv va uyquni kuzatish uchun bepul ilova</p>
      <p>• Ma'lumotlaringiz telefoningizda va raqamingizga bog'lab serverda saqlanadi (ovqat suratlarisiz), shuning uchun telefon almashganda ham tiklanadi.<br>• Ovqat surati va chat Qomat AI orqali tahlil qilinadi: surat va savol shu maqsadda Qomat serveriga yuboriladi.<br>• Qomat AI hisobi taxminiy, aniq miqdorni qadoqdan tekshiring.</p>
      ${NATIVE ? `<button class="btn soft" id="upChk" style="margin-bottom:8px">🔄 Yangilanishni tekshirish</button>` : ""}
      <button class="btn ghost" onclick="closeSheet()">Yopish</button>`, (s) => $("#upChk", s)?.addEventListener("click", () => checkUpdate(true)));
  }));
  $("#logout")?.addEventListener("click", logout);
  $("#reset").onclick = () => {
    if (!confirm("Hamma ma'lumot telefondan ham, serverdan ham o'chadi. Davom etilsinmi?")) return;
    const { device, auth } = S;
    localStorage.removeItem(KEY);
    S = load();
    Object.assign(S, { device, auth });
    save(); step = 0; render(); // bo'sh holat serverga ham yuboriladi
  };
}
const maxBirth = () => `${new Date().getFullYear() - 10}-12-31`;
const validBirth = (v) => /^\d{4}-\d\d-\d\d$/.test(v) && v >= "1930-01-01" && v <= maxBirth();
function birthSheet() {
  const p = S.profile;
  openSheet(`<h2>Tug'ilgan sana</h2>
    <label class="field"><input id="bd" type="date" min="1930-01-01" max="${maxBirth()}" value="${p.bdate || `${p.birth}-01-01`}"></label>
    <button class="btn" id="ok">${ico("check", 20, "#fff")} Saqlash</button>`, (b) => {
    $("#ok", b).onclick = () => {
      const v = $("#bd", b).value;
      if (!validBirth(v)) return toast("Sanani tekshiring");
      Object.assign(p, { bdate: v, birth: +v.slice(0, 4) }); // birth: eski versiyalar uchun yil ham qoladi
      save(); closeSheet(); render();
    };
  });
}
function healthTags(sel) {
  return HEALTH.map(([g, list]) => `<p class="tgroup">${g}</p><div class="tags">${list.map(([id, t]) => `<button data-h="${id}" class="${sel.has(id) ? "on" : ""}">${t}</button>`).join("")}</div>`).join("");
}
function bindTags(el, sel) {
  $$("[data-h]", el).forEach((b) => (b.onclick = () => {
    const id = b.dataset.h;
    sel.has(id) ? sel.delete(id) : sel.add(id);
    b.classList.toggle("on", sel.has(id));
  }));
}
function setHealth(p, sel, other) {
  p.health = [...sel];
  if (other) p.healthOther = other.slice(0, 80); else delete p.healthOther;
}
function healthSheet() {
  const p = S.profile, sel = new Set(p.health || []);
  openSheet(`<h2>Allergiya va cheklovlar</h2><p class="sub">AI ovqat bahosi, chat va maslahatlarda shularni hisobga oladi</p>
    ${healthTags(sel)}
    <label class="field"><span>Boshqa (o'zingiz yozing)</span><input id="ho" maxlength="80" value="${esc(p.healthOther || "")}" placeholder="Masalan: pomidorga allergiya"></label>
    <button class="btn" id="ok">${ico("check", 20, "#fff")} Saqlash</button>`, (b) => {
    bindTags(b, sel);
    $("#ok", b).onclick = () => { setHealth(p, sel, $("#ho", b).value.trim()); save(); closeSheet(); render(); };
  });
}
function choose(title, opts, cur, done) {
  openSheet(`<h2>${title}</h2><div class="choice">${opts.map(([v, t, d]) => `<button data-v="${v}" class="${v == cur ? "on" : ""}">${t}${d ? `<small>${d}</small>` : ""}</button>`).join("")}</div>`, (b) => {
    $$("[data-v]", b).forEach((x) => (x.onclick = () => { closeSheet(); const v = opts.find((o) => String(o[0]) === x.dataset.v)[0]; done(v); }));
  });
}
function exportData() {
  const blob = new Blob([JSON.stringify({ ...S, auth: undefined })], { type: "application/json" }); // kirish kaliti faylga yozilmaydi
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `qomat-${dkey()}.json` });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast("Fayl saqlandi");
}
function importData() {
  const i = Object.assign(document.createElement("input"), { type: "file", accept: "application/json,.json" });
  i.onchange = async () => {
    try {
      const d = JSON.parse(await i.files[0].text());
      if (!d.profile || !d.days) throw 0;
      S = Object.assign(d, { device: S.device, auth: S.auth });
      save(); render(); toast("Ma'lumotlar tiklandi");
    } catch { toast("Bu fayl Qomat zaxirasi emas"); }
  };
  i.click();
}

// ── Boshlash (birinchi ochilganda) ──────────────────
const draft = { sex: "f", birth: 1995, bdate: "1995-01-01", height: 160, weight: 60, goal: 55, activity: 1.375, name: TG?.user.first_name || "" };
const draftHealth = new Set();
let step = 0;
function onboarding() {
  if (!draft.name) draft.name = S.auth?.name || "";
  const steps = [
    { t: "Salom! 👋", d: "Qomat sizga vazn, kaloriya va suvni kuzatishda yordam beradi. Avval bir nechta savol.", body: `<div style="text-align:center">${mascot(90)}</div>
      <label class="field"><span>Ismingiz</span><input id="nm" value="${esc(draft.name)}" maxlength="30" placeholder="Masalan: Malika"></label>` },
    { t: "Jinsingiz", d: "Kaloriya normasini to'g'ri hisoblash uchun kerak", body: `<div class="choice" id="sx">
      <button data-v="f" class="${draft.sex === "f" ? "on" : ""}">👩 Ayol</button><button data-v="m" class="${draft.sex === "m" ? "on" : ""}">👨 Erkak</button></div>` },
    { t: "Tug'ilgan sanangiz", d: "Yoshga qarab norma o'zgaradi", body: `<label class="field"><input id="bd" type="date" min="1930-01-01" max="${maxBirth()}" value="${draft.bdate}"></label>`, k: "birth" },
    { t: "Bo'yingiz", d: "Santimetrda", body: `<div id="rl"></div>`, r: "height" },
    { t: "Hozirgi vazningiz", d: "Kilogrammda", body: `<div id="rl"></div>`, r: "weight" },
    { t: "Maqsad vazningiz", d: "Qancha bo'lishni xohlaysiz?", body: `<div id="rl"></div><p class="muted" id="gh" style="text-align:center"></p>`, r: "goal" },
    { t: "Faolligingiz", d: "Odatiy haftangiz qanday o'tadi?", body: `<div class="choice" id="ac">${ACTIVITY.map((a) => `<button data-v="${a.v}" class="${a.v === draft.activity ? "on" : ""}">${a.t}<small>${a.d}</small></button>`).join("")}</div>` },
    { t: "Allergiya va cheklovlar", d: "Bo'lsa belgilang: AI ovqatni shunga qarab baholaydi. Bo'lmasa, shunchaki o'tib keting.", k: "health",
      body: `${healthTags(draftHealth)}<label class="field"><span>Boshqa (o'zingiz yozing)</span><input id="ho" maxlength="80" value="${esc(draft.healthOther || "")}" placeholder="Masalan: pomidorga allergiya"></label>` },
  ];
  const s = steps[step], last = step === steps.length - 1;
  $("#screen").innerHTML = `<div class="onb">
    <div class="steps">${steps.map((_, i) => `<i class="${i <= step ? "on" : ""}"></i>`).join("")}</div>
    <h1>${s.t}</h1><p class="lead">${s.d}</p>
    <div class="grow">${s.body}</div>
    <div class="nav" style="${step ? "" : "grid-template-columns:1fr"}">${step ? `<button class="btn ghost" id="bk">${ico("back", 22)}</button>` : ""}<button class="btn" id="nx">${last ? "Boshlash 🚀" : "Davom etish"}</button></div></div>`;
  if (s.r) {
    const hint = () => {
      const gh = $("#gh");
      if (!gh) return;
      const h = draft.height / 100, lo = 18.5 * h * h, hi = 24.9 * h * h;
      gh.textContent = `Bo'yingiz uchun sog'lom vazn: ${kg(lo)}–${kg(hi)} kg`;
    };
    ruler($("#rl"), { ...PICKERS[s.r], value: draft[s.r], onChange: (v) => { draft[s.r] = v; hint(); } });
    hint();
  }
  $$("#sx button, #ac button").forEach((b) => (b.onclick = () => {
    const box = b.parentElement;
    $$("button", box).forEach((x) => x.classList.toggle("on", x === b));
    if (box.id === "sx") draft.sex = b.dataset.v; else draft.activity = +b.dataset.v;
  }));
  if (s.k === "health") bindTags($("#screen"), draftHealth);
  const keep = () => {
    if (s.k === "birth" && validBirth($("#bd").value)) Object.assign(draft, { bdate: $("#bd").value, birth: +$("#bd").value.slice(0, 4) });
    if (s.k === "health") draft.healthOther = $("#ho").value.trim();
  };
  $("#bk")?.addEventListener("click", () => { keep(); step--; onboarding(); });
  $("#nx").onclick = () => {
    if (step === 0) draft.name = $("#nm").value.trim();
    if (s.k === "birth" && !validBirth($("#bd").value)) return toast("Tug'ilgan sanani tekshiring");
    keep();
    if (s.r === "weight" && draft.goal === 55) draft.goal = Math.max(30, Math.round(draft.weight - 5));
    if (!last) { step++; return onboarding(); }
    S.profile = { ...draft };
    setHealth(S.profile, draftHealth, draft.healthOther);
    S.weights = [{ d: dkey(), kg: draft.weight }];
    save(); tab = "kundalik"; render(); scrollTo(0, 0);
    syncSteps();
  };
}

if (cleanSleep(S.days)) save(); // oldingi versiyada saqlanib qolgan buzuq uyqu yozuvi
render();
if (TG) checkTgUser().then(checkInbox);
else syncPull().then(checkInbox);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) return pushNow();
  if (loginCode) pollLogin(true); // Telegram'dan qaytdi
  else syncPull().then(checkInbox);
});
if (NATIVE) {
  syncSteps();
  planSoon();
  blockInit();
  setTimeout(checkUpdate, 2500);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { syncSteps(); planSoon(); checkUpdate(); } });
  setInterval(() => { if (!document.hidden) syncSteps(); }, 60000);
}
