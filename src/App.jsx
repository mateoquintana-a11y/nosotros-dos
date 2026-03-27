import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://TU_PROYECTO.supabase.co";
const SUPABASE_URL = "https://ybmcolklhlycemampkgk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlibWNvbGtsaGx5Y2VtYW1wa2drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4ODE4NTMsImV4cCI6MjA4OTQ1Nzg1M30.-wgV1gNB4KuzUjIvryVwzDOCX8J5n2dJ8Dur8cjbJL0";

const FONT_LINK = document.createElement("link");
FONT_LINK.rel = "stylesheet";
FONT_LINK.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap";
document.head.appendChild(FONT_LINK);

const style = document.createElement("style");
style.textContent = `
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  body { margin: 0; background: #0d0a14; font-family: 'DM Sans', sans-serif; }
  .font-display { font-family: 'Cormorant Garamond', serif; }
  ::-webkit-scrollbar { width: 0; height: 0; }
  input, textarea { outline: none; resize: none; }
  button:active { transform: scale(0.97); }
  @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  .fade-up { animation: fadeUp 0.4s ease forwards; }
  @keyframes pop { 0%{transform:scale(1)} 50%{transform:scale(1.25)} 100%{transform:scale(1)} }
  .pop { animation: pop 0.3s ease; }
  .swipe-card { transition: transform 0.18s cubic-bezier(.4,0,.2,1), opacity 0.18s; }
  .swipe-left { transform: translateX(-110%) rotate(-12deg); opacity:0; }
  .swipe-right { transform: translateX(110%) rotate(12deg); opacity:0; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .spin { animation: spin 1s linear infinite; display:inline-block; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
  .pulse { animation: pulse 2s ease infinite; }
  @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
  .shake { animation: shake 0.3s ease; }
  .chips-scroll { display:flex; gap:0.5rem; overflow-x:auto; padding-bottom:0.25rem; }
  .chips-scroll::-webkit-scrollbar { display:none; }
`;
document.head.appendChild(style);

// ── LocalStorage ──
const LOCAL_KEY = "nd_couple_code";
const LOCAL_PARTNER_KEY = (code) => `nd_partner_${code}`;
const LAST_ACTIVE_KEY = (code) => `nd_lastactive_${code}`;
const getLocalCode = () => { try { return localStorage.getItem(LOCAL_KEY); } catch { return null; } };
const setLocalCode = (c) => { try { localStorage.setItem(LOCAL_KEY, c); } catch {} };
const getLocalPartner = (code) => { try { return localStorage.getItem(LOCAL_PARTNER_KEY(code)); } catch { return null; } };
const setLocalPartner = (code, p) => { try { localStorage.setItem(LOCAL_PARTNER_KEY(code), p); } catch {} };
const getLastRead = (code, p) => { try { return localStorage.getItem(`nd_lastread_${code}_${p}`) || '1970-01-01'; } catch { return '1970-01-01'; } };
const setLastRead = (code, p) => { try { localStorage.setItem(`nd_lastread_${code}_${p}`, new Date().toISOString()); } catch {} };
const getLastActive = (code) => { try { return localStorage.getItem(LAST_ACTIVE_KEY(code)) || '1970-01-01'; } catch { return '1970-01-01'; } };
const setLastActive = (code) => { try { localStorage.setItem(LAST_ACTIVE_KEY(code), new Date().toISOString()); } catch {} };

// ── Weekly helpers ──
const getISOWeek = (d = new Date()) => {
  const date = new Date(d); date.setHours(0,0,0,0);
  date.setDate(date.getDate() + 3 - (date.getDay()+6)%7);
  const week1 = new Date(date.getFullYear(),0,4);
  return 1 + Math.round(((date.getTime()-week1.getTime())/86400000 - 3 + (week1.getDay()+6)%7)/7);
};

// ── Notifications ──
const requestNotifPermission = async () => {
  if(!('Notification' in window)) return false;
  if(Notification.permission === 'granted') return true;
  if(Notification.permission !== 'denied') {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }
  return false;
};
const sendNotif = (body) => {
  if(Notification.permission === 'granted') {
    try { new Notification('😏', { body, icon: '/icon.png', badge: '/icon.png', silent: false }); } catch {}
  }
};

// ── DB helpers ──
const dbToApp = (row) => ({
  names: row.names,
  points: row.points,
  preferences: row.preferences,
  completedChallenges: row.completed_challenges || [],
  completedDates: row.completed_dates || [],
  completedExpress: row.completed_express || [],
  savedPositions: row.saved_positions || [],
  matches: row.matches || [],
  expressChallenges: row.express_challenges || [],
  weeklyPoints: row.weekly_points || { A:0, B:0, week:0 },
  positionsStatus: row.positions_status || {},
  encounterGame: row.encounter_game || null,
  anagramGame: row.anagram_game || null,
});
const appToDb = (data) => ({
  names: data.names,
  points: data.points,
  preferences: data.preferences,
  completed_challenges: data.completedChallenges || [],
  completed_dates: data.completedDates || [],
  completed_express: data.completedExpress || [],
  saved_positions: data.savedPositions || [],
  matches: data.matches || [],
  express_challenges: data.expressChallenges || [],
  weekly_points: data.weeklyPoints || { A:0, B:0, week:0 },
  positions_status: data.positionsStatus || {},
  encounter_game: data.encounterGame || null,
  anagram_game: data.anagramGame || null,
  updated_at: new Date().toISOString(),
});
const DEFAULT_DATA = (names) => ({
  names: names || { A:"Ella", B:"Él" },
  points: { A:0, B:0 },
  preferences: { A:{}, B:{} },
  completedChallenges: [],
  completedDates: [],
  completedExpress: [],
  savedPositions: [],
  matches: [],
  expressChallenges: [],
  weeklyPoints: { A:0, B:0, week: getISOWeek() },
  positionsStatus: {},
  encounterGame: null,
  anagramGame: null,
});

async function fetchCouple(code) {
  const { data, error } = await supabase.from("couples").select("*").eq("couple_code", code.toUpperCase()).single();
  if(error) return null;
  return data;
}
async function createCouple(code, names) {
  const def = DEFAULT_DATA(names);
  const { data, error } = await supabase.from("couples").insert([{ couple_code: code.toUpperCase(), ...appToDb(def) }]).select().single();
  if(error) return null;
  return data;
}
async function updateCouple(code, updates) {
  await supabase.from("couples").update({ ...appToDb(updates) }).eq("couple_code", code.toUpperCase());
}
function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c = ""; for(let i=0;i<6;i++) c+=chars[Math.floor(Math.random()*chars.length)];
  return c;
}

// ── Weekly points check & reset ──
const checkWeeklyReset = (appData) => {
  const currentWeek = getISOWeek();
  const wp = appData.weeklyPoints || { A:0, B:0, week:0 };
  if(wp.week !== currentWeek) return { ...appData, weeklyPoints: { A:0, B:0, week: currentWeek } };
  return appData;
};
const addWeeklyPoints = (appData, partner, pts) => {
  const wp = appData.weeklyPoints || { A:0, B:0, week: getISOWeek() };
  return { ...wp, [partner]: (wp[partner]||0) + pts };
};

// ══════════════════════════════════════════════════════
// GAME DATA
// ══════════════════════════════════════════════════════

// ANAGRAM — 50 words in 10 groups of 5
const ANAGRAM_BANK = [
  ['BESOS','CARICIAS','MASAJE','PLACER','DESEO'],
  ['TENSION','LABIOS','ESPALDA','CUELLO','PECHO'],
  ['CADERAS','LENCERIA','ACEITE','VELAS','GEMIDOS'],
  ['SUSURRO','MORDISCO','ABRAZO','LENGUA','CALOR'],
  ['VIBRADOR','STRIPTEASE','LUBRICANTE','ORGASMO','FOREPLAY'],
  ['INTIMIDAD','SEDUCCION','PROVOCAR','MIRADAS','DESNUDOS'],
  ['ESPEJO','DUCHA','SORPRESA','FOTOGRAFIA','FANTASY'],
  ['POSICION','RITMO','LENTO','INTENSO','PROFUNDO'],
  ['SUAVE','PASION','EXPLORAR','ATREVIDO','CONTROL'],
  ['RENDIRSE','PIEL','FUEGO','PLACER','PROVOCAR'],
];
const getWeeklyWords = () => {
  const week = getISOWeek();
  return ANAGRAM_BANK[week % ANAGRAM_BANK.length];
};
const shuffleWord = (word, seed) => {
  const arr = word.split('');
  let s = seed;
  for(let i=arr.length-1;i>0;i--){
    s = (s*1664525+1013904223)&0xffffffff;
    const j = Math.abs(s) % (i+1);
    [arr[i],arr[j]] = [arr[j],arr[i]];
  }
  const result = arr.join('');
  return result === word ? shuffleWord(word, seed+1) : result;
};

// ENCOUNTER GAME
const ENCOUNTER_FIXED = [
  {
    id:'ef1', label:'¿A qué hora?', emoji:'🕐',
    options:['Por la mañana 🌅','Por la tarde ☀️','Por la noche 🌙'],
  },
  {
    id:'ef2', label:'¿Dónde?', emoji:'🏠',
    options:['En la cama 🛏️','En la ducha 🚿','En la sala 🛋️','Donde sea 🔀','Sorpréndeme ✨'],
  },
  {
    id:'ef3', label:'¿Qué tipo de encuentro?', emoji:'🔥',
    options:['Solo foreplay 🌶️','Sexo oral 👄','Con penetración 💜','Todo incluido 🌊','Solo masturbación mutua 🤲'],
  },
];
const ENCOUNTER_VARIABLE_BANK = [
  { id:'ev1', label:'¿A qué ritmo?', emoji:'⏱️', options:['Despacio y sin prisa 🐌','Rápido y apasionado ⚡','Empieza suave y termina intenso 🌊'] },
  { id:'ev2', label:'¿Con juguetes?', emoji:'💜', options:['Sin juguetes','Con vibrador 💜','Lo que se nos ocurra en el momento 🎲'] },
  { id:'ev3', label:'¿Qué ambiente?', emoji:'🕯️', options:['En silencio 🤫','Con música 🎵','Con velas 🕯️','Con todo el ambiente ✨'] },
  { id:'ev4', label:'¿Cómo empieza la previa?', emoji:'💋', options:['Previa larga hasta no poder más 🔥','Previa corta e ir directo ⚡','Sin previa, ya mismo 😏'] },
  { id:'ev5', label:'¿Quién escoge la posición inicial?', emoji:'🔀', options:['La que él escoja 👨','La que ella escoja 👩','La que salga natural 🌊'] },
  { id:'ev6', label:'¿Nivel de ruido?', emoji:'🔊', options:['En silencio total 🤐','Solo susurros 😏','Sin límites 🔥'] },
];
const getEncounterQuestions = (seed) => {
  const shuffled = [...ENCOUNTER_VARIABLE_BANK].sort(()=>(((seed*9301+49297)%233280)/233280)-0.5);
  const vars = shuffled.slice(0,3);
  const all = [...ENCOUNTER_FIXED, ...vars];
  // Shuffle all 6
  return all.sort(()=>(((seed*6271+49979)%233280)/233280)-0.5);
};

// GAMIFICATION
const LEVELS = [
  { min:0,   max:124,  name:'Pareja Romántica',  emoji:'🌹', gradient:'linear-gradient(135deg,#a8456a,#c96b8a)' },
  { min:125, max:299,  name:'Pareja Aventurera', emoji:'💫', gradient:'linear-gradient(135deg,#6d28d9,#8b5cf6)' },
  { min:300, max:599,  name:'Pareja Apasionada', emoji:'🔥', gradient:'linear-gradient(135deg,#c2500a,#e07340)' },
  { min:600, max:9999, name:'Pareja Legendaria', emoji:'✨', gradient:'linear-gradient(135deg,#a87800,#d4a017)' },
];
const getLevel = pts => LEVELS.find(l=>pts>=l.min&&pts<=l.max)||LEVELS[0];
const MEDIUM_UNLOCK = 125;
const HOT_UNLOCK    = 190;
const ICfg = {
  mild:   { label:'Mild',   emoji:'🌸', bg:'rgba(201,107,138,0.12)', border:'rgba(201,107,138,0.3)', accent:'#e07b8a' },
  medium: { label:'Medium', emoji:'🔥', bg:'rgba(224,115,64,0.12)',  border:'rgba(224,115,64,0.3)',  accent:'#e07340' },
  hot:    { label:'Hot',    emoji:'🌶️', bg:'rgba(220,38,38,0.12)',   border:'rgba(220,38,38,0.3)',   accent:'#ef4444' },
};

// Weekly path milestones
const WEEKLY_MILESTONES = [
  { pts:0,   label:'Calentando motores...', emoji:'🔥' },
  { pts:30,  label:'Ya despertamos',        emoji:'😏' },
  { pts:70,  label:'La tensión sube',       emoji:'💋' },
  { pts:120, label:'Zona de peligro',       emoji:'🌶️' },
  { pts:180, label:'Sin control',           emoji:'🔥🔥' },
  { pts:250, label:'Leyenda de la semana',  emoji:'👑' },
];

// Express helpers
const EXPRESS_WINDOW_MS = 24*60*60*1000;
const EXPRESS_BONUS_MS  = 10*60*1000;
const getTimeLeft = (sentAt) => { const ms=EXPRESS_WINDOW_MS-(Date.now()-new Date(sentAt).getTime()); return ms>0?ms:0; };
const formatCountdown = (ms) => {
  if(ms<=0) return '00:00';
  const totalSec=Math.floor(ms/1000); const h=Math.floor(totalSec/3600);
  const m=Math.floor((totalSec%3600)/60); const s=totalSec%60;
  if(h>0) return `${h}h ${m.toString().padStart(2,'0')}m`;
  return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
};

// ══════════════════════════════════════════════════════
// QUESTIONS DATA (same as before)
// ══════════════════════════════════════════════════════
const QUESTIONS = [
  { id:'q01', cat:'Exploración del cuerpo ✨', text:'¿Te gustaría que tu pareja te besara el cuello más seguido?' },
  { id:'q02', cat:'Exploración del cuerpo ✨', text:'¿Te gustaría que tu pareja te besara las orejas?' },
  { id:'q03', cat:'Exploración del cuerpo ✨', text:'¿Te gustaría que tu pareja te besara el pecho?' },
  { id:'q04', cat:'Exploración del cuerpo ✨', text:'¿Te gustaría que tu pareja te besara la espalda?' },
  { id:'q05', cat:'Exploración del cuerpo ✨', text:'¿Te gustaría explorar el cuerpo del otro completamente con la boca?' },
  { id:'q06', cat:'Exploración del cuerpo ✨', text:'¿Te gustaría que usaran aceites por todo el cuerpo antes de tener relaciones?' },
  { id:'q07', cat:'Exploración del cuerpo ✨', text:'¿Te gustaría recibir más masajes como parte regular de su intimidad?' },
  { id:'q08', cat:'Exploración del cuerpo ✨', text:'¿Te gustaría que te despertaran con besos por todo el cuerpo?' },
  { id:'q09', cat:'Sexo oral 👄', text:'¿Te gustaría que tu pareja te hiciera más sexo oral?' },
  { id:'q10', cat:'Sexo oral 👄', text:'¿Te gustaría despertar a tu pareja haciéndole sexo oral?' },
  { id:'q11', cat:'Sexo oral 👄', text:'¿Te gustaría que te despertaran haciéndote el amor?' },
  { id:'q12', cat:'Sexo oral 👄', text:'¿Te gustaría explorar el sexo oral mutuo al mismo tiempo (69)?' },
  { id:'q13', cat:'Sexo oral 👄', text:'¿Te gustaría que ella se sentara en tu cara mientras le haces oral?' },
  { id:'q14', cat:'Sexo oral 👄', text:'¿Te gustaría sentarte en la cara de tu pareja mientras te hacen oral?' },
  { id:'q15', cat:'Juguetes 💜', text:'¿Te gustaría usar vibradores mientras tienen relaciones?' },
  { id:'q16', cat:'Juguetes 💜', text:'¿Te gustaría explorar jugueteo anal con juguetes?' },
  { id:'q17', cat:'Juguetes 💜', text:'¿Te gustaría explorar jugueteo anal con diferentes partes del cuerpo?' },
  { id:'q18', cat:'Juguetes 💜', text:'¿Te gustaría explorar la penetración doble con un juguete sexual?' },
  { id:'q19', cat:'Juguetes 💜', text:'¿Te gustaría usar un vibrador de control remoto incluso fuera de casa?' },
  { id:'q20', cat:'Juguetes 💜', text:'¿Te gustaría usar una vela de masaje (cera a temperatura segura) por el cuerpo?' },
  { id:'q21', cat:'Juguetes 💜', text:'¿Te gustaría usar lubricante de forma habitual durante el sexo?' },
  { id:'q22', cat:'Visual y voyeur 👁️', text:'¿Te gustaría ver a tu pareja masturbarse?' },
  { id:'q23', cat:'Visual y voyeur 👁️', text:'¿Te gustaría que te vieran masturbarte?' },
  { id:'q24', cat:'Visual y voyeur 👁️', text:'¿Te gustaría ver películas porno juntos?' },
  { id:'q25', cat:'Visual y voyeur 👁️', text:'¿Te gustaría tener sexo frente a un espejo para verse a los dos?' },
  { id:'q26', cat:'Visual y voyeur 👁️', text:'¿Te gustaría hacer contacto visual sostenido durante el sexo?' },
  { id:'q27', cat:'Visual y voyeur 👁️', text:'¿Te gustaría que te tomaran fotos durante la intimidad?' },
  { id:'q28', cat:'Fotos y grabaciones 📸', text:'¿Te gustaría enviarle nudes a tu pareja?' },
  { id:'q29', cat:'Fotos y grabaciones 📸', text:'¿Te gustaría tomarse fotos sexis como pareja?' },
  { id:'q30', cat:'Fotos y grabaciones 📸', text:'¿Te gustaría tomarse fotos mientras tienen relaciones?' },
  { id:'q31', cat:'Fotos y grabaciones 📸', text:'¿Te gustaría grabarse teniendo relaciones?' },
  { id:'q32', cat:'Seducción y previa 🔥', text:'¿Te gustaría hacerle un striptease a tu pareja?' },
  { id:'q33', cat:'Seducción y previa 🔥', text:'¿Te gustaría que la previa durara hasta que no puedan más?' },
  { id:'q34', cat:'Seducción y previa 🔥', text:'¿Te gustaría sorprender a tu pareja ya lista/listo en la habitación?' },
  { id:'q35', cat:'Seducción y previa 🔥', text:'¿Te gustaría que te despertaran ya con todo preparado para un momento íntimo?' },
  { id:'q36', cat:'Seducción y previa 🔥', text:'¿Te gustaría vestirte con ropa sexy o lencería para tener relaciones?' },
  { id:'q37', cat:'Seducción y previa 🔥', text:'¿Te gustaría hacerle un masaje sensual a tu pareja?' },
  { id:'q38', cat:'Seducción y previa 🔥', text:'¿Te gustaría que te abrazara con las piernas mientras se masturba?' },
  { id:'q39', cat:'Climax 💦', text:'¿Te gustaría que tu pareja se viniera encima de ti?' },
  { id:'q40', cat:'Climax 💦', text:'¿Te gustaría que se vinieran en tu cara?' },
  { id:'q41', cat:'Climax 💦', text:'¿Te gustaría que se vinieran en tu pecho?' },
  { id:'q42', cat:'Climax 💦', text:'¿Te gustaría que se vinieran en tu culo?' },
  { id:'q43', cat:'Climax 💦', text:'¿Te gustaría que te masturbaran después de que ya hayas tenido un orgasmo?' },
  { id:'q44', cat:'Climax 💦', text:'¿Te gustaría masturbarte en la pierna de tu pareja?' },
  { id:'q45', cat:'Espontaneidad y lugar 🌍', text:'¿Te gustaría tener relaciones siendo más espontáneos?' },
  { id:'q46', cat:'Espontaneidad y lugar 🌍', text:'¿Te gustaría tener relaciones aún vestidos?' },
  { id:'q47', cat:'Espontaneidad y lugar 🌍', text:'¿Te gustaría tener sexo en el bosque?' },
  { id:'q48', cat:'Espontaneidad y lugar 🌍', text:'¿Te gustaría tener sexo en la playa?' },
  { id:'q49', cat:'Espontaneidad y lugar 🌍', text:'¿Te gustaría tener sexo en una terraza?' },
  { id:'q50', cat:'Espontaneidad y lugar 🌍', text:'¿Te gustaría tener sexo en el carro a un lado de la carretera?' },
  { id:'q51', cat:'Espontaneidad y lugar 🌍', text:'¿Te gustaría nadar desnudos juntos?' },
  { id:'q52', cat:'Comunicación y exploración 💬', text:'¿Te gustaría hablar sucio mientras tienen relaciones?' },
  { id:'q53', cat:'Comunicación y exploración 💬', text:'¿Te gustaría comer cosas del cuerpo de tu pareja?' },
  { id:'q54', cat:'Comunicación y exploración 💬', text:'¿Te gustaría tomarse un baño o ducha juntos que derive en intimidad?' },
  { id:'q55', cat:'Comunicación y exploración 💬', text:'¿Te gustaría probar una posición nueva con más frecuencia?' },
];

