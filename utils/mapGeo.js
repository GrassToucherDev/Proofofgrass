// utils/mapGeo.js
// Shared helpers for the community map: coordinate validation, privacy
// rounding, and country / US-state normalisation.
// Pure functions, no I/O, safe on both server and client.

// ── Country list (195 = 193 UN members + Holy See + State of Palestine) ──────
const COUNTRY_DATA = `AF:Afghanistan|AL:Albania|DZ:Algeria|AD:Andorra|AO:Angola|AG:Antigua and Barbuda|AR:Argentina|AM:Armenia|AU:Australia|AT:Austria|AZ:Azerbaijan|BS:Bahamas|BH:Bahrain|BD:Bangladesh|BB:Barbados|BY:Belarus|BE:Belgium|BZ:Belize|BJ:Benin|BT:Bhutan|BO:Bolivia|BA:Bosnia and Herzegovina|BW:Botswana|BR:Brazil|BN:Brunei|BG:Bulgaria|BF:Burkina Faso|BI:Burundi|CV:Cabo Verde|KH:Cambodia|CM:Cameroon|CA:Canada|CF:Central African Republic|TD:Chad|CL:Chile|CN:China|CO:Colombia|KM:Comoros|CG:Congo|CD:DR Congo|CR:Costa Rica|CI:Côte d'Ivoire|HR:Croatia|CU:Cuba|CY:Cyprus|CZ:Czechia|DK:Denmark|DJ:Djibouti|DM:Dominica|DO:Dominican Republic|EC:Ecuador|EG:Egypt|SV:El Salvador|GQ:Equatorial Guinea|ER:Eritrea|EE:Estonia|SZ:Eswatini|ET:Ethiopia|FJ:Fiji|FI:Finland|FR:France|GA:Gabon|GM:Gambia|GE:Georgia|DE:Germany|GH:Ghana|GR:Greece|GD:Grenada|GT:Guatemala|GN:Guinea|GW:Guinea-Bissau|GY:Guyana|HT:Haiti|VA:Holy See|HN:Honduras|HU:Hungary|IS:Iceland|IN:India|ID:Indonesia|IR:Iran|IQ:Iraq|IE:Ireland|IL:Israel|IT:Italy|JM:Jamaica|JP:Japan|JO:Jordan|KZ:Kazakhstan|KE:Kenya|KI:Kiribati|KW:Kuwait|KG:Kyrgyzstan|LA:Laos|LV:Latvia|LB:Lebanon|LS:Lesotho|LR:Liberia|LY:Libya|LI:Liechtenstein|LT:Lithuania|LU:Luxembourg|MG:Madagascar|MW:Malawi|MY:Malaysia|MV:Maldives|ML:Mali|MT:Malta|MH:Marshall Islands|MR:Mauritania|MU:Mauritius|MX:Mexico|FM:Micronesia|MD:Moldova|MC:Monaco|MN:Mongolia|ME:Montenegro|MA:Morocco|MZ:Mozambique|MM:Myanmar|NA:Namibia|NR:Nauru|NP:Nepal|NL:Netherlands|NZ:New Zealand|NI:Nicaragua|NE:Niger|NG:Nigeria|KP:North Korea|MK:North Macedonia|NO:Norway|OM:Oman|PK:Pakistan|PW:Palau|PS:Palestine|PA:Panama|PG:Papua New Guinea|PY:Paraguay|PE:Peru|PH:Philippines|PL:Poland|PT:Portugal|QA:Qatar|RO:Romania|RU:Russia|RW:Rwanda|KN:Saint Kitts and Nevis|LC:Saint Lucia|VC:Saint Vincent and the Grenadines|WS:Samoa|SM:San Marino|ST:São Tomé and Príncipe|SA:Saudi Arabia|SN:Senegal|RS:Serbia|SC:Seychelles|SL:Sierra Leone|SG:Singapore|SK:Slovakia|SI:Slovenia|SB:Solomon Islands|SO:Somalia|ZA:South Africa|KR:South Korea|SS:South Sudan|ES:Spain|LK:Sri Lanka|SD:Sudan|SR:Suriname|SE:Sweden|CH:Switzerland|SY:Syria|TJ:Tajikistan|TZ:Tanzania|TH:Thailand|TL:Timor-Leste|TG:Togo|TO:Tonga|TT:Trinidad and Tobago|TN:Tunisia|TR:Türkiye|TM:Turkmenistan|TV:Tuvalu|UG:Uganda|UA:Ukraine|AE:United Arab Emirates|GB:United Kingdom|US:United States|UY:Uruguay|UZ:Uzbekistan|VU:Vanuatu|VE:Venezuela|VN:Vietnam|YE:Yemen|ZM:Zambia|ZW:Zimbabwe`;

