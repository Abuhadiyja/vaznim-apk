/* Qomat: «Nima yesam?» — AI'siz tavsiyalar. foods.js dagi taomlardan tayyor to'plamlar tuziladi va
   foydalanuvchining shu kundagi holatiga qarab ball beriladi: ovqat vaqtining qolgan normasi, kunlik oqsil/yog'
   kamchiligi, sog'liq cheklovlari, odatlari (ko'p yeganlari, saqlanganlari, kecha yegani) va kun vaqti (kechqurun yengil).
   app.js dan oldin yuklanadi; app.js dagi funksiyalar faqat chaqirilganda ishlatiladi. */

// Taom rollari (foods.js dagi aniq nomlar). [nom, porsiya grammi]
const NIMA_MAINS = [ // o'zi to'liq ovqat (yoniga salat yoki non qo'shilishi mumkin)
  ["Palov (osh)", 300], ["Tovuqli palov", 300], ["Shivit oshi", 300], ["Mosh xo'rda", 400], ["Moshkichiri", 300], ["Shovla", 300],
  ["Mastava", 400], ["Sho'rva (go'shtli)", 400], ["Qaynatma sho'rva", 400], ["Tovuq sho'rva", 400], ["Lag'mon (suyuq)", 450],
  ["Qovurma lag'mon", 350], ["Manti (go'shtli)", 220], ["Manti (tovuqli)", 220], ["Manti (qovoqli)", 240], ["Manti (kartoshkali)", 240],
  ["Chuchvara (sho'rvali)", 350], ["Dimlama", 400], ["Qozon kabob", 300], ["Qovurma (go'sht, kartoshka)", 300], ["Beshbarmoq", 350],
  ["Halim", 350], ["Norin", 250], ["Kuksi", 450], ["Ugra osh", 400], ["Mampar", 400], ["Dolma", 250], ["Okroshka", 350],
  ["Jarkop", 300], ["Makaron (qiymali)", 300], ["Pelmen", 200], ["Varenik (kartoshkali)", 200],
];
const NIMA_SOUPS = new Set(["Mosh xo'rda", "Mastava", "Sho'rva (go'shtli)", "Qaynatma sho'rva", "Tovuq sho'rva", "Lag'mon (suyuq)",
  "Chuchvara (sho'rvali)", "Kuksi", "Ugra osh", "Mampar", "Okroshka", "Halim"]);