// ══════════════════════════════════════════════════════
// CHALLENGES & EXPRESS & DATES (same as v5)
// ══════════════════════════════════════════════════════
const CHALLENGES = {
  mild: [
    { id:'m01', title:'Nota escondida 💌', desc:'Escribe una nota romántica y escóndela donde tu pareja la encuentre mañana', points:10, time:'5 min' },
    { id:'m02', title:'Masaje relajante 🤲', desc:'Dale un masaje de 15 minutos sin pedir nada a cambio. Solo dar', points:10, time:'15 min' },
    { id:'m03', title:'Baño con velas 🛁', desc:'Preparen un baño con velas, espuma y música para los dos', points:15, time:'30 min' },
    { id:'m04', title:'Baile en sala 💃', desc:'Bailen juntos en la sala con su canción favorita. Sin excusas', points:10, time:'10 min' },
    { id:'m05', title:'Cena especial 🍷', desc:'Cocinen juntos una cena especial: velas, música y sin teléfonos', points:15, time:'60 min' },
    { id:'m06', title:'Mensajes todo el día 📱', desc:'Mándense mensajes coquetos durante todo el día', points:10, time:'Todo el día' },
    { id:'m07', title:'5 cosas que amo ❤️', desc:'Dile 5 cosas que te encantan físicamente de tu pareja, con detalle y sin prisa', points:10, time:'5 min' },
    { id:'m08', title:'Look favorito 👗', desc:'Vístete con la ropa que más le gusta a tu pareja y sorpréndelo/a', points:10, time:'5 min' },
    { id:'m09', title:'Recuérdame 💭', desc:'Cuéntense sus recuerdos favoritos de cuando se conocieron', points:10, time:'15 min' },
    { id:'m10', title:'Cocina para él/ella 🍳', desc:'Prepara su desayuno o cena favorita con todos los detalles', points:10, time:'30 min' },
    { id:'m11', title:'Rutina de noche juntos 🧴', desc:'Hagan su rutina nocturna juntos. Terminen con un abrazo largo', points:10, time:'20 min' },
    { id:'m12', title:'Detalle sin razón 💐', desc:'Cómprale o prepárale algo pequeño sin ningún motivo especial', points:10, time:'5 min' },
  ],
  medium: [
    { id:'med01', title:'Masaje con aceites 🌺', desc:'Masaje por todo el cuerpo con aceites. Turnos de 20 min cada uno', points:20, time:'40 min' },
    { id:'med02', title:'Venda y exploración 😶', desc:'Usen una venda en los ojos y explórense. El que tiene la venda solo recibe', points:20, time:'20 min' },
    { id:'med03', title:'Cuento erótico 📖', desc:'Léanse algo erótico en voz alta y compartan sus reacciones', points:15, time:'15 min' },
    { id:'med04', title:'Exploración con hielo 🧊', desc:'Usen hielo para explorar diferentes zonas del cuerpo del otro', points:20, time:'20 min' },
    { id:'med05', title:'Striptease lento ✨', desc:'Desvístanse el uno al otro muy lentamente, en silencio, sin prisa', points:20, time:'15 min' },
    { id:'med06', title:'Strip preguntas 🃏', desc:'Preguntas íntimas: si no respondes (o te niegas) pierdes una prenda', points:20, time:'30 min' },
    { id:'med07', title:'Sesión de fotos 📸', desc:'Tómense fotos íntimas y divertidas. Para ustedes dos solamente', points:15, time:'20 min' },
    { id:'med08', title:'Solo labios 💋', desc:'15 minutos cada uno explorando el cuerpo del otro únicamente con los labios', points:25, time:'30 min' },
    { id:'med09', title:'Cuéntame un deseo 🎁', desc:'Dile una cosa específica que quieres que te hagan. El otro la cumple', points:20, time:'15 min' },
    { id:'med10', title:'Solo mirarnos 👁️', desc:'5 minutos de contacto visual sostenido sin hablar. Luego lo que surja', points:20, time:'10 min' },
    { id:'med11', title:'Exploración con calor 🌡️', desc:'Aceite tibio o vela de masaje segura. Explórense con el calor', points:20, time:'20 min' },
    { id:'med12', title:'Ducha juntos con propósito 🚿', desc:'Con jabón, con tiempo, con atención total al cuerpo del otro', points:20, time:'20 min' },
  ],
  hot: [
    { id:'h01', title:'Nuevo juguete 💜', desc:'Usen un juguete que no hayan probado o que no han usado recientemente', points:30, time:'30+ min' },
    { id:'h02', title:'Posición nueva 🔥', desc:'Prueben una posición de su lista guardada que aún no han intentado', points:25, time:'30+ min' },
    { id:'h03', title:'Frente al espejo 🪞', desc:'Sesión íntima frente a un espejo para explorar visualmente juntos', points:30, time:'30+ min' },
    { id:'h04', title:'Control total 👑', desc:'Turnos de 20 min: el que tiene el turno decide todo', points:30, time:'40 min' },
    { id:'h05', title:'Masaje íntimo completo 🌡️', desc:'Masaje con aceites calientes por todo el cuerpo, incluyendo todas las zonas', points:30, time:'40 min' },
    { id:'h06', title:'Sí o no en vivo 🎯', desc:'Se proponen cosas en tiempo real y responden: sí, no, o quizás pronto', points:25, time:'20 min' },
    { id:'h07', title:'Sorpresa lista 🎁', desc:'Prepara el ambiente y sorpréndelo/a ya listo/a cuando llegue', points:30, time:'Prep 20 min' },
    { id:'h08', title:'Seducción completa 💃', desc:'Música, ropa especial, bailen primero. Dejen que la tensión crezca', points:30, time:'45 min' },
    { id:'h09', title:'Solo exploración 🌊', desc:'Intimidad usando únicamente caricias y besos. Sin llegar al sexo', points:25, time:'30 min' },
    { id:'h10', title:'Grábense 📹', desc:'Sesión con cámara para ustedes dos solos. Para verlo juntos después', points:30, time:'30+ min' },
    { id:'h11', title:'Hablar sucio toda la sesión 🌶️', desc:'Desde el principio hasta el final, sin parar. Los dos. Sin vergüenza', points:30, time:'30+ min' },
    { id:'h12', title:'Posición nueva + juguete 🔀', desc:'Combinen una posición que no hayan hecho con un juguete', points:30, time:'30+ min' },
  ],
};

const EXPRESS = [
  { id:'e01', title:'Audio secreto 🎙️', desc:'Mándale un audio de voz con algo muy provocador para más tarde esta noche', points:5, time:'2 min' },
  { id:'e02', title:'Promesa escrita 📝', desc:'Una nota con una promesa específica y detallada para esta noche. Sin firmar', points:5, time:'3 min' },
  { id:'e03', title:'El beso cronometrado ⏱️', desc:'Un beso de exactamente 60 segundos. Luego siguen con su día como si nada', points:5, time:'1 min' },
  { id:'e04', title:'Al oído 😏', desc:'Susúrrale algo íntimo al oído mientras están ocupados en otra cosa', points:5, time:'1 min' },
  { id:'e05', title:'Toque secreto 🤭', desc:'Tócale íntimamente de forma sutil mientras hacen algo cotidiano', points:5, time:'1 min' },
  { id:'e06', title:'Foto privada 📷', desc:'Una foto sugerente. Exclusivamente para él/ella. Sin previo aviso', points:8, time:'5 min' },
  { id:'e07', title:'Mini masaje ⚡', desc:'5 minutos de masaje en cuello y hombros. Prométele que continuará', points:5, time:'5 min' },
  { id:'e08', title:'Fantasía en 3 frases 💭', desc:'Cuéntale en exactamente 3 oraciones lo que le harías si tuvieran 1 hora solos', points:5, time:'3 min' },
  { id:'e09', title:'2 verdades 1 deseo 🎲', desc:'Jueguen "2 verdades y 1 deseo íntimo" por mensajes de texto', points:8, time:'5 min' },
  { id:'e10', title:'Check-in de deseo 💬', desc:'¿Qué te gustaría que te hiciera en este momento? Ambos responden', points:8, time:'5 min' },
  { id:'e11', title:'Propuesta secreta 🌙', desc:'Dile una cosa específica que quieres hacer con él/ella este fin de semana', points:5, time:'2 min' },
  { id:'e12', title:'Elogio físico 🌹', desc:'Cuéntale 3 cosas específicas de su cuerpo que te vuelven loco/a. Con detalle', points:5, time:'3 min' },
  { id:'e13', title:'Ve al baño y mándale una nude 🚿', desc:'Donde sea que estés ahora mismo. Ve al baño y mándale una foto', points:8, time:'5 min' },
  { id:'e14', title:'Clip de 15 segundos 🎬', desc:'Grábate haciendo algo sugerente. Mándaselo sin ninguna explicación', points:8, time:'5 min' },
  { id:'e15', title:'Pausa en la rutina 🧦', desc:'Interrúmpelo/a mientras hace algo cotidiano y bésalo/a apasionadamente', points:5, time:'1 min' },
  { id:'e16', title:'Nota en el bolsillo 💌', desc:'Mete una nota descriptiva y atrevida donde la encuentre después', points:5, time:'3 min' },
  { id:'e17', title:'Alarma secreta 🔔', desc:'Ponle una alarma con una descripción de lo que le harás esta noche', points:5, time:'2 min' },
  { id:'e18', title:'La mirada 🪞', desc:'Sin decir nada, mírale de arriba abajo y di solo: "esta noche..."', points:5, time:'1 min' },
  { id:'e19', title:'3 palabras 🫦', desc:'Mándale exactamente 3 palabras que lo/la pongan a pensar el resto del día', points:5, time:'2 min' },
  { id:'e20', title:'Check de temperatura 🌡️', desc:'¿Qué tienes ganas de hacer ahora mismo? Ambos responden sin filtro', points:8, time:'5 min' },
  { id:'e21', title:'Cuenta regresiva ⏰', desc:'Dile: "en X minutos quiero que estés en el cuarto". Y cumple', points:5, time:'1 min' },
  { id:'e22', title:'Playlist de esta noche 🔊', desc:'Mándale una playlist de 5 canciones describiéndole el ambiente', points:5, time:'5 min' },
];

const DATES = [
  { id:'d01', title:'Spa en casa', emoji:'🛁', desc:'Máscaras, aceites, música y vino', time:'2h', mood:'Relajante', points:20, steps:['Velas y música suave','Máscaras faciales juntos','Turnos de masaje con aceites','Baño o ducha juntos','Copa de vino sin teléfonos'] },
  { id:'d02', title:'Restaurante en casa', emoji:'🍷', desc:'Delivery favorito, velas, vestidos especial', time:'1.5h', mood:'Romántico', points:20, steps:['Escojan su restaurante favorito','Vístanse elegante','Velas y teléfonos en modo avión','Brindis antes de comer','Un postre especial'] },
  { id:'d03', title:'Cine + masaje', emoji:'🎬', desc:'El que elige la película da masaje durante toda la película', time:'2h', mood:'Relajante', points:15, steps:['Voten por la película','Preparen snacks','Manta y almohadas','El masajista no para','Turno a mitad si empatan'] },
  { id:'d04', title:'Picnic en sala', emoji:'🧺', desc:'Manta en el piso, luces navideñas y snacks', time:'1.5h', mood:'Divertido', points:15, steps:['Manta grande en la sala','Luces navideñas','Snacks y bebidas','Playlist especial','Juego de cartas o preguntas'] },
  { id:'d05', title:'Juegos + preguntas', emoji:'🎲', desc:'Juego de mesa + preguntas íntimas como penalización', time:'1.5h', mood:'Divertido', points:15, steps:['Escojan su juego','10 preguntas íntimas en papelitos','Quien pierda responde','El gran perdedor cumple un reto','Celebren el cierre'] },
  { id:'d06', title:'Chefs por una noche', emoji:'👨‍🍳', desc:'Receta nueva con música y vino', time:'2h', mood:'Divertido', points:20, steps:['Receta nueva y ambiciosa','Ingredientes ese día','Cocinen juntos sin dividir','Playlist favorita','Presenten como en restaurante'] },
  { id:'d07', title:'Cata en casa', emoji:'🍾', desc:'Cata de vinos o cócteles con quesos', time:'1.5h', mood:'Relajante', points:15, steps:['3-4 vinos o cócteles','Quesos y botanas','Califiquen del 1 al 10','El que adivine más gana','El ganador elige algo para esa noche'] },
  { id:'d08', title:'Karaoke privado', emoji:'🎤', desc:'Las canciones más ridículas y románticas', time:'1h', mood:'Divertido', points:15, steps:['YouTube Karaoke','1 romántica por cada 2 ridículas','Puntos al más dramático','Canción final dedicada','Video obligatorio'] },
  { id:'d09', title:'Primera cita 2.0', emoji:'💑', desc:'Recrear su primera cita desde casa', time:'2h', mood:'Romántico', points:25, steps:['Recuerden cada detalle','Decoren lo más parecido posible','Usen o imiten la ropa','Recreen las conversaciones','Final alternativo que no tuvieron'] },
  { id:'d10', title:'Sesión fotográfica', emoji:'📸', desc:'Sesión de fotos íntima y divertida', time:'1h', mood:'Íntimo', points:20, steps:['Sets en diferentes partes de la casa','Fotos elegantes primero','Cambios de ropa','Algunas más íntimas','Foto favorita como fondo de pantalla'] },
  { id:'d11', title:'Noche de chimenea', emoji:'🔥', desc:'Cobijas frente a la chimenea, vino y nada de distracciones', time:'2h', mood:'Romántico', points:20, steps:['Prendan la chimenea y apaguen luces','Cobijas en el piso','Vino o café','Música suave sin pantallas','Sin agenda: solo estar'] },
  { id:'d12', title:'Maratón + masaje', emoji:'🍿', desc:'Serie nueva con masaje continuo', time:'2h', mood:'Relajante', points:15, steps:['Serie que ninguno haya visto','Quién da masaje primero','Cambian a la mitad','Aceite disponible','Snacks sin levantarse'] },
  { id:'d13', title:'Noche de arte', emoji:'🎨', desc:'Pinten juntos algo sin habilidad requerida', time:'1.5h', mood:'Divertido', points:15, steps:['Pinturas o colores','Cada uno pinta al otro','Bebida favorita','Presenten obras con seriedad','Cuélguenlas en la casa'] },
  { id:'d14', title:'Spa express', emoji:'💆', desc:'Para noches de poco tiempo pero algo especial', time:'45 min', mood:'Relajante', points:10, steps:['Velas, teléfonos lejos','Mascarilla rápida','15 minutos de masaje','Ducha o baño juntos','Terminen con algo rico'] },
  { id:'d15', title:'Terraza nocturna', emoji:'🌃', desc:'Cobija, bebida, cielo y conversación', time:'1h', mood:'Romántico', points:15, steps:['Cuando la bebé duerma','Cobija y bebida en terraza','Teléfonos adentro','Sin tema fijo','Abrazo largo mirando hacia afuera'] },
  { id:'d16', title:'Apuestas íntimas', emoji:'🎰', desc:'Juego donde cada ronda tiene una apuesta íntima', time:'1.5h', mood:'Divertido', points:15, steps:['Cualquier juego: cartas o dados','Ganador propone apuesta','Sin vetar antes de escuchar','El gran ganador elige el cierre','Suban la intensidad con cada ronda'] },
  { id:'d17', title:'Lectura íntima', emoji:'📚', desc:'Cada uno lee al otro algo erótico o que le guste', time:'1h', mood:'Íntimo', points:15, steps:['Cada uno busca algo','Velas y posición cómoda','El primero lee, el otro escucha','Compartan qué les generó','Si quieren explorar lo leído: esa es la noche'] },
  { id:'d18', title:'Teatro en casa', emoji:'🎭', desc:'Improv juntos: ridículas primero, luego ven qué surge', time:'1h', mood:'Divertido', points:15, steps:['Escenas ridículas primero','Siempre decir sí al otro','Escalar intensidad','Sin guion','Final que los dos quieran'] },
  { id:'d19', title:'Postre de medianoche', emoji:'🍰', desc:'Algo dulce en la cama cuando la bebé duerma', time:'45 min', mood:'Romántico', points:10, steps:['Esperar que la bebé duerma','Algo dulce juntos','Comerlo en la cama','Sin teléfonos ni TV','Solo los dos y algo rico'] },
  { id:'d20', title:'Mañana lenta', emoji:'🛌', desc:'Un domingo sin alarmas ni teléfonos', time:'Mañana entera', mood:'Íntimo', points:20, steps:['Sin alarma','Teléfonos fuera hasta el mediodía','Desayuno en cama','Sin planes','Solo estar presentes'] },
];