export const COUNTRIES = Object.fromEntries(COUNTRY_DATA.split("|").map(s => { const i = s.indexOf(":"); return [s.slice(0, i), s.slice(i + 1)]; }));
export const COUNTRY_TOTAL = Object.keys(COUNTRIES).length; // 195

// Extra spellings → ISO2
const COUNTRY_ALIASES = {
  "usa":"US","u.s.":"US","u.s.a.":"US","us":"US","america":"US","united states of america":"US","the united states":"US",
  "uk":"GB","u.k.":"GB","great britain":"GB","britain":"GB","england":"GB","scotland":"GB","wales":"GB","northern ireland":"GB","united kingdom of great britain and northern ireland":"GB",
  "uae":"AE","emirates":"AE","turkey":"TR","turkiye":"TR","czech republic":"CZ","russian federation":"RU",
  "korea":"KR","republic of korea":"KR","korea, south":"KR","south korea":"KR","korea, north":"KP","democratic people's republic of korea":"KP",
  "ivory coast":"CI","cote d'ivoire":"CI","côte d’ivoire":"CI","cape verde":"CV","swaziland":"SZ","burma":"MM","east timor":"TL",
  "vatican":"VA","vatican city":"VA","holy see (vatican city state)":"VA","palestinian territories":"PS","state of palestine":"PS","palestine, state of":"PS",
  "bahamas, the":"BS","the bahamas":"BS","gambia, the":"GM","the gambia":"GM","laos pdr":"LA","lao pdr":"LA","viet nam":"VN",
  "democratic republic of the congo":"CD","democratic republic of congo":"CD","congo (kinshasa)":"CD","drc":"CD","dr congo":"CD",
  "republic of the congo":"CG","congo (brazzaville)":"CG","congo-brazzaville":"CG","macedonia":"MK","republic of north macedonia":"MK",
  "federated states of micronesia":"FM","st. kitts and nevis":"KN","st kitts and nevis":"KN","st. lucia":"LC","st lucia":"LC",
  "st. vincent and the grenadines":"VC","sao tome and principe":"ST","holland":"NL","the netherlands":"NL","iran, islamic republic of":"IR",
  "syrian arab republic":"SY","tanzania, united republic of":"TZ","moldova, republic of":"MD","bolivia, plurinational state of":"BO",
  "venezuela, bolivarian republic of":"VE","brunei darussalam":"BN",
};
const COUNTRY_BY_NAME = {};
for (const [code, name] of Object.entries(COUNTRIES)) COUNTRY_BY_NAME[fold(name)] = code;
for (const [alias, code] of Object.entries(COUNTRY_ALIASES)) COUNTRY_BY_NAME[fold(alias)] = code;