const NIMA_PROTEINS = [ // garnir bilan yeyiladigan go'sht, baliq, tuxum
  ["Tovuq ko'kragi (qaynatilgan)", 150], ["Tovuq (grill)", 200], ["Kurka go'shti", 150], ["Mol go'shti (qaynatilgan)", 120],
  ["Baliq (qaynatilgan, bug'da)", 150], ["Qizil baliq (losos)", 130], ["Baliq (qovurilgan)", 150], ["Tovuq kotleti", 160],
  ["Kotlet", 160], ["Tefteli", 150], ["Jigar (qovurilgan)", 120], ["Shashlik (tovuq)", 160], ["Shashlik (mol go'shti)", 160],
  ["Shashlik (qo'y go'shti)", 160], ["Kabob (qiyma)", 140], ["Tovuq soni (qovurilgan)", 120], ["Krevetka", 150], ["Omlet", 130],
];
const NIMA_GARNISH = [
  ["Grechka (qaynatilgan)", 200], ["Guruch (qaynatilgan)", 180], ["Bulg'ur", 200], ["Makaron (qaynatilgan)", 200],
  ["Kartoshka (qaynatilgan)", 240], ["Kartoshka pyuresi", 200], ["Perlovka", 200], ["Kuskus", 180], ["Yasmiq (qaynatilgan)", 180],
  ["Loviya (qaynatilgan)", 180], ["No'xat (qaynatilgan)", 150], ["Brokkoli", 200], ["Gulkaram", 200], ["Qovoq (dimlangan)", 200],
  ["Qovurilgan kartoshka", 200],
];
const NIMA_SALADS = [
  ["Achchiq-chuchuk", 150], ["Bodring va pomidor salati", 150], ["Karam salati", 150], ["Vinegret", 150], ["Grek salati", 150],
  ["Koreyscha sabzi", 80], ["Olivye", 150], ["Sezar salati", 200],
];
const NIMA_BREAD = [["Kepakli non", 40], ["Qora non", 35], ["Obi non", 100]];
const NIMA_BREAKFAST = [ // tayyor nonushta to'plamlari
  [["Suli bo'tqasi (suvda)", 250], ["Banan", 120]], [["Suli bo'tqasi (sutda)", 250], ["Olma", 180]],
  [["Tuxum (qaynatilgan)", 100], ["Kepakli non", 40], ["Bodring", 100]], [["Omlet", 130], ["Pomidor", 120], ["Qora non", 35]],
  [["Tvorog (5%)", 150], ["Qulupnay", 100]], [["Tvorog (5%)", 150], ["Banan", 120]], [["Sirniki", 180], ["Yogurt (shakarsiz, quyuq)", 150]],
  [["Yogurt (shakarsiz, quyuq)", 150], ["Olma", 180], ["Yong'oq", 15]], [["Grechka (qaynatilgan)", 200], ["Tuxum (qaynatilgan)", 50]],
  [["Qatiq", 250], ["Obi non", 100]], [["Tuxum (qaynatilgan)", 100], ["Pishloq (qattiq)", 20], ["Kepakli non", 40]],
  [["Manniy bo'tqa", 250], ["Olma", 180]], [["Tvorogli zapekanka", 150], ["Kefir", 250]],
];
const NIMA_SNACKS = [
  [["Olma", 180]], [["Banan", 120]], [["Nok", 170]], [["Apelsin", 180]], [["Mandarin", 140]], [["Kivi", 150]], [["Anor", 200]],
  [["Yogurt (shakarsiz, quyuq)", 150]], [["Kefir", 250]], [["Qatiq", 250]], [["Tvorog (5%)", 150]], [["Tuxum (qaynatilgan)", 100]],
  [["Olma", 180], ["Yong'oq", 15]], [["Kefir", 250], ["Banan", 120]], [["Bodom", 20]], [["Qatiq", 250], ["Olma", 180]],
  [["Tvorog (5%)", 150], ["Qulupnay", 100]], [["Bodring", 100], ["Pomidor", 120], ["Pishloq (qattiq)", 20]],
];
// Og'ir yoki qovurilgan: kechqurun va oshqozon cheklovlarida tavsiya qilinmaydi
const NIMA_HEAVY = /palov|osh\)|to'y oshi|qozon|norin|beshbarmoq|qovurma|qovurilgan|kabob|shashlik \(qo'y|olivye|sezar|pelmen|makaron \(qiymali|manti \(go'shtli/i;
const NIMA_LIGHT = /qaynatilgan|bug'da|sho'rva|mastava|mosh xo'rda|brokkoli|gulkaram|qovoq|salat|achchiq|bodring|pomidor|qatiq|kefir|yogurt|tvorog|olma|nok|kivi|mandarin|apelsin|dimlama|kurka|grill/i;
const NIMA_NATIONAL = /palov|\(osh\)|oshi|mastava|sho'rva|lag'mon|manti|chuchvara|dimlama|qozon|qovurma|beshbarmoq|halim|norin|kuksi|ugra|mampar|dolma|jarkop|mosh xo'rda|moshkichiri|shovla|shashlik|kabob|achchiq-chuchuk|obi non|qatiq/i;
const NIMA_QUICK = /qatiq|kefir|yogurt|tvorog|olma|banan|nok|apelsin|mandarin|kivi|anor|qulupnay|yong'oq|bodom|bodring|pomidor|pishloq|non|tuxum|omlet|salat|achchiq|sirniki|kotlet|tunets/i;
// Sog'liq cheklovlari → taom nomidagi belgilar
const NIMA_ALLERGEN = {
  gluten: /non|makaron|lag'mon|manti|chuchvara|pelmen|varenik|kuskus|bulg'ur|perlovka|kuksi|ugra|beshbarmoq|mampar|norin|suli|manniy|sirniki|kotlet|sezar|halim/i,
  lactose: /sut|qatiq|kefir|tvorog|pishloq|yogurt|smetana|qaymoq|suzma|ayron|omlet|sirniki|manniy|zapekanka|grek salati|sezar|okroshka/i,
  egg: /tuxum|omlet|olivye|sirniki|kotlet|zapekanka/i,
  fish: /baliq|losos/i, seafood: /krevetka|krab/i, nuts: /yong'oq|bodom/i, peanut: /yeryong'oq/i, honey: /asal/i,
  citrus: /apelsin|mandarin|limon/i, strawberry: /qulupnay/i,
};
const NIMA_MEAT = /go'sht|tovuq|kurka|kotlet|tefteli|jigar|shashlik|kabob|baliq|losos|krevetka|palov|\(osh\)|oshi|mastava|sho'rva|lag'mon|manti \((go'shtli|tovuqli)|chuchvara|qozon|qovurma|beshbarmoq|halim|norin|kuksi|ugra|mampar|dolma|jarkop|dimlama|pelmen|makaron \(qiymali|mosh xo'rda|moshkichiri|shovla|olivye|sezar|okroshka/i;

const nimaFood = (name) => FOODS.find((x) => x.name === name);
// nomdan faqat pishirish usuli olib tashlanadi: "Tovuq ko'kragi (qaynatilgan)" → "Tovuq ko'kragi", "Shashlik (tovuq)" qoladi
const NIMA_HOW = / \((qaynatilgan|qaynatilgan, bug'da|grill|qovurilgan|dimlangan|suvda|sutda|5%|9%|shakarsiz, quyuq|qattiq|losos)\)$/;
const mealGa = (m) => { const t = mealName(m); return t + (/k$/.test(t) ? "ka" : "ga"); }; // "Tushlikka", "Nonushtaga"
const nimaMeals = () => MEAL4.map(([k, ic, t, share]) => ({ k, ic, t, share }));
let nimaMeal = null, nimaFilter = "", nimaPage = 0;

/** Bugungi holat: ovqat vaqti, uning qolgan normasi, kunlik kamchiliklar, kechki rejim. */
function nimaState(meal = nimaMeal) {
  const n = norms(), t = totals(), k = dkey(), now = new Date(), h = now.getHours() + now.getMinutes() / 60;
  const eatenBy = (m) => (S.days[k]?.food || []).filter((f) => mealOf(f) === m).reduce((a, f) => a + (+f.kcal || 0), 0);
  const left = (m) => Math.round(n.kcal * nimaMeals().find((x) => x.k === m).share - eatenBy(m));
  if (!meal) {
    meal = h < 11 ? "b" : h < 15.5 ? "l" : h < 17.5 ? "s" : "d";
    if (left(meal) < 80) meal = ["b", "l", "s", "d"].slice(["b", "l", "s", "d"].indexOf(meal) + 1).find((m) => left(m) >= 80) || meal;
  }
  const dayLeft = Math.round(n.kcal - t.eat + t.bonus);
  const bed = hm2m(bestBed().at), toBed = (bed - (now.getHours() * 60 + now.getMinutes()) + 1440) % 1440;
  const late = (meal === "d" && (h >= 19 || toBed <= 180)) || h >= 21;
  const full = Math.min(left(meal), dayLeft);
  const target = Math.max(meal === "s" ? 120 : 200, late ? Math.round(full * 0.6) : full); // kechqurun yengilroq porsiya
  const health = new Set(S.profile?.health || []);
  return { n, t, meal, mealLeft: left(meal), dayLeft, target, late, toBed, health,
    pNeed: Math.max(0, n.protein - t.p), fatOver: t.f - n.fat, diab: [...health].some((x) => x.startsWith("diab") || x === "lowsugar") };
}

/** Taom sog'liq cheklovi bo'yicha mutlaqo mos emasmi (allergiya, vegetarianlik). */
function nimaBanned(name, health) {
  for (const [h, re] of Object.entries(NIMA_ALLERGEN)) if (health.has(h) && re.test(name)) return true;
  if ((health.has("vegetarian") || health.has("vegan")) && NIMA_MEAT.test(name)) return true;
  if (health.has("vegan") && (NIMA_ALLERGEN.lactose.test(name) || NIMA_ALLERGEN.egg.test(name))) return true;
  if ((health.has("gastritis") || health.has("ulcer") || health.has("reflux") || health.has("liver")) && /qovurilgan|achchiq|koreyscha/i.test(name)) return true;
  if (health.has("gout") && /jigar|krevetka/i.test(name)) return true;
  if ((health.has("pregnant") || health.has("breastfeed")) && /krevetka/i.test(name)) return true;
  return false;
}

/** Hamma mumkin bo'lgan to'plamlar: [[nom, gramm], ...]. */
function nimaCombos(meal, late = false) {
  if (meal === "b") return NIMA_BREAKFAST;
  if (meal === "s") return NIMA_SNACKS;
  const out = late ? NIMA_SNACKS.filter((c) => c.some(([nm]) => /qatiq|kefir|tvorog|yogurt/i.test(nm))) : [];
  if (late) NIMA_PROTEINS.slice(0, 6).forEach((p) => ["Brokkoli", "Gulkaram", "Qovoq (dimlangan)"].forEach((v) => out.push([p, [v, 200]])));
  NIMA_MAINS.forEach((m) => {
    out.push([m]);
    if (NIMA_SOUPS.has(m[0])) out.push([m, NIMA_BREAD[0]], [m, NIMA_BREAD[2]]);
    else NIMA_SALADS.slice(0, 4).forEach((s) => out.push([m, s]));
  });
  NIMA_PROTEINS.forEach((p) => NIMA_GARNISH.forEach((g, gi) => {
    out.push([p, g]);
    if (gi % 3 === 0) out.push([p, g, NIMA_SALADS[(gi / 3) % 5]]); // hamma variantni emas, bir qismiga salat qo'shiladi
  }));
  NIMA_PROTEINS.slice(0, 6).forEach((p) => NIMA_SALADS.slice(0, 5).forEach((s) => out.push([p, s])));
  return out;
}

/** To'plamni hisoblaydi: grammlar normaga moslab o'zgartiriladi (×0,6…1,25, 10 g gacha yaxlitlanadi). */
function nimaBuild(parts, target) {
  const foods = parts.map(([nm, g]) => [nimaFood(nm), g]).filter(([x]) => x);
  if (!foods.length || foods.length !== parts.length) return null;
  const base = foods.reduce((a, [x, g]) => a + (x.k * g) / 100, 0);
  const m = clamp((target * 0.9) / base, 0.6, 1.25);
  const items = foods.map(([x, g]) => {
    const gg = Math.max(10, Math.round((g * (x.cat === "y" ? 1 : m)) / 10) * 10), v = (n) => (n * gg) / 100;
    return { x, n: x.name, g: gg, k: Math.round(v(x.k)), p: r1(v(x.p)), f: r1(v(x.f)), c: r1(v(x.c)) };
  });
  const sum = (key) => items.reduce((a, i) => a + i[key], 0);
  // nom: "Tovuq ko'kragi va grechka", "Tovuq ko'kragi, grechka va achchiq-chuchuk" (qavs ichidagisiz)
  const short = items.map((i, j) => { const s = i.n.replace(NIMA_HOW, ""); return j ? s.toLowerCase() : s; });
  const name = items.length === 1 ? items[0].n : `${short.slice(0, -1).join(", ")} va ${short[short.length - 1]}`;
  return { name, items, kcal: Math.round(sum("k")), p: Math.round(sum("p")), f: Math.round(sum("f")), c: Math.round(sum("c")) };
}

/** Ball va sabablar. */
function nimaScore(c, st, used, yest) {
  const names = c.items.map((i) => i.n), all = names.join(" ");
  const why = [], tags = [];
  let s = 100 - 60 * Math.abs(c.kcal - st.target * 0.9) / st.target;
  if (c.kcal <= st.target + 30) tags.push(["✅", "normaga sig'adi"]);
  const pPct = (c.p * 4) / Math.max(1, c.kcal);
  if (st.pNeed > 15) {
    s += 25 * Math.min(1, c.p / st.pNeed);
    if (c.p >= Math.min(25, st.pNeed * 0.5)) why.push(`Bugun oqsil ${Math.round(st.pNeed)} g kam: bu taom ${c.p} g oqsil beradi.`);
  }
  if (pPct >= 0.25 || c.p >= 30) tags.push(["🥩", "oqsil ko'p"]);
  if (st.fatOver + c.f > 0) s -= Math.min(30, st.fatOver + c.f); // kunlik yog' normasidan oshirsa
  const cPct = (c.c * 4) / Math.max(1, c.kcal);
  if (st.diab) { s -= 60 * Math.max(0, cPct - 0.4); if (cPct < 0.4) tags.push(["🩺", "uglevodi kam"]); }
  const heavy = NIMA_HEAVY.test(all), light = !heavy && names.every((nm) => NIMA_LIGHT.test(nm) || nimaFood(nm)?.cat === "v" || nimaFood(nm)?.cat === "f");
  if (st.late) { if (heavy) s -= 45; if (light) { s += 12; tags.push(["🌙", "yengil"]); } }
  else if (light) tags.push(["🌿", "yengil"]);
  if (NIMA_NATIONAL.test(all)) tags.push(["🍲", "milliy"]);
  const fried = /qovurilgan|qovurma/i.test(all);
  if ([...st.health].some((x) => ["hyper", "heart", "chol", "lowsalt", "liver"].includes(x))) {
    if (fried) s -= 25;
    if ((c.f * 9) / c.kcal > 0.4) s -= 15;
  }
  let habit = 0;
  names.forEach((nm) => { const u = used.get(favKey(nm))?.n || 0; habit += Math.min(12, u * 3) + (isFav(nm) ? 8 : 0); });
  s += Math.min(20, habit);
  const often = names.find((nm) => (used.get(favKey(nm))?.n || 0) >= 3);
  if (often) why.push(`Siz ${often.replace(/ \(.*\)$/, "").toLowerCase()}ni tez-tez yeysiz.`);
  if (names.some((nm) => yest.has(favKey(nm)))) s -= 25;
  why.unshift(`${mealName(st.meal)} normasiga ${fmt(Math.max(0, st.mealLeft))} kkal qolgan, bu taom ${fmt(c.kcal)} kkal.`);
  if (st.late && light) why.push(`Yotishga ${Math.max(1, Math.round(st.toBed / 60))} soatcha qoldi: yengil taom uyquni buzmaydi.`);
  if (st.diab && cPct < 0.4) why.push("Uglevodi kam: qondagi qandni keskin oshirmaydi.");
  // foydaliligi (olmalar): oqsil va sabzavot +, qovurilgan, yog'li va shirin −
  let a = 3 + (pPct >= 0.25 ? 1 : 0) + (c.items.some((i) => i.x.cat === "v") ? 1 : 0) - (fried ? 1 : 0) - ((c.f * 9) / c.kcal > 0.45 ? 1 : 0);
  return { ...c, score: s, apples: clamp(Math.round(a), 1, 5), tags: tags.slice(0, 3), why, heavy, light };
}

/** Tartiblangan tavsiyalar (filtr bilan). Kun davomida bir xil, "Boshqa variantlar" keyingi sahifani ko'rsatadi. */
function nimaList(st, filter = nimaFilter) {
  const used = foodStats(), yest = new Set((S.days[dkey(ddays(1))]?.food || []).map((f) => favKey(f.name)));
  const seed = dkey().split("-").reduce((a, x) => a * 31 + +x, 7);
  const rnd = (i) => ((Math.sin(seed + i * 12.9898) * 43758.5453) % 1 + 1) % 1;
  let list = nimaCombos(st.meal, st.late).map((p, i) => [p, i])
    .filter(([p]) => !p.some(([nm]) => nimaBanned(nm, st.health)))
    .map(([p, i]) => { const c = nimaBuild(p, st.target); return c && { ...nimaScore(c, st, used, yest), r: rnd(i) }; })
    .filter(Boolean);
  if (st.late) list = list.filter((c) => !c.heavy);
  if (filter === "protein") list = list.filter((c) => (c.p * 4) / c.kcal >= 0.22).map((c) => ({ ...c, score: c.score + c.p }));
  if (filter === "light") list = list.filter((c) => c.light);
  if (filter === "national") list = list.filter((c) => NIMA_NATIONAL.test(c.items.map((i) => i.n).join(" ")));
  if (filter === "quick") list = list.filter((c) => c.items.every((i) => NIMA_QUICK.test(i.n)));
  list.sort((x, y) => y.score + y.r * 6 - (x.score + x.r * 6));
  // bir xil asosiy taom ketma-ket takrorlanmasin
  const seen = new Set();
  return list.filter((c) => { const keys = [c.items[0].n, c.name]; if (keys.some((x) => seen.has(x))) return false; keys.forEach((x) => seen.add(x)); return true; });
}

/** Kundalikdagi kichik kartochka. */
function nimaCard() {
  if (!S.profile || isPast()) return "";
  const st = nimaState(null);
  if (st.dayLeft < 100) return "";
  const top = nimaList(st, "").slice(0, 3);
  if (!top.length) return "";
  const lack = st.pNeed > 15 ? ` · oqsil ${Math.round(st.pNeed)} g kam` : "";
  return `<section class="card nima-card">
    <div class="between"><div><b>💡 Nima yesam?</b><small class="hint">${mealGa(st.meal)} ${fmt(Math.max(0, st.mealLeft))} kkal qoldi${lack}</small></div>
      <button class="btn soft" id="nimaGo" style="width:auto;padding:8px 14px">Ko'rish</button></div>
    <div class="nima-chips">${top.map((c, i) => `<button data-nq="${i}">${c.items[0].x ? FCAT[c.items[0].x.cat]?.ic || "🍽️" : ""} ${esc(c.name)} · ${fmt(c.kcal)}</button>`).join("")}</div>
  </section>`;
}
function bindNimaCard() {
  $("#nimaGo")?.addEventListener("click", () => { nimaMeal = null; nimaFilter = ""; nimaPage = 0; openSub("nima"); });
  $$("[data-nq]").forEach((b) => (b.onclick = () => { const st = nimaState(null); nimaDetail(nimaList(st, "")[+b.dataset.nq], st); }));
}

const NIMA_FILTERS = [["", "Hammasi"], ["protein", "🥩 Oqsilga boy"], ["light", "🌿 Yengil"], ["national", "🍲 Milliy"], ["quick", "⚡ Tez tayyor"]];
function viewNima() {
  const st = nimaState();
  nimaMeal = st.meal;
  const list = nimaList(st), page = list.slice(nimaPage * 3, nimaPage * 3 + 3);
  const fatTxt = st.fatOver > 0 ? `<b style="color:var(--orange)">+${Math.round(st.fatOver)} g</b>` : `<b>yo'q</b>`;
  const card = (c, i) => `<section class="card nima-opt ${!nimaPage && !i ? "best" : ""}">
    ${!nimaPage && !i ? `<span class="nima-best">🍏 ENG MOSI</span>` : ""}
    <div class="between"><b style="font-size:16px">${esc(c.name)}</b><b style="color:var(--green-d);white-space:nowrap">${fmt(c.kcal)} kkal</b></div>
    <p class="muted" style="margin:4px 0 8px;font-size:13px">${c.items.map((x) => `${esc(x.n)} ${x.g} g`).join(" · ")} · oqsil ${c.p} g</p>
    <div class="nima-tags">${c.tags.map(([ic, t]) => `<span>${ic} ${t}</span>`).join("")}${apples(c.apples)}</div>
    <div class="grid2" style="margin-top:10px"><button class="btn ghost" data-nd="${i}">👀 Batafsil</button><button class="btn" data-na="${i}">+ Qo'shish</button></div>
  </section>`;
  const avoid = st.late ? nimaCombos(st.meal).flat().map(([nm]) => nm).filter((nm, i, a) => a.indexOf(nm) === i && NIMA_HEAVY.test(nm)).slice(0, 5) : [];
  return `${subHead("Nima yesam?", `${mealName(st.meal)} · AI so'rovisiz, sizga moslab`)}
  <div class="nima-meals">${nimaMeals().map((m) => `<button data-nm="${m.k}" class="${m.k === st.meal ? "on" : ""}">${m.ic} ${m.t}</button>`).join("")}</div>
  <section class="card nima-sum"><div><small>Qoldi</small><b>${fmt(Math.max(0, st.mealLeft))} kkal</b></div>
    <div><small>Oqsil kam</small><b style="color:${st.pNeed > 15 ? "var(--orange)" : "inherit"}">${Math.round(st.pNeed)} g</b></div><div><small>Yog' ko'p</small>${fatTxt}</div></section>
  ${st.late ? `<section class="card" style="background:#FFF6DC;border-color:#F3E2A6"><b>🌙 Yotishga ${Math.max(1, Math.round(st.toBed / 60))} soatcha qoldi</b>
    <p class="muted" style="margin:4px 0 0;font-size:13px">Yengil va oqsilli taom tanlang: og'ir ovqat uyquni buzadi.${st.diab ? " Diabet belgilangan: uglevodi kam taomlar tepada." : ""}</p></section>` : ""}
  <div class="fcats">${NIMA_FILTERS.map(([f, t]) => `<button data-nf="${f}" class="${nimaFilter === f ? "on" : ""}">${t}</button>`).join("")}</div>
  ${page.length ? page.map(card).join("") : `<section class="card empty"><div class="ill">🍽️</div><b>Mos variant topilmadi</b><p>Boshqa filtrni tanlang yoki Qomat AI'dan so'rang.</p></section>`}
  ${list.length > 3 ? `<button class="btn soft" id="nimaMore" style="margin-bottom:10px">🎲 Boshqa variantlar</button>` : ""}
  <button class="btn ghost" id="nimaAi">🍏 Qomat AI'dan so'rash (1 so'rov)</button>
  ${avoid.length ? `<section class="card" style="margin-top:12px"><b>🚫 Hozir tavsiya qilinmaydi</b><p class="muted" style="margin:4px 0 0;font-size:13px">${avoid.map((x) => esc(x.replace(/ \(.*\)$/, ""))).join(", ")}: kechga og'ir, uyquni buzadi.</p></section>` : ""}
  <p class="muted" style="text-align:center;font-size:12px;margin:10px 0 0">Qiymatlar o'rtacha (ovqatlar ro'yxatidan). Porsiya qolgan normangizga moslab hisoblangan.</p>`;
}
function bindNima() {
  $("#back").onclick = () => history.back();
  const st = nimaState(), page = nimaList(st).slice(nimaPage * 3, nimaPage * 3 + 3);
  $$("[data-nm]").forEach((b) => (b.onclick = () => { nimaMeal = b.dataset.nm; nimaPage = 0; render(); }));
  $$("[data-nf]").forEach((b) => (b.onclick = () => { nimaFilter = b.dataset.nf; nimaPage = 0; render(); }));
  $$("[data-nd]").forEach((b) => (b.onclick = () => nimaDetail(page[+b.dataset.nd], st)));
  $$("[data-na]").forEach((b) => (b.onclick = () => nimaAdd(page[+b.dataset.na], st)));
  $("#nimaMore")?.addEventListener("click", () => { const n = nimaList(st).length; nimaPage = (nimaPage + 1) * 3 >= Math.min(n, 15) ? 0 : nimaPage + 1; render(); scrollTo(0, 0); });
  $("#nimaAi").onclick = () => {
    const t = `Hozir ${mealGa(st.meal).toLowerCase()} ${Math.max(0, st.mealLeft)} kkal qoldi, bugun oqsil ${Math.round(st.pNeed)} g kam. ${st.late ? "Yotishga oz qoldi. " : ""}Nima yesam? 3 ta aniq variant ayt (gramm va kaloriyasi bilan).`;
    history.back(); // ichki sahifadan chiqiladi, keyin Chat ochilib savol yuboriladi
    setTimeout(() => { tab = "chat"; render(); sendChat(t); }, 60);
  };
}
function nimaAdd(c, st) {
  if (!c) return;
  addFood({ name: c.name, kcal: c.kcal, p: c.p, f: c.f, c: c.c, score: c.apples, why: "Nima yesam? tavsiyasi",
    items: c.items.map(({ n, g, k, p, f, c: cc }) => ({ n, g, k, p, f, c: cc })), src: "db" }, dkey(), st.meal);
}
/** Batafsil: tarkib, nega aynan bu, kun oxirida nima bo'ladi, bir qismini almashtirish. */
function nimaDetail(c, st) {
  if (!c) return;
  const after = st.t.eat - st.t.bonus + c.kcal, pAfter = st.t.p + c.p;
  openSheet(`<h2 style="margin-bottom:2px">${esc(c.name)}</h2><p class="sub">${apples(c.apples)} ${c.tags.map(([, t]) => t).join(" · ")}</p>
    <div class="nima-macro"><div><b>${fmt(c.kcal)}</b><small>kkal</small></div><div><b>${c.p}</b><small>oqsil, g</small></div><div><b>${c.f}</b><small>yog', g</small></div><div><b>${c.c}</b><small>uglevod, g</small></div></div>
    <div class="nima-items">${c.items.map((x, i) => `<div class="between"><span>${esc(x.n)} · ${x.g} g</span><span class="row" style="gap:8px"><b>${fmt(x.k)} kkal</b><button class="date-chip" data-sw="${i}" style="background:var(--soft)" aria-label="Almashtirish">🔁</button></span></div>`).join("")}</div>
    <p class="muted" style="font-size:12px;margin:-4px 0 10px">🔁 — bir qismini boshqasiga almashtirish</p>
    <div class="nima-why">💡 <b>Nega bu?</b> ${c.why.map(esc).join(" ")}</div>
    <p class="cap" style="margin:14px 0 6px">Kun oxirida</p>
    <div class="bar"><i style="width:${clamp((after / st.n.kcal) * 100, 0, 100)}%;${after > st.n.kcal ? "background:var(--orange)" : ""}"></i></div>
    <p class="muted" style="font-size:12.5px;margin:6px 0 14px">Jami ~${fmt(after)} / ${fmt(st.n.kcal)} kkal · oqsil ${Math.round(pAfter)} / ${st.n.protein} g${pAfter >= st.n.protein ? " — oqsil normasi bajariladi ✅" : ""}</p>
    <button class="btn" id="nAdd">+ ${mealGa(st.meal)} qo'shish</button>`, (b) => {
    $("#nAdd", b).onclick = () => { closeSheet(); nimaAdd(c, st); };
    $$("[data-sw]", b).forEach((x) => (x.onclick = () => nimaSwap(c, +x.dataset.sw, st)));
  });
}
/** Bir qismini shu roldagi boshqa taomga almashtirish. */
function nimaSwap(c, idx, st) {
  const cur = c.items[idx].n;
  const role = [NIMA_PROTEINS, NIMA_GARNISH, NIMA_SALADS, NIMA_BREAD, NIMA_MAINS].find((r) => r.some(([nm]) => nm === cur))
    || [...new Set([...NIMA_BREAKFAST, ...NIMA_SNACKS].flat().map(([nm]) => nm))].map((nm) => [nm, nimaFood(nm)?.por[0][1] || 100])
      .filter(([nm]) => nimaFood(nm)?.cat === nimaFood(cur)?.cat);
  const alts = role.filter(([nm]) => nm !== cur && !nimaBanned(nm, st.health) && nimaFood(nm)).slice(0, 8);
  openSheet(`<h2>🔁 Almashtirish</h2><p class="sub">${esc(cur)} o'rniga</p>
    <div class="opts">${alts.map(([nm, g], i) => { const x = nimaFood(nm); return `<button class="btn ghost" data-alt="${i}" style="justify-content:space-between;display:flex">
      <span>${esc(nm)}</span><small>${fmt((x.k * g) / 100)} kkal</small></button>`; }).join("")}</div>`, (b) => {
    $$("[data-alt]", b).forEach((x) => (x.onclick = () => {
      const parts = c.items.map((i) => [i.n, i.g]);
      parts[idx] = alts[+x.dataset.alt];
      const nc = nimaBuild(parts, st.target);
      if (nc) nimaDetail(nimaScore(nc, st, foodStats(), new Set()), st);
    }));
  });
}