// ══════════════════════════════════════════════════════
// POSITIONS (21 original + 20 new = 41 total)
// ══════════════════════════════════════════════════════
const POSITIONS = [
  // ── Original 21 ──
  { id:'p01', name:'Cowgirl invertida', emoji:'🔄', diff:'Media', cat:'Ella arriba', pts:10, desc:'Ella arriba mirando hacia los pies de él. Estimulación diferente y muy visual.', tip:'Ella puede apoyarse en los muslos de él para mayor control.' },
  { id:'p02', name:'Mariposa', emoji:'🦋', diff:'Media', cat:'Variante', pts:10, desc:'Ella al borde de la cama, él de pie. Buena profundidad y contacto visual.', tip:'Él puede elevar sus piernas a diferentes alturas para cambiar el ángulo.' },
  { id:'p03', name:'Piernas al hombro', emoji:'🦵', diff:'Media', cat:'Misionero+', pts:10, desc:'Misionero con las piernas de ella sobre los hombros de él. Más profundidad.', tip:'Empiecen con solo una pierna al hombro para calibrar la comodidad.' },
  { id:'p04', name:'Águila', emoji:'🦅', diff:'Media', cat:'Misionero+', pts:10, desc:'Ella boca arriba con piernas muy abiertas, él sobre ella. Cara a cara, profunda.', tip:'Una almohada bajo la cadera de ella cambia el ángulo completamente.' },
  { id:'p05', name:'Cuchara profunda', emoji:'🥄', diff:'Fácil', cat:'De lado', pts:5, desc:'Cucharita donde ella echa la pierna de arriba hacia atrás sobre la cadera de él.', tip:'Ambos tienen manos libres para estimulación adicional.' },
  { id:'p06', name:'Movimiento trasero', emoji:'🍑', diff:'Fácil', cat:'Trasera', pts:5, desc:'Ella boca abajo con caderas levantadas, él encima. Ideal para vibrador de pareja.', tip:'Un cojín bajo el abdomen de ella ayuda a mantener la posición.' },
  { id:'p07', name:'Doggy Style', emoji:'🐕', diff:'Fácil', cat:'Trasera', pts:5, desc:'Ella en cuatro, él detrás. Profundo con acceso total de manos y juguetes.', tip:'Bajar el torso de ella aumenta la estimulación del punto G.' },
  { id:'p08', name:'Doble penetración', emoji:'💜', diff:'Difícil', cat:'Juguetes', pts:15, desc:'Ella con caderas elevadas, él desde atrás, con juguete adicional al frente.', tip:'Empiecen con el juguete ya en posición antes de que él entre.' },
  { id:'p09', name:'Superior femenina', emoji:'👑', diff:'Fácil', cat:'Ella arriba', pts:5, desc:'Ella arriba inclinada hacia adelante. Control total del ritmo desde ella.', tip:'Inclinarse más hacia adelante aumenta la fricción en el clítoris.' },
  { id:'p10', name:'Perrito plano', emoji:'🛏️', diff:'Fácil', cat:'Trasera', pts:5, desc:'Ella completamente boca abajo, él encima. Máximo contacto corporal.', tip:'Ella puede elevar solo las caderas para aumentar la profundidad.' },
  { id:'p11', name:'Cuna', emoji:'🪷', diff:'Media', cat:'Sentada', pts:10, desc:'Él sentado con piernas cruzadas, ella en su regazo mirándolo.', tip:'El movimiento es circular. Los dos pueden abrazarse completamente.' },
  { id:'p12', name:'Arrodillado frente a frente', emoji:'🙏', diff:'Media', cat:'Sentada', pts:10, desc:'Él arrodillado, ella encima a horcajadas mirándolo. Cara a cara.', tip:'Sus manos quedan libres para explorar su cuerpo completamente.' },
  { id:'p13', name:'Al borde', emoji:'🛋️', diff:'Fácil', cat:'Trasera', pts:5, desc:'Ella doblada sobre el brazo del sofá, él detrás de pie. Espontáneo.', tip:'La altura del brazo del sofá determina el ángulo.' },
  { id:'p14', name:'Caderas elevadas', emoji:'🌉', diff:'Fácil', cat:'Variante', pts:5, desc:'Ella boca arriba con caderas sobre almohada firme, él arrodillado.', tip:'Más almohadas cambia el ángulo hacia el punto G.' },
  { id:'p15', name:'La reina', emoji:'👸', diff:'Media', cat:'Oral', pts:10, desc:'Ella se sienta sobre la cara de él para recibir sexo oral.', tip:'Ella controla completamente la presión y el movimiento.' },
  { id:'p16', name:'Bajo el capó', emoji:'🛠️', diff:'Media', cat:'Oral', pts:10, desc:'Él recostado con cabeza colgando al borde, ella en cuclillas sobre su cara.', tip:'La posición invertida reduce tensión en el cuello de él.' },
  { id:'p17', name:'Peepshow', emoji:'🎭', diff:'Media', cat:'Oral', pts:10, desc:'Ella de lado, él perpendicular entre sus piernas para oral desde ángulo diferente.', tip:'Da acceso fácil a estimulación con manos. Ideal para sesiones largas.' },
  { id:'p18', name:'Tabla encima', emoji:'💪', diff:'Difícil', cat:'Trasera', pts:15, desc:'Él en posición de plancha encima de ella. Requiere fuerza de core real.', tip:'Transicionen a rodillas cuando se canse.' },
  { id:'p19', name:'Posición polo', emoji:'🔀', diff:'Media', cat:'Ella arriba', pts:10, desc:'Ella encima montando solo una pierna de él. Ángulo único.', tip:'Ella baja muy cuidadosamente para evitar lesiones.' },
  { id:'p20', name:'Oral inverso', emoji:'🔁', diff:'Media', cat:'Oral', pts:10, desc:'Ella boca abajo, él la estimula oralmente desde atrás.', tip:'Él puede alternarse entre zonas con total libertad de movimiento.' },
  { id:'p21', name:'Suplex oral', emoji:'🌊', diff:'Media', cat:'Oral', pts:10, desc:'Él al borde, ella boca arriba con caderas sobre sus piernas, él se inclina.', tip:'Este ángulo reduce la tensión de cuello de él completamente.' },
  // ── 20 new positions ──
  { id:'p22', name:'Misionero clásico', emoji:'💑', diff:'Fácil', cat:'Misionero', pts:5, desc:'Ella boca arriba, él encima. La posición más íntima y cara a cara que existe.', tip:'Almohada bajo las caderas de ella cambia el ángulo y estimula mejor el punto G.' },
  { id:'p23', name:'El pretzel', emoji:'🥨', diff:'Difícil', cat:'Variante', pts:15, desc:'Ella de lado, él penetra desde atrás pero ambos están parcialmente frente a frente.', tip:'Requiere flexibilidad. Empiecen en cucharita y él gira su torso hacia ella lentamente.' },
  { id:'p24', name:'El puente', emoji:'🌉', diff:'Difícil', cat:'Variante', pts:15, desc:'Ella en posición de puente (arco hacia arriba), él arrodillado frente a ella.', tip:'Ella puede apoyarse en sus hombros. Muy intenso, limitarlo a pocos minutos.' },
  { id:'p25', name:'La silla', emoji:'🪑', diff:'Media', cat:'Sentada', pts:10, desc:'Él sentado en silla sin brazos, ella encima mirándolo. Muy íntimo.', tip:'Permite besos, abrazos y susurros constantes. Ideal para conexión emocional.' },
  { id:'p26', name:'69 mutuo', emoji:'👅', diff:'Media', cat:'Oral', pts:10, desc:'Sexo oral simultáneo. Uno sobre el otro en direcciones opuestas.', tip:'Pueden estar de lado para más comodidad en lugar de uno encima del otro.' },
  { id:'p27', name:'De pie contra la pared', emoji:'🧱', diff:'Media', cat:'De pie', pts:10, desc:'Contra la pared, él detrás de ella. Espontáneo, apasionado e intenso.', tip:'Si hay diferencia de altura, ella puede ponerse de puntitas o usar un escalón.' },
  { id:'p28', name:'El columpio', emoji:'🎡', diff:'Difícil', cat:'Ella arriba', pts:15, desc:'Ella encima en cowgirl pero se inclina hacia atrás apoyándose en las piernas de él.', tip:'Él puede sostener sus caderas para ayudarla a mantener el equilibrio.' },
  { id:'p29', name:'Loto', emoji:'🪷', diff:'Media', cat:'Sentada', pts:10, desc:'Variante de la cuna donde ella envuelve sus piernas alrededor de él. Máxima fusión.', tip:'Movimientos muy sutiles pero la conexión es extremadamente intensa.' },
  { id:'p30', name:'Cucharita con vibrador', emoji:'🥄💜', diff:'Fácil', cat:'Juguetes', pts:5, desc:'Cucharita clásica con vibrador externo para ella. Lo mejor de los dos mundos.', tip:'Él puede controlar el vibrador con la mano libre mientras la abraza.' },
  { id:'p31', name:'El triángulo', emoji:'📐', diff:'Media', cat:'Variante', pts:10, desc:'Ella boca arriba, él de rodillas entre sus piernas pero inclinado hacia adelante en ángulo.', tip:'El ángulo de 45 grados estimula el punto G directamente.' },
  { id:'p32', name:'Reversed spoon', emoji:'🥄🔄', diff:'Fácil', cat:'De lado', pts:5, desc:'Cucharita pero mirándose de frente. Muy íntimo con acceso para besos.', tip:'Ella puede doblar su rodilla de arriba para facilitar la penetración.' },
  { id:'p33', name:'El surfista', emoji:'🏄', diff:'Difícil', cat:'Trasera', pts:15, desc:'Perrito pero él se inclina muy hacia atrás apoyándose en sus talones. Ángulo radical.', tip:'Cambia completamente la estimulación comparado con el perrito normal.' },
  { id:'p34', name:'La tortuga', emoji:'🐢', diff:'Media', cat:'Trasera', pts:10, desc:'Perrito pero ella baja el torso y sube las caderas con rodillas muy juntas.', tip:'Las rodillas juntas cambian el canal y la sensación para los dos.' },
  { id:'p35', name:'El acordeón', emoji:'🎵', diff:'Difícil', cat:'Variante', pts:15, desc:'Ella boca arriba, dobla las rodillas hacia el pecho completamente. Penetración profunda.', tip:'Una almohada bajo la cadera ayuda. Comunicación constante sobre profundidad.' },
  { id:'p36', name:'Amazona', emoji:'🏇', diff:'Media', cat:'Ella arriba', pts:10, desc:'Cowgirl pero ella se inclina completamente hacia adelante, apoyada en sus manos.', tip:'Este ángulo estimula mejor el punto G y el clítoris simultáneamente.' },
  { id:'p37', name:'El arcoíris', emoji:'🌈', diff:'Media', cat:'Oral', pts:10, desc:'Ella boca arriba con caderas al borde, él de pie dando oral. Clásico pero ideal.', tip:'La altura perfecta es que la boca de él quede naturalmente a nivel de sus caderas.' },
  { id:'p38', name:'Vaquero lateral', emoji:'🤠', diff:'Media', cat:'De lado', pts:10, desc:'Ambos de lado, ella encima de él con una pierna entre las suyas. Variante del cowgirl.', tip:'Permite movimiento circular de ella y estimulación de clítoris con facilidad.' },
  { id:'p39', name:'El sultán', emoji:'👘', diff:'Media', cat:'Sentada', pts:10, desc:'Él sentado con piernas estiradas, ella encima mirando hacia él con piernas a los lados.', tip:'Movimiento de vaivén hacia adelante y atrás. Las manos de él completamente libres.' },
  { id:'p40', name:'De pie frente a frente', emoji:'🧍‍♀️🧍', diff:'Media', cat:'De pie', pts:10, desc:'Los dos de pie, frente a frente. Ella levanta una pierna en la cadera de él.', tip:'Una cama o mesa cercana sirve para que ella apoye la pierna a mayor altura.' },
  { id:'p41', name:'El helicóptero', emoji:'🚁', diff:'Difícil', cat:'Ella arriba', pts:15, desc:'Cowgirl invertida donde ella gira 360 grados sin que él salga. El reto final.', tip:'Requiere práctica, calma y mucha comunicación. No hay que apresurarse.' },
];