function fold(s) {
  return String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[’`]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
}

/** Free text (or ISO2) → ISO2 code of a recognised country, else null. */
export function normalizeCountry(input) {
  if (input == null) return null;
  const raw = String(input).trim();
  if (!raw) return null;
  const up = raw.toUpperCase();
  if (up.length === 2 && COUNTRIES[up]) return up;
  return COUNTRY_BY_NAME[fold(raw)] || null;
}

// ── US states (50) + DC + territories ────────────────────────────────────────
const STATE_DATA = `AL:Alabama|AK:Alaska|AZ:Arizona|AR:Arkansas|CA:California|CO:Colorado|CT:Connecticut|DE:Delaware|FL:Florida|GA:Georgia|HI:Hawaii|ID:Idaho|IL:Illinois|IN:Indiana|IA:Iowa|KS:Kansas|KY:Kentucky|LA:Louisiana|ME:Maine|MD:Maryland|MA:Massachusetts|MI:Michigan|MN:Minnesota|MS:Mississippi|MO:Missouri|MT:Montana|NE:Nebraska|NV:Nevada|NH:New Hampshire|NJ:New Jersey|NM:New Mexico|NY:New York|NC:North Carolina|ND:North Dakota|OH:Ohio|OK:Oklahoma|OR:Oregon|PA:Pennsylvania|RI:Rhode Island|SC:South Carolina|SD:South Dakota|TN:Tennessee|TX:Texas|UT:Utah|VT:Vermont|VA:Virginia|WA:Washington|WV:West Virginia|WI:Wisconsin|WY:Wyoming`;
export const US_STATES = Object.fromEntries(STATE_DATA.split("|").map(s => s.split(":")));
export const US_STATE_TOTAL = 50;
const US_OTHER = { DC:"Washington, D.C.", PR:"Puerto Rico", GU:"Guam", VI:"U.S. Virgin Islands", AS:"American Samoa", MP:"Northern Mariana Islands" };
const US_OTHER_ALIASES = { "washington dc":"DC","washington d.c.":"DC","washington, dc":"DC","washington, d.c.":"DC","district of columbia":"DC","d.c.":"DC","dc":"DC","virgin islands":"VI","us virgin islands":"VI","u.s. virgin islands":"VI","northern mariana islands":"MP" };
const STATE_BY_NAME = {};
for (const [c, n] of Object.entries(US_STATES)) { STATE_BY_NAME[fold(n)] = c; STATE_BY_NAME[c.toLowerCase()] = c; }
for (const [c, n] of Object.entries(US_OTHER)) { STATE_BY_NAME[fold(n)] = c; STATE_BY_NAME[c.toLowerCase()] = c; }
for (const [a, c] of Object.entries(US_OTHER_ALIASES)) STATE_BY_NAME[fold(a)] = c;

/** Region text → { code, name, kind: "state" | "other" } or null. Only call for US rows. */
export function normalizeUsState(input) {
  if (input == null) return null;
  let raw = String(input).trim().replace(/^US-/i, "");
  if (!raw) return null;
  const code = STATE_BY_NAME[fold(raw)];
  if (!code) return null;
  if (US_STATES[code]) return { code, name: US_STATES[code], kind: "state" };
  return { code, name: US_OTHER[code], kind: "other" };
}

// ── Coordinates & privacy ────────────────────────────────────────────────────
/** True for finite lat/lng in range, excluding the (0,0) "null island" default. */
export function validCoords(lat, lng) {
  const a = Number(lat), b = Number(lng);
  if (lat == null || lng == null || lat === "" || lng === "") return false;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  if (a < -90 || a > 90 || b < -180 || b > 180) return false;
  if (a === 0 && b === 0) return false;
  return true;
}

/**
 * Public coordinates are coarsened to 0.1° (≈ 11 km) — one step coarser than
 * the 0.01° (≈ 1 km) value the app stores — so markers never reveal a street.
 */
export function publicCoord(v) {
  return Math.round(Number(v) * 10) / 10;
}

export function cellKey(lat, lng) {
  return `${publicCoord(lat).toFixed(1)},${publicCoord(lng).toFixed(1)}`;
}

export function titleCase(s) {
  return String(s ?? "").trim().replace(/\s+/g, " ")
    .replace(/\b([a-z])([a-z']*)/gi, (_, a, b) => a.toUpperCase() + b.toLowerCase());
}

/** Broad, human-readable location: "Austin, TX" / "Texas, United States" / "Japan". */
export function broadLabel({ city, stateCode, regionName, countryCode }) {
  const country = countryCode ? COUNTRIES[countryCode] : null;
  if (countryCode === "US") {
    const st = stateCode || regionName;
    if (city && st) return `${city}, ${st}`;
    if (st) return `${US_STATES[st] || st}, United States`;
    return "United States";
  }
  if (city && country) return `${city}, ${country}`;
  if (regionName && country) return `${regionName}, ${country}`;
  return country || regionName || city || "Approximate location";
}