// ══════════════════════════════════════════════════════
// POSITION SVG ILLUSTRATIONS
// ══════════════════════════════════════════════════════
const PositionSVG = ({ id }) => {
  const svgs = {
    // Ella arriba
    p01: <svg viewBox="0 0 100 70" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="55" rx="30" ry="8" fill="rgba(197,110,140,0.25)"/><circle cx="50" cy="47" r="6" fill="rgba(197,110,140,0.5)"/><ellipse cx="50" cy="25" rx="22" ry="8" fill="rgba(255,255,255,0.2)" transform="rotate(-5,50,25)"/><circle cx="68" cy="20" r="5" fill="rgba(255,255,255,0.4)"/><line x1="28" y1="55" x2="72" y2="55" stroke="rgba(197,110,140,0.3)" strokeWidth="3" strokeLinecap="round"/></svg>,
    // De lado cucharita
    p05: <svg viewBox="0 0 100 70" xmlns="http://www.w3.org/2000/svg"><ellipse cx="42" cy="40" rx="28" ry="9" fill="rgba(255,255,255,0.2)" transform="rotate(-8,42,40)"/><ellipse cx="55" cy="32" rx="22" ry="7" fill="rgba(197,110,140,0.4)" transform="rotate(-8,55,32)"/><circle cx="20" cy="35" r="6" fill="rgba(255,255,255,0.4)"/><circle cx="30" cy="27" r="5" fill="rgba(197,110,140,0.6)"/></svg>,
    // Trasera
    p06: <svg viewBox="0 0 100 70" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="50" rx="30" ry="8" fill="rgba(255,255,255,0.2)"/><ellipse cx="50" cy="35" rx="25" ry="8" fill="rgba(197,110,140,0.4)"/><circle cx="15" cy="48" r="6" fill="rgba(255,255,255,0.4)"/><circle cx="85" cy="30" r="5" fill="rgba(197,110,140,0.5)"/><path d="M50,42 Q50,30 50,30" stroke="rgba(197,110,140,0.3)" strokeWidth="2" fill="none"/></svg>,
    // Misionero
    p22: <svg viewBox="0 0 100 70" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="50" rx="28" ry="9" fill="rgba(255,255,255,0.2)"/><circle cx="78" cy="46" r="6" fill="rgba(255,255,255,0.4)"/><ellipse cx="48" cy="35" rx="26" ry="8" fill="rgba(197,110,140,0.4)"/><circle cx="22" cy="31" r="5" fill="rgba(197,110,140,0.6)"/></svg>,
    // Oral
    p15: <svg viewBox="0 0 100 70" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="55" rx="30" ry="8" fill="rgba(255,255,255,0.2)"/><circle cx="50" cy="46" r="6" fill="rgba(255,255,255,0.4)"/><ellipse cx="50" cy="28" rx="18" ry="7" fill="rgba(197,110,140,0.4)"/><circle cx="50" cy="19" r="5" fill="rgba(197,110,140,0.6)"/></svg>,
  };
  // Default SVG for positions without specific illustration
  const defaultSvg = (
    <svg viewBox="0 0 100 70" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="40" cy="45" rx="25" ry="8" fill="rgba(255,255,255,0.15)" transform="rotate(-10,40,45)"/>
      <ellipse cx="60" cy="30" rx="20" ry="7" fill="rgba(197,110,140,0.35)" transform="rotate(10,60,30)"/>
      <circle cx="18" cy="40" r="5" fill="rgba(255,255,255,0.3)"/>
      <circle cx="80" cy="25" r="5" fill="rgba(197,110,140,0.5)"/>
    </svg>
  );
  return (
    <div style={{width:'100%',height:'80px',display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(255,255,255,0.03)',borderRadius:'12px',overflow:'hidden',marginBottom:'0.5rem'}}>
      {svgs[id] || defaultSvg}
    </div>
  );
};

// ══════════════════════════════════════════════════════
// SETUP SCREENS (same as v5)
// ══════════════════════════════════════════════════════
function SplashScreen({onNext}) {
  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(160deg,#0d0a14,#1a0d2e,#0d0a14)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'2rem',textAlign:'center'}}>
      <div style={{fontSize:'5rem',marginBottom:'1.5rem',filter:'drop-shadow(0 0 24px rgba(197,110,140,0.5))'}}>💑</div>
      <h1 className="font-display" style={{fontSize:'3.2rem',fontWeight:700,color:'#f0e8f8',margin:'0 0 0.5rem',lineHeight:1.1}}>Nosotros Dos</h1>
      <p style={{color:'#c89fd4',fontSize:'1.1rem',margin:'0 0 3.5rem'}}>Tu espacio íntimo en pareja</p>
      <button onClick={onNext} style={{background:'linear-gradient(135deg,#a8456a,#7c3aed)',color:'white',fontFamily:'DM Sans,sans-serif',fontWeight:600,fontSize:'1rem',padding:'1rem 2.5rem',borderRadius:'100px',border:'none',cursor:'pointer'}}>
        Comenzar juntos ✨
      </button>
    </div>
  );
}

function JoinOrCreateScreen({onCreated,onJoined}) {
  const [mode,setMode]=useState(null);
  const [nameA,setNameA]=useState(''); const [nameB,setNameB]=useState('');
  const [code,setCode]=useState('');
  const [loading,setLoading]=useState(false); const [error,setError]=useState('');
  const inp={width:'100%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'14px',padding:'0.875rem 1rem',color:'white',fontFamily:'DM Sans,sans-serif',fontSize:'1rem'};
  const card={background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'20px',padding:'1.5rem',width:'100%',maxWidth:'340px'};
  const handleCreate=async()=>{
    if(!nameA.trim()||!nameB.trim())return;
    setLoading(true);setError('');
    const newCode=generateCode();
    const row=await createCouple(newCode,{A:nameA.trim(),B:nameB.trim()});
    if(!row){setError('Error al crear. Intenta de nuevo.');setLoading(false);return;}
    setLocalCode(newCode);
    onCreated(dbToApp(row),newCode);
  };
  const handleJoin=async()=>{
    if(!code.trim())return;
    setLoading(true);setError('');
    const row=await fetchCouple(code.trim());
    if(!row){setError('Código no encontrado.');setLoading(false);return;}
    setLocalCode(code.trim().toUpperCase());
    onJoined(dbToApp(row),code.trim().toUpperCase());
  };
  if(!mode)return(
    <div style={{minHeight:'100vh',background:'linear-gradient(160deg,#0d0a14,#1a0d2e,#0d0a14)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'2rem',gap:'1rem'}}>
      <div style={{textAlign:'center',marginBottom:'1rem'}}>
        <div style={{fontSize:'3rem',marginBottom:'0.75rem'}}>💝</div>
        <h2 className="font-display" style={{fontSize:'2rem',color:'#f0e8f8',margin:'0 0 0.4rem'}}>¿Cómo quieren empezar?</h2>
        <p style={{color:'rgba(180,150,200,0.7)',fontSize:'0.85rem',margin:0}}>Solo uno crea. El otro se une con el código.</p>
      </div>
      <button onClick={()=>setMode('create')} style={{width:'100%',maxWidth:'300px',background:'linear-gradient(135deg,#a8456a,#7c3aed)',color:'white',fontFamily:'DM Sans,sans-serif',fontWeight:600,fontSize:'1rem',padding:'1rem',borderRadius:'14px',border:'none',cursor:'pointer'}}>✨ Crear nuestra pareja</button>
      <button onClick={()=>setMode('join')} style={{width:'100%',maxWidth:'300px',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',color:'white',fontFamily:'DM Sans,sans-serif',fontWeight:500,fontSize:'1rem',padding:'1rem',borderRadius:'14px',cursor:'pointer'}}>🔗 Unirme con un código</button>
    </div>
  );
  if(mode==='create')return(
    <div style={{minHeight:'100vh',background:'linear-gradient(160deg,#0d0a14,#1a0d2e,#0d0a14)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'2rem'}}>
      <div style={card}>
        <button onClick={()=>setMode(null)} style={{background:'none',border:'none',color:'rgba(200,160,200,0.7)',fontSize:'0.85rem',padding:'0 0 1rem',display:'block',cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>← Volver</button>
        <h3 className="font-display" style={{color:'#f0e8f8',fontSize:'1.5rem',margin:'0 0 1.25rem'}}>Crear pareja ✨</h3>
        {[['👩 Nombre de ella',nameA,setNameA],['👨 Nombre de él',nameB,setNameB]].map(([lbl,val,set])=>(
          <div key={lbl} style={{marginBottom:'0.875rem'}}>
            <label style={{color:'#c89fd4',fontSize:'0.78rem',fontWeight:500,display:'block',marginBottom:'0.4rem'}}>{lbl}</label>
            <input style={inp} placeholder="Nombre..." value={val} onChange={e=>set(e.target.value)} />
          </div>
        ))}
        {error&&<p style={{color:'#f87171',fontSize:'0.8rem',margin:'0.5rem 0'}}>{error}</p>}
        <button onClick={handleCreate} disabled={loading||!nameA.trim()||!nameB.trim()} style={{width:'100%',background:(loading||!nameA.trim()||!nameB.trim())?'rgba(255,255,255,0.08)':'linear-gradient(135deg,#a8456a,#7c3aed)',color:(loading||!nameA.trim()||!nameB.trim())?'rgba(255,255,255,0.3)':'white',fontFamily:'DM Sans,sans-serif',fontWeight:600,fontSize:'1rem',padding:'1rem',borderRadius:'14px',border:'none',cursor:'pointer',marginTop:'0.5rem'}}>
          {loading?<span className="spin">⏳</span>:'Crear y obtener código'}
        </button>
      </div>
    </div>
  );
  return(
    <div style={{minHeight:'100vh',background:'linear-gradient(160deg,#0d0a14,#1a0d2e,#0d0a14)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'2rem'}}>
      <div style={card}>
        <button onClick={()=>setMode(null)} style={{background:'none',border:'none',color:'rgba(200,160,200,0.7)',fontSize:'0.85rem',padding:'0 0 1rem',display:'block',cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>← Volver</button>
        <h3 className="font-display" style={{color:'#f0e8f8',fontSize:'1.5rem',margin:'0 0 0.5rem'}}>Unirme 🔗</h3>
        <p style={{color:'rgba(180,150,200,0.6)',fontSize:'0.82rem',margin:'0 0 1.25rem',lineHeight:1.4}}>Pídele a tu pareja el código de 6 letras</p>
        <input style={{...inp,textTransform:'uppercase',letterSpacing:'0.15em',fontSize:'1.2rem',textAlign:'center'}} placeholder="XXXXXX" maxLength={6} value={code} onChange={e=>setCode(e.target.value.toUpperCase())} />
        {error&&<p style={{color:'#f87171',fontSize:'0.8rem',margin:'0.5rem 0'}}>{error}</p>}
        <button onClick={handleJoin} disabled={loading||code.length<6} style={{width:'100%',background:(loading||code.length<6)?'rgba(255,255,255,0.08)':'linear-gradient(135deg,#a8456a,#7c3aed)',color:(loading||code.length<6)?'rgba(255,255,255,0.3)':'white',fontFamily:'DM Sans,sans-serif',fontWeight:600,fontSize:'1rem',padding:'1rem',borderRadius:'14px',border:'none',cursor:'pointer',marginTop:'0.875rem'}}>
          {loading?<span className="spin">⏳</span>:'Unirme'}
        </button>
      </div>
    </div>
  );
}

function CodeDisplayScreen({code,onContinue}) {
  const [copied,setCopied]=useState(false);
  const copy=()=>{navigator.clipboard?.writeText(code);setCopied(true);setTimeout(()=>setCopied(false),2000);};
  return(
    <div style={{minHeight:'100vh',background:'linear-gradient(160deg,#0d0a14,#1a0d2e,#0d0a14)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'2rem',textAlign:'center'}}>
      <div style={{fontSize:'3rem',marginBottom:'1rem'}}>🎉</div>
      <h2 className="font-display" style={{color:'#f0e8f8',fontSize:'2rem',margin:'0 0 0.5rem'}}>¡Pareja creada!</h2>
      <p style={{color:'rgba(180,150,200,0.7)',fontSize:'0.88rem',margin:'0 0 2rem',maxWidth:'260px',lineHeight:1.5}}>Comparte este código con tu pareja para que se una desde su celular</p>
      <div style={{background:'rgba(197,110,140,0.15)',border:'2px solid rgba(197,110,140,0.4)',borderRadius:'20px',padding:'1.5rem 2.5rem',marginBottom:'1rem'}}>
        <p style={{color:'rgba(200,160,200,0.6)',fontSize:'0.75rem',margin:'0 0 0.5rem'}}>Tu código de pareja</p>
        <p style={{color:'white',fontSize:'2.5rem',fontWeight:700,letterSpacing:'0.2em',margin:0,fontFamily:'DM Sans,sans-serif'}}>{code}</p>
      </div>
      <button onClick={copy} style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',color:'white',fontFamily:'DM Sans,sans-serif',padding:'0.6rem 1.5rem',borderRadius:'100px',fontSize:'0.85rem',marginBottom:'1.5rem',cursor:'pointer'}}>
        {copied?'✓ Copiado':'Copiar código'}
      </button>
      <button onClick={onContinue} style={{background:'linear-gradient(135deg,#a8456a,#7c3aed)',color:'white',fontFamily:'DM Sans,sans-serif',fontWeight:600,fontSize:'1rem',padding:'1rem 2.5rem',borderRadius:'100px',border:'none',cursor:'pointer'}}>
        Continuar →
      </button>
    </div>
  );
}

function PartnerSelectScreen({names,onSelect}) {
  return(
    <div style={{minHeight:'100vh',background:'linear-gradient(160deg,#0d0a14,#1a0d2e,#0d0a14)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'2rem'}}>
      <div style={{textAlign:'center',marginBottom:'2.5rem'}}>
        <div style={{fontSize:'3.5rem',marginBottom:'1rem'}}>💑</div>
        <h2 className="font-display" style={{fontSize:'2rem',color:'#f0e8f8',margin:'0 0 0.4rem'}}>¿Quién está aquí?</h2>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem',width:'100%',maxWidth:'300px'}}>
        {[['A','👩',names.A,'rgba(168,69,106,0.2)','rgba(168,69,106,0.4)'],['B','👨',names.B,'rgba(124,58,237,0.2)','rgba(124,58,237,0.4)']].map(([key,em,name,bg,bdr])=>(
          <button key={key} onClick={()=>onSelect(key)} style={{background:bg,border:`1px solid ${bdr}`,borderRadius:'20px',padding:'1.75rem 1rem',display:'flex',flexDirection:'column',alignItems:'center',gap:'0.75rem',cursor:'pointer'}}>
            <span style={{fontSize:'2.5rem'}}>{em}</span>
            <span style={{color:'white',fontWeight:500,fontFamily:'DM Sans,sans-serif',fontSize:'1rem'}}>{name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// HOME TAB — Weekly progress path
// ══════════════════════════════════════════════════════
function HomeTab({appData,partner,updateData}) {
  const names=appData.names||{A:'Ella',B:'Él'};
  const pts=appData.points||{A:0,B:0};
  const total=(pts.A||0)+(pts.B||0);
  const level=getLevel(total);
  const nextLevel=LEVELS.find(l=>l.min>total);
  const progress=nextLevel?((total-level.min)/(nextLevel.min-level.min))*100:100;
  const pKey=partner==='A'?'B':'A';
  const wp=appData.weeklyPoints||{A:0,B:0,week:0};
  const myWP=wp[partner]||0;
  const theirWP=wp[pKey]||0;
  const maxWP=Math.max(myWP,theirWP,30);
  const expressChallenges=appData.expressChallenges||[];
  const pendingForMe=expressChallenges.filter(c=>c.to===partner&&!c.completed&&!c.expired&&getTimeLeft(c.sentAt)>0);
  const completed=(appData.completedChallenges||[]).length+(appData.completedDates||[]).length+(appData.completedExpress||[]).length;
  const isSunday=new Date().getDay()===0;
  const isBehind=myWP<theirWP;
  const isTied=myWP===theirWP;
  const matches=appData.matches||[];

  // Get current milestone
  const currentMilestone = [...WEEKLY_MILESTONES].reverse().find(m=>myWP>=m.pts)||WEEKLY_MILESTONES[0];
  const nextMilestone = WEEKLY_MILESTONES.find(m=>m.pts>myWP);

  // Match reminder check
  useEffect(()=>{
    const lastActive = getLastActive(appData.couple_code||'');
    const hoursSinceActive = (Date.now()-new Date(lastActive).getTime())/(1000*60*60);
    if(hoursSinceActive>48&&matches.length>0){
      const randomMatch = matches[Math.floor(Math.random()*matches.length)];
      const q = QUESTIONS.find(q=>q.id===randomMatch);
      if(q) sendNotif(`Recuerda: a tu pareja le gustaría "${q.text.replace('¿Te gustaría que tu pareja','').replace('¿Te gustaría','').trim()}" 😏`);
    }
  },[]);

  return(
    <div style={{padding:'1rem',display:'flex',flexDirection:'column',gap:'1rem'}}>

      {/* Sunday penalty */}
      {isSunday&&(
        <div style={{background:isTied?'rgba(139,92,246,0.15)':isBehind?'rgba(239,68,68,0.12)':'rgba(34,197,94,0.1)',border:`1px solid ${isTied?'rgba(139,92,246,0.4)':isBehind?'rgba(239,68,68,0.35)':'rgba(34,197,94,0.3)'}`,borderRadius:'20px',padding:'1.25rem'}} className="fade-up">
          <p style={{color:isTied?'#a78bfa':isBehind?'#f87171':'#4ade80',fontWeight:700,fontSize:'0.9rem',margin:'0 0 0.35rem'}}>
            {isTied?'🤝 ¡Empate!':isBehind?'😏 Esta noche te toca tomar la iniciativa':'🏆 ¡Vas ganando esta semana!'}
          </p>
          <p style={{color:'rgba(220,190,220,0.8)',fontSize:'0.82rem',margin:0,lineHeight:1.4}}>
            {isTied?`Tú ${myWP} pts · ${names[pKey]} ${theirWP} pts · Tienen que acordar cómo será la noche 😉`
            :isBehind?`Tú ${myWP} pts · ${names[pKey]} ${theirWP} pts · La penitencia es clara: pon el ambiente esta noche 🌹`
            :`Tú ${myWP} pts · ${names[pKey]} ${theirWP} pts · ${names[pKey]} tiene que tomar la iniciativa esta noche 👑`}
          </p>
        </div>
      )}

      {/* Level card */}
      <div style={{background:level.gradient,borderRadius:'24px',padding:'1.25rem'}} className="fade-up">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.75rem'}}>
          <div>
            <p style={{color:'rgba(255,255,255,0.7)',fontSize:'0.75rem',margin:'0 0 0.2rem'}}>Nivel de pareja</p>
            <h2 className="font-display" style={{color:'white',fontSize:'1.5rem',margin:0,fontWeight:700}}>{level.emoji} {level.name}</h2>
          </div>
          <div style={{textAlign:'right'}}>
            <p style={{color:'white',fontWeight:700,fontSize:'1.8rem',margin:0,lineHeight:1}}>{total}</p>
            <p style={{color:'rgba(255,255,255,0.7)',fontSize:'0.7rem',margin:0}}>pts totales</p>
          </div>
        </div>
        <div style={{background:'rgba(255,255,255,0.2)',borderRadius:'100px',height:'6px',overflow:'hidden'}}>
          <div style={{background:'rgba(255,255,255,0.9)',height:'100%',width:`${Math.min(progress,100)}%`,borderRadius:'100px'}} />
        </div>
        {nextLevel&&<p style={{color:'rgba(255,255,255,0.65)',fontSize:'0.72rem',margin:'0.4rem 0 0'}}>{nextLevel.min-total} pts para {nextLevel.name}</p>}
      </div>

      {/* Weekly race */}
      <div style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'20px',padding:'1.25rem'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.75rem'}}>
          <p style={{color:'rgba(200,160,200,0.7)',fontSize:'0.78rem',margin:0}}>🏁 Carrera semanal</p>
          <p style={{color:'rgba(200,160,200,0.5)',fontSize:'0.72rem',margin:0}}>Se reinicia cada lunes</p>
        </div>
        {/* Path visualization */}
        <div style={{position:'relative',height:'60px',marginBottom:'0.75rem'}}>
          {/* Road */}
          <div style={{position:'absolute',top:'50%',left:'5%',right:'5%',height:'4px',background:'rgba(255,255,255,0.1)',borderRadius:'100px',transform:'translateY(-50%)'}}>
            {/* Milestones */}
            {WEEKLY_MILESTONES.map((m,i)=>{
              const pct=Math.min((m.pts/250)*100,100);
              return(
                <div key={i} style={{position:'absolute',left:`${pct}%`,top:'50%',transform:'translate(-50%,-50%)'}}>
                  <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'rgba(197,110,140,0.5)',border:'1px solid rgba(197,110,140,0.3)'}} />
                </div>
              );
            })}
            {/* Partner A */}
            <div style={{position:'absolute',left:`${Math.min((wp.A/250)*90,90)}%`,top:'50%',transform:'translate(-50%,-50%)',zIndex:2,transition:'left 0.5s ease'}}>
              <div style={{fontSize:'1.4rem',filter:'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'}}>👩</div>
            </div>
            {/* Partner B */}
            <div style={{position:'absolute',left:`${Math.min((wp.B/250)*90,90)}%`,top:'50%',transform:'translate(-50%,20%)',zIndex:1,transition:'left 0.5s ease'}}>
              <div style={{fontSize:'1.2rem',filter:'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'}}>👨</div>
            </div>
          </div>
          {/* Flag at end */}
          <div style={{position:'absolute',right:'3%',top:'20%',fontSize:'1.2rem'}}>🏆</div>
        </div>
        {/* Milestone text */}
        <p style={{color:currentMilestone.emoji?'#e07b8a':'rgba(200,160,200,0.7)',fontSize:'0.78rem',margin:'0 0 0.5rem',textAlign:'center'}}>
          {currentMilestone.emoji} {currentMilestone.label}
          {nextMilestone&&<span style={{color:'rgba(200,160,200,0.5)'}}> · {nextMilestone.pts-myWP} pts para "{nextMilestone.label}"</span>}
        </p>
        {/* Points comparison */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem'}}>
          {[['A','👩'],['B','👨']].map(([key,em])=>(
            <div key={key} style={{background:key===partner?'rgba(197,110,140,0.12)':'rgba(255,255,255,0.04)',border:`1px solid ${key===partner?'rgba(197,110,140,0.3)':'rgba(255,255,255,0.06)'}`,borderRadius:'12px',padding:'0.6rem',textAlign:'center'}}>
              <span style={{fontSize:'1rem'}}>{em}</span>
              <p style={{color:'white',fontWeight:700,fontSize:'1.1rem',margin:'0.1rem 0 0'}}>{wp[key]||0}</p>
              <p style={{color:'rgba(200,160,200,0.6)',fontSize:'0.68rem',margin:0}}>{names[key]}{key===partner?' · tú':''}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pending express alerts */}
      {pendingForMe.length>0&&(
        <div style={{background:'rgba(234,179,8,0.1)',border:'1px solid rgba(234,179,8,0.3)',borderRadius:'18px',padding:'1rem'}}>
          <h3 style={{color:'#fbbf24',fontWeight:600,fontSize:'0.9rem',margin:'0 0 0.25rem'}}>💪 {names[pKey]} te retó ({pendingForMe.length})</h3>
          <p style={{color:'rgba(220,200,160,0.7)',fontSize:'0.78rem',margin:0}}>Revisa la sección Express para verlos</p>
        </div>
      )}

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'0.75rem'}}>
        {[{v:completed,l:'Completados',e:'🎯'},{v:matches.length,l:'Matches',e:'💞'},{v:(appData.savedPositions||[]).length,l:'Posiciones',e:'📌'}].map(s=>(
          <div key={s.l} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'16px',padding:'0.875rem',textAlign:'center'}}>
            <div style={{fontSize:'1.3rem',marginBottom:'0.2rem'}}>{s.e}</div>
            <p style={{color:'white',fontWeight:700,fontSize:'1.2rem',margin:0}}>{s.v}</p>
            <p style={{color:'rgba(200,160,200,0.7)',fontSize:'0.7rem',margin:'0.15rem 0 0'}}>{s.l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// DISCOVER TAB — no chat, chips visible
// ══════════════════════════════════════════════════════
function DiscoverTab({appData,partner,updateData}) {
  const prefs=appData.preferences?.[partner]||{};
  const answered=Object.keys(prefs);
  const unanswered=QUESTIONS.filter(q=>!answered.includes(q.id));
  const [showAnswered,setShowAnswered]=useState(false);
  const [anim,setAnim]=useState(null);
  const [newMatch,setNewMatch]=useState(null);
  const pKey=partner==='A'?'B':'A';
  const partnerPrefs=appData.preferences?.[pKey]||{};
  const matches=appData.matches||[];
  const names=appData.names||{A:'Ella',B:'Él'};
  const current=unanswered[0];

  const answer=(qId,val)=>{
    if(val!==null)setAnim(val===true?'right':'left');
    setTimeout(()=>{
      const newPrefs={...appData.preferences,[partner]:{...(appData.preferences?.[partner]||{}),[qId]:val}};
      let newMatches=[...matches];let matched=false;
      if(val===true&&partnerPrefs[qId]===true&&!newMatches.includes(qId)){newMatches.push(qId);matched=true;}
      const newWP=addWeeklyPoints(appData,partner,2);
      updateData({preferences:newPrefs,matches:newMatches,weeklyPoints:newWP,points:{...(appData.points||{A:0,B:0}),[partner]:((appData.points?.[partner])||0)+2}});
      if(matched)setNewMatch(qId);
      setAnim(null);
    },180);
  };
  const editPref=(qId,val)=>{
    const newPrefs={...appData.preferences,[partner]:{...(appData.preferences?.[partner]||{}),[qId]:val}};
    let newMatches=(appData.matches||[]).filter(m=>m!==qId);
    if(val===true&&partnerPrefs[qId]===true)newMatches.push(qId);
    updateData({preferences:newPrefs,matches:newMatches});
  };

  if(newMatch){const q=QUESTIONS.find(q=>q.id===newMatch);return(<div style={{minHeight:'60vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'2rem',textAlign:'center'}}><div style={{fontSize:'4rem',marginBottom:'1rem'}} className="pop">💞</div><h2 className="font-display" style={{color:'#e07b8a',fontSize:'2rem',margin:'0 0 0.75rem'}}>¡Match!</h2><p style={{color:'rgba(240,210,240,0.9)',marginBottom:'0.5rem',fontSize:'0.9rem'}}>¡Los dos dijeron que sí a esto!</p><div style={{background:'rgba(197,110,140,0.15)',border:'1px solid rgba(197,110,140,0.3)',borderRadius:'16px',padding:'1rem',margin:'0.5rem 0 1.5rem',maxWidth:'280px'}}><p style={{color:'white',margin:0,fontSize:'0.9rem',lineHeight:1.4}}>{q?.text}</p></div><button onClick={()=>setNewMatch(null)} style={{background:'linear-gradient(135deg,#a8456a,#7c3aed)',color:'white',fontFamily:'DM Sans,sans-serif',fontWeight:600,padding:'0.875rem 2rem',borderRadius:'100px',border:'none',cursor:'pointer'}}>Continuar ✨</button></div>);}

  if(showAnswered){
    const answeredQs=QUESTIONS.filter(q=>answered.includes(q.id));
    const cats=[...new Set(answeredQs.map(q=>q.cat))];
    return(
      <div style={{padding:'1rem'}}>
        <div style={{display:'flex',alignItems:'center',gap:'0.75rem',marginBottom:'0.5rem'}}>
          <button onClick={()=>setShowAnswered(false)} style={{background:'none',border:'none',color:'rgba(200,160,200,0.8)',cursor:'pointer',fontFamily:'DM Sans,sans-serif',fontSize:'0.9rem',padding:0}}>← Volver</button>
          <h3 style={{color:'white',fontWeight:600,margin:0,fontFamily:'DM Sans,sans-serif'}}>Mis respuestas</h3>
        </div>
        <p style={{color:'rgba(200,160,200,0.6)',fontSize:'0.78rem',margin:'0 0 1rem',lineHeight:1.4}}>Puedes cambiar cualquier respuesta. Los matches se actualizan automáticamente.</p>
        {cats.map(cat=>(
          <div key={cat} style={{marginBottom:'1.25rem'}}>
            <p style={{color:'#e07b8a',fontSize:'0.78rem',fontWeight:600,margin:'0 0 0.5rem'}}>{cat}</p>
            {answeredQs.filter(q=>q.cat===cat).map(q=>(
              <div key={q.id} style={{background:'rgba(255,255,255,0.05)',border:`1px solid ${matches.includes(q.id)?'rgba(197,110,140,0.35)':'rgba(255,255,255,0.08)'}`,borderRadius:'14px',padding:'0.75rem 1rem',display:'flex',alignItems:'center',gap:'0.75rem',marginBottom:'0.4rem'}}>
                <div style={{flex:1}}>
                  <p style={{color:'rgba(240,220,240,0.9)',fontSize:'0.82rem',margin:0,lineHeight:1.35}}>{q.text}</p>
                  {matches.includes(q.id)&&<span style={{color:'#e07b8a',fontSize:'0.7rem'}}>💞 Match con {names[pKey]}</span>}
                </div>
                <div style={{display:'flex',gap:'0.3rem',flexShrink:0}}>
                  {[{v:true,e:'✓',c:'#22c55e'},{v:null,e:'?',c:'#eab308'},{v:false,e:'✕',c:'#ef4444'}].map(({v,e,c})=>(
                    <button key={String(v)} onClick={()=>editPref(q.id,v)} style={{width:'28px',height:'28px',borderRadius:'50%',border:'none',cursor:'pointer',fontSize:'0.8rem',background:prefs[q.id]===v?c:'rgba(255,255,255,0.1)',color:prefs[q.id]===v?'white':'rgba(200,170,200,0.5)'}}>{e}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return(
    <div style={{padding:'1rem',display:'flex',flexDirection:'column',minHeight:'calc(100vh - 160px)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.75rem'}}>
        <h2 className="font-display" style={{color:'#f0e8f8',fontSize:'1.5rem',margin:0}}>Descubrir 💫</h2>
        <button onClick={()=>setShowAnswered(true)} style={{background:'none',border:'none',color:'rgba(200,160,200,0.6)',fontFamily:'DM Sans,sans-serif',fontSize:'0.78rem',cursor:'pointer',padding:0}}>Ver respuestas</button>
      </div>
      <div style={{marginBottom:'1.25rem'}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:'0.4rem'}}>
          <span style={{color:'rgba(200,160,200,0.7)',fontSize:'0.75rem'}}>{answered.length}/{QUESTIONS.length} respondidas · +2 pts c/u</span>
          <span style={{color:'#e07b8a',fontSize:'0.75rem'}}>{matches.length} matches 💞</span>
        </div>
        <div style={{background:'rgba(255,255,255,0.08)',borderRadius:'100px',height:'4px',overflow:'hidden'}}>
          <div style={{background:'linear-gradient(90deg,#a8456a,#7c3aed)',height:'100%',width:`${(answered.length/QUESTIONS.length)*100}%`}} />
        </div>
      </div>
      {unanswered.length===0?(
        <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center'}}>
          <div style={{fontSize:'4rem',marginBottom:'1rem'}}>🎉</div>
          <h3 className="font-display" style={{color:'white',fontSize:'1.8rem',margin:'0 0 0.5rem'}}>¡Todo respondido!</h3>
          <p style={{color:'rgba(200,160,200,0.8)',margin:'0 0 1.5rem',fontSize:'0.9rem'}}>Puedes editar tus respuestas cuando quieras</p>
          <p style={{color:'#e07b8a',fontWeight:600,margin:0}}>{matches.length} matches con {names[pKey]} 💞</p>
        </div>
      ):(
        <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
          <div style={{marginBottom:'0.75rem'}}><span style={{background:'rgba(124,58,237,0.2)',border:'1px solid rgba(124,58,237,0.3)',color:'#a78bfa',fontSize:'0.75rem',padding:'0.3rem 0.75rem',borderRadius:'100px'}}>{current?.cat}</span></div>
          <div className={`swipe-card ${anim==='left'?'swipe-left':anim==='right'?'swipe-right':''}`} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'28px',padding:'2.5rem 2rem',textAlign:'center',marginBottom:'2rem',width:'100%',maxWidth:'340px',minHeight:'160px',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <p style={{color:'white',fontSize:'1.1rem',lineHeight:1.5,margin:0}}>{current?.text}</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'0.75rem',width:'100%',maxWidth:'300px'}}>
            {[{v:false,e:'✕',l:'No',bg:'rgba(239,68,68,0.15)',bdr:'rgba(239,68,68,0.35)',col:'#f87171'},{v:null,e:'?',l:'Quizás',bg:'rgba(234,179,8,0.15)',bdr:'rgba(234,179,8,0.35)',col:'#fbbf24'},{v:true,e:'✓',l:'Sí',bg:'rgba(34,197,94,0.15)',bdr:'rgba(34,197,94,0.35)',col:'#4ade80'}].map(({v,e,l,bg,bdr,col})=>(
              <button key={l} onClick={()=>answer(current.id,v)} style={{background:bg,border:`1px solid ${bdr}`,borderRadius:'18px',padding:'1rem 0.5rem',display:'flex',flexDirection:'column',alignItems:'center',gap:'0.3rem',cursor:'pointer'}}>
                <span style={{fontSize:'1.6rem',color:col}}>{e}</span>
                <span style={{color:col,fontSize:'0.8rem',fontWeight:500,fontFamily:'DM Sans,sans-serif'}}>{l}</span>
              </button>
            ))}
          </div>
          <p style={{color:'rgba(200,160,200,0.4)',fontSize:'0.75rem',marginTop:'1rem'}}>{unanswered.length} preguntas restantes</p>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════
// AUDIO PLAYER
// ══════════════════════════════════════════════════════
function AudioPlayer({url}) {
  const [playing,setPlaying]=useState(false);
  const [progress,setProgress]=useState(0);
  const [duration,setDuration]=useState(0);
  const audioRef=useRef(null);
  useEffect(()=>{
    const a=new Audio(url);audioRef.current=a;
    a.addEventListener('loadedmetadata',()=>setDuration(a.duration));
    a.addEventListener('timeupdate',()=>setProgress(a.currentTime/a.duration*100));
    a.addEventListener('ended',()=>{setPlaying(false);setProgress(0);});
    return()=>{a.pause();a.src='';};
  },[url]);
  const toggle=()=>{const a=audioRef.current;if(!a)return;if(playing){a.pause();setPlaying(false);}else{a.play();setPlaying(true);}};
  const fmt=(s)=>{if(!s||isNaN(s))return'0:00';const m=Math.floor(s/60);const sec=Math.floor(s%60);return`${m}:${sec.toString().padStart(2,'0')}`;};
  return(
    <div style={{display:'flex',alignItems:'center',gap:'0.6rem',minWidth:'180px'}}>
      <button onClick={toggle} style={{background:'rgba(255,255,255,0.15)',border:'none',borderRadius:'50%',width:'36px',height:'36px',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:'1rem',flexShrink:0,color:'white'}}>{playing?'⏸':'▶'}</button>
      <div style={{flex:1}}>
        <div style={{background:'rgba(255,255,255,0.2)',borderRadius:'100px',height:'4px',overflow:'hidden',cursor:'pointer'}} onClick={e=>{const rect=e.currentTarget.getBoundingClientRect();const pct=(e.clientX-rect.left)/rect.width;if(audioRef.current)audioRef.current.currentTime=pct*audioRef.current.duration;}}>
          <div style={{background:'white',height:'100%',width:`${progress}%`,borderRadius:'100px',transition:'width 0.1s'}} />
        </div>
        <span style={{color:'rgba(255,255,255,0.6)',fontSize:'0.65rem'}}>{fmt(duration)}</span>
      </div>
    </div>
  );
}
function AudioUrlLoader({path}) {
  const [url,setUrl]=useState(null);
  useEffect(()=>{(async()=>{const {data}=await supabase.storage.from('chat-media').createSignedUrl(path,300);if(data?.signedUrl)setUrl(data.signedUrl);})();},[path]);
  if(!url)return<span style={{color:'rgba(255,255,255,0.5)',fontSize:'0.8rem'}} className="pulse">Cargando audio...</span>;
  return<AudioPlayer url={url} />;
}

// ══════════════════════════════════════════════════════
// CHAT TAB (new standalone tab)
// ══════════════════════════════════════════════════════
function ChatTab({appData,partner,coupleCode,onMarkRead}) {
  const pKey=partner==='A'?'B':'A';
  const names=appData.names||{A:'Ella',B:'Él'};
  const [messages,setMessages]=useState([]);
  const [input,setInput]=useState('');
  const [cited,setCited]=useState(null);
  const [loading,setLoading]=useState(true);
  const [recording,setRecording]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [viewedPhotos,setViewedPhotos]=useState({});
  const bottomRef=useRef(null);
  const inputRef=useRef(null);
  const textareaRef=useRef(null);
  const mediaRecRef=useRef(null);
  const chunksRef=useRef([]);
  const fileInputRef=useRef(null);

  // Discussable questions — chips
  const prefsA=appData.preferences?.A||{};
  const prefsB=appData.preferences?.B||{};
  const discussable=QUESTIONS.filter(q=>{
    const a=prefsA[q.id];const b=prefsB[q.id];
    if(a===false||b===false)return false;
    if(a===undefined&&b===undefined)return false;
    return true;
  });

  useEffect(()=>{
    (async()=>{
      const {data}=await supabase.from('messages').select('*').eq('couple_code',coupleCode).order('created_at',{ascending:true}).limit(100);
      setMessages(data||[]);setLoading(false);
      setLastRead(coupleCode,partner);if(onMarkRead)onMarkRead();
    })();
  },[coupleCode]);

  useEffect(()=>{if(!loading)setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:'smooth'}),100);},[messages,loading]);

  useEffect(()=>{
    const sub=supabase.channel('chat_'+coupleCode+'_'+Date.now())
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:'couple_code=eq.'+coupleCode},(payload)=>{
        setMessages(prev=>prev.find(m=>m.id===payload.new.id)?prev:[...prev,payload.new]);
        setLastRead(coupleCode,partner);if(onMarkRead)onMarkRead();
        if(payload.new.sender!==partner) sendNotif('Nuevo mensaje de tu pareja 😏');
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'messages',filter:'couple_code=eq.'+coupleCode},(payload)=>{
        setMessages(prev=>prev.map(m=>m.id===payload.new.id?payload.new:m));
      }).subscribe();
    return()=>sub.unsubscribe();
  },[coupleCode]);

  // Auto-grow textarea
  const handleInputChange=(e)=>{
    setInput(e.target.value);
    if(textareaRef.current){
      textareaRef.current.style.height='auto';
      textareaRef.current.style.height=Math.min(textareaRef.current.scrollHeight,120)+'px';
    }
  };

  const send=async(extraFields={})=>{
    const text=input.trim();
    if(!text&&!extraFields.media_url)return;
    const msg={couple_code:coupleCode,sender:partner,content:text||'',cited_question_id:cited?.id||null,viewed_by:[partner],...extraFields};
    setInput('');setCited(null);
    if(textareaRef.current){textareaRef.current.style.height='auto';}
    await supabase.from('messages').insert([msg]);
  };

  const cancelRecording=()=>{
    if(mediaRecRef.current&&recording){mediaRecRef.current.onstop=null;mediaRecRef.current.stop();chunksRef.current=[];setRecording(false);}
  };

  const toggleRecording=async()=>{
    if(recording){if(mediaRecRef.current)mediaRecRef.current.stop();setRecording(false);}
    else{
      try{
        const stream=await navigator.mediaDevices.getUserMedia({audio:true});
        const mimeType=MediaRecorder.isTypeSupported('audio/webm;codecs=opus')?'audio/webm;codecs=opus':MediaRecorder.isTypeSupported('audio/webm')?'audio/webm':'audio/mp4';
        const mr=new MediaRecorder(stream,{mimeType});
        chunksRef.current=[];
        mr.ondataavailable=e=>{if(e.data&&e.data.size>0)chunksRef.current.push(e.data);};
        mr.onstop=async()=>{
          stream.getTracks().forEach(t=>t.stop());
          if(chunksRef.current.length===0)return;
          const blob=new Blob(chunksRef.current,{type:mimeType});
          if(blob.size<1000)return;
          setUploading(true);
          const ext=mimeType.includes('webm')?'webm':'mp4';
          const path=`${coupleCode}/${Date.now()}_audio.${ext}`;
          const {error}=await supabase.storage.from('chat-media').upload(path,blob,{contentType:mimeType});
          if(!error)await send({media_url:path,media_type:'audio',content:'🎙️ Nota de voz'});
          setUploading(false);
        };
        mr.start(100);mediaRecRef.current=mr;setRecording(true);
      }catch(e){alert('No se pudo acceder al micrófono. Verifica los permisos.');}
    }
  };

  const handlePhoto=async(e)=>{
    const file=e.target.files?.[0];if(!file)return;
    setUploading(true);
    const ext=file.name.split('.').pop()||'jpg';
    const path=`${coupleCode}/${Date.now()}_photo.${ext}`;
    const {error}=await supabase.storage.from('chat-media').upload(path,file,{contentType:file.type});
    if(!error)await send({media_url:path,media_type:'photo',content:'📷 Foto (ver 1 vez)'});
    setUploading(false);e.target.value='';
  };

  const viewPhoto=async(msg)=>{
    if(viewedPhotos[msg.id])return;
    const {data}=await supabase.storage.from('chat-media').createSignedUrl(msg.media_url,300);
    if(!data?.signedUrl)return;
    setViewedPhotos(prev=>({...prev,[msg.id]:data.signedUrl}));
    const newViewedBy=[...(msg.viewed_by||[])];
    if(!newViewedBy.includes(partner))newViewedBy.push(partner);
    await supabase.from('messages').update({viewed_by:newViewedBy}).eq('id',msg.id);
    if(newViewedBy.includes('A')&&newViewedBy.includes('B'))
      await supabase.storage.from('chat-media').remove([msg.media_url]);
  };

  const renderMsgContent=(msg)=>{
    if(msg.media_type==='audio'){
      if(!msg.media_url)return<span style={{color:'rgba(255,255,255,0.5)',fontSize:'0.8rem'}}>Audio no disponible</span>;
      return<AudioUrlLoader path={msg.media_url} />;
    }
    if(msg.media_type==='photo'){
      const alreadyViewed=(msg.viewed_by||[]).includes(partner);
      const localUrl=viewedPhotos[msg.id];
      if(localUrl)return<div><img src={localUrl} alt="foto" style={{maxWidth:'200px',maxHeight:'200px',borderRadius:'10px',display:'block'}} /><p style={{color:'rgba(255,255,255,0.5)',fontSize:'0.65rem',margin:'0.3rem 0 0'}}>Vista ✓</p></div>;
      if(alreadyViewed&&msg.sender!==partner)return<span style={{color:'rgba(255,255,255,0.5)',fontSize:'0.82rem'}}>📷 Ya viste esta foto</span>;
      if(!alreadyViewed&&msg.sender!==partner)return<button onClick={()=>viewPhoto(msg)} style={{background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.25)',borderRadius:'12px',padding:'0.75rem 1.25rem',color:'white',cursor:'pointer',fontFamily:'DM Sans,sans-serif',fontSize:'0.85rem',fontWeight:500}}>👁️ Ver foto (1 vez)</button>;
      const theyViewed=(msg.viewed_by||[]).includes(pKey);
      return<span style={{color:'rgba(255,255,255,0.8)',fontSize:'0.82rem'}}>📷 Foto enviada {theyViewed?'· Vista ✓':'· Esperando...'}</span>;
    }
    return<span style={{fontSize:'0.9rem',lineHeight:1.4,wordBreak:'break-word'}}>{msg.content}</span>;
  };

  const statusGroups=[
    {key:'match',label:'💞 Los dos dijeron sí'},
    {key:'interest',label:'✨ Uno sí, otro quizás'},
    {key:'maybe',label:'❓ Los dos dijeron quizás'},
  ];
  const qStatus=(q)=>{const a=prefsA[q.id];const b=prefsB[q.id];if(a===true&&b===true)return'match';if(a===true||b===true)return'interest';return'maybe';};

  return(
    <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 130px)'}}>
      {/* Header */}
      <div style={{padding:'0.75rem 1rem 0.5rem',borderBottom:'1px solid rgba(255,255,255,0.06)',flexShrink:0}}>
        <h2 className="font-display" style={{color:'#f0e8f8',fontSize:'1.3rem',margin:'0 0 0.5rem'}}>Conversemos 💬</h2>
        {/* Chips — always visible */}
        {discussable.length>0&&(
          <div className="chips-scroll">
            {statusGroups.map(({key,label})=>{
              const qs=discussable.filter(q=>qStatus(q)===key);
              return qs.map(q=>(
                <button key={q.id} onClick={()=>{setCited(q);inputRef.current?.focus();}} style={{background:cited?.id===q.id?'rgba(197,110,140,0.25)':'rgba(255,255,255,0.07)',border:`1px solid ${cited?.id===q.id?'rgba(197,110,140,0.5)':'rgba(255,255,255,0.1)'}`,borderRadius:'100px',padding:'0.3rem 0.75rem',color:cited?.id===q.id?'#e07b8a':'rgba(200,160,200,0.7)',fontSize:'0.72rem',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0,fontFamily:'DM Sans,sans-serif'}}>
                  {key==='match'?'💞':key==='interest'?'✨':'❓'} {q.text.slice(0,30)}…
                </button>
              ));
            })}
          </div>
        )}
      </div>

      {/* Messages */}
      <div style={{flex:1,overflowY:'auto',padding:'0.75rem 1rem',display:'flex',flexDirection:'column',gap:'0.75rem'}}>
        {loading?(<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%'}}><span style={{color:'rgba(200,160,200,0.5)',fontSize:'0.9rem'}} className="pulse">Cargando...</span></div>)
        :messages.length===0?(<div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',textAlign:'center'}}><div style={{fontSize:'3rem',marginBottom:'0.75rem'}}>💬</div><p style={{color:'rgba(200,160,200,0.7)',margin:'0 0 0.5rem',fontFamily:'DM Sans,sans-serif'}}>¡Empiecen la conversación!</p><p style={{color:'rgba(200,160,200,0.4)',fontSize:'0.82rem',margin:0}}>Texto, notas de voz o fotos de un solo uso</p></div>)
        :messages.map((msg,i)=>{
          const isMe=msg.sender===partner;
          const citedQ=msg.cited_question_id?QUESTIONS.find(q=>q.id===msg.cited_question_id):null;
          const showName=i===0||messages[i-1]?.sender!==msg.sender;
          return(
            <div key={msg.id} style={{display:'flex',flexDirection:'column',alignItems:isMe?'flex-end':'flex-start'}}>
              {showName&&<p style={{color:'rgba(200,160,200,0.5)',fontSize:'0.7rem',margin:'0 0 0.25rem',padding:isMe?'0 0.25rem 0 0':'0 0 0 0.25rem'}}>{names[msg.sender]}</p>}
              <div style={{maxWidth:'82%',display:'flex',flexDirection:'column',alignItems:isMe?'flex-end':'flex-start',gap:'0.2rem'}}>
                {citedQ&&<div style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'0.4rem 0.65rem',fontSize:'0.72rem',color:'rgba(200,160,200,0.7)',lineHeight:1.3}}>💬 {citedQ.text}</div>}
                <div style={{background:isMe?'linear-gradient(135deg,#a8456a,#7c3aed)':'rgba(255,255,255,0.09)',borderRadius:isMe?'18px 18px 4px 18px':'18px 18px 18px 4px',padding:'0.625rem 0.875rem',color:'white'}}>
                  {renderMsgContent(msg)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{padding:'0.5rem 1rem 0.75rem',borderTop:'1px solid rgba(255,255,255,0.06)',flexShrink:0,background:'rgba(13,10,20,0.5)'}}>
        {cited&&(
          <div style={{display:'flex',alignItems:'center',gap:'0.5rem',background:'rgba(197,110,140,0.1)',border:'1px solid rgba(197,110,140,0.25)',borderRadius:'10px',padding:'0.4rem 0.75rem',marginBottom:'0.5rem'}}>
            <span style={{color:'#e07b8a',fontSize:'0.72rem',flex:1,lineHeight:1.3}}>💬 {cited.text}</span>
            <button onClick={()=>setCited(null)} style={{background:'none',border:'none',color:'rgba(200,160,200,0.5)',cursor:'pointer',fontSize:'1rem',padding:0,flexShrink:0}}>✕</button>
          </div>
        )}
        {uploading&&<div style={{textAlign:'center',padding:'0.3rem',color:'#fbbf24',fontSize:'0.78rem'}} className="pulse">Subiendo... ⏳</div>}
        <div style={{display:'flex',gap:'0.4rem',alignItems:'flex-end'}}>
          {/* Camera */}
          <button onClick={()=>fileInputRef.current?.click()} disabled={uploading||recording} style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'50%',width:'40px',height:'40px',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:'1.1rem',flexShrink:0,color:'rgba(200,160,200,0.8)'}}>📷</button>
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{display:'none'}} onChange={handlePhoto} />
          {/* Mic */}
          <button onClick={toggleRecording} disabled={uploading} style={{background:recording?'rgba(239,68,68,0.35)':'rgba(255,255,255,0.07)',border:`1px solid ${recording?'rgba(239,68,68,0.6)':'rgba(255,255,255,0.1)'}`,borderRadius:'50%',width:'40px',height:'40px',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:'1.1rem',flexShrink:0,color:recording?'#f87171':'rgba(200,160,200,0.8)'}}>
            {recording?'⏹':'🎙️'}
          </button>
          {recording&&<button onClick={cancelRecording} style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'50%',width:'40px',height:'40px',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:'1rem',flexShrink:0,color:'rgba(200,160,200,0.6)'}}>🗑️</button>}
          {/* Textarea */}
          <textarea ref={el=>{textareaRef.current=el;inputRef.current=el;}} value={input} onChange={handleInputChange}
            onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}}
            placeholder={recording?'Grabando — ⏹ para enviar · 🗑️ cancelar':'Escribe algo...'}
            disabled={recording}
            rows={1}
            style={{flex:1,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'14px',padding:'0.75rem 1rem',color:'white',fontFamily:'DM Sans,sans-serif',fontSize:'0.9rem',lineHeight:1.4,maxHeight:'120px',overflowY:'auto'}} />
          {/* Send */}
          <button onClick={()=>send()} disabled={!input.trim()||recording||uploading} style={{background:(input.trim()&&!recording&&!uploading)?'linear-gradient(135deg,#a8456a,#7c3aed)':'rgba(255,255,255,0.08)',border:'none',borderRadius:'50%',width:'40px',height:'40px',display:'flex',alignItems:'center',justifyContent:'center',cursor:(input.trim()&&!recording&&!uploading)?'pointer':'default',fontSize:'1rem',flexShrink:0,color:'white',alignSelf:'flex-end'}}>➤</button>
        </div>
        {recording&&<p style={{color:'#f87171',fontSize:'0.72rem',textAlign:'center',margin:'0.3rem 0 0',fontFamily:'DM Sans,sans-serif'}}>🔴 Grabando — ⏹ para enviar · 🗑️ para cancelar</p>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// ENCOUNTER TAB — mood check + rebote de preguntas
// ══════════════════════════════════════════════════════
function EncounterTab({appData,partner,updateData}) {
  const pKey=partner==='A'?'B':'A';
  const names=appData.names||{A:'Ella',B:'Él'};
  const game=appData.encounterGame;
  const [selected,setSelected]=useState(null);

  const startMoodCheck=()=>{
    const seed=Date.now();
    const questions=getEncounterQuestions(seed);
    updateData({encounterGame:{
      active:false,
      moodVotes:{A:null,B:null},
      currentTurn:Math.random()>0.5?'A':'B',
      answers:[],
      questions:questions.map(q=>q.id),
      questionData:questions,
      seed,
      startedAt:new Date().toISOString(),
    }});
  };

  const voteMood=(val)=>{
    const newVotes={...game.moodVotes,[partner]:val};
    const bothYes=newVotes.A===true&&newVotes.B===true;
    const anyNo=newVotes.A===false||newVotes.B===false;
    updateData({encounterGame:{...game,moodVotes:newVotes,active:bothYes,}});
  };

  const answerQuestion=(answer)=>{
    const newAnswers=[...game.answers,{questionId:game.questionData[game.answers.length]?.id,answer,by:partner}];
    const nextTurn=partner==='A'?'B':'A';
    const isComplete=newAnswers.length>=6;
    updateData({encounterGame:{...game,answers:newAnswers,currentTurn:isComplete?null:nextTurn,}});
    setSelected(null);
  };

  const resetGame=()=>updateData({encounterGame:null});

  // No game started
  if(!game)return(
    <div style={{padding:'1rem',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'60vh',textAlign:'center'}}>
      <div style={{fontSize:'4rem',marginBottom:'1rem'}}>🎲</div>
      <h2 className="font-display" style={{color:'#f0e8f8',fontSize:'2rem',margin:'0 0 0.5rem'}}>¿Cómo sería nuestro encuentro?</h2>
      <p style={{color:'rgba(200,160,200,0.7)',fontSize:'0.9rem',margin:'0 0 2rem',maxWidth:'280px',lineHeight:1.5}}>Respondan preguntas por turnos y al final armen juntos el plan perfecto para esta noche</p>
      <button onClick={startMoodCheck} style={{background:'linear-gradient(135deg,#a8456a,#7c3aed)',color:'white',fontFamily:'DM Sans,sans-serif',fontWeight:600,fontSize:'1rem',padding:'1rem 2.5rem',borderRadius:'100px',border:'none',cursor:'pointer'}}>
        ¿Empezamos? 😏
      </button>
    </div>
  );

  // Mood check phase
  if(!game.active){
    const myVote=game.moodVotes?.[partner];
    const theirVote=game.moodVotes?.[pKey];
    const anyNo=game.moodVotes?.A===false||game.moodVotes?.B===false;
    if(anyNo)return(
      <div style={{padding:'1rem',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'60vh',textAlign:'center'}}>
        <div style={{fontSize:'4rem',marginBottom:'1rem'}}>😔</div>
        <h3 className="font-display" style={{color:'white',fontSize:'1.5rem',margin:'0 0 0.5rem'}}>No es el momento</h3>
        <p style={{color:'rgba(200,160,200,0.7)',fontSize:'0.9rem',margin:'0 0 1.5rem'}}>Puede ser en otro momento 🌙</p>
        <button onClick={resetGame} style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',color:'white',fontFamily:'DM Sans,sans-serif',padding:'0.75rem 1.5rem',borderRadius:'100px',cursor:'pointer',fontSize:'0.9rem'}}>Reiniciar</button>
      </div>
    );
    return(
      <div style={{padding:'1rem',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'60vh',textAlign:'center'}}>
        <div style={{fontSize:'3rem',marginBottom:'1rem'}}>😏</div>
        <h3 className="font-display" style={{color:'#f0e8f8',fontSize:'1.75rem',margin:'0 0 0.75rem'}}>¿Estás en el mood para algo hoy?</h3>
        <p style={{color:'rgba(200,160,200,0.6)',fontSize:'0.85rem',margin:'0 0 2rem'}}>Los dos tienen que decir que sí para comenzar</p>
        {myVote===null?(
          <div style={{display:'flex',gap:'1rem'}}>
            <button onClick={()=>voteMood(true)} style={{background:'rgba(34,197,94,0.15)',border:'1px solid rgba(34,197,94,0.4)',borderRadius:'20px',padding:'1.25rem 2rem',display:'flex',flexDirection:'column',alignItems:'center',gap:'0.5rem',cursor:'pointer'}}>
              <span style={{fontSize:'2rem'}}>🔥</span><span style={{color:'#4ade80',fontWeight:600,fontFamily:'DM Sans,sans-serif'}}>Sí, estoy</span>
            </button>
            <button onClick={()=>voteMood(false)} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'20px',padding:'1.25rem 2rem',display:'flex',flexDirection:'column',alignItems:'center',gap:'0.5rem',cursor:'pointer'}}>
              <span style={{fontSize:'2rem'}}>😴</span><span style={{color:'rgba(200,160,200,0.7)',fontFamily:'DM Sans,sans-serif'}}>Ahora no</span>
            </button>
          </div>
        ):(
          <div style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'20px',padding:'1.5rem',maxWidth:'280px'}}>
            <p style={{color:'#4ade80',fontWeight:600,margin:'0 0 0.5rem',fontFamily:'DM Sans,sans-serif'}}>✓ Tú ya respondiste</p>
            <p style={{color:'rgba(200,160,200,0.7)',fontSize:'0.85rem',margin:0}} className="pulse">Esperando a {names[pKey]}...</p>
          </div>
        )}
        <button onClick={resetGame} style={{marginTop:'1.5rem',background:'none',border:'none',color:'rgba(200,160,200,0.4)',cursor:'pointer',fontFamily:'DM Sans,sans-serif',fontSize:'0.82rem'}}>Cancelar</button>
      </div>
    );
  }

  // Game complete — show summary
  if(game.answers?.length>=6||(game.active&&game.currentTurn===null)){
    const qData=game.questionData||[];
    return(
      <div style={{padding:'1rem'}}>
        <div style={{textAlign:'center',marginBottom:'1.25rem'}}>
          <div style={{fontSize:'3rem',marginBottom:'0.5rem'}}>🌙</div>
          <h2 className="font-display" style={{color:'#f0e8f8',fontSize:'1.75rem',margin:'0 0 0.35rem'}}>El plan de esta noche</h2>
          <p style={{color:'rgba(200,160,200,0.6)',fontSize:'0.82rem',margin:0}}>Construido juntos, respuesta a respuesta</p>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:'0.6rem',marginBottom:'1.5rem'}}>
          {(game.answers||[]).map((ans,i)=>{
            const q=qData[i];
            return q?(
              <div key={i} style={{background:'rgba(197,110,140,0.1)',border:'1px solid rgba(197,110,140,0.2)',borderRadius:'16px',padding:'0.875rem 1rem'}}>
                <p style={{color:'rgba(200,160,200,0.6)',fontSize:'0.72rem',margin:'0 0 0.2rem'}}>{q.emoji} {q.label} · respondió {names[ans.by]}</p>
                <p style={{color:'white',fontWeight:500,fontSize:'0.9rem',margin:0,fontFamily:'DM Sans,sans-serif'}}>{ans.answer}</p>
              </div>
            ):null;
          })}
        </div>
        <button onClick={resetGame} style={{width:'100%',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)',color:'white',fontFamily:'DM Sans,sans-serif',fontWeight:500,fontSize:'0.9rem',padding:'0.875rem',borderRadius:'14px',cursor:'pointer'}}>
          Jugar de nuevo 🎲
        </button>
      </div>
    );
  }

  // Game in progress
  const isMyTurn=game.currentTurn===partner;
  const currentQIndex=game.answers?.length||0;
  const currentQ=game.questionData?.[currentQIndex];
  if(!currentQ)return null;

  return(
    <div style={{padding:'1rem'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
        <h2 className="font-display" style={{color:'#f0e8f8',fontSize:'1.4rem',margin:0}}>El plan de esta noche 🌙</h2>
        <span style={{color:'rgba(200,160,200,0.5)',fontSize:'0.75rem'}}>{currentQIndex+1}/6</span>
      </div>
      {/* Progress */}
      <div style={{background:'rgba(255,255,255,0.08)',borderRadius:'100px',height:'4px',overflow:'hidden',marginBottom:'1.25rem'}}>
        <div style={{background:'linear-gradient(90deg,#a8456a,#7c3aed)',height:'100%',width:`${(currentQIndex/6)*100}%`,transition:'width 0.3s'}} />
      </div>
      {/* Previous answers */}
      {(game.answers||[]).length>0&&(
        <div style={{marginBottom:'1rem',display:'flex',flexDirection:'column',gap:'0.4rem'}}>
          {(game.answers||[]).map((ans,i)=>{
            const q=game.questionData?.[i];
            return q?(
              <div key={i} style={{background:'rgba(255,255,255,0.05)',borderRadius:'12px',padding:'0.5rem 0.75rem',display:'flex',gap:'0.5rem'}}>
                <span style={{fontSize:'0.9rem'}}>{q.emoji}</span>
                <p style={{color:'rgba(220,190,220,0.8)',fontSize:'0.78rem',margin:0,lineHeight:1.3}}><span style={{color:'rgba(200,160,200,0.5)'}}>{names[ans.by]}:</span> {ans.answer}</p>
              </div>
            ):null;
          })}
        </div>
      )}
      {isMyTurn?(
        <div className="fade-up">
          <div style={{background:'rgba(197,110,140,0.1)',border:'1px solid rgba(197,110,140,0.25)',borderRadius:'20px',padding:'1.25rem',marginBottom:'1rem',textAlign:'center'}}>
            <span style={{fontSize:'2rem'}}>{currentQ.emoji}</span>
            <h3 style={{color:'white',fontSize:'1.1rem',fontWeight:600,margin:'0.5rem 0 0',fontFamily:'DM Sans,sans-serif'}}>{currentQ.label}</h3>
            <p style={{color:'rgba(200,160,200,0.6)',fontSize:'0.78rem',margin:'0.25rem 0 0'}}>Tu turno · Escoge una opción</p>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
            {currentQ.options.map(opt=>(
              <button key={opt} onClick={()=>answerQuestion(opt)} style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'14px',padding:'0.875rem 1rem',color:'white',fontFamily:'DM Sans,sans-serif',fontSize:'0.9rem',cursor:'pointer',textAlign:'left'}}>
                {opt}
              </button>
            ))}
          </div>
        </div>
      ):(
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'2rem',textAlign:'center'}}>
          <div style={{fontSize:'3rem',marginBottom:'0.75rem'}} className="pulse">⏳</div>
          <p style={{color:'white',fontWeight:500,fontFamily:'DM Sans,sans-serif',margin:'0 0 0.35rem'}}>Le toca a {names[game.currentTurn]}</p>
          <div style={{background:'rgba(255,255,255,0.06)',borderRadius:'14px',padding:'0.875rem 1rem',maxWidth:'260px',marginTop:'0.75rem'}}>
            <span style={{fontSize:'1.2rem'}}>{currentQ.emoji}</span>
            <p style={{color:'rgba(200,160,200,0.7)',fontSize:'0.82rem',margin:'0.25rem 0 0'}}>{currentQ.label}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════
// ANAGRAM TAB
// ══════════════════════════════════════════════════════
function AnagramTab({appData,partner,updateData}) {
  const pKey=partner==='A'?'B':'A';
  const names=appData.names||{A:'Ella',B:'Él'};
  const game=appData.anagramGame;
  const currentWeek=getISOWeek();
  const words=getWeeklyWords();
  const [letters,setLetters]=useState([]);
  const [answer,setAnswer]=useState([]);
  const [wordIdx,setWordIdx]=useState(0);
  const [shakeKey,setShakeKey]=useState(0);
  const [localDone,setLocalDone]=useState(false);
  const [startTime,setStartTime]=useState(null);
  const [elapsed,setElapsed]=useState(0);

  // Reset if new week
  useEffect(()=>{
    if(game&&game.week!==currentWeek){
      updateData({anagramGame:{week:currentWeek,completed:{},started:{}}});
    }
  },[]);

  // Timer
  useEffect(()=>{
    if(!startTime||localDone)return;
    const t=setInterval(()=>setElapsed(Math.floor((Date.now()-startTime)/1000)),1000);
    return()=>clearInterval(t);
  },[startTime,localDone]);

  // Init letters for current word
  useEffect(()=>{
    const word=words[wordIdx];
    if(!word)return;
    const shuffled=shuffleWord(word,currentWeek*31+wordIdx*7+1).split('').map((l,i)=>({id:i,letter:l,used:false}));
    setLetters(shuffled);
    setAnswer([]);
  },[wordIdx,currentWeek]);

  const myGame=game||{week:currentWeek,completed:{},started:{}};
  const myCompleted=myGame.completed?.[partner];
  const theirCompleted=myGame.completed?.[pKey];
  const iStarted=!!myGame.started?.[partner];

  const handleStart=()=>{
    const now=Date.now();
    setStartTime(now);
    const newGame={...myGame,started:{...myGame.started,[partner]:new Date(now).toISOString()}};
    updateData({anagramGame:newGame});
  };

  const pickLetter=(item)=>{
    if(item.used)return;
    setLetters(prev=>prev.map(l=>l.id===item.id?{...l,used:true}:l));
    setAnswer(prev=>[...prev,item]);
  };

  const removeLetter=(item,idx)=>{
    setLetters(prev=>prev.map(l=>l.id===item.id?{...l,used:false}:l));
    setAnswer(prev=>prev.filter((_,i)=>i!==idx));
  };

  const checkAnswer=()=>{
    const word=words[wordIdx];
    const formed=answer.map(a=>a.letter).join('');
    if(formed===word){
      if(wordIdx<words.length-1){
        setWordIdx(wordIdx+1);
      } else {
        // All done!
        const totalTime=Math.floor((Date.now()-startTime)/1000);
        setLocalDone(true);
        const theirTime=myGame.completed?.[pKey]?.time;
        const iWon=!theirTime||totalTime<theirTime;
        const myPts=iWon?20:8;
        const newPts={...(appData.points||{A:0,B:0}),[partner]:((appData.points?.[partner])||0)+myPts};
        const newWP=addWeeklyPoints(appData,partner,myPts);
        const newGame={...myGame,completed:{...myGame.completed,[partner]:{time:totalTime,pts:myPts}}};
        updateData({anagramGame:newGame,points:newPts,weeklyPoints:newWP});
      }
    } else {
      setShakeKey(k=>k+1);
      setAnswer([]);
      setLetters(prev=>prev.map(l=>({...l,used:false})));
    }
  };

  const fmt=(s)=>{const m=Math.floor(s/60);const sec=s%60;return`${m}:${sec.toString().padStart(2,'0')}`;};

  if(!iStarted&&!myCompleted){
    return(
      <div style={{padding:'1rem',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'60vh',textAlign:'center'}}>
        <div style={{fontSize:'4rem',marginBottom:'1rem'}}>🔤</div>
        <h2 className="font-display" style={{color:'#f0e8f8',fontSize:'2rem',margin:'0 0 0.5rem'}}>Anagrama semanal</h2>
        <p style={{color:'rgba(200,160,200,0.7)',fontSize:'0.88rem',margin:'0 0 0.5rem'}}>5 palabras · mismas para los dos · gana quien termine primero</p>
        <p style={{color:'rgba(200,160,200,0.5)',fontSize:'0.78rem',margin:'0 0 2rem'}}>Semana {currentWeek} · Se reinicia cada lunes</p>
        {theirCompleted&&<div style={{background:'rgba(234,179,8,0.1)',border:'1px solid rgba(234,179,8,0.3)',borderRadius:'14px',padding:'0.875rem 1.25rem',marginBottom:'1.25rem'}}>
          <p style={{color:'#fbbf24',fontWeight:600,margin:'0 0 0.2rem',fontSize:'0.88rem'}}>⚡ {names[pKey]} ya terminó</p>
          <p style={{color:'rgba(220,200,160,0.7)',fontSize:'0.78rem',margin:0}}>Lo hizo en {fmt(theirCompleted.time)} · ¡Supéralo!</p>
        </div>}
        <button onClick={handleStart} style={{background:'linear-gradient(135deg,#a8456a,#7c3aed)',color:'white',fontFamily:'DM Sans,sans-serif',fontWeight:600,fontSize:'1rem',padding:'1rem 2.5rem',borderRadius:'100px',border:'none',cursor:'pointer'}}>
          ¡Empezar! 🔤
        </button>
      </div>
    );
  }

  if(myCompleted||localDone){
    const myTime=myCompleted?.time||elapsed;
    const iWon=theirCompleted?myTime<=theirCompleted.time:true;
    const myPts=myCompleted?.pts||8;
    return(
      <div style={{padding:'1rem',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'60vh',textAlign:'center'}}>
        <div style={{fontSize:'4rem',marginBottom:'1rem'}}>{iWon?'🏆':'🥈'}</div>
        <h2 className="font-display" style={{color:'#f0e8f8',fontSize:'2rem',margin:'0 0 0.5rem'}}>{iWon?'¡Ganaste!':'¡Completado!'}</h2>
        <p style={{color:'rgba(200,160,200,0.7)',fontSize:'0.88rem',margin:'0 0 0.5rem'}}>Tu tiempo: {fmt(myTime)}</p>
        <p style={{color:'#d4a017',fontWeight:600,fontSize:'0.9rem',margin:'0 0 1rem'}}>+{myPts} pts</p>
        {theirCompleted?(
          <div style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'14px',padding:'0.875rem 1.25rem',marginBottom:'1rem'}}>
            <p style={{color:'rgba(200,160,200,0.7)',fontSize:'0.82rem',margin:0}}>{names[pKey]}: {fmt(theirCompleted.time)} · +{theirCompleted.pts} pts</p>
          </div>
        ):(
          <div style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'14px',padding:'0.875rem 1.25rem',marginBottom:'1rem'}} className="pulse">
            <p style={{color:'rgba(200,160,200,0.5)',fontSize:'0.82rem',margin:0}}>Esperando a {names[pKey]}...</p>
          </div>
        )}
        <p style={{color:'rgba(200,160,200,0.4)',fontSize:'0.75rem',margin:0}}>Vuelve el próximo lunes para las palabras de la semana siguiente</p>
      </div>
    );
  }

  // Playing
  const currentWord=words[wordIdx];
  return(
    <div style={{padding:'1rem'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
        <div>
          <h2 className="font-display" style={{color:'#f0e8f8',fontSize:'1.4rem',margin:0}}>Anagrama 🔤</h2>
          <p style={{color:'rgba(200,160,200,0.5)',fontSize:'0.75rem',margin:'0.1rem 0 0'}}>Palabra {wordIdx+1} de {words.length}</p>
        </div>
        <div style={{textAlign:'right'}}>
          <p style={{color:'white',fontWeight:700,fontSize:'1.3rem',margin:0,fontFamily:'DM Sans,sans-serif'}}>{fmt(elapsed)}</p>
          {theirCompleted&&<p style={{color:'#fbbf24',fontSize:'0.7rem',margin:0}}>{names[pKey]}: {fmt(theirCompleted.time)}</p>}
        </div>
      </div>
      {/* Progress */}
      <div style={{background:'rgba(255,255,255,0.08)',borderRadius:'100px',height:'4px',overflow:'hidden',marginBottom:'1.5rem'}}>
        <div style={{background:'linear-gradient(90deg,#a8456a,#7c3aed)',height:'100%',width:`${(wordIdx/words.length)*100}%`,transition:'width 0.3s'}} />
      </div>
      {/* Answer area */}
      <div key={shakeKey} style={{minHeight:'56px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'16px',padding:'0.75rem 1rem',display:'flex',flexWrap:'wrap',gap:'0.4rem',marginBottom:'0.75rem',animation:shakeKey>0?'shake 0.3s ease':undefined}}>
        {answer.length===0?<span style={{color:'rgba(200,160,200,0.3)',fontSize:'0.85rem',alignSelf:'center'}}>Toca las letras para formar la palabra...</span>
        :answer.map((item,i)=>(
          <button key={i} onClick={()=>removeLetter(item,i)} style={{background:'linear-gradient(135deg,#a8456a,#7c3aed)',border:'none',borderRadius:'10px',padding:'0.5rem 0.75rem',color:'white',fontWeight:700,fontSize:'1.1rem',cursor:'pointer',fontFamily:'DM Sans,sans-serif',minWidth:'36px'}}>
            {item.letter}
          </button>
        ))}
      </div>
      {/* Letters */}
      <div style={{display:'flex',flexWrap:'wrap',gap:'0.4rem',justifyContent:'center',marginBottom:'1rem'}}>
        {letters.map(item=>(
          <button key={item.id} onClick={()=>pickLetter(item)} disabled={item.used} style={{background:item.used?'rgba(255,255,255,0.04)':'rgba(255,255,255,0.1)',border:`1px solid ${item.used?'rgba(255,255,255,0.06)':'rgba(255,255,255,0.2)'}`,borderRadius:'10px',padding:'0.6rem 0.9rem',color:item.used?'rgba(255,255,255,0.2)':'white',fontWeight:700,fontSize:'1.2rem',cursor:item.used?'default':'pointer',minWidth:'42px',fontFamily:'DM Sans,sans-serif',transition:'all 0.1s'}}>
            {item.letter}
          </button>
        ))}
      </div>
      {/* Actions */}
      <div style={{display:'flex',gap:'0.75rem'}}>
        <button onClick={()=>{setAnswer([]);setLetters(prev=>prev.map(l=>({...l,used:false})));}} style={{flex:1,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'14px',padding:'0.875rem',color:'rgba(200,160,200,0.7)',fontFamily:'DM Sans,sans-serif',cursor:'pointer',fontSize:'0.9rem'}}>
          🔄 Borrar
        </button>
        <button onClick={checkAnswer} disabled={answer.length===0} style={{flex:2,background:answer.length>0?'linear-gradient(135deg,#a8456a,#7c3aed)':'rgba(255,255,255,0.08)',border:'none',borderRadius:'14px',padding:'0.875rem',color:answer.length>0?'white':'rgba(255,255,255,0.3)',fontFamily:'DM Sans,sans-serif',fontWeight:600,cursor:answer.length>0?'pointer':'default',fontSize:'1rem'}}>
          Confirmar ✓
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// CHALLENGES TAB
// ══════════════════════════════════════════════════════
function ChallengesTab({appData,partner,updateData}) {
  const [intensity,setIntensity]=useState('mild');
  const [selected,setSelected]=useState(null);
  const [done2,setDone2]=useState(false);
  const done=appData.completedChallenges||[];
  const total=(appData.points?.A||0)+(appData.points?.B||0);
  const mediumLocked=total<MEDIUM_UNLOCK;
  const hotLocked=total<HOT_UNLOCK;
  const complete=(c)=>{
    if(done.includes(c.id))return;
    const newDone=[...done,c.id];
    const newPts={...(appData.points||{A:0,B:0}),[partner]:((appData.points?.[partner])||0)+c.points};
    const newWP=addWeeklyPoints(appData,partner,c.points);
    updateData({completedChallenges:newDone,points:newPts,weeklyPoints:newWP});
    setDone2(true);
  };
  if(selected){const cfg=ICfg[intensity];return(<div style={{padding:'1rem'}} className="fade-up"><button onClick={()=>{setSelected(null);setDone2(false);}} style={{background:'none',border:'none',color:'rgba(200,160,200,0.8)',cursor:'pointer',fontFamily:'DM Sans,sans-serif',fontSize:'0.9rem',padding:'0 0 1rem',display:'block'}}>← Volver</button><div style={{background:cfg.bg,border:`1px solid ${cfg.border}`,borderRadius:'24px',padding:'1.5rem',marginBottom:'1rem'}}><span style={{color:cfg.accent,fontSize:'0.75rem',fontWeight:500}}>{cfg.emoji} {cfg.label}</span><h2 className="font-display" style={{color:'white',fontSize:'1.75rem',margin:'0.3rem 0 0.75rem',lineHeight:1.2}}>{selected.title}</h2><p style={{color:'rgba(220,190,220,0.9)',lineHeight:1.6,margin:'0 0 1rem',fontSize:'0.95rem'}}>{selected.desc}</p><div style={{display:'flex',gap:'1rem'}}><span style={{color:'#e07b8a',fontSize:'0.8rem'}}>⏱ {selected.time}</span><span style={{color:'#d4a017',fontSize:'0.8rem'}}>+{selected.points} pts</span></div></div>{done.includes(selected.id)||done2?(<div style={{background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.3)',borderRadius:'16px',padding:'1.25rem',textAlign:'center'}}><div style={{fontSize:'2.5rem',marginBottom:'0.5rem'}}>✅</div><p style={{color:'#4ade80',fontWeight:600,margin:0}}>¡Reto completado! +{selected.points} pts</p></div>):(<button onClick={()=>complete(selected)} style={{width:'100%',background:cfg.accent,color:'white',fontFamily:'DM Sans,sans-serif',fontWeight:600,fontSize:'1rem',padding:'1rem',borderRadius:'14px',border:'none',cursor:'pointer'}}>✓ ¡Completado! (+{selected.points} pts)</button>)}</div>);}
  return(<div style={{padding:'1rem'}}><h2 className="font-display" style={{color:'#f0e8f8',fontSize:'1.5rem',margin:'0 0 1rem'}}>Retos 🎯</h2><div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'0.5rem',marginBottom:'1rem'}}>{Object.entries(ICfg).map(([key,cfg])=>{const locked=(key==='medium'&&mediumLocked)||(key==='hot'&&hotLocked);const lockPts=key==='medium'?MEDIUM_UNLOCK:HOT_UNLOCK;return(<button key={key} onClick={()=>{if(locked)return;setIntensity(key);}} style={{background:intensity===key?cfg.accent:(locked?'rgba(255,255,255,0.03)':'rgba(255,255,255,0.07)'),border:`1px solid ${intensity===key?cfg.accent:cfg.border}`,borderRadius:'14px',padding:'0.7rem 0.5rem',display:'flex',flexDirection:'column',alignItems:'center',gap:'0.3rem',cursor:locked?'default':'pointer',opacity:locked?0.5:1}}><span style={{fontSize:'1.2rem'}}>{cfg.emoji}</span><span style={{color:intensity===key?'white':'rgba(200,160,200,0.8)',fontSize:'0.75rem',fontWeight:500,fontFamily:'DM Sans,sans-serif'}}>{cfg.label}</span>{locked&&<span style={{color:'rgba(200,160,200,0.5)',fontSize:'0.62rem'}}>🔒 {lockPts} pts</span>}</button>);})}</div><div style={{display:'flex',flexDirection:'column',gap:'0.6rem'}}>{CHALLENGES[intensity].map(c=>(<button key={c.id} onClick={()=>setSelected(c)} style={{background:done.includes(c.id)?'rgba(255,255,255,0.03)':'rgba(255,255,255,0.06)',border:`1px solid ${ICfg[intensity].border}`,borderRadius:'16px',padding:'1rem',display:'flex',alignItems:'center',justifyContent:'space-between',textAlign:'left',cursor:'pointer',opacity:done.includes(c.id)?0.6:1}}><div style={{flex:1}}><div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}><span style={{color:'white',fontWeight:500,fontSize:'0.9rem',fontFamily:'DM Sans,sans-serif'}}>{c.title}</span>{done.includes(c.id)&&<span style={{color:'#4ade80',fontSize:'0.75rem'}}>✓</span>}</div><p style={{color:'rgba(200,170,200,0.7)',fontSize:'0.78rem',margin:'0.2rem 0 0',lineHeight:1.3}}>{c.desc.slice(0,65)}…</p><div style={{display:'flex',gap:'0.75rem',marginTop:'0.35rem'}}><span style={{color:'rgba(200,160,200,0.5)',fontSize:'0.72rem'}}>{c.time}</span><span style={{color:'#d4a017',fontSize:'0.72rem'}}>+{c.points} pts</span></div></div><span style={{color:'rgba(200,160,200,0.3)',marginLeft:'0.75rem',fontSize:'1.2rem'}}>›</span></button>))}</div></div>);
}

// ══════════════════════════════════════════════════════
// EXPRESS TAB
// ══════════════════════════════════════════════════════
function useCountdown(sentAt) {
  const [ms,setMs]=useState(()=>getTimeLeft(sentAt));
  useEffect(()=>{const t=setInterval(()=>setMs(getTimeLeft(sentAt)),1000);return()=>clearInterval(t);},[sentAt]);
  return ms;
}
function PendingChallengeRow({challenge,item,names,onTap}) {
  const ms=useCountdown(challenge.sentAt);
  const isBonus=(Date.now()-new Date(challenge.sentAt).getTime())<=EXPRESS_BONUS_MS;
  return(
    <button onClick={onTap} style={{background:'rgba(255,255,255,0.06)',border:`1px solid ${isBonus?'rgba(74,222,128,0.35)':'rgba(234,179,8,0.2)'}`,borderRadius:'14px',padding:'0.875rem 1rem',display:'flex',alignItems:'center',justifyContent:'space-between',textAlign:'left',cursor:'pointer'}}>
      <div><p style={{color:'white',fontWeight:500,fontSize:'0.88rem',margin:'0 0 0.2rem',fontFamily:'DM Sans,sans-serif'}}>{item.title}</p><p style={{color:'rgba(200,170,200,0.6)',fontSize:'0.75rem',margin:0}}>De {names[challenge.from]} · {isBonus?`⚡ ¡Bonus x2! ${formatCountdown(ms)}`:`⏱ ${formatCountdown(ms)} restantes`}</p></div>
      <span style={{color:isBonus?'#4ade80':'#fbbf24',fontSize:'1.2rem'}}>›</span>
    </button>
  );
}
function ChallengeReceived({challenge,item,partner,names,completedChallId,onComplete}) {
  const ms=useCountdown(challenge.sentAt);
  const pKey=partner==='A'?'B':'A';
  const isBonus=(Date.now()-new Date(challenge.sentAt).getTime())<=EXPRESS_BONUS_MS;
  if(completedChallId?.id===challenge.id)return(<div style={{background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.3)',borderRadius:'16px',padding:'1.25rem',marginBottom:'1rem',textAlign:'center'}}><div style={{fontSize:'2rem',marginBottom:'0.25rem'}}>{completedChallId.bonus?'⚡🎉':'🎉'}</div><p style={{color:'#4ade80',fontWeight:600,margin:0,fontSize:'0.95rem'}}>{completedChallId.bonus?`¡Bonus x2! +${completedChallId.pts} pts 🔥`:`¡Reto completado! +${completedChallId.pts} pts`}</p></div>);
  return(<div style={{background:isBonus?'rgba(74,222,128,0.1)':'rgba(234,179,8,0.1)',border:`1px solid ${isBonus?'rgba(74,222,128,0.35)':'rgba(234,179,8,0.35)'}`,borderRadius:'16px',padding:'1rem',marginBottom:'1rem'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.5rem'}}><p style={{color:isBonus?'#4ade80':'#fbbf24',fontWeight:600,fontSize:'0.85rem',margin:0}}>💪 {names[challenge.from]} te retó</p><span style={{color:isBonus?'#4ade80':'#fbbf24',fontWeight:700,fontSize:'0.9rem',fontFamily:'DM Sans,sans-serif'}}>{formatCountdown(ms)}</span></div>{isBonus&&<p style={{color:'#4ade80',fontSize:'0.78rem',margin:'0 0 0.75rem',lineHeight:1.3}}>⚡ ¡Estás a tiempo para el doble de puntos!</p>}<button onClick={onComplete} style={{width:'100%',background:isBonus?'linear-gradient(135deg,#15803d,#4ade80)':'linear-gradient(135deg,#d97706,#f59e0b)',color:'white',fontFamily:'DM Sans,sans-serif',fontWeight:600,fontSize:'0.9rem',padding:'0.75rem',borderRadius:'12px',border:'none',cursor:'pointer'}}>✅ Completar {isBonus?`(+${item.points*2} pts x2 ⚡)`:`(+${item.points} pts)`}</button></div>);
}
function ExpressTab({appData,partner,updateData}) {
  const [selected,setSelected]=useState(null);
  const [done2,setDone2]=useState(false);
  const [completedChallId,setCompletedChallId]=useState(null);
  const done=appData.completedExpress||[];
  const expressChallenges=appData.expressChallenges||[];
  const pKey=partner==='A'?'B':'A';
  const names=appData.names||{A:'Ella',B:'Él'};
  useEffect(()=>{
    const expired=expressChallenges.filter(c=>!c.completed&&!c.expired&&c.to===partner&&getTimeLeft(c.sentAt)===0);
    if(expired.length===0)return;
    const newChallenges=expressChallenges.map(c=>expired.find(e=>e.id===c.id)?{...c,expired:true}:c);
    const newPts={...(appData.points||{A:0,B:0})};
    const newWP={...appData.weeklyPoints};
    expired.forEach(c=>{const item=EXPRESS.find(e=>e.id===c.expressId);if(item){newPts[c.from]=(newPts[c.from]||0)+item.points;if(newWP[c.from]!==undefined)newWP[c.from]=(newWP[c.from]||0)+item.points;}});
    updateData({expressChallenges:newChallenges,points:newPts,weeklyPoints:newWP});
  },[]);
  const pendingForMe=expressChallenges.filter(c=>c.to===partner&&!c.completed&&!c.expired&&getTimeLeft(c.sentAt)>0);
  const alreadySentActive=(itemId)=>expressChallenges.some(c=>c.from===partner&&c.expressId===itemId&&!c.completed&&!c.expired&&getTimeLeft(c.sentAt)>0);
  const sendChallenge=(item)=>{
    const nc={id:Date.now()+'_'+Math.random().toString(36).slice(2),expressId:item.id,from:partner,to:pKey,sentAt:new Date().toISOString(),completed:false,expired:false,completedAt:null};
    updateData({expressChallenges:[...expressChallenges,nc]});
    sendNotif(`${names[partner]} te envió un reto express 😏`);
  };
  const completeChallenge=(challenge,item)=>{
    const elapsed=Date.now()-new Date(challenge.sentAt).getTime();
    const isBonus=elapsed<=EXPRESS_BONUS_MS;
    const pts=isBonus?item.points*2:item.points;
    const newChallenges=expressChallenges.map(c=>c.id===challenge.id?{...c,completed:true,completedAt:new Date().toISOString()}:c);
    const newPts={...(appData.points||{A:0,B:0}),[partner]:((appData.points?.[partner])||0)+pts};
    const newWP=addWeeklyPoints(appData,partner,pts);
    updateData({expressChallenges:newChallenges,points:newPts,weeklyPoints:newWP});
    setCompletedChallId({id:challenge.id,pts,bonus:isBonus});
  };
  const complete=(item)=>{
    if(done.includes(item.id))return;
    const newDone=[...done,item.id];
    const newPts={...(appData.points||{A:0,B:0}),[partner]:((appData.points?.[partner])||0)+item.points};
    const newWP=addWeeklyPoints(appData,partner,item.points);
    updateData({completedExpress:newDone,points:newPts,weeklyPoints:newWP});
    setDone2(true);
  };
  if(selected){const pendingChall=pendingForMe.find(c=>c.expressId===selected.id);const sent=alreadySentActive(selected.id);const isCompleted=done.includes(selected.id);return(<div style={{padding:'1rem'}} className="fade-up"><button onClick={()=>{setSelected(null);setDone2(false);setCompletedChallId(null);}} style={{background:'none',border:'none',color:'rgba(200,160,200,0.8)',cursor:'pointer',fontFamily:'DM Sans,sans-serif',fontSize:'0.9rem',padding:'0 0 1rem',display:'block'}}>← Volver</button>{pendingChall&&<ChallengeReceived challenge={pendingChall} item={selected} partner={partner} names={names} completedChallId={completedChallId} onComplete={()=>completeChallenge(pendingChall,selected)} />}<div style={{background:'rgba(234,179,8,0.1)',border:'1px solid rgba(234,179,8,0.3)',borderRadius:'24px',padding:'1.5rem',marginBottom:'1rem'}}><span style={{color:'#fbbf24',fontSize:'0.75rem',fontWeight:500}}>⚡ Express</span><h2 className="font-display" style={{color:'white',fontSize:'1.75rem',margin:'0.3rem 0 0.75rem'}}>{selected.title}</h2><p style={{color:'rgba(220,190,220,0.9)',lineHeight:1.6,margin:'0 0 1rem',fontSize:'0.95rem'}}>{selected.desc}</p><div style={{display:'flex',gap:'1rem',flexWrap:'wrap'}}><span style={{color:'#fbbf24',fontSize:'0.8rem'}}>⏱ {selected.time}</span><span style={{color:'#d4a017',fontSize:'0.8rem'}}>+{selected.points} pts</span><span style={{color:'#4ade80',fontSize:'0.8rem'}}>+{selected.points*2} pts si completas en 10 min ⚡</span></div></div>{!pendingChall&&(<div style={{display:'flex',flexDirection:'column',gap:'0.6rem'}}>{isCompleted||done2?(<div style={{background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.3)',borderRadius:'14px',padding:'1rem',textAlign:'center'}}><p style={{color:'#4ade80',fontWeight:600,margin:0,fontSize:'0.9rem'}}>✅ Ya lo hiciste · +{selected.points} pts</p></div>):(<button onClick={()=>complete(selected)} style={{width:'100%',background:'linear-gradient(135deg,#d97706,#f59e0b)',color:'white',fontFamily:'DM Sans,sans-serif',fontWeight:600,fontSize:'1rem',padding:'1rem',borderRadius:'14px',border:'none',cursor:'pointer'}}>⚡ ¡Lo hice! (+{selected.points} pts)</button>)}{sent?(<div style={{textAlign:'center',padding:'0.75rem',color:'rgba(200,160,200,0.5)',fontSize:'0.85rem',fontFamily:'DM Sans,sans-serif'}}>📨 Reto enviado a {names[pKey]} · esperando respuesta</div>):(<button onClick={()=>sendChallenge(selected)} style={{width:'100%',background:'rgba(197,110,140,0.15)',border:'1px solid rgba(197,110,140,0.35)',color:'#e07b8a',fontFamily:'DM Sans,sans-serif',fontWeight:600,fontSize:'1rem',padding:'1rem',borderRadius:'14px',cursor:'pointer'}}>📨 Retar a {names[pKey]} · tiene 24h</button>)}</div>)}</div>);}
  return(<div style={{padding:'1rem'}}><h2 className="font-display" style={{color:'#f0e8f8',fontSize:'1.5rem',margin:'0 0 0.25rem'}}>Express ⚡</h2><p style={{color:'rgba(200,160,200,0.7)',fontSize:'0.83rem',margin:'0 0 1rem'}}>Para cuando tienen poco tiempo pero quieren provocarse</p>{pendingForMe.length>0&&(<div style={{background:'rgba(234,179,8,0.1)',border:'1px solid rgba(234,179,8,0.3)',borderRadius:'18px',padding:'1rem',marginBottom:'1rem'}}><h3 style={{color:'#fbbf24',fontWeight:600,fontSize:'0.9rem',margin:'0 0 0.75rem'}}>💪 Retos para ti ({pendingForMe.length})</h3><div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>{pendingForMe.map(challenge=>{const item=EXPRESS.find(e=>e.id===challenge.expressId);if(!item)return null;return<PendingChallengeRow key={challenge.id} challenge={challenge} item={item} names={names} onTap={()=>setSelected(item)} />;})}</div></div>)}<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.65rem'}}>{EXPRESS.map(item=>(<button key={item.id} onClick={()=>setSelected(item)} style={{background:done.includes(item.id)?'rgba(255,255,255,0.03)':'rgba(255,255,255,0.06)',border:'1px solid rgba(234,179,8,0.2)',borderRadius:'18px',padding:'1rem',textAlign:'left',cursor:'pointer',opacity:done.includes(item.id)?0.6:1}}><h3 style={{color:'white',fontWeight:500,fontSize:'0.85rem',margin:'0 0 0.35rem',fontFamily:'DM Sans,sans-serif'}}>{item.title}</h3><p style={{color:'rgba(200,170,200,0.7)',fontSize:'0.75rem',margin:'0 0 0.5rem',lineHeight:1.35}}>{item.desc.slice(0,55)}…</p><div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'#fbbf24',fontSize:'0.7rem'}}>{item.time}</span><span style={{color:'#d4a017',fontSize:'0.7rem'}}>+{item.points}</span></div>{done.includes(item.id)&&<div style={{color:'#4ade80',fontSize:'0.68rem',marginTop:'0.25rem'}}>✓ Hecho</div>}{alreadySentActive(item.id)&&<div style={{color:'#e07b8a',fontSize:'0.68rem',marginTop:'0.25rem'}}>📨 Enviado</div>}</button>))}</div></div>);
}

// ══════════════════════════════════════════════════════
// DATES TAB
// ══════════════════════════════════════════════════════
function DatesTab({appData,partner,updateData}) {
  const [selected,setSelected]=useState(null);const [done2,setDone2]=useState(false);const [filter,setFilter]=useState('Todos');
  const done=appData.completedDates||[];const moods=['Todos','Romántico','Divertido','Relajante','Íntimo'];
  const complete=(d)=>{if(done.includes(d.id))return;const newDone=[...done,d.id];const newPts={...(appData.points||{A:0,B:0}),[partner]:((appData.points?.[partner])||0)+d.points};const newWP=addWeeklyPoints(appData,partner,d.points);updateData({completedDates:newDone,points:newPts,weeklyPoints:newWP});setDone2(true);};
  if(selected)return(<div style={{padding:'1rem'}} className="fade-up"><button onClick={()=>{setSelected(null);setDone2(false);}} style={{background:'none',border:'none',color:'rgba(200,160,200,0.8)',cursor:'pointer',fontFamily:'DM Sans,sans-serif',fontSize:'0.9rem',padding:'0 0 1rem',display:'block'}}>← Volver</button><div style={{background:'rgba(197,110,140,0.1)',border:'1px solid rgba(197,110,140,0.25)',borderRadius:'24px',padding:'1.5rem',marginBottom:'1rem',textAlign:'center'}}><div style={{fontSize:'3.5rem',marginBottom:'0.75rem'}}>{selected.emoji}</div><h2 className="font-display" style={{color:'white',fontSize:'1.75rem',margin:'0 0 0.5rem'}}>{selected.title}</h2><p style={{color:'rgba(220,190,220,0.9)',margin:'0 0 0.75rem',fontSize:'0.9rem',lineHeight:1.5}}>{selected.desc}</p><div style={{display:'flex',justifyContent:'center',gap:'1rem'}}><span style={{color:'#e07b8a',fontSize:'0.8rem'}}>⏱ {selected.time}</span><span style={{color:'#a78bfa',fontSize:'0.8rem'}}>{selected.mood}</span><span style={{color:'#d4a017',fontSize:'0.8rem'}}>+{selected.points} pts</span></div></div><div style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'18px',padding:'1.25rem',marginBottom:'1rem'}}><h3 style={{color:'white',fontWeight:600,fontSize:'0.9rem',margin:'0 0 0.75rem',fontFamily:'DM Sans,sans-serif'}}>Cómo hacerlo:</h3>{selected.steps.map((s,i)=>(<div key={i} style={{display:'flex',gap:'0.75rem',marginBottom:'0.6rem',alignItems:'flex-start'}}><span style={{background:'rgba(197,110,140,0.25)',color:'#e07b8a',borderRadius:'50%',width:'22px',height:'22px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.7rem',flexShrink:0,marginTop:'1px'}}>{i+1}</span><p style={{color:'rgba(220,190,220,0.9)',fontSize:'0.83rem',margin:0,lineHeight:1.4}}>{s}</p></div>))}</div>{done.includes(selected.id)||done2?(<div style={{background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.3)',borderRadius:'16px',padding:'1.25rem',textAlign:'center'}}><div style={{fontSize:'2.5rem',marginBottom:'0.5rem'}}>✅</div><p style={{color:'#4ade80',fontWeight:600,margin:0}}>¡Ya tuvieron esta cita!</p></div>):(<button onClick={()=>complete(selected)} style={{width:'100%',background:'linear-gradient(135deg,#a8456a,#c96b8a)',color:'white',fontFamily:'DM Sans,sans-serif',fontWeight:600,fontSize:'1rem',padding:'1rem',borderRadius:'14px',border:'none',cursor:'pointer'}}>✓ ¡La tuvimos! (+{selected.points} pts)</button>)}</div>);
  const filtered=filter==='Todos'?DATES:DATES.filter(d=>d.mood===filter);
  return(<div style={{padding:'1rem'}}><h2 className="font-display" style={{color:'#f0e8f8',fontSize:'1.5rem',margin:'0 0 0.25rem'}}>Citas en Casa 📅</h2><p style={{color:'rgba(200,160,200,0.7)',fontSize:'0.83rem',margin:'0 0 1rem'}}>Momentos especiales sin necesidad de salir</p><div style={{display:'flex',gap:'0.5rem',marginBottom:'1rem',overflowX:'auto',paddingBottom:'0.25rem'}}>{moods.map(m=>(<button key={m} onClick={()=>setFilter(m)} style={{background:filter===m?'#e07b8a':'rgba(255,255,255,0.07)',border:'none',borderRadius:'100px',padding:'0.4rem 0.9rem',color:filter===m?'white':'rgba(200,160,200,0.7)',fontFamily:'DM Sans,sans-serif',fontSize:'0.8rem',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>{m}</button>))}</div><div style={{display:'flex',flexDirection:'column',gap:'0.65rem'}}>{filtered.map(d=>(<button key={d.id} onClick={()=>setSelected(d)} style={{background:done.includes(d.id)?'rgba(255,255,255,0.03)':'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'18px',padding:'1rem',display:'flex',alignItems:'center',gap:'1rem',textAlign:'left',cursor:'pointer',opacity:done.includes(d.id)?0.65:1}}><span style={{fontSize:'2.5rem',flexShrink:0}}>{d.emoji}</span><div style={{flex:1}}><div style={{display:'flex',alignItems:'center',gap:'0.4rem'}}><span style={{color:'white',fontWeight:500,fontFamily:'DM Sans,sans-serif',fontSize:'0.9rem'}}>{d.title}</span>{done.includes(d.id)&&<span style={{color:'#4ade80',fontSize:'0.75rem'}}>✓</span>}</div><p style={{color:'rgba(200,170,200,0.7)',fontSize:'0.78rem',margin:'0.2rem 0 0',lineHeight:1.3}}>{d.desc}</p><div style={{display:'flex',gap:'0.75rem',marginTop:'0.3rem'}}><span style={{color:'rgba(200,160,200,0.5)',fontSize:'0.7rem'}}>{d.time}</span><span style={{color:'#a78bfa',fontSize:'0.7rem'}}>{d.mood}</span><span style={{color:'#d4a017',fontSize:'0.7rem'}}>+{d.points} pts</span></div></div></button>))}</div></div>);
}

// ══════════════════════════════════════════════════════
// POSITIONS TAB — with collection states and SVG
// ══════════════════════════════════════════════════════
function PositionsTab({appData,partner,updateData}) {
  const [selected,setSelected]=useState(null);const [filter,setFilter]=useState('Todas');
  const saved=appData.savedPositions||[];
  const posStatus=appData.positionsStatus||{};
  const cats=['Todas','Guardadas','Probadas',...new Set(POSITIONS.map(p=>p.cat))];
  const diffCol={'Fácil':'#4ade80','Media':'#fbbf24','Difícil':'#f87171'};

  const toggleSave=(id,e)=>{e&&e.stopPropagation();const newSaved=saved.includes(id)?saved.filter(s=>s!==id):[...saved,id];updateData({savedPositions:newSaved});};
  const markTried=(pos,e)=>{
    e&&e.stopPropagation();
    const current=posStatus[pos.id];
    if(current==='tried')return;
    const newStatus={...posStatus,[pos.id]:'tried'};
    const newPts={...(appData.points||{A:0,B:0}),[partner]:((appData.points?.[partner])||0)+pos.pts};
    const newWP=addWeeklyPoints(appData,partner,pos.pts);
    updateData({positionsStatus:newStatus,points:newPts,weeklyPoints:newWP});
  };
  const getStatusIcon=(id)=>{const s=posStatus[id];if(s==='tried')return'✓';if(saved.includes(id))return'❤️';return'🤍';};
  const getStatusColor=(id)=>{const s=posStatus[id];if(s==='tried')return'#4ade80';if(saved.includes(id))return'#e07b8a';return'rgba(200,160,200,0.4)';};

  const filtered=filter==='Todas'?POSITIONS:filter==='Guardadas'?POSITIONS.filter(p=>saved.includes(p.id)):filter==='Probadas'?POSITIONS.filter(p=>posStatus[p.id]==='tried'):POSITIONS.filter(p=>p.cat===filter);
  const triedCount=Object.values(posStatus).filter(v=>v==='tried').length;

  if(selected)return(
    <div style={{padding:'1rem'}} className="fade-up">
      <button onClick={()=>setSelected(null)} style={{background:'none',border:'none',color:'rgba(200,160,200,0.8)',cursor:'pointer',fontFamily:'DM Sans,sans-serif',fontSize:'0.9rem',padding:'0 0 1rem',display:'block'}}>← Volver</button>
      <div style={{background:'rgba(124,58,237,0.1)',border:'1px solid rgba(124,58,237,0.25)',borderRadius:'24px',padding:'1.5rem',marginBottom:'1rem'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.75rem'}}>
          <div>
            <span style={{color:'#a78bfa',fontSize:'0.75rem'}}>{selected.cat}</span>
            <h2 className="font-display" style={{color:'white',fontSize:'1.75rem',margin:'0.2rem 0 0.2rem'}}>{selected.emoji} {selected.name}</h2>
            <span style={{color:diffCol[selected.diff],fontSize:'0.78rem'}}>{selected.diff}</span>
          </div>
          <div style={{display:'flex',gap:'0.5rem'}}>
            <button onClick={e=>toggleSave(selected.id,e)} style={{background:'none',border:'1px solid rgba(255,255,255,0.15)',borderRadius:'50%',width:'36px',height:'36px',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:'1rem'}}>{saved.includes(selected.id)?'❤️':'🤍'}</button>
          </div>
        </div>
        <PositionSVG id={selected.id} />
        <p style={{color:'rgba(220,190,220,0.9)',lineHeight:1.6,margin:'0 0 1rem',fontSize:'0.95rem'}}>{selected.desc}</p>
        <div style={{background:'rgba(124,58,237,0.2)',border:'1px solid rgba(124,58,237,0.3)',borderRadius:'14px',padding:'1rem'}}>
          <p style={{color:'#a78bfa',fontSize:'0.75rem',fontWeight:600,margin:'0 0 0.35rem'}}>💡 Tip:</p>
          <p style={{color:'rgba(220,190,220,0.9)',fontSize:'0.85rem',margin:0,lineHeight:1.45}}>{selected.tip}</p>
        </div>
      </div>
      {posStatus[selected.id]==='tried'?(
        <div style={{background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.3)',borderRadius:'16px',padding:'1rem',textAlign:'center'}}>
          <p style={{color:'#4ade80',fontWeight:600,margin:0}}>✅ ¡Ya la probaron! · +{selected.pts} pts</p>
        </div>
      ):(
        <button onClick={e=>markTried(selected,e)} style={{width:'100%',background:'linear-gradient(135deg,#6d28d9,#8b5cf6)',color:'white',fontFamily:'DM Sans,sans-serif',fontWeight:600,fontSize:'1rem',padding:'1rem',borderRadius:'14px',border:'none',cursor:'pointer'}}>
          ✓ ¡Ya la probamos! (+{selected.pts} pts)
        </button>
      )}
    </div>
  );

  return(
    <div style={{padding:'1rem'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.25rem'}}>
        <h2 className="font-display" style={{color:'#f0e8f8',fontSize:'1.5rem',margin:0}}>Posiciones 💫</h2>
        <div style={{textAlign:'right'}}>
          <p style={{color:'#4ade80',fontWeight:600,fontSize:'0.85rem',margin:0}}>{triedCount}/{POSITIONS.length}</p>
          <p style={{color:'rgba(200,160,200,0.5)',fontSize:'0.7rem',margin:0}}>probadas</p>
        </div>
      </div>
      <p style={{color:'rgba(200,160,200,0.7)',fontSize:'0.83rem',margin:'0 0 1rem'}}>❤️ guardar · ✓ marcar como probada</p>
      {/* Progress bar */}
      <div style={{background:'rgba(255,255,255,0.08)',borderRadius:'100px',height:'4px',overflow:'hidden',marginBottom:'1rem'}}>
        <div style={{background:'linear-gradient(90deg,#6d28d9,#4ade80)',height:'100%',width:`${(triedCount/POSITIONS.length)*100}%`,transition:'width 0.3s'}} />
      </div>
      <div style={{display:'flex',gap:'0.5rem',marginBottom:'1rem',overflowX:'auto',paddingBottom:'0.25rem'}}>
        {cats.map(c=>(
          <button key={c} onClick={()=>setFilter(c)} style={{background:filter===c?'#7c3aed':'rgba(255,255,255,0.07)',border:'none',borderRadius:'100px',padding:'0.4rem 0.9rem',color:filter===c?'white':'rgba(200,160,200,0.7)',fontFamily:'DM Sans,sans-serif',fontSize:'0.8rem',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>
            {c==='Guardadas'?`❤️ Guardadas (${saved.length})`:c==='Probadas'?`✓ Probadas (${triedCount})`:c}
          </button>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.65rem'}}>
        {filtered.map(p=>(
          <button key={p.id} onClick={()=>setSelected(p)} style={{background:posStatus[p.id]==='tried'?'rgba(34,197,94,0.08)':'rgba(255,255,255,0.05)',border:`1px solid ${posStatus[p.id]==='tried'?'rgba(34,197,94,0.25)':'rgba(124,58,237,0.2)'}`,borderRadius:'18px',padding:'1rem',textAlign:'left',cursor:'pointer'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.4rem'}}>
              <span style={{fontSize:'1.5rem'}}>{p.emoji}</span>
              <div style={{display:'flex',gap:'0.3rem'}}>
                <button onClick={e=>markTried(p,e)} style={{background:'none',border:'none',cursor:'pointer',padding:0,fontSize:'0.85rem',color:posStatus[p.id]==='tried'?'#4ade80':'rgba(200,160,200,0.3)'}}>
                  {posStatus[p.id]==='tried'?'✓':'○'}
                </button>
                <button onClick={e=>toggleSave(p.id,e)} style={{background:'none',border:'none',fontSize:'0.85rem',cursor:'pointer',padding:0}}>{saved.includes(p.id)?'❤️':'🤍'}</button>
              </div>
            </div>
            <h3 style={{color:'white',fontWeight:500,fontSize:'0.88rem',margin:'0 0 0.25rem',fontFamily:'DM Sans,sans-serif'}}>{p.name}</h3>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{color:diffCol[p.diff],fontSize:'0.7rem'}}>{p.diff}</span>
              <span style={{color:'#d4a017',fontSize:'0.7rem'}}>+{p.pts} pts</span>
            </div>
          </button>
        ))}
        {filtered.length===0&&<div style={{gridColumn:'1/-1',textAlign:'center',padding:'2rem',color:'rgba(200,160,200,0.5)',fontSize:'0.9rem'}}>Sin resultados aquí todavía</div>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// BOTTOM NAV — 8 tabs
// ══════════════════════════════════════════════════════
function BottomNav({active,onChange,unreadMessages,pendingExpress}) {
  const tabs=[
    {id:'home',   emoji:'🏠', label:'Inicio'},
    {id:'discover',emoji:'💫',label:'Descubrir'},
    {id:'chat',   emoji:'💬', label:'Chat',   badge:unreadMessages},
    {id:'challenges',emoji:'🎯',label:'Retos'},
    {id:'express',emoji:'⚡', label:'Express', badge:pendingExpress},
    {id:'dates',  emoji:'📅', label:'Citas'},
    {id:'positions',emoji:'🔥',label:'Posiciones'},
    {id:'games',  emoji:'🎮', label:'Juegos'},
  ];
  return(
    <div style={{position:'fixed',bottom:0,left:0,right:0,background:'rgba(13,10,20,0.97)',backdropFilter:'blur(12px)',borderTop:'1px solid rgba(255,255,255,0.07)',display:'grid',gridTemplateColumns:'repeat(8,1fr)',zIndex:100}}>
      {tabs.map(t=>(
        <button key={t.id} onClick={()=>onChange(t.id)} style={{padding:'0.5rem 0.1rem',display:'flex',flexDirection:'column',alignItems:'center',gap:'0.1rem',background:'none',border:'none',cursor:'pointer',position:'relative'}}>
          <div style={{position:'relative',display:'inline-flex'}}>
            <span style={{fontSize:'1.1rem',filter:active===t.id?'drop-shadow(0 0 6px rgba(224,123,138,0.6))':'none'}}>{t.emoji}</span>
            {t.badge>0&&<span style={{position:'absolute',top:'-4px',right:'-6px',background:'#ef4444',color:'white',borderRadius:'50%',minWidth:'15px',height:'15px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.55rem',fontWeight:700,lineHeight:1,padding:'0 2px'}}>{t.badge>9?'9+':t.badge}</span>}
          </div>
          <span style={{color:active===t.id?'#e07b8a':'rgba(150,120,160,0.6)',fontSize:'0.55rem',fontFamily:'DM Sans,sans-serif',fontWeight:active===t.id?600:400}}>{t.label}</span>
          {active===t.id&&<div style={{position:'absolute',bottom:0,left:'50%',transform:'translateX(-50%)',width:'4px',height:'4px',borderRadius:'50%',background:'#e07b8a'}} />}
        </button>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════
// GAMES ROUTER
// ══════════════════════════════════════════════════════
function GamesTab({appData,partner,updateData}) {
  const [game,setGame]=useState(null);
  if(game==='encounter')return<EncounterTab appData={appData} partner={partner} updateData={updateData} />;
  if(game==='anagram')return<AnagramTab appData={appData} partner={partner} updateData={updateData} />;
  return(
    <div style={{padding:'1rem'}}>
      <h2 className="font-display" style={{color:'#f0e8f8',fontSize:'1.5rem',margin:'0 0 0.25rem'}}>Juegos 🎮</h2>
      <p style={{color:'rgba(200,160,200,0.7)',fontSize:'0.83rem',margin:'0 0 1.25rem'}}>Actividades para jugar juntos</p>
      <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
        <button onClick={()=>setGame('encounter')} style={{background:'rgba(197,110,140,0.1)',border:'1px solid rgba(197,110,140,0.25)',borderRadius:'20px',padding:'1.25rem',textAlign:'left',cursor:'pointer'}}>
          <div style={{display:'flex',alignItems:'center',gap:'0.75rem',marginBottom:'0.5rem'}}>
            <span style={{fontSize:'2rem'}}>🌙</span>
            <div>
              <h3 style={{color:'white',fontWeight:600,fontSize:'1rem',margin:0,fontFamily:'DM Sans,sans-serif'}}>¿Cómo sería nuestro encuentro?</h3>
              <span style={{color:'rgba(200,160,200,0.6)',fontSize:'0.75rem'}}>Rebote de preguntas · Sin puntos</span>
            </div>
          </div>
          <p style={{color:'rgba(220,190,220,0.7)',fontSize:'0.82rem',margin:0,lineHeight:1.4}}>Respondan preguntas por turnos y armen juntos el plan perfecto para esta noche. Solo los dos lo verán.</p>
        </button>
        <button onClick={()=>setGame('anagram')} style={{background:'rgba(124,58,237,0.1)',border:'1px solid rgba(124,58,237,0.25)',borderRadius:'20px',padding:'1.25rem',textAlign:'left',cursor:'pointer'}}>
          <div style={{display:'flex',alignItems:'center',gap:'0.75rem',marginBottom:'0.5rem'}}>
            <span style={{fontSize:'2rem'}}>🔤</span>
            <div>
              <h3 style={{color:'white',fontWeight:600,fontSize:'1rem',margin:0,fontFamily:'DM Sans,sans-serif'}}>Anagrama semanal</h3>
              <span style={{color:'rgba(200,160,200,0.6)',fontSize:'0.75rem'}}>Ganador: 20 pts · Segundo: 8 pts</span>
            </div>
          </div>
          <p style={{color:'rgba(220,190,220,0.7)',fontSize:'0.82rem',margin:0,lineHeight:1.4}}>5 palabras íntimas revueltas. Las mismas para los dos. Gana quien las descifre todas primero.</p>
          {(appData.anagramGame?.completed?.[partner])&&<p style={{color:'#4ade80',fontSize:'0.78rem',margin:'0.5rem 0 0'}}>✓ Ya completaste esta semana</p>}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════
export default function App() {
  const [screen,setScreen]=useState('loading');
  const [tab,setTab]=useState('home');
  const [partner,setPartner]=useState(null);
  const [appData,setAppData]=useState(null);
  const [coupleCode,setCoupleCode]=useState(null);
  const [pendingCode,setPendingCode]=useState(null);
  const [unreadMessages,setUnreadMessages]=useState(0);
  const subRef=useRef(null);
  const msgSubRef=useRef(null);

  // All hooks before returns
  const markMessagesRead=useCallback(()=>{
    if(coupleCode&&partner){setLastRead(coupleCode,partner);setUnreadMessages(0);}
  },[coupleCode,partner]);

  const updateData=useCallback((updates)=>{
    setAppData(prev=>{
      const next={...prev,...updates};
      if(coupleCode)updateCouple(coupleCode,next);
      return next;
    });
  },[coupleCode]);

  // Load on mount
  useEffect(()=>{
    (async()=>{
      await requestNotifPermission();
      const savedCode=getLocalCode();
      if(savedCode){
        const row=await fetchCouple(savedCode);
        if(row){
          let data=dbToApp(row);
          data=checkWeeklyReset(data);
          setCoupleCode(savedCode);
          setAppData(data);
          // Auto-detect partner
          const savedPartner=getLocalPartner(savedCode);
          if(savedPartner){setPartner(savedPartner);setScreen('app');}
          else setScreen('partner_select');
        } else setScreen('splash');
      } else setScreen('splash');
    })();
  },[]);

  // Realtime subscription for couple data
  useEffect(()=>{
    if(!coupleCode)return;
    if(subRef.current)subRef.current.unsubscribe();
    subRef.current=supabase.channel('couple_'+coupleCode)
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'couples',filter:'couple_code=eq.'+coupleCode},(payload)=>{
        let data=dbToApp(payload.new);
        data=checkWeeklyReset(data);
        setAppData(data);
      }).subscribe();
    return()=>{if(subRef.current)subRef.current.unsubscribe();};
  },[coupleCode]);

  // Unread messages count
  useEffect(()=>{
    if(!coupleCode||!partner)return;
    const checkUnread=async()=>{
      const lastRead=getLastRead(coupleCode,partner);
      const pKey=partner==='A'?'B':'A';
      const {count}=await supabase.from('messages').select('*',{count:'exact',head:true}).eq('couple_code',coupleCode).eq('sender',pKey).gt('created_at',lastRead);
      setUnreadMessages(count||0);
    };
    checkUnread();
    if(msgSubRef.current)msgSubRef.current.unsubscribe();
    msgSubRef.current=supabase.channel('unread_'+coupleCode+'_'+partner)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:'couple_code=eq.'+coupleCode},(payload)=>{
        const pKey=partner==='A'?'B':'A';
        if(payload.new.sender===pKey&&tab!=='chat'){
          setUnreadMessages(prev=>prev+1);
          sendNotif('Nuevo mensaje de tu pareja 😏');
        }
      }).subscribe();
    return()=>{if(msgSubRef.current)msgSubRef.current.unsubscribe();};
  },[coupleCode,partner]);

  // Track activity for match reminder
  useEffect(()=>{
    if(coupleCode)setLastActive(coupleCode);
  },[tab,coupleCode]);

  if(screen==='loading')return<div style={{minHeight:'100vh',background:'#0d0a14',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{fontSize:'3rem'}} className="pulse">💑</div></div>;
  if(screen==='splash')return<SplashScreen onNext={()=>setScreen('join_or_create')} />;
  if(screen==='join_or_create')return<JoinOrCreateScreen onCreated={(data,code)=>{setAppData(data);setCoupleCode(code);setPendingCode(code);setScreen('show_code');}} onJoined={(data,code)=>{setAppData(data);setCoupleCode(code);setScreen('partner_select');}}/>;
  if(screen==='show_code')return<CodeDisplayScreen code={pendingCode} onContinue={()=>setScreen('partner_select')} />;
  if(screen==='partner_select'||!partner)return<PartnerSelectScreen names={appData?.names||{A:'Ella',B:'Él'}} onSelect={(p)=>{setPartner(p);setLocalPartner(coupleCode,p);setScreen('app');setTab('home');}}/>;

  const names=appData?.names||{A:'Ella',B:'Él'};
  const expressChallenges=appData?.expressChallenges||[];
  const pendingExpress=expressChallenges.filter(c=>c.to===partner&&!c.completed&&!c.expired&&getTimeLeft(c.sentAt)>0).length;
  const tabProps={appData,partner,updateData};

  const TABS={
    home:()=><HomeTab {...tabProps} />,
    discover:()=><DiscoverTab {...tabProps} />,
    chat:()=><ChatTab {...tabProps} coupleCode={coupleCode} onMarkRead={markMessagesRead} />,
    challenges:()=><ChallengesTab {...tabProps} />,
    express:()=><ExpressTab {...tabProps} />,
    dates:()=><DatesTab {...tabProps} />,
    positions:()=><PositionsTab {...tabProps} />,
    games:()=><GamesTab {...tabProps} />,
  };

  return(
    <div style={{minHeight:'100vh',background:'linear-gradient(180deg,#0d0a14,#13091f)',color:'white'}}>
      <div style={{position:'sticky',top:0,background:'rgba(13,10,20,0.93)',backdropFilter:'blur(12px)',borderBottom:'1px solid rgba(255,255,255,0.06)',padding:'0.65rem 1rem',display:'flex',alignItems:'center',justifyContent:'space-between',zIndex:50}}>
        <h1 className="font-display" style={{color:'#f0e8f8',fontSize:'1.2rem',margin:0}}>💑 Nosotros Dos</h1>
        <div style={{display:'flex',alignItems:'center',gap:'0.6rem'}}>
          <span style={{color:'rgba(200,160,200,0.45)',fontSize:'0.68rem'}}>{coupleCode}</span>
          {pendingExpress>0&&<span style={{background:'#f59e0b',color:'black',borderRadius:'50%',width:'18px',height:'18px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.65rem',fontWeight:700,flexShrink:0}}>{pendingExpress}</span>}
          <span style={{color:'rgba(200,160,200,0.7)',fontSize:'0.82rem'}}>{names[partner]}</span>
          <button onClick={()=>{setPartner(null);setLocalPartner(coupleCode,'');setScreen('partner_select');}} style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'50%',width:'28px',height:'28px',display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(200,160,200,0.7)',cursor:'pointer',fontSize:'0.85rem'}}>↩</button>
        </div>
      </div>
      <div style={{paddingBottom:'80px',minHeight:'calc(100vh - 56px)',overflowY:'auto'}}>
        {TABS[tab]?.()}
      </div>
      <BottomNav active={tab} onChange={(t)=>{setTab(t);if(t==='chat'){markMessagesRead();}}} unreadMessages={unreadMessages} pendingExpress={pendingExpress} />
    </div>
  );
}
