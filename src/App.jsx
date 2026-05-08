import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ybmcolklhlycemampkgk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlibWNvbGtsaGx5Y2VtYW1wa2drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4ODE4NTMsImV4cCI6MjA4OTQ1Nzg1M30.-wgV1gNB4KuzUjIvryVwzDOCX8J5n2dJ8Dur8cjbJL0";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
  button { font-family: 'DM Sans', sans-serif; }
  button:active { transform: scale(0.97); }
  @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  .fade-up { animation: fadeUp 0.4s ease forwards; }
  @keyframes pop { 0%{transform:scale(1)} 50%{transform:scale(1.3)} 100%{transform:scale(1)} }
  .pop { animation: pop 0.35s ease; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .spin { animation: spin 1s linear infinite; display:inline-block; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
  .pulse { animation: pulse 2s ease infinite; }
  @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
  .shake { animation: shake 0.3s ease; }
  @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
  .bounce { animation: bounce 0.5s ease; }
  .slide-in { animation: slideIn 0.3s ease forwards; }
  @keyframes slideIn { from{transform:translateX(100%)} to{transform:translateX(0)} }
  .chips-row { display:flex; gap:0.4rem; overflow-x:auto; padding-bottom:0.25rem; }
  .chips-row::-webkit-scrollbar { display:none; }
`;
document.head.appendChild(style);

// ── LocalStorage ──
const getLocal = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const setLocal = (k,v) => { try { localStorage.setItem(k,v); } catch {} };
const getLocalCode = () => getLocal("nd_code");
const setLocalCode = (c) => setLocal("nd_code", c);
const getLocalPartner = (c) => getLocal(`nd_partner_${c}`);
const setLocalPartner = (c,p) => setLocal(`nd_partner_${c}`, p);
const getLastRead = (c,p) => getLocal(`nd_lastread_${c}_${p}`) || '1970-01-01';
const setLastRead = (c,p) => setLocal(`nd_lastread_${c}_${p}`, new Date().toISOString());
const getDiceUsed = (c,p) => { const v=getLocal(`nd_dice_${c}_${p}`); return v===new Date().toDateString(); };
const setDiceUsed = (c,p) => setLocal(`nd_dice_${c}_${p}`, new Date().toDateString());

// ── Week helpers ──
const getISOWeek = (d=new Date()) => {
  const date=new Date(d); date.setHours(0,0,0,0);
  date.setDate(date.getDate()+3-(date.getDay()+6)%7);
  const w1=new Date(date.getFullYear(),0,4);
  return 1+Math.round(((date-w1)/86400000-3+(w1.getDay()+6)%7)/7);
};
const getDayOfYear = (d=new Date()) => {
  const start=new Date(d.getFullYear(),0,0);
  return Math.floor((d-start)/86400000);
};
const todayStr = () => new Date().toDateString();

// ── Notifications ──
const requestNotifPermission = async () => {
  if(!('Notification' in window)) return false;
  if(Notification.permission==='granted') return true;
  if(Notification.permission!=='denied') { const p=await Notification.requestPermission(); return p==='granted'; }
  return false;
};
const sendNotif = (body) => {
  if(Notification.permission==='granted') try { new Notification('😏',{body,icon:'/icon.png'}); } catch {}
};

// ── DB ──
const dbToApp = (row) => ({
  names: row.names,
  points: row.points,
  preferences: row.preferences || {A:{},B:{}},
  completedChallenges: row.completed_challenges || [],
  completedDates: row.completed_dates || [],
  completedExpress: row.completed_express || [],
  savedPositions: row.saved_positions || [],
  matches: row.matches || [],
  expressChallenges: row.express_challenges || [],
  weeklyPoints: row.weekly_points || {A:0,B:0,week:0},
  positionsStatus: row.positions_status || {},
  encounterGame: row.encounter_game || null,
  anagramGame: row.anagram_game || null,
  boardState: row.board_state || null,
  dailyQuestion: row.daily_question || null,
});
const appToDb = (data) => ({
  names: data.names,
  points: data.points,
  preferences: data.preferences,
  completed_challenges: data.completedChallenges||[],
  completed_dates: data.completedDates||[],
  completed_express: data.completedExpress||[],
  saved_positions: data.savedPositions||[],
  matches: data.matches||[],
  express_challenges: data.expressChallenges||[],
  weekly_points: data.weeklyPoints||{A:0,B:0,week:0},
  positions_status: data.positionsStatus||{},
  encounter_game: data.encounterGame||null,
  anagram_game: data.anagramGame||null,
  board_state: data.boardState||null,
  daily_question: data.dailyQuestion||null,
  updated_at: new Date().toISOString(),
});
const DEFAULT_DATA = (names) => ({
  names: names||{A:"Ella",B:"Él"},
  points: {A:0,B:0},
  preferences: {A:{},B:{}},
  completedChallenges: [],
  completedDates: [],
  completedExpress: [],
  savedPositions: [],
  matches: [],
  expressChallenges: [],
  weeklyPoints: {A:0,B:0,week:getISOWeek()},
  positionsStatus: {},
  encounterGame: null,
  anagramGame: null,
  boardState: null,
  dailyQuestion: null,
});

async function fetchCouple(code) {
  const {data,error}=await supabase.from("couples").select("*").eq("couple_code",code.toUpperCase()).single();
  if(error) return null; return data;
}
async function createCouple(code,names) {
  const def=DEFAULT_DATA(names);
  const {data,error}=await supabase.from("couples").insert([{couple_code:code.toUpperCase(),...appToDb(def)}]).select().single();
  if(error) return null; return data;
}
async function updateCouple(code,updates) {
  await supabase.from("couples").update({...appToDb(updates)}).eq("couple_code",code.toUpperCase());
}
function generateCode() {
  const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c=""; for(let i=0;i<6;i++) c+=chars[Math.floor(Math.random()*chars.length)];
  return c;
}

// ══════════════════════════════════════════════════════
// BOARD DATA
// ══════════════════════════════════════════════════════
const BOARD_SIZE = 60;
const PTS_PER_SQUARE = 5;

const SQUARE_TYPES = {
  start:      { emoji:'🏁', label:'Inicio',    color:'rgba(255,255,255,0.15)', border:'rgba(255,255,255,0.3)' },
  reto:       { emoji:'🎯', label:'Reto',       color:'rgba(168,69,106,0.25)', border:'rgba(168,69,106,0.5)' },
  express:    { emoji:'⚡', label:'Express',    color:'rgba(234,179,8,0.2)',   border:'rgba(234,179,8,0.45)' },
  encuentro:  { emoji:'🌙', label:'Encuentro',  color:'rgba(124,58,237,0.25)', border:'rgba(124,58,237,0.5)' },
  bonus:      { emoji:'🎁', label:'Bonus',      color:'rgba(34,197,94,0.2)',   border:'rgba(34,197,94,0.45)' },
  penitencia: { emoji:'💀', label:'Penitencia', color:'rgba(220,38,38,0.2)',   border:'rgba(220,38,38,0.45)' },
  neutral:    { emoji:'⭐', label:'',           color:'rgba(255,255,255,0.05)', border:'rgba(255,255,255,0.1)' },
  end:        { emoji:'🏆', label:'¡Meta!',     color:'rgba(212,160,23,0.25)', border:'rgba(212,160,23,0.5)' },
};

// Seeded random
const seededRand = (seed) => { let s=seed; return ()=>{ s=(s*1664525+1013904223)&0xffffffff; return Math.abs(s)/2147483648; }; };

const generateBoard = (week) => {
  const rand = seededRand(week*7919+31337);
  // Distribution: 60 squares total
  const pool = [
    ...Array(12).fill('reto'),
    ...Array(12).fill('express'),
    ...Array(6).fill('encuentro'),
    ...Array(8).fill('bonus'),
    ...Array(8).fill('penitencia'),
    ...Array(12).fill('neutral'),
  ]; // 58 + start + end = 60
  // Shuffle pool
  for(let i=pool.length-1;i>0;i--){
    const j=Math.floor(rand()*(i+1));
    [pool[i],pool[j]]=[pool[j],pool[i]];
  }
  // Ensure no two encounter squares adjacent
  const squares = ['start',...pool,'end'];
  return squares;
};

const getPosition = (points) => Math.floor((points||0)/PTS_PER_SQUARE);

// ── BONUS amounts ──
const BONUS_PTS = [10,15,20,25];
const getBonusPts = (seed) => BONUS_PTS[seed%BONUS_PTS.length];

// ── QUESTIONS (55) ──
const QUESTIONS = [
  {id:'q01',cat:'Exploración del cuerpo ✨',text:'¿Te gustaría que tu pareja te besara el cuello más seguido?'},
  {id:'q02',cat:'Exploración del cuerpo ✨',text:'¿Te gustaría que tu pareja te besara las orejas?'},
  {id:'q03',cat:'Exploración del cuerpo ✨',text:'¿Te gustaría que tu pareja te besara el pecho?'},
  {id:'q04',cat:'Exploración del cuerpo ✨',text:'¿Te gustaría que tu pareja te besara la espalda?'},
  {id:'q05',cat:'Exploración del cuerpo ✨',text:'¿Te gustaría explorar el cuerpo del otro completamente con la boca?'},
  {id:'q06',cat:'Exploración del cuerpo ✨',text:'¿Te gustaría que usaran aceites por todo el cuerpo antes de tener relaciones?'},
  {id:'q07',cat:'Exploración del cuerpo ✨',text:'¿Te gustaría recibir más masajes como parte regular de su intimidad?'},
  {id:'q08',cat:'Exploración del cuerpo ✨',text:'¿Te gustaría que te despertaran con besos por todo el cuerpo?'},
  {id:'q09',cat:'Sexo oral 👄',text:'¿Te gustaría que tu pareja te hiciera más sexo oral?'},
  {id:'q10',cat:'Sexo oral 👄',text:'¿Te gustaría despertar a tu pareja haciéndole sexo oral?'},
  {id:'q11',cat:'Sexo oral 👄',text:'¿Te gustaría que te despertaran haciéndote el amor?'},
  {id:'q12',cat:'Sexo oral 👄',text:'¿Te gustaría explorar el sexo oral mutuo al mismo tiempo (69)?'},
  {id:'q13',cat:'Sexo oral 👄',text:'¿Te gustaría que ella se sentara en tu cara mientras le haces oral?'},
  {id:'q14',cat:'Sexo oral 👄',text:'¿Te gustaría sentarte en la cara de tu pareja mientras te hacen oral?'},
  {id:'q15',cat:'Juguetes 💜',text:'¿Te gustaría usar vibradores mientras tienen relaciones?'},
  {id:'q16',cat:'Juguetes 💜',text:'¿Te gustaría explorar jugueteo anal con juguetes?'},
  {id:'q17',cat:'Juguetes 💜',text:'¿Te gustaría explorar jugueteo anal con diferentes partes del cuerpo?'},
  {id:'q18',cat:'Juguetes 💜',text:'¿Te gustaría explorar la penetración doble con un juguete sexual?'},
  {id:'q19',cat:'Juguetes 💜',text:'¿Te gustaría usar un vibrador de control remoto incluso fuera de casa?'},
  {id:'q20',cat:'Juguetes 💜',text:'¿Te gustaría usar una vela de masaje por el cuerpo?'},
  {id:'q21',cat:'Juguetes 💜',text:'¿Te gustaría usar lubricante de forma habitual durante el sexo?'},
  {id:'q22',cat:'Visual y voyeur 👁️',text:'¿Te gustaría ver a tu pareja masturbarse?'},
  {id:'q23',cat:'Visual y voyeur 👁️',text:'¿Te gustaría que te vieran masturbarte?'},
  {id:'q24',cat:'Visual y voyeur 👁️',text:'¿Te gustaría ver películas porno juntos?'},
  {id:'q25',cat:'Visual y voyeur 👁️',text:'¿Te gustaría tener sexo frente a un espejo?'},
  {id:'q26',cat:'Visual y voyeur 👁️',text:'¿Te gustaría hacer contacto visual sostenido durante el sexo?'},
  {id:'q27',cat:'Visual y voyeur 👁️',text:'¿Te gustaría que te tomaran fotos durante la intimidad?'},
  {id:'q28',cat:'Fotos y grabaciones 📸',text:'¿Te gustaría enviarle nudes a tu pareja?'},
  {id:'q29',cat:'Fotos y grabaciones 📸',text:'¿Te gustaría tomarse fotos sexis como pareja?'},
  {id:'q30',cat:'Fotos y grabaciones 📸',text:'¿Te gustaría tomarse fotos mientras tienen relaciones?'},
  {id:'q31',cat:'Fotos y grabaciones 📸',text:'¿Te gustaría grabarse teniendo relaciones?'},
  {id:'q32',cat:'Seducción y previa 🔥',text:'¿Te gustaría hacerle un striptease a tu pareja?'},
  {id:'q33',cat:'Seducción y previa 🔥',text:'¿Te gustaría que la previa durara hasta que no puedan más?'},
  {id:'q34',cat:'Seducción y previa 🔥',text:'¿Te gustaría sorprender a tu pareja ya lista/listo en la habitación?'},
  {id:'q35',cat:'Seducción y previa 🔥',text:'¿Te gustaría que te despertaran ya con todo preparado para un momento íntimo?'},
  {id:'q36',cat:'Seducción y previa 🔥',text:'¿Te gustaría vestirte con ropa sexy o lencería para tener relaciones?'},
  {id:'q37',cat:'Seducción y previa 🔥',text:'¿Te gustaría hacerle un masaje sensual a tu pareja?'},
  {id:'q38',cat:'Seducción y previa 🔥',text:'¿Te gustaría que te abrazara con las piernas mientras se masturba?'},
  {id:'q39',cat:'Climax 💦',text:'¿Te gustaría que tu pareja se viniera encima de ti?'},
  {id:'q40',cat:'Climax 💦',text:'¿Te gustaría que se vinieran en tu cara?'},
  {id:'q41',cat:'Climax 💦',text:'¿Te gustaría que se vinieran en tu pecho?'},
  {id:'q42',cat:'Climax 💦',text:'¿Te gustaría que se vinieran en tu culo?'},
  {id:'q43',cat:'Climax 💦',text:'¿Te gustaría que te masturbaran después de que ya hayas tenido un orgasmo?'},
  {id:'q44',cat:'Climax 💦',text:'¿Te gustaría masturbarte en la pierna de tu pareja?'},
  {id:'q45',cat:'Espontaneidad 🌍',text:'¿Te gustaría tener relaciones siendo más espontáneos?'},
  {id:'q46',cat:'Espontaneidad 🌍',text:'¿Te gustaría tener relaciones aún vestidos?'},
  {id:'q47',cat:'Espontaneidad 🌍',text:'¿Te gustaría tener sexo en el bosque?'},
  {id:'q48',cat:'Espontaneidad 🌍',text:'¿Te gustaría tener sexo en la playa?'},
  {id:'q49',cat:'Espontaneidad 🌍',text:'¿Te gustaría tener sexo en una terraza?'},
  {id:'q50',cat:'Espontaneidad 🌍',text:'¿Te gustaría tener sexo en el carro a un lado de la carretera?'},
  {id:'q51',cat:'Espontaneidad 🌍',text:'¿Te gustaría nadar desnudos juntos?'},
  {id:'q52',cat:'Comunicación 💬',text:'¿Te gustaría hablar sucio mientras tienen relaciones?'},
  {id:'q53',cat:'Comunicación 💬',text:'¿Te gustaría comer cosas del cuerpo de tu pareja?'},
  {id:'q54',cat:'Comunicación 💬',text:'¿Te gustaría tomarse un baño o ducha juntos que derive en intimidad?'},
  {id:'q55',cat:'Comunicación 💬',text:'¿Te gustaría probar una posición nueva con más frecuencia?'},
];

const getDailyQuestion = (dayOffset=0) => {
  const day=getDayOfYear()+dayOffset;
  return QUESTIONS[day%QUESTIONS.length];
};

// ── ENCOUNTERS ──
const ENCOUNTER_QUESTIONS = [
  {id:'ef1',label:'¿A qué hora?',emoji:'🕐',options:['Por la mañana 🌅','Por la tarde ☀️','Por la noche 🌙']},
  {id:'ef2',label:'¿Dónde?',emoji:'🏠',options:['En la cama 🛏️','En la ducha 🚿','En la sala 🛋️','Donde sea 🔀','Sorpréndeme ✨']},
  {id:'ef3',label:'¿Qué tipo?',emoji:'🔥',options:['Solo foreplay 🌶️','Sexo oral 👄','Con penetración 💜','Todo incluido 🌊','Solo masturbación mutua 🤲']},
  {id:'ef4',label:'¿A qué ritmo?',emoji:'⏱️',options:['Despacio y sin prisa 🐌','Rápido y apasionado ⚡','Empieza suave y termina intenso 🌊']},
  {id:'ef5',label:'¿Con qué ambiente?',emoji:'🕯️',options:['En silencio 🤫','Con música 🎵','Con velas 🕯️','Con todo el ambiente ✨']},
];

// ── CHALLENGES (compact) ──
const CHALLENGES_POOL = [
  {id:'m01',title:'Nota escondida 💌',desc:'Escribe una nota romántica y escóndela para tu pareja',points:10,time:'5 min'},
  {id:'m02',title:'Masaje relajante 🤲',desc:'Dale un masaje de 15 minutos sin pedir nada a cambio',points:10,time:'15 min'},
  {id:'m03',title:'Baño con velas 🛁',desc:'Preparen un baño con velas, espuma y música',points:15,time:'30 min'},
  {id:'m04',title:'Baile en sala 💃',desc:'Bailen juntos con su canción favorita sin excusas',points:10,time:'10 min'},
  {id:'m05',title:'Cena especial 🍷',desc:'Cena con velas, música y sin teléfonos',points:15,time:'60 min'},
  {id:'m06',title:'5 cosas que amo ❤️',desc:'Dile 5 cosas que te encantan físicamente, con detalle',points:10,time:'5 min'},
  {id:'m07',title:'Masaje con aceites 🌺',desc:'Masaje por todo el cuerpo. Turnos de 20 min',points:20,time:'40 min'},
  {id:'m08',title:'Venda y exploración 😶',desc:'Venda en los ojos y explórense con manos y labios',points:20,time:'20 min'},
  {id:'m09',title:'Striptease lento ✨',desc:'Desvístanse mutuamente, muy lentamente',points:20,time:'15 min'},
  {id:'m10',title:'Solo labios 💋',desc:'15 min cada uno explorando al otro solo con los labios',points:25,time:'30 min'},
  {id:'m11',title:'Ducha juntos 🚿',desc:'Con jabón, tiempo y atención total al cuerpo del otro',points:20,time:'20 min'},
  {id:'m12',title:'Nuevo juguete 💜',desc:'Usen un juguete que no hayan probado recientemente',points:30,time:'30+ min'},
  {id:'m13',title:'Frente al espejo 🪞',desc:'Sesión íntima frente a un espejo',points:30,time:'30+ min'},
  {id:'m14',title:'Control total 👑',desc:'Turnos de 20 min: el que manda decide todo',points:30,time:'40 min'},
  {id:'m15',title:'Sorpresa lista 🎁',desc:'Prepara el ambiente y sorpréndela/lo ya listo/a',points:30,time:'Prep 20 min'},
];

const EXPRESS_POOL = [
  {id:'e01',title:'Audio secreto 🎙️',desc:'Mándale un audio provocador para esta noche',points:5,time:'2 min'},
  {id:'e02',title:'El beso cronometrado ⏱️',desc:'Un beso de 60 segundos. Luego siguen como si nada',points:5,time:'1 min'},
  {id:'e03',title:'Al oído 😏',desc:'Susúrrale algo íntimo al oído en cualquier momento',points:5,time:'1 min'},
  {id:'e04',title:'Foto privada 📷',desc:'Una foto sugerente. Solo para él/ella. Sin aviso',points:8,time:'5 min'},
  {id:'e05',title:'Fantasía en 3 frases 💭',desc:'3 oraciones de lo que le harías si tuvieran 1h solos',points:5,time:'3 min'},
  {id:'e06',title:'Elogio físico 🌹',desc:'3 cosas específicas de su cuerpo que te vuelven loco/a',points:5,time:'3 min'},
  {id:'e07',title:'3 palabras 🫦',desc:'3 palabras que lo/la pongan a pensar el resto del día',points:5,time:'2 min'},
  {id:'e08',title:'La mirada 🪞',desc:'Mírale de arriba abajo y di solo: "esta noche..."',points:5,time:'1 min'},
  {id:'e09',title:'Cuenta regresiva ⏰',desc:'"En X minutos quiero que estés en el cuarto." Y cumple.',points:5,time:'1 min'},
  {id:'e10',title:'Toque secreto 🤭',desc:'Tócale íntimamente de forma sutil en un momento cotidiano',points:5,time:'1 min'},
];

const DATES_POOL = [
  {id:'d01',title:'Spa en casa',emoji:'🛁',desc:'Máscaras, aceites, música y vino',points:20},
  {id:'d02',title:'Restaurante en casa',emoji:'🍷',desc:'Delivery favorito con velas y vestidos especial',points:20},
  {id:'d03',title:'Cine + masaje',emoji:'🎬',desc:'El que elige la película da masaje toda la película',points:15},
  {id:'d04',title:'Chefs por una noche',emoji:'👨‍🍳',desc:'Receta nueva que nunca hayan preparado',points:20},
  {id:'d05',title:'Primera cita 2.0',emoji:'💑',desc:'Recrear su primera cita desde casa',points:25},
  {id:'d06',title:'Noche de chimenea',emoji:'🔥',desc:'Cobijas, vino, sin distracciones',points:20},
  {id:'d07',title:'Lectura íntima',emoji:'📚',desc:'Cada uno lee al otro algo erótico o que le guste',points:15},
  {id:'d08',title:'Apuestas íntimas',emoji:'🎰',desc:'Cualquier juego donde las apuestas son íntimas',points:15},
];

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

const POSITIONS = [
  {id:'p01',name:'Cowgirl invertida',emoji:'🔄',diff:'Media',pts:10,cat:'Ella arriba',desc:'Ella arriba mirando hacia los pies de él.',tip:'Apoyarse en los muslos para mayor control.'},
  {id:'p02',name:'Mariposa',emoji:'🦋',diff:'Media',pts:10,cat:'Variante',desc:'Ella al borde de la cama, él de pie.',tip:'Elevar piernas a diferentes alturas cambia el ángulo.'},
  {id:'p03',name:'Piernas al hombro',emoji:'🦵',diff:'Media',pts:10,cat:'Misionero+',desc:'Misionero con las piernas de ella sobre sus hombros.',tip:'Empiecen con una pierna primero.'},
  {id:'p04',name:'Águila',emoji:'🦅',diff:'Media',pts:10,cat:'Misionero+',desc:'Ella boca arriba con piernas muy abiertas.',tip:'Almohada bajo la cadera cambia el ángulo.'},
  {id:'p05',name:'Cuchara profunda',emoji:'🥄',diff:'Fácil',pts:5,cat:'De lado',desc:'Cucharita con la pierna de ella hacia atrás.',tip:'Manos libres para estimulación extra.'},
  {id:'p06',name:'Doggy Style',emoji:'🐕',diff:'Fácil',pts:5,cat:'Trasera',desc:'Ella en cuatro, él detrás. Acceso total.',tip:'Bajar el torso estimula el punto G.'},
  {id:'p07',name:'Superior femenina',emoji:'👑',diff:'Fácil',pts:5,cat:'Ella arriba',desc:'Ella arriba inclinada hacia adelante.',tip:'Más adelante = más fricción en el clítoris.'},
  {id:'p08',name:'Perrito plano',emoji:'🛏️',diff:'Fácil',pts:5,cat:'Trasera',desc:'Ella boca abajo, él encima. Máximo contacto.',tip:'Caderas elevadas aumentan la profundidad.'},
  {id:'p09',name:'La reina',emoji:'👸',diff:'Media',pts:10,cat:'Oral',desc:'Ella se sienta sobre la cara de él.',tip:'Ella controla la presión y el movimiento.'},
  {id:'p10',name:'Cuna',emoji:'🪷',diff:'Media',pts:10,cat:'Sentada',desc:'Él sentado, ella en su regazo mirándolo.',tip:'Movimiento circular. Abrazo total posible.'},
  {id:'p11',name:'Al borde',emoji:'🛋️',diff:'Fácil',pts:5,cat:'Trasera',desc:'Ella sobre el brazo del sofá, él detrás.',tip:'La altura determina el ángulo.'},
  {id:'p12',name:'Misionero clásico',emoji:'💑',diff:'Fácil',pts:5,cat:'Misionero',desc:'El más íntimo. Cara a cara.',tip:'Almohada bajo caderas mejora el ángulo.'},
  {id:'p13',name:'El pretzel',emoji:'🥨',diff:'Difícil',pts:15,cat:'Variante',desc:'Ella de lado, ambos parcialmente frente a frente.',tip:'Empiecen en cucharita y él gira lentamente.'},
  {id:'p14',name:'La silla',emoji:'🪑',diff:'Media',pts:10,cat:'Sentada',desc:'Él en silla, ella encima mirándolo.',tip:'Permite besos y susurros constantes.'},
  {id:'p15',name:'69 mutuo',emoji:'👅',diff:'Media',pts:10,cat:'Oral',desc:'Sexo oral simultáneo en direcciones opuestas.',tip:'De lado es más cómodo que uno encima.'},
  {id:'p16',name:'De pie contra la pared',emoji:'🧱',diff:'Media',pts:10,cat:'De pie',desc:'Contra la pared, él detrás. Espontáneo.',tip:'Puntitas o escalón si hay diferencia de altura.'},
  {id:'p17',name:'Amazona',emoji:'🏇',diff:'Media',pts:10,cat:'Ella arriba',desc:'Cowgirl inclinada completamente hacia adelante.',tip:'Estimula el punto G y el clítoris juntos.'},
  {id:'p18',name:'Loto',emoji:'🪷',diff:'Media',pts:10,cat:'Sentada',desc:'Cuna con piernas envueltas. Máxima fusión.',tip:'Movimientos sutiles pero conexión intensa.'},
  {id:'p19',name:'El triángulo',emoji:'📐',diff:'Media',pts:10,cat:'Variante',desc:'Él de rodillas inclinado en ángulo de 45°.',tip:'Estimula directamente el punto G.'},
  {id:'p20',name:'La tortuga',emoji:'🐢',diff:'Media',pts:10,cat:'Trasera',desc:'Perrito con rodillas juntas de ella.',tip:'Rodillas juntas cambian la sensación para los dos.'},
  {id:'p21',name:'Vaquero lateral',emoji:'🤠',diff:'Media',pts:10,cat:'De lado',desc:'Ella encima de lado, pierna entre las suyas.',tip:'Movimiento circular y clítoris accesible.'},
];

// ══════════════════════════════════════════════════════
// SETUP SCREENS
// ══════════════════════════════════════════════════════
function SplashScreen({onNext}) {
  return(
    <div style={{minHeight:'100vh',background:'linear-gradient(160deg,#0d0a14,#1a0d2e)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'2rem',textAlign:'center'}}>
      <div style={{fontSize:'5rem',marginBottom:'1.5rem',filter:'drop-shadow(0 0 24px rgba(197,110,140,0.5))'}}>💑</div>
      <h1 className="font-display" style={{fontSize:'3.2rem',fontWeight:700,color:'#f0e8f8',margin:'0 0 0.5rem',lineHeight:1.1}}>Nosotros Dos</h1>
      <p style={{color:'#c89fd4',fontSize:'1.1rem',margin:'0 0 3.5rem'}}>Tu espacio íntimo en pareja</p>
      <button onClick={onNext} style={{background:'linear-gradient(135deg,#a8456a,#7c3aed)',color:'white',fontWeight:600,fontSize:'1rem',padding:'1rem 2.5rem',borderRadius:'100px',border:'none',cursor:'pointer'}}>Comenzar juntos ✨</button>
    </div>
  );
}
function JoinOrCreateScreen({onCreated,onJoined}) {
  const [mode,setMode]=useState(null);
  const [nameA,setNameA]=useState('');const [nameB,setNameB]=useState('');
  const [code,setCode]=useState('');const [loading,setLoading]=useState(false);const [error,setError]=useState('');
  const inp={width:'100%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'14px',padding:'0.875rem 1rem',color:'white',fontSize:'1rem'};
  const card={background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'20px',padding:'1.5rem',width:'100%',maxWidth:'340px'};
  const handleCreate=async()=>{if(!nameA.trim()||!nameB.trim())return;setLoading(true);setError('');const c=generateCode();const row=await createCouple(c,{A:nameA.trim(),B:nameB.trim()});if(!row){setError('Error al crear. Intenta de nuevo.');setLoading(false);return;}setLocalCode(c);onCreated(dbToApp(row),c);};
  const handleJoin=async()=>{if(!code.trim())return;setLoading(true);setError('');const row=await fetchCouple(code.trim());if(!row){setError('Código no encontrado.');setLoading(false);return;}setLocalCode(code.trim().toUpperCase());onJoined(dbToApp(row),code.trim().toUpperCase());};
  if(!mode)return(<div style={{minHeight:'100vh',background:'linear-gradient(160deg,#0d0a14,#1a0d2e)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'2rem',gap:'1rem'}}><div style={{textAlign:'center',marginBottom:'1rem'}}><div style={{fontSize:'3rem',marginBottom:'0.75rem'}}>💝</div><h2 className="font-display" style={{fontSize:'2rem',color:'#f0e8f8',margin:'0 0 0.4rem'}}>¿Cómo quieren empezar?</h2></div><button onClick={()=>setMode('create')} style={{width:'100%',maxWidth:'300px',background:'linear-gradient(135deg,#a8456a,#7c3aed)',color:'white',fontWeight:600,fontSize:'1rem',padding:'1rem',borderRadius:'14px',border:'none',cursor:'pointer'}}>✨ Crear nuestra pareja</button><button onClick={()=>setMode('join')} style={{width:'100%',maxWidth:'300px',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',color:'white',fontWeight:500,fontSize:'1rem',padding:'1rem',borderRadius:'14px',cursor:'pointer'}}>🔗 Unirme con un código</button></div>);
  if(mode==='create')return(<div style={{minHeight:'100vh',background:'linear-gradient(160deg,#0d0a14,#1a0d2e)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'2rem'}}><div style={card}><button onClick={()=>setMode(null)} style={{background:'none',border:'none',color:'rgba(200,160,200,0.7)',fontSize:'0.85rem',padding:'0 0 1rem',display:'block',cursor:'pointer'}}>← Volver</button><h3 className="font-display" style={{color:'#f0e8f8',fontSize:'1.5rem',margin:'0 0 1.25rem'}}>Crear pareja ✨</h3>{[['👩 Nombre de ella',nameA,setNameA],['👨 Nombre de él',nameB,setNameB]].map(([lbl,val,set])=>(<div key={lbl} style={{marginBottom:'0.875rem'}}><label style={{color:'#c89fd4',fontSize:'0.78rem',fontWeight:500,display:'block',marginBottom:'0.4rem'}}>{lbl}</label><input style={inp} placeholder="Nombre..." value={val} onChange={e=>set(e.target.value)} /></div>))}{error&&<p style={{color:'#f87171',fontSize:'0.8rem',margin:'0.5rem 0'}}>{error}</p>}<button onClick={handleCreate} disabled={loading||!nameA.trim()||!nameB.trim()} style={{width:'100%',background:(loading||!nameA.trim()||!nameB.trim())?'rgba(255,255,255,0.08)':'linear-gradient(135deg,#a8456a,#7c3aed)',color:(loading||!nameA.trim()||!nameB.trim())?'rgba(255,255,255,0.3)':'white',fontWeight:600,fontSize:'1rem',padding:'1rem',borderRadius:'14px',border:'none',cursor:'pointer',marginTop:'0.5rem'}}>{loading?<span className="spin">⏳</span>:'Crear y obtener código'}</button></div></div>);
  return(<div style={{minHeight:'100vh',background:'linear-gradient(160deg,#0d0a14,#1a0d2e)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'2rem'}}><div style={card}><button onClick={()=>setMode(null)} style={{background:'none',border:'none',color:'rgba(200,160,200,0.7)',fontSize:'0.85rem',padding:'0 0 1rem',display:'block',cursor:'pointer'}}>← Volver</button><h3 className="font-display" style={{color:'#f0e8f8',fontSize:'1.5rem',margin:'0 0 0.5rem'}}>Unirme 🔗</h3><p style={{color:'rgba(180,150,200,0.6)',fontSize:'0.82rem',margin:'0 0 1.25rem'}}>El código de 6 letras de tu pareja</p><input style={{...inp,textTransform:'uppercase',letterSpacing:'0.15em',fontSize:'1.2rem',textAlign:'center'}} placeholder="XXXXXX" maxLength={6} value={code} onChange={e=>setCode(e.target.value.toUpperCase())} />{error&&<p style={{color:'#f87171',fontSize:'0.8rem',margin:'0.5rem 0'}}>{error}</p>}<button onClick={handleJoin} disabled={loading||code.length<6} style={{width:'100%',background:(loading||code.length<6)?'rgba(255,255,255,0.08)':'linear-gradient(135deg,#a8456a,#7c3aed)',color:(loading||code.length<6)?'rgba(255,255,255,0.3)':'white',fontWeight:600,fontSize:'1rem',padding:'1rem',borderRadius:'14px',border:'none',cursor:'pointer',marginTop:'0.875rem'}}>{loading?<span className="spin">⏳</span>:'Unirme'}</button></div></div>);
}
function CodeDisplayScreen({code,onContinue}) {
  const [copied,setCopied]=useState(false);
  return(<div style={{minHeight:'100vh',background:'linear-gradient(160deg,#0d0a14,#1a0d2e)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'2rem',textAlign:'center'}}><div style={{fontSize:'3rem',marginBottom:'1rem'}}>🎉</div><h2 className="font-display" style={{color:'#f0e8f8',fontSize:'2rem',margin:'0 0 0.5rem'}}>¡Pareja creada!</h2><p style={{color:'rgba(180,150,200,0.7)',fontSize:'0.88rem',margin:'0 0 2rem',maxWidth:'260px',lineHeight:1.5}}>Comparte este código con tu pareja</p><div style={{background:'rgba(197,110,140,0.15)',border:'2px solid rgba(197,110,140,0.4)',borderRadius:'20px',padding:'1.5rem 2.5rem',marginBottom:'1rem'}}><p style={{color:'rgba(200,160,200,0.6)',fontSize:'0.75rem',margin:'0 0 0.5rem'}}>Tu código de pareja</p><p style={{color:'white',fontSize:'2.5rem',fontWeight:700,letterSpacing:'0.2em',margin:0}}>{code}</p></div><button onClick={()=>{navigator.clipboard?.writeText(code);setCopied(true);setTimeout(()=>setCopied(false),2000);}} style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',color:'white',padding:'0.6rem 1.5rem',borderRadius:'100px',fontSize:'0.85rem',marginBottom:'1.5rem',cursor:'pointer'}}>{copied?'✓ Copiado':'Copiar código'}</button><button onClick={onContinue} style={{background:'linear-gradient(135deg,#a8456a,#7c3aed)',color:'white',fontWeight:600,fontSize:'1rem',padding:'1rem 2.5rem',borderRadius:'100px',border:'none',cursor:'pointer'}}>Continuar →</button></div>);
}
function PartnerSelectScreen({names,onSelect}) {
  return(<div style={{minHeight:'100vh',background:'linear-gradient(160deg,#0d0a14,#1a0d2e)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'2rem'}}><div style={{textAlign:'center',marginBottom:'2.5rem'}}><div style={{fontSize:'3.5rem',marginBottom:'1rem'}}>💑</div><h2 className="font-display" style={{fontSize:'2rem',color:'#f0e8f8',margin:'0 0 0.4rem'}}>¿Quién está aquí?</h2></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem',width:'100%',maxWidth:'300px'}}>{[['A','👩',names.A,'rgba(168,69,106,0.2)','rgba(168,69,106,0.4)'],['B','👨',names.B,'rgba(124,58,237,0.2)','rgba(124,58,237,0.4)']].map(([key,em,name,bg,bdr])=>(<button key={key} onClick={()=>onSelect(key)} style={{background:bg,border:`1px solid ${bdr}`,borderRadius:'20px',padding:'1.75rem 1rem',display:'flex',flexDirection:'column',alignItems:'center',gap:'0.75rem',cursor:'pointer'}}><span style={{fontSize:'2.5rem'}}>{em}</span><span style={{color:'white',fontWeight:500,fontSize:'1rem'}}>{name}</span></button>))}</div></div>);
}

// ══════════════════════════════════════════════════════
// BOARD TAB
// ══════════════════════════════════════════════════════
const COLS = 6;
const ROWS = Math.ceil(BOARD_SIZE / COLS);

function SquareCell({sq,idx,posA,posB,names,isActive,onPress}) {
  const cfg=SQUARE_TYPES[sq]||SQUARE_TYPES.neutral;
  const hasA=posA===idx;
  const hasB=posB===idx;
  const isLast=idx===BOARD_SIZE-1;
  return(
    <button onClick={()=>isActive&&onPress&&onPress(idx,sq)} style={{background:cfg.color,border:`1.5px solid ${isActive||hasA||hasB?cfg.border:'rgba(255,255,255,0.07)'}`,borderRadius:'10px',padding:'0.3rem',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'1px',cursor:isActive?'pointer':'default',position:'relative',minHeight:'52px',transform:hasA||hasB?'scale(1.05)':'scale(1)',transition:'transform 0.2s',boxShadow:isActive?`0 0 12px ${cfg.border}`:'none'}}>
      <span style={{fontSize:'1.1rem',lineHeight:1}}>{cfg.emoji}</span>
      <span style={{color:'rgba(255,255,255,0.45)',fontSize:'0.45rem',lineHeight:1}}>{idx+1}</span>
      {(hasA||hasB)&&(
        <div style={{position:'absolute',top:'-8px',left:'50%',transform:'translateX(-50%)',display:'flex',gap:'1px'}}>
          {hasA&&<span style={{fontSize:'0.75rem'}}>👩</span>}
          {hasB&&<span style={{fontSize:'0.7rem'}}>👨</span>}
        </div>
      )}
    </button>
  );
}

function BoardTab({appData,partner,updateData,coupleCode}) {
  const pKey=partner==='A'?'B':'A';
  const names=appData.names||{A:'Ella',B:'Él'};
  const pts=appData.points||{A:0,B:0};
  const week=getISOWeek();

  // Init or reset board each week
  const bs=appData.boardState;
  const board=(!bs||bs.week!==week)?generateBoard(week):(bs.squares||generateBoard(week));
  const triggered=bs?.triggered||{};
  const encounterPlan=bs?.encounterPlan||null;

  const posA=Math.min(getPosition(pts.A),BOARD_SIZE-1);
  const posB=Math.min(getPosition(pts.B),BOARD_SIZE-1);
  const myPos=partner==='A'?posA:posB;
  const prevPos=bs?.lastPos?.[partner]||0;

  const [modal,setModal]=useState(null); // {type, sq, idx}
  const [diceResult,setDiceResult]=useState(null);
  const [rolling,setRolling]=useState(false);
  const [bonusAnim,setBonusAnim]=useState(false);
  const diceUsed=getDiceUsed(coupleCode,partner);

  // Save board state if week changed
  useEffect(()=>{
    if(!bs||bs.week!==week){
      const newBs={week,squares:generateBoard(week),triggered:{},lastPos:{A:0,B:0},encounterPlan:null};
      updateData({boardState:newBs,points:{A:0,B:0},weeklyPoints:{A:0,B:0,week}});
    }
  },[]);

  // Check if landed on new square
  useEffect(()=>{
    if(!bs||bs.week!==week)return;
    const lastPos=(bs.lastPos?.[partner])||0;
    if(myPos>lastPos){
      // Landed on myPos
      const sq=board[myPos];
      if(sq&&sq!=='neutral'&&sq!=='start'&&!triggered[`${myPos}`]){
        // Trigger square action
        setTimeout(()=>setModal({type:sq,sq,idx:myPos}),400);
      }
      // Update lastPos
      const newBs={...bs,lastPos:{...(bs.lastPos||{}), [partner]:myPos}};
      updateData({boardState:newBs});
    }
  },[myPos]);

  const markTriggered=(idx,extra={})=>{
    const newTriggered={...(bs?.triggered||{}),[`${idx}`]:{by:partner,at:new Date().toISOString(),...extra}};
    const newBs={...(bs||{}),week,squares:board,triggered:newTriggered,lastPos:{...(bs?.lastPos||{})}};
    updateData({boardState:newBs});
    setModal(null);
  };

  const rollDice=()=>{
    if(diceUsed||rolling)return;
    setRolling(true);
    setTimeout(()=>{
      const roll=Math.floor(Math.random()*6)+1;
      setDiceResult(roll);
      setDiceUsed(coupleCode,partner);
      // Add bonus points to simulate movement (5pts per square)
      const bonusPts=roll*PTS_PER_SQUARE;
      const newPts={...pts,[partner]:(pts[partner]||0)+bonusPts};
      const newWP={...(appData.weeklyPoints||{A:0,B:0,week}),[partner]:((appData.weeklyPoints?.[partner])||0)+bonusPts};
      updateData({points:newPts,weeklyPoints:newWP});
      setRolling(false);
    },1000);
  };

  // Build grid - serpentine rows
  const grid=[];
  for(let row=0;row<ROWS;row++){
    const rowSquares=[];
    const leftToRight=row%2===0;
    for(let col=0;col<COLS;col++){
      const idx=row*COLS+(leftToRight?col:COLS-1-col);
      if(idx<BOARD_SIZE) rowSquares.push({idx,sq:board[idx]});
      else rowSquares.push(null);
    }
    grid.push(rowSquares);
  }

  const winner=posA>=BOARD_SIZE-1?'A':posB>=BOARD_SIZE-1?'B':null;
  const myWP=(appData.weeklyPoints?.[partner])||0;
  const theirWP=(appData.weeklyPoints?.[pKey])||0;

  return(
    <div style={{padding:'0.75rem'}}>
      {/* Header stats */}
      <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',alignItems:'center',gap:'0.5rem',marginBottom:'0.75rem'}}>
        <div style={{background:'rgba(168,69,106,0.15)',border:'1px solid rgba(168,69,106,0.3)',borderRadius:'14px',padding:'0.6rem',textAlign:'center'}}>
          <span style={{fontSize:'1rem'}}>👩</span>
          <p style={{color:'white',fontWeight:700,fontSize:'1rem',margin:'0.1rem 0 0'}}>{pts.A||0}</p>
          <p style={{color:'rgba(200,160,200,0.6)',fontSize:'0.65rem',margin:0}}>pts · casilla {posA+1}</p>
        </div>
        <div style={{textAlign:'center'}}>
          <p style={{color:'rgba(200,160,200,0.5)',fontSize:'0.65rem',margin:0}}>semana {week}</p>
          <p style={{color:'rgba(200,160,200,0.3)',fontSize:'0.6rem',margin:0}}>5 pts = 1 casilla</p>
        </div>
        <div style={{background:'rgba(124,58,237,0.15)',border:'1px solid rgba(124,58,237,0.3)',borderRadius:'14px',padding:'0.6rem',textAlign:'center'}}>
          <span style={{fontSize:'1rem'}}>👨</span>
          <p style={{color:'white',fontWeight:700,fontSize:'1rem',margin:'0.1rem 0 0'}}>{pts.B||0}</p>
          <p style={{color:'rgba(200,160,200,0.6)',fontSize:'0.65rem',margin:0}}>pts · casilla {posB+1}</p>
        </div>
      </div>

      {/* Dice */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'0.75rem',background:'rgba(255,255,255,0.04)',borderRadius:'14px',padding:'0.6rem 0.875rem'}}>
        <div>
          <p style={{color:'white',fontWeight:500,fontSize:'0.85rem',margin:'0 0 0.1rem'}}>Dado salvavidas 🎲</p>
          <p style={{color:'rgba(200,160,200,0.5)',fontSize:'0.72rem',margin:0}}>{diceUsed?'Ya lo usaste hoy':'Una vez por día — avanza sin ganar puntos'}</p>
        </div>
        <button onClick={rollDice} disabled={diceUsed||rolling} style={{background:diceUsed?'rgba(255,255,255,0.05)':'linear-gradient(135deg,#a8456a,#7c3aed)',border:'none',borderRadius:'12px',padding:'0.6rem 1rem',color:diceUsed?'rgba(255,255,255,0.3)':'white',fontWeight:600,cursor:diceUsed?'default':'pointer',fontSize:'0.85rem'}}>
          {rolling?<span className="spin">🎲</span>:diceResult&&!diceUsed?`🎲 ${diceResult}`:'🎲 Tirar'}
        </button>
      </div>
      {diceResult&&<p style={{color:'#4ade80',fontSize:'0.8rem',textAlign:'center',margin:'0 0 0.5rem'}} className="fade-up">🎲 Sacaste {diceResult} — avanzaste {diceResult} casillas (+{diceResult*PTS_PER_SQUARE} pts)</p>}

      {/* Board grid — rendered bottom to top */}
      <div style={{display:'flex',flexDirection:'column',gap:'3px'}}>
        {[...grid].reverse().map((row,ri)=>(
          <div key={ri} style={{display:'grid',gridTemplateColumns:`repeat(${COLS},1fr)`,gap:'3px'}}>
            {row.map((cell,ci)=>cell?(
              <SquareCell key={ci} sq={cell.sq} idx={cell.idx} posA={posA} posB={posB} names={names}
                isActive={cell.idx===myPos&&!triggered[`${cell.idx}`]&&cell.sq!=='neutral'&&cell.sq!=='start'}
                onPress={(idx,sq)=>setModal({type:sq,idx})} />
            ):<div key={ci} />)}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{display:'flex',flexWrap:'wrap',gap:'0.4rem',marginTop:'0.75rem'}}>
        {Object.entries(SQUARE_TYPES).filter(([k])=>k!=='start'&&k!=='end').map(([k,v])=>(
          <span key={k} style={{background:v.color,border:`1px solid ${v.border}`,borderRadius:'100px',padding:'0.2rem 0.6rem',fontSize:'0.65rem',color:'white'}}>{v.emoji} {v.label||k}</span>
        ))}
      </div>

      {/* Square action modals */}
      {modal&&<SquareModal modal={modal} appData={appData} partner={partner} pKey={pKey} names={names} coupleCode={coupleCode} board={board} bs={bs} onDone={(extra)=>markTriggered(modal.idx,extra)} onClose={()=>setModal(null)} updateData={updateData} />}

      {/* Winner banner */}
      {winner&&(
        <div style={{position:'fixed',top:0,left:0,right:0,background:'linear-gradient(135deg,#a87800,#d4a017)',padding:'1rem',textAlign:'center',zIndex:200}}>
          <p style={{color:'white',fontWeight:700,fontSize:'1rem',margin:0}}>🏆 {names[winner]} llegó a la meta esta semana</p>
        </div>
      )}
    </div>
  );
}

// ── Square action modal ──
function SquareModal({modal,appData,partner,pKey,names,coupleCode,board,bs,onDone,onClose,updateData}) {
  const {type,idx}=modal;
  const pts=appData.points||{A:0,B:0};
  const [penanceMode,setPenanceMode]=useState(null); // 'custom'|'anagram'
  const [customText,setCustomText]=useState('');
  const [encounter,setEncounter]=useState({answers:[],currentQ:0});
  const [anagramWord]=useState(()=>{
    const week=getISOWeek();
    const group=ANAGRAM_BANK[week%ANAGRAM_BANK.length];
    return group[idx%group.length];
  });
  const [shuffled]=useState(()=>{
    if(!anagramWord)return[];
    const arr=anagramWord.split('');
    for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}
    return arr.map((l,i)=>({id:i,letter:l,used:false}));
  });
  const [anagramLetters,setAnagramLetters]=useState(shuffled);
  const [anagramAnswer,setAnagramAnswer]=useState([]);
  const [anagramDone,setAnagramDone]=useState(false);
  const [timeLeft,setTimeLeft]=useState(120); // 2 min

  // Anagram timer
  useEffect(()=>{
    if(type!=='penitencia'||penanceMode!=='anagram'||anagramDone)return;
    if(timeLeft<=0){onDone({penanceResult:'timeout'});return;}
    const t=setInterval(()=>setTimeLeft(v=>v-1),1000);
    return()=>clearInterval(t);
  },[penanceMode,anagramDone,timeLeft]);

  const bonusAmt=getBonusPts(idx);

  // Reto
  const getRandomReto=()=>{
    const done=appData.completedChallenges||[];
    const avail=CHALLENGES_POOL.filter(c=>!done.includes(c.id));
    return avail.length>0?avail[idx%avail.length]:CHALLENGES_POOL[idx%CHALLENGES_POOL.length];
  };
  const getRandomExpress=()=>EXPRESS_POOL[idx%EXPRESS_POOL.length];

  const [reto]=useState(getRandomReto);
  const [express]=useState(getRandomExpress);

  const completeReto=()=>{
    const newDone=[...(appData.completedChallenges||[]),reto.id];
    const newPts={...pts,[partner]:(pts[partner]||0)+reto.points};
    const newWP={...(appData.weeklyPoints||{A:0,B:0}),[partner]:((appData.weeklyPoints?.[partner])||0)+reto.points};
    // Add to historial
    const newBs={...bs,activatedRetos:[...(bs?.activatedRetos||[]),{...reto,activatedAt:new Date().toISOString()}]};
    updateData({completedChallenges:newDone,points:newPts,weeklyPoints:newWP,boardState:newBs});
    onDone();
  };
  const completeExpress=()=>{
    const newDone=[...(appData.completedExpress||[]),express.id];
    const newPts={...pts,[partner]:(pts[partner]||0)+express.points};
    const newWP={...(appData.weeklyPoints||{A:0,B:0}),[partner]:((appData.weeklyPoints?.[partner])||0)+express.points};
    const newBs={...bs,activatedExpress:[...(bs?.activatedExpress||[]),{...express,activatedAt:new Date().toISOString()}]};
    updateData({completedExpress:newDone,points:newPts,weeklyPoints:newWP,boardState:newBs});
    onDone();
  };
  const collectBonus=()=>{
    const newPts={...pts,[partner]:(pts[partner]||0)+bonusAmt};
    const newWP={...(appData.weeklyPoints||{A:0,B:0}),[partner]:((appData.weeklyPoints?.[partner])||0)+bonusAmt};
    updateData({points:newPts,weeklyPoints:newWP});
    onDone();
  };

  // Encounter
  const answerEncounter=(answer)=>{
    const newAnswers=[...encounter.answers,{questionId:ENCOUNTER_QUESTIONS[encounter.currentQ].id,answer,by:partner}];
    const nextQ=encounter.currentQ+1;
    if(nextQ>=ENCOUNTER_QUESTIONS.length){
      // Save plan
      const newBs={...bs,encounterPlan:{answers:newAnswers,lastBy:partner,updatedAt:new Date().toISOString()}};
      updateData({boardState:newBs});
      onDone({encounterAnswered:true});
    } else {
      setEncounter({answers:newAnswers,currentQ:nextQ});
    }
  };

  // Penance anagram
  const pickAnagramLetter=(item)=>{
    if(item.used)return;
    setAnagramLetters(prev=>prev.map(l=>l.id===item.id?{...l,used:true}:l));
    setAnagramAnswer(prev=>[...prev,item]);
  };
  const removeAnagramLetter=(item,i)=>{
    setAnagramLetters(prev=>prev.map(l=>l.id===item.id?{...l,used:false}:l));
    setAnagramAnswer(prev=>prev.filter((_,j)=>j!==i));
  };
  const checkAnagram=()=>{
    const formed=anagramAnswer.map(a=>a.letter).join('');
    if(formed===anagramWord){setAnagramDone(true);onDone({penanceResult:'solved'});}
    else{setAnagramAnswer([]);setAnagramLetters(shuffled.map(l=>({...l,used:false})));}
  };
  const sendCustomPenance=()=>{
    if(!customText.trim())return;
    const newBs={...bs,activePenance:{text:customText,for:pKey,from:partner,idx,createdAt:new Date().toISOString()}};
    updateData({boardState:newBs});
    sendNotif(`${names[partner]} te dejó una penitencia 😏`);
    onDone({penanceResult:'custom'});
  };

  const overlay={position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:200,display:'flex',alignItems:'flex-end',justifyContent:'center'};
  const sheet={background:'#1a0d2e',borderRadius:'24px 24px 0 0',padding:'1.5rem',width:'100%',maxWidth:'420px',maxHeight:'85vh',overflowY:'auto'};

  return(
    <div style={overlay} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={sheet} className="slide-in">
        {/* Reto */}
        {type==='reto'&&(<div className="fade-up"><div style={{fontSize:'2.5rem',textAlign:'center',marginBottom:'0.75rem'}}>🎯</div><h3 className="font-display" style={{color:'white',fontSize:'1.75rem',textAlign:'center',margin:'0 0 0.5rem'}}>¡Casilla de Reto!</h3><div style={{background:'rgba(168,69,106,0.15)',border:'1px solid rgba(168,69,106,0.3)',borderRadius:'16px',padding:'1.25rem',margin:'0.75rem 0 1rem'}}><h4 style={{color:'#e07b8a',margin:'0 0 0.5rem',fontSize:'1rem'}}>{reto.title}</h4><p style={{color:'rgba(220,190,220,0.9)',fontSize:'0.88rem',margin:'0 0 0.75rem',lineHeight:1.4}}>{reto.desc}</p><div style={{display:'flex',gap:'1rem'}}><span style={{color:'#e07b8a',fontSize:'0.78rem'}}>⏱ {reto.time}</span><span style={{color:'#d4a017',fontSize:'0.78rem'}}>+{reto.points} pts al completarlo</span></div></div><button onClick={completeReto} style={{width:'100%',background:'linear-gradient(135deg,#a8456a,#c96b8a)',color:'white',fontWeight:600,fontSize:'1rem',padding:'1rem',borderRadius:'14px',border:'none',cursor:'pointer'}}>✓ ¡Completado! (+{reto.points} pts)</button></div>)}

        {/* Express */}
        {type==='express'&&(<div className="fade-up"><div style={{fontSize:'2.5rem',textAlign:'center',marginBottom:'0.75rem'}}>⚡</div><h3 className="font-display" style={{color:'white',fontSize:'1.75rem',textAlign:'center',margin:'0 0 0.5rem'}}>¡Express!</h3><div style={{background:'rgba(234,179,8,0.12)',border:'1px solid rgba(234,179,8,0.3)',borderRadius:'16px',padding:'1.25rem',margin:'0.75rem 0 1rem'}}><h4 style={{color:'#fbbf24',margin:'0 0 0.5rem',fontSize:'1rem'}}>{express.title}</h4><p style={{color:'rgba(220,190,220,0.9)',fontSize:'0.88rem',margin:'0 0 0.75rem',lineHeight:1.4}}>{express.desc}</p><span style={{color:'#d4a017',fontSize:'0.78rem'}}>+{express.points} pts</span></div><button onClick={completeExpress} style={{width:'100%',background:'linear-gradient(135deg,#d97706,#f59e0b)',color:'white',fontWeight:600,fontSize:'1rem',padding:'1rem',borderRadius:'14px',border:'none',cursor:'pointer'}}>⚡ ¡Lo hice! (+{express.points} pts)</button></div>)}

        {/* Bonus */}
        {type==='bonus'&&(<div className="fade-up" style={{textAlign:'center'}}><div style={{fontSize:'3.5rem',marginBottom:'0.75rem'}} className="pop">🎁</div><h3 className="font-display" style={{color:'white',fontSize:'2rem',margin:'0 0 0.5rem'}}>¡Bonus!</h3><p style={{color:'rgba(200,160,200,0.8)',margin:'0 0 1.5rem'}}>Cayeron en una casilla de suerte</p><div style={{background:'rgba(34,197,94,0.15)',border:'1px solid rgba(34,197,94,0.35)',borderRadius:'20px',padding:'1.5rem',marginBottom:'1.25rem'}}><p style={{color:'#4ade80',fontSize:'2.5rem',fontWeight:700,margin:0}}>+{bonusAmt}</p><p style={{color:'rgba(200,160,200,0.6)',margin:0}}>puntos extra</p></div><button onClick={collectBonus} style={{width:'100%',background:'linear-gradient(135deg,#15803d,#4ade80)',color:'white',fontWeight:600,fontSize:'1rem',padding:'1rem',borderRadius:'14px',border:'none',cursor:'pointer'}}>🎁 ¡Recoger!</button></div>)}

        {/* Encuentro */}
        {type==='encuentro'&&(<div className="fade-up">
          <div style={{fontSize:'2.5rem',textAlign:'center',marginBottom:'0.75rem'}}>🌙</div>
          <h3 className="font-display" style={{color:'white',fontSize:'1.75rem',textAlign:'center',margin:'0 0 0.35rem'}}>Casilla de Encuentro</h3>
          <p style={{color:'rgba(200,160,200,0.6)',fontSize:'0.82rem',textAlign:'center',margin:'0 0 1rem'}}>Responde cómo quieres que sea el próximo encuentro. Tu pareja lo verá al terminar.</p>
          {bs?.encounterPlan&&bs.encounterPlan.lastBy!==partner&&(
            <div style={{background:'rgba(124,58,237,0.15)',border:'1px solid rgba(124,58,237,0.3)',borderRadius:'14px',padding:'0.875rem',marginBottom:'1rem'}}>
              <p style={{color:'#a78bfa',fontWeight:600,fontSize:'0.85rem',margin:'0 0 0.35rem'}}>Plan de {names[pKey]}:</p>
              {(bs.encounterPlan.answers||[]).map((a,i)=>{
                const q=ENCOUNTER_QUESTIONS.find(q=>q.id===a.questionId);
                return q?(<p key={i} style={{color:'rgba(220,190,220,0.8)',fontSize:'0.78rem',margin:'0.2rem 0'}}>{q.emoji} {q.label}: <strong>{a.answer}</strong></p>):null;
              })}
            </div>
          )}
          {encounter.currentQ<ENCOUNTER_QUESTIONS.length?(
            <div>
              <div style={{background:'rgba(124,58,237,0.12)',border:'1px solid rgba(124,58,237,0.25)',borderRadius:'16px',padding:'1rem',marginBottom:'0.75rem',textAlign:'center'}}>
                <span style={{fontSize:'1.5rem'}}>{ENCOUNTER_QUESTIONS[encounter.currentQ].emoji}</span>
                <p style={{color:'white',fontWeight:600,fontSize:'0.95rem',margin:'0.4rem 0 0.25rem'}}>{ENCOUNTER_QUESTIONS[encounter.currentQ].label}</p>
                <p style={{color:'rgba(200,160,200,0.5)',fontSize:'0.72rem',margin:0}}>{encounter.currentQ+1} de {ENCOUNTER_QUESTIONS.length}</p>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:'0.4rem'}}>
                {ENCOUNTER_QUESTIONS[encounter.currentQ].options.map(opt=>(
                  <button key={opt} onClick={()=>answerEncounter(opt)} style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'12px',padding:'0.75rem 1rem',color:'white',fontSize:'0.9rem',cursor:'pointer',textAlign:'left'}}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ):(
            <div style={{textAlign:'center',padding:'1rem'}}>
              <div style={{fontSize:'3rem',marginBottom:'0.5rem'}}>✨</div>
              <p style={{color:'#4ade80',fontWeight:600,margin:0}}>¡Plan guardado! Tu pareja puede verlo ahora.</p>
            </div>
          )}
        </div>)}

        {/* Penitencia */}
        {type==='penitencia'&&(<div className="fade-up">
          <div style={{fontSize:'2.5rem',textAlign:'center',marginBottom:'0.75rem'}}>💀</div>
          <h3 className="font-display" style={{color:'white',fontSize:'1.75rem',textAlign:'center',margin:'0 0 0.35rem'}}>¡Casilla de Penitencia!</h3>
          <p style={{color:'rgba(200,160,200,0.6)',fontSize:'0.82rem',textAlign:'center',margin:'0 0 1rem'}}>{names[partner]} cayó aquí. {names[pKey]} decide la penitencia.</p>
          {!penanceMode&&(
            <div style={{display:'flex',flexDirection:'column',gap:'0.6rem'}}>
              <button onClick={()=>setPenanceMode('custom')} style={{background:'rgba(197,110,140,0.15)',border:'1px solid rgba(197,110,140,0.35)',borderRadius:'14px',padding:'1rem',color:'#e07b8a',fontWeight:600,cursor:'pointer',fontSize:'0.95rem'}}>
                ✍️ Yo escribo la penitencia
              </button>
              <button onClick={()=>setPenanceMode('anagram')} style={{background:'rgba(124,58,237,0.15)',border:'1px solid rgba(124,58,237,0.35)',borderRadius:'14px',padding:'1rem',color:'#a78bfa',fontWeight:600,cursor:'pointer',fontSize:'0.95rem'}}>
                🔤 Anagrama automático (2 min)
              </button>
            </div>
          )}
          {penanceMode==='custom'&&(
            <div>
              <p style={{color:'rgba(200,160,200,0.7)',fontSize:'0.82rem',margin:'0 0 0.5rem'}}>{names[partner]} debe hacer esto:</p>
              <textarea value={customText} onChange={e=>setCustomText(e.target.value)} placeholder="Escribe la penitencia..." style={{width:'100%',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'12px',padding:'0.75rem',color:'white',fontSize:'0.9rem',minHeight:'80px',marginBottom:'0.75rem'}} />
              <button onClick={sendCustomPenance} disabled={!customText.trim()} style={{width:'100%',background:customText.trim()?'linear-gradient(135deg,#a8456a,#7c3aed)':'rgba(255,255,255,0.08)',border:'none',borderRadius:'14px',padding:'1rem',color:customText.trim()?'white':'rgba(255,255,255,0.3)',fontWeight:600,cursor:customText.trim()?'pointer':'default',fontSize:'0.95rem'}}>
                Enviar penitencia 😏
              </button>
            </div>
          )}
          {penanceMode==='anagram'&&!anagramDone&&(
            <div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.75rem'}}>
                <p style={{color:'rgba(200,160,200,0.7)',fontSize:'0.82rem',margin:0}}>Descifra la palabra en 2 minutos</p>
                <span style={{color:timeLeft<30?'#f87171':'#fbbf24',fontWeight:700,fontSize:'1rem'}}>{Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,'0')}</span>
              </div>
              <div style={{minHeight:'48px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'12px',padding:'0.6rem',display:'flex',flexWrap:'wrap',gap:'0.3rem',marginBottom:'0.6rem'}}>
                {anagramAnswer.length===0?<span style={{color:'rgba(200,160,200,0.3)',fontSize:'0.82rem',alignSelf:'center'}}>Toca las letras...</span>
                :anagramAnswer.map((item,i)=>(
                  <button key={i} onClick={()=>removeAnagramLetter(item,i)} style={{background:'linear-gradient(135deg,#a8456a,#7c3aed)',border:'none',borderRadius:'8px',padding:'0.4rem 0.6rem',color:'white',fontWeight:700,fontSize:'1rem',cursor:'pointer',minWidth:'32px'}}>{item.letter}</button>
                ))}
              </div>
              <div style={{display:'flex',flexWrap:'wrap',gap:'0.35rem',justifyContent:'center',marginBottom:'0.75rem'}}>
                {anagramLetters.map(item=>(
                  <button key={item.id} onClick={()=>pickAnagramLetter(item)} disabled={item.used} style={{background:item.used?'rgba(255,255,255,0.04)':'rgba(255,255,255,0.1)',border:`1px solid ${item.used?'rgba(255,255,255,0.05)':'rgba(255,255,255,0.2)'}`,borderRadius:'8px',padding:'0.5rem 0.7rem',color:item.used?'rgba(255,255,255,0.2)':'white',fontWeight:700,fontSize:'1.1rem',cursor:item.used?'default':'pointer',minWidth:'38px'}}>{item.letter}</button>
                ))}
              </div>
              <div style={{display:'flex',gap:'0.5rem'}}>
                <button onClick={()=>{setAnagramAnswer([]);setAnagramLetters(shuffled.map(l=>({...l,used:false})));}} style={{flex:1,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',padding:'0.75rem',color:'rgba(200,160,200,0.7)',cursor:'pointer'}}>🔄</button>
                <button onClick={checkAnagram} disabled={anagramAnswer.length===0} style={{flex:2,background:anagramAnswer.length>0?'linear-gradient(135deg,#a8456a,#7c3aed)':'rgba(255,255,255,0.08)',border:'none',borderRadius:'12px',padding:'0.75rem',color:anagramAnswer.length>0?'white':'rgba(255,255,255,0.3)',fontWeight:600,cursor:anagramAnswer.length>0?'pointer':'default'}}>Confirmar ✓</button>
              </div>
            </div>
          )}
          {penanceMode==='anagram'&&anagramDone&&(
            <div style={{textAlign:'center',padding:'1rem'}}><div style={{fontSize:'3rem',marginBottom:'0.5rem'}}>🎉</div><p style={{color:'#4ade80',fontWeight:600,margin:0}}>¡Lo lograste! La palabra era {anagramWord}</p></div>
          )}
        </div>)}

        <button onClick={onClose} style={{width:'100%',background:'none',border:'none',color:'rgba(200,160,200,0.4)',marginTop:'1rem',cursor:'pointer',fontSize:'0.85rem'}}>Cerrar</button>
      </div>
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
  const fmt=(s)=>{if(!s||isNaN(s))return'0:00';return`${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`;};
  return(
    <div style={{display:'flex',alignItems:'center',gap:'0.5rem',minWidth:'160px'}}>
      <button onClick={toggle} style={{background:'rgba(255,255,255,0.15)',border:'none',borderRadius:'50%',width:'34px',height:'34px',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:'0.9rem',color:'white',flexShrink:0}}>{playing?'⏸':'▶'}</button>
      <div style={{flex:1}}>
        <div style={{background:'rgba(255,255,255,0.2)',borderRadius:'100px',height:'3px',overflow:'hidden',cursor:'pointer'}} onClick={e=>{const r=e.currentTarget.getBoundingClientRect();if(audioRef.current)audioRef.current.currentTime=((e.clientX-r.left)/r.width)*audioRef.current.duration;}}>
          <div style={{background:'white',height:'100%',width:`${progress}%`,borderRadius:'100px'}} />
        </div>
        <span style={{color:'rgba(255,255,255,0.6)',fontSize:'0.6rem'}}>{fmt(duration)}</span>
      </div>
    </div>
  );
}
function AudioUrlLoader({path}) {
  const [url,setUrl]=useState(null);
  useEffect(()=>{(async()=>{const{data}=await supabase.storage.from('chat-media').createSignedUrl(path,300);if(data?.signedUrl)setUrl(data.signedUrl);})();},[path]);
  if(!url)return<span style={{color:'rgba(255,255,255,0.5)',fontSize:'0.78rem'}} className="pulse">Cargando...</span>;
  return<AudioPlayer url={url}/>;
}

// ══════════════════════════════════════════════════════
// CHAT TAB — daily question + full chat
// ══════════════════════════════════════════════════════
function ChatTab({appData,partner,coupleCode,updateData,onMarkRead}) {
  const pKey=partner==='A'?'B':'A';
  const names=appData.names||{A:'Ella',B:'Él'};
  const [messages,setMessages]=useState([]);
  const [input,setInput]=useState('');
  const [loading,setLoading]=useState(true);
  const [recording,setRecording]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [viewedPhotos,setViewedPhotos]=useState({});
  const bottomRef=useRef(null);
  const textareaRef=useRef(null);
  const mediaRecRef=useRef(null);
  const chunksRef=useRef([]);
  const fileInputRef=useRef(null);

  // Daily question logic
  const dq=appData.dailyQuestion;
  const todayQ=getDailyQuestion();
  const isToday=dq?.questionId===todayQ.id;
  const currentDQ=isToday?dq:{questionId:todayQ.id,date:todayStr(),answers:{A:null,B:null}};
  const myAnswer=currentDQ.answers?.[partner];
  const theirAnswer=currentDQ.answers?.[pKey];

  const answerDailyQ=(val)=>{
    const newAnswers={...(currentDQ.answers||{}),[partner]:val};
    const newDQ={...currentDQ,answers:newAnswers};
    updateData({dailyQuestion:newDQ});
  };

  // Load messages
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
        if(payload.new.sender!==partner)sendNotif('Nuevo mensaje de tu pareja 😏');
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'messages',filter:'couple_code=eq.'+coupleCode},(payload)=>{
        setMessages(prev=>prev.map(m=>m.id===payload.new.id?payload.new:m));
      }).subscribe();
    return()=>sub.unsubscribe();
  },[coupleCode]);

  const handleInputChange=(e)=>{
    setInput(e.target.value);
    if(textareaRef.current){textareaRef.current.style.height='auto';textareaRef.current.style.height=Math.min(textareaRef.current.scrollHeight,120)+'px';}
  };

  const send=async(extraFields={})=>{
    const text=input.trim();
    if(!text&&!extraFields.media_url)return;
    const msg={couple_code:coupleCode,sender:partner,content:text||'',cited_question_id:currentDQ?.questionId||null,viewed_by:[partner],...extraFields};
    setInput('');
    if(textareaRef.current)textareaRef.current.style.height='auto';
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
          if(!chunksRef.current.length)return;
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
      }catch(e){alert('No se pudo acceder al micrófono.');}
    }
  };
  const handlePhoto=async(e)=>{
    const file=e.target.files?.[0];if(!file)return;
    setUploading(true);
    const ext=file.name.split('.').pop()||'jpg';
    const path=`${coupleCode}/${Date.now()}_photo.${ext}`;
    const {error}=await supabase.storage.from('chat-media').upload(path,file,{contentType:file.type});
    if(!error)await send({media_url:path,media_type:'photo',content:'📷 Foto (1 vez)'});
    setUploading(false);e.target.value='';
  };
  const viewPhoto=async(msg)=>{
    if(viewedPhotos[msg.id])return;
    const {data}=await supabase.storage.from('chat-media').createSignedUrl(msg.media_url,300);
    if(!data?.signedUrl)return;
    setViewedPhotos(prev=>({...prev,[msg.id]:data.signedUrl}));
    const newVB=[...(msg.viewed_by||[])];
    if(!newVB.includes(partner))newVB.push(partner);
    await supabase.from('messages').update({viewed_by:newVB}).eq('id',msg.id);
    if(newVB.includes('A')&&newVB.includes('B'))await supabase.storage.from('chat-media').remove([msg.media_url]);
  };

  const renderContent=(msg)=>{
    if(msg.media_type==='audio'){if(!msg.media_url)return<span style={{color:'rgba(255,255,255,0.5)',fontSize:'0.78rem'}}>Audio no disponible</span>;return<AudioUrlLoader path={msg.media_url}/>;}
    if(msg.media_type==='photo'){
      const alreadyViewed=(msg.viewed_by||[]).includes(partner);
      const localUrl=viewedPhotos[msg.id];
      if(localUrl)return<div><img src={localUrl} alt="foto" style={{maxWidth:'200px',maxHeight:'200px',borderRadius:'10px',display:'block'}}/><p style={{color:'rgba(255,255,255,0.5)',fontSize:'0.62rem',margin:'0.3rem 0 0'}}>Vista ✓</p></div>;
      if(alreadyViewed&&msg.sender!==partner)return<span style={{color:'rgba(255,255,255,0.5)',fontSize:'0.82rem'}}>📷 Ya viste esta foto</span>;
      if(!alreadyViewed&&msg.sender!==partner)return<button onClick={()=>viewPhoto(msg)} style={{background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.25)',borderRadius:'12px',padding:'0.6rem 1rem',color:'white',cursor:'pointer',fontSize:'0.82rem',fontWeight:500}}>👁️ Ver foto (1 vez)</button>;
      return<span style={{color:'rgba(255,255,255,0.8)',fontSize:'0.82rem'}}>📷 Foto enviada {(msg.viewed_by||[]).includes(pKey)?'· Vista ✓':'· Esperando...'}</span>;
    }
    return<span style={{fontSize:'0.9rem',lineHeight:1.4,wordBreak:'break-word'}}>{msg.content}</span>;
  };

  const answerLabels={true:'Sí ✓',false:'No ✕',null:'Quizás ?'};
  const answerColors={true:'#4ade80',false:'#f87171',null:'#fbbf24'};

  return(
    <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 120px)'}}>
      {/* Daily question banner */}
      <div style={{background:'rgba(124,58,237,0.12)',borderBottom:'1px solid rgba(124,58,237,0.2)',padding:'0.75rem 1rem',flexShrink:0}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.4rem'}}>
          <p style={{color:'#a78bfa',fontWeight:600,fontSize:'0.75rem',margin:0}}>💫 Pregunta del día</p>
          {myAnswer!==null&&<span style={{color:answerColors[myAnswer],fontSize:'0.72rem',fontWeight:600}}>{answerLabels[myAnswer]}</span>}
        </div>
        <p style={{color:'rgba(240,220,240,0.9)',fontSize:'0.85rem',margin:'0 0 0.5rem',lineHeight:1.4}}>{todayQ.text}</p>
        {myAnswer===null?(
          <div style={{display:'flex',gap:'0.4rem'}}>
            {[{v:true,l:'Sí ✓',c:'rgba(34,197,94,0.2)',bc:'rgba(34,197,94,0.4)',tc:'#4ade80'},{v:null,l:'?',c:'rgba(234,179,8,0.15)',bc:'rgba(234,179,8,0.35)',tc:'#fbbf24'},{v:false,l:'No ✕',c:'rgba(239,68,68,0.15)',bc:'rgba(239,68,68,0.35)',tc:'#f87171'}].map(({v,l,c,bc,tc})=>(
              <button key={String(v)} onClick={()=>answerDailyQ(v)} style={{flex:1,background:c,border:`1px solid ${bc}`,borderRadius:'10px',padding:'0.4rem',color:tc,fontWeight:600,fontSize:'0.78rem',cursor:'pointer'}}>{l}</button>
            ))}
          </div>
        ):(
          <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
            <span style={{color:'rgba(200,160,200,0.5)',fontSize:'0.72rem'}}>Tema del chat de hoy</span>
            {theirAnswer!==null&&<span style={{color:answerColors[theirAnswer],fontSize:'0.72rem'}}>{names[pKey]}: {answerLabels[theirAnswer]}</span>}
            {theirAnswer===null&&<span style={{color:'rgba(200,160,200,0.4)',fontSize:'0.72rem'}} className="pulse">Esperando a {names[pKey]}...</span>}
          </div>
        )}
      </div>

      {/* Messages */}
      <div style={{flex:1,overflowY:'auto',padding:'0.75rem 1rem',display:'flex',flexDirection:'column',gap:'0.75rem'}}>
        {loading?<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%'}}><span style={{color:'rgba(200,160,200,0.5)'}} className="pulse">Cargando...</span></div>
        :messages.length===0?<div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',textAlign:'center'}}><div style={{fontSize:'3rem',marginBottom:'0.75rem'}}>💬</div><p style={{color:'rgba(200,160,200,0.7)',margin:'0 0 0.35rem'}}>Nadie ha escrito todavía</p><p style={{color:'rgba(200,160,200,0.4)',fontSize:'0.82rem',margin:0}}>Empiecen hablando sobre la pregunta del día</p></div>
        :messages.map((msg,i)=>{
          const isMe=msg.sender===partner;
          const showName=i===0||messages[i-1]?.sender!==msg.sender;
          return(
            <div key={msg.id} style={{display:'flex',flexDirection:'column',alignItems:isMe?'flex-end':'flex-start'}}>
              {showName&&<p style={{color:'rgba(200,160,200,0.5)',fontSize:'0.7rem',margin:'0 0 0.2rem',padding:isMe?'0 0.25rem 0 0':'0 0 0 0.25rem'}}>{names[msg.sender]}</p>}
              <div style={{maxWidth:'82%'}}>
                <div style={{background:isMe?'linear-gradient(135deg,#a8456a,#7c3aed)':'rgba(255,255,255,0.09)',borderRadius:isMe?'18px 18px 4px 18px':'18px 18px 18px 4px',padding:'0.625rem 0.875rem',color:'white'}}>
                  {renderContent(msg)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div style={{padding:'0.5rem 0.75rem 0.75rem',borderTop:'1px solid rgba(255,255,255,0.06)',flexShrink:0,background:'rgba(13,10,20,0.6)'}}>
        {uploading&&<div style={{textAlign:'center',padding:'0.3rem',color:'#fbbf24',fontSize:'0.75rem'}} className="pulse">Subiendo... ⏳</div>}
        <div style={{display:'flex',gap:'0.35rem',alignItems:'flex-end'}}>
          <button onClick={()=>fileInputRef.current?.click()} disabled={uploading||recording} style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'50%',width:'38px',height:'38px',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:'1rem',flexShrink:0,color:'rgba(200,160,200,0.8)'}}>📷</button>
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{display:'none'}} onChange={handlePhoto}/>
          <button onClick={toggleRecording} disabled={uploading} style={{background:recording?'rgba(239,68,68,0.35)':'rgba(255,255,255,0.07)',border:`1px solid ${recording?'rgba(239,68,68,0.6)':'rgba(255,255,255,0.1)'}`,borderRadius:'50%',width:'38px',height:'38px',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:'1rem',flexShrink:0,color:recording?'#f87171':'rgba(200,160,200,0.8)'}}>
            {recording?'⏹':'🎙️'}
          </button>
          {recording&&<button onClick={cancelRecording} style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'50%',width:'38px',height:'38px',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:'0.9rem',flexShrink:0,color:'rgba(200,160,200,0.6)'}}>🗑️</button>}
          <textarea ref={textareaRef} value={input} onChange={handleInputChange} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}} placeholder={recording?'Grabando — ⏹ enviar · 🗑️ cancelar':'Escribe algo...'} disabled={recording} rows={1} style={{flex:1,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'14px',padding:'0.7rem 0.875rem',color:'white',fontSize:'0.9rem',lineHeight:1.4,maxHeight:'120px',overflowY:'auto'}}/>
          <button onClick={()=>send()} disabled={!input.trim()||recording||uploading} style={{background:(input.trim()&&!recording&&!uploading)?'linear-gradient(135deg,#a8456a,#7c3aed)':'rgba(255,255,255,0.08)',border:'none',borderRadius:'50%',width:'38px',height:'38px',display:'flex',alignItems:'center',justifyContent:'center',cursor:(input.trim()&&!recording&&!uploading)?'pointer':'default',fontSize:'0.9rem',flexShrink:0,color:'white',alignSelf:'flex-end'}}>➤</button>
        </div>
        {recording&&<p style={{color:'#f87171',fontSize:'0.7rem',textAlign:'center',margin:'0.3rem 0 0'}}>🔴 Grabando — ⏹ enviar · 🗑️ cancelar</p>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// HISTORIAL — side panel (hamburger menu)
// ══════════════════════════════════════════════════════
function HistorialPanel({appData,partner,updateData,onClose}) {
  const [section,setSection]=useState('preguntas');
  const pKey=partner==='A'?'B':'A';
  const names=appData.names||{A:'Ella',B:'Él'};
  const bs=appData.boardState;
  const dq=appData.dailyQuestion;
  const posStatus=appData.positionsStatus||{};
  const saved=appData.savedPositions||[];
  const diffCol={'Fácil':'#4ade80','Media':'#fbbf24','Difícil':'#f87171'};

  // Weekly position match check
  const weekDay=new Date().getDay(); // 0=Sun...6=Sat
  const posMatchDay=3; // Wednesday
  const isPositionMatchDay=weekDay===posMatchDay;
  const posMatchKey=`posMatch_${getISOWeek()}`;
  const posMatchDone=bs?.[posMatchKey];
  const [posMatchQ,setPosMatchQ]=useState(null);
  const [myPosVote,setMyPosVote]=useState(null);

  useEffect(()=>{
    if(isPositionMatchDay&&!posMatchDone){
      const randPos=POSITIONS[getISOWeek()%POSITIONS.length];
      setPosMatchQ(randPos);
    }
  },[]);

  const votePosMatch=(liked)=>{
    setMyPosVote(liked);
    const newVotes={...(bs?.[posMatchKey+'_votes']||{}),[partner]:liked};
    const bothLiked=newVotes.A===true&&newVotes.B===true;
    const newBs={...bs,[posMatchKey]:true,[posMatchKey+'_votes']:newVotes};
    if(bothLiked&&posMatchQ){
      // Add to citas
      const newDates=[...(appData.completedDates||[])];
      if(!newDates.includes('posMatch_'+posMatchQ.id)){
        newDates.push('posMatch_'+posMatchQ.id);
        newBs.activatedCitas=[...(bs?.activatedCitas||[]),{...posMatchQ,type:'positionMatch',activatedAt:new Date().toISOString()}];
      }
      updateData({boardState:newBs,completedDates:newDates});
    } else {
      updateData({boardState:newBs});
    }
  };

  const sections=[
    {id:'preguntas',label:'💫 Preguntas',emoji:'💫'},
    {id:'posiciones',label:'🔥 Posiciones',emoji:'🔥'},
    {id:'retos',label:'🎯 Retos',emoji:'🎯'},
    {id:'citas',label:'📅 Citas',emoji:'📅'},
  ];

  const activatedRetos=bs?.activatedRetos||[];
  const activatedCitas=bs?.activatedCitas||[];

  // Question history: all questions answered so far (one per day)
  const qHistory=[];
  const prefs=appData.preferences?.[partner]||{};
  const partnerPrefs=appData.preferences?.[pKey]||{};
  QUESTIONS.forEach(q=>{
    const myA=prefs[q.id];
    const theirA=partnerPrefs[q.id];
    if(myA!==undefined||theirA!==undefined){
      qHistory.push({q,myA,theirA});
    }
  });
  // Also show today's question if not in history
  const todayQ=getDailyQuestion();
  if(dq&&!qHistory.find(h=>h.q.id===dq.questionId)){
    const q=QUESTIONS.find(q=>q.id===dq.questionId);
    if(q)qHistory.push({q,myA:dq.answers?.[partner],theirA:dq.answers?.[pKey]});
  }

  const labelOf=(v)=>v===true?'Sí ✓':v===false?'No ✕':v===null?'Quizás':'Sin responder';
  const colorOf=(v)=>v===true?'#4ade80':v===false?'#f87171':v===null?'#fbbf24':'rgba(200,160,200,0.3)';

  return(
    <div style={{position:'fixed',inset:0,zIndex:300,display:'flex',justifyContent:'flex-end'}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:'#130922',width:'min(340px,92vw)',height:'100%',display:'flex',flexDirection:'column',boxShadow:'-8px 0 32px rgba(0,0,0,0.5)'}} className="slide-in">
        {/* Header */}
        <div style={{padding:'1rem',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <h2 className="font-display" style={{color:'#f0e8f8',fontSize:'1.3rem',margin:0}}>Historial 📚</h2>
          <button onClick={onClose} style={{background:'none',border:'none',color:'rgba(200,160,200,0.6)',fontSize:'1.5rem',cursor:'pointer',lineHeight:1}}>×</button>
        </div>
        {/* Tabs */}
        <div style={{display:'flex',borderBottom:'1px solid rgba(255,255,255,0.07)',flexShrink:0}}>
          {sections.map(s=>(
            <button key={s.id} onClick={()=>setSection(s.id)} style={{flex:1,background:'none',border:'none',borderBottom:`2px solid ${section===s.id?'#e07b8a':'transparent'}`,padding:'0.6rem 0.25rem',color:section===s.id?'#e07b8a':'rgba(200,160,200,0.5)',cursor:'pointer',fontSize:'1.1rem'}}>
              {s.emoji}
            </button>
          ))}
        </div>
        {/* Content */}
        <div style={{flex:1,overflowY:'auto',padding:'0.75rem'}}>

          {/* PREGUNTAS */}
          {section==='preguntas'&&(
            <div>
              {/* Today's daily question if unanswered */}
              {dq&&dq.answers?.[partner]===null&&(
                <div style={{background:'rgba(124,58,237,0.12)',border:'1px solid rgba(124,58,237,0.3)',borderRadius:'14px',padding:'0.875rem',marginBottom:'0.75rem'}}>
                  <p style={{color:'#a78bfa',fontWeight:600,fontSize:'0.78rem',margin:'0 0 0.35rem'}}>💫 Pregunta de hoy — sin responder</p>
                  <p style={{color:'rgba(240,220,240,0.9)',fontSize:'0.85rem',margin:0,lineHeight:1.4}}>{todayQ.text}</p>
                </div>
              )}
              {/* Position match of the week */}
              {isPositionMatchDay&&!posMatchDone&&posMatchQ&&(
                <div style={{background:'rgba(197,110,140,0.1)',border:'1px solid rgba(197,110,140,0.3)',borderRadius:'14px',padding:'0.875rem',marginBottom:'0.75rem'}}>
                  <p style={{color:'#e07b8a',fontWeight:600,fontSize:'0.78rem',margin:'0 0 0.35rem'}}>🔥 Posición de la semana — ¿les llama la atención?</p>
                  <p style={{color:'white',fontWeight:500,fontSize:'0.9rem',margin:'0 0 0.5rem'}}>{posMatchQ.emoji} {posMatchQ.name}</p>
                  <p style={{color:'rgba(220,190,220,0.7)',fontSize:'0.78rem',margin:'0 0 0.75rem',lineHeight:1.3}}>{posMatchQ.desc}</p>
                  {myPosVote===null?(
                    <div style={{display:'flex',gap:'0.5rem'}}>
                      <button onClick={()=>votePosMatch(true)} style={{flex:1,background:'rgba(34,197,94,0.15)',border:'1px solid rgba(34,197,94,0.4)',borderRadius:'10px',padding:'0.5rem',color:'#4ade80',fontWeight:600,cursor:'pointer',fontSize:'0.85rem'}}>❤️ Sí</button>
                      <button onClick={()=>votePosMatch(false)} style={{flex:1,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'0.5rem',color:'rgba(200,160,200,0.6)',cursor:'pointer',fontSize:'0.85rem'}}>✕ No</button>
                    </div>
                  ):(
                    <p style={{color:myPosVote?'#4ade80':'rgba(200,160,200,0.5)',fontSize:'0.78rem',margin:0}}>
                      {myPosVote?'❤️ Te llama la atención — esperando a '+names[pKey]:'Pasaste esta semana'}
                    </p>
                  )}
                </div>
              )}
              {qHistory.length===0?<p style={{color:'rgba(200,160,200,0.4)',textAlign:'center',padding:'2rem',fontSize:'0.85rem'}}>Las preguntas aparecerán aquí a medida que las vayan respondiendo</p>
              :qHistory.map(({q,myA,theirA})=>(
                <div key={q.id} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'0.75rem',marginBottom:'0.5rem'}}>
                  <p style={{color:'rgba(240,220,240,0.85)',fontSize:'0.82rem',margin:'0 0 0.5rem',lineHeight:1.35}}>{q.text}</p>
                  <div style={{display:'flex',gap:'0.75rem'}}>
                    <span style={{color:colorOf(myA),fontSize:'0.72rem'}}>Tú: {labelOf(myA)}</span>
                    <span style={{color:colorOf(theirA),fontSize:'0.72rem'}}>{names[pKey]}: {labelOf(theirA)}</span>
                    {myA===true&&theirA===true&&<span style={{color:'#e07b8a',fontSize:'0.72rem'}}>💞 Match</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* POSICIONES */}
          {section==='posiciones'&&(
            <div>
              <p style={{color:'rgba(200,160,200,0.5)',fontSize:'0.75rem',margin:'0 0 0.75rem'}}>{Object.values(posStatus).filter(v=>v==='tried').length}/{POSITIONS.length} probadas</p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem'}}>
                {POSITIONS.map(p=>{
                  const tried=posStatus[p.id]==='tried';
                  const isSaved=saved.includes(p.id);
                  return(
                    <div key={p.id} style={{background:tried?'rgba(34,197,94,0.08)':isSaved?'rgba(197,110,140,0.07)':'rgba(255,255,255,0.04)',border:`1.5px solid ${tried?'rgba(34,197,94,0.35)':isSaved?'rgba(197,110,140,0.3)':'rgba(255,255,255,0.07)'}`,borderRadius:'12px',padding:'0.75rem',position:'relative'}}>
                      {tried&&<span style={{position:'absolute',top:'0.4rem',right:'0.4rem',background:'rgba(34,197,94,0.2)',border:'1px solid rgba(34,197,94,0.4)',borderRadius:'100px',padding:'0.1rem 0.4rem',fontSize:'0.6rem',color:'#4ade80',fontWeight:600}}>✓</span>}
                      {!tried&&isSaved&&<span style={{position:'absolute',top:'0.4rem',right:'0.4rem',fontSize:'0.75rem'}}>❤️</span>}
                      <span style={{fontSize:'1.2rem',display:'block',marginBottom:'0.2rem',marginTop:tried||isSaved?'0.5rem':'0'}}>{p.emoji}</span>
                      <p style={{color:tried?'#4ade80':isSaved?'#e07b8a':'white',fontWeight:500,fontSize:'0.78rem',margin:'0 0 0.2rem'}}>{p.name}</p>
                      <div style={{display:'flex',gap:'0.4rem',alignItems:'center'}}>
                        <span style={{color:p.diff==='Fácil'?'#4ade80':p.diff==='Media'?'#fbbf24':'#f87171',fontSize:'0.65rem'}}>{p.diff}</span>
                        {!tried&&<span style={{color:'#d4a017',fontSize:'0.65rem'}}>+{p.pts}</span>}
                      </div>
                      {!tried&&(
                        <div style={{display:'flex',gap:'0.3rem',marginTop:'0.4rem'}}>
                          <button onClick={()=>{const newS=isSaved?saved.filter(s=>s!==p.id):[...saved,p.id];updateData({savedPositions:newS});}} style={{flex:1,background:'none',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',padding:'0.3rem',color:'rgba(200,160,200,0.6)',cursor:'pointer',fontSize:'0.7rem'}}>{isSaved?'❤️':'🤍'}</button>
                          <button onClick={()=>{const newStatus={...posStatus,[p.id]:'tried'};const newPts={...(appData.points||{A:0,B:0}),[partner]:((appData.points?.[partner])||0)+p.pts};const newWP={...(appData.weeklyPoints||{A:0,B:0}),[partner]:((appData.weeklyPoints?.[partner])||0)+p.pts};updateData({positionsStatus:newStatus,points:newPts,weeklyPoints:newWP});}} style={{flex:2,background:'rgba(124,58,237,0.15)',border:'1px solid rgba(124,58,237,0.3)',borderRadius:'8px',padding:'0.3rem',color:'#a78bfa',cursor:'pointer',fontSize:'0.7rem',fontWeight:600}}>✓ Probada</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* RETOS */}
          {section==='retos'&&(
            <div>
              {activatedRetos.length===0?<p style={{color:'rgba(200,160,200,0.4)',textAlign:'center',padding:'2rem',fontSize:'0.85rem'}}>Los retos aparecen cuando caen en una casilla del tablero</p>
              :activatedRetos.map((r,i)=>(
                <div key={i} style={{background:'rgba(168,69,106,0.1)',border:'1px solid rgba(168,69,106,0.25)',borderRadius:'14px',padding:'0.875rem',marginBottom:'0.5rem'}}>
                  <p style={{color:'#e07b8a',fontWeight:600,fontSize:'0.85rem',margin:'0 0 0.25rem'}}>{r.title}</p>
                  <p style={{color:'rgba(220,190,220,0.8)',fontSize:'0.78rem',margin:'0 0 0.35rem',lineHeight:1.3}}>{r.desc}</p>
                  <p style={{color:'rgba(200,160,200,0.4)',fontSize:'0.65rem',margin:0}}>+{r.points} pts · {new Date(r.activatedAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}

          {/* CITAS */}
          {section==='citas'&&(
            <div>
              {activatedCitas.length===0?<p style={{color:'rgba(200,160,200,0.4)',textAlign:'center',padding:'2rem',fontSize:'0.85rem'}}>Las citas y matches de posiciones aparecen aquí</p>
              :activatedCitas.map((c,i)=>(
                <div key={i} style={{background:'rgba(124,58,237,0.1)',border:'1px solid rgba(124,58,237,0.25)',borderRadius:'14px',padding:'0.875rem',marginBottom:'0.5rem'}}>
                  <p style={{color:'#a78bfa',fontWeight:600,fontSize:'0.85rem',margin:'0 0 0.25rem'}}>{c.emoji||'💑'} {c.name||c.title}</p>
                  <p style={{color:'rgba(220,190,220,0.8)',fontSize:'0.78rem',margin:'0 0 0.35rem',lineHeight:1.3}}>{c.desc}</p>
                  {c.type==='positionMatch'&&<span style={{color:'#e07b8a',fontSize:'0.7rem'}}>💞 Match de posición</span>}
                  <p style={{color:'rgba(200,160,200,0.4)',fontSize:'0.65rem',margin:'0.35rem 0 0'}}>{new Date(c.activatedAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// BOTTOM NAV (3 tabs)
// ══════════════════════════════════════════════════════
function BottomNav({active,onChange,unreadMessages}) {
  const tabs=[
    {id:'board',emoji:'🎲',label:'Tablero'},
    {id:'chat', emoji:'💬',label:'Chat', badge:unreadMessages},
  ];
  return(
    <div style={{position:'fixed',bottom:0,left:0,right:0,background:'rgba(13,10,20,0.97)',backdropFilter:'blur(12px)',borderTop:'1px solid rgba(255,255,255,0.07)',display:'grid',gridTemplateColumns:'1fr 1fr',zIndex:100}}>
      {tabs.map(t=>(
        <button key={t.id} onClick={()=>onChange(t.id)} style={{padding:'0.65rem 0.25rem',display:'flex',flexDirection:'column',alignItems:'center',gap:'0.15rem',background:'none',border:'none',cursor:'pointer',position:'relative'}}>
          <div style={{position:'relative',display:'inline-flex'}}>
            <span style={{fontSize:'1.4rem',filter:active===t.id?'drop-shadow(0 0 8px rgba(224,123,138,0.7))':'none'}}>{t.emoji}</span>
            {t.badge>0&&<span style={{position:'absolute',top:'-4px',right:'-6px',background:'#ef4444',color:'white',borderRadius:'50%',minWidth:'16px',height:'16px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.58rem',fontWeight:700,lineHeight:1,padding:'0 2px'}}>{t.badge>9?'9+':t.badge}</span>}
          </div>
          <span style={{color:active===t.id?'#e07b8a':'rgba(150,120,160,0.6)',fontSize:'0.65rem',fontWeight:active===t.id?600:400}}>{t.label}</span>
          {active===t.id&&<div style={{position:'absolute',bottom:0,left:'50%',transform:'translateX(-50%)',width:'24px',height:'3px',borderRadius:'100px',background:'#e07b8a'}} />}
        </button>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════
export default function App() {
  const [screen,setScreen]=useState('loading');
  const [tab,setTab]=useState('board');
  const [partner,setPartner]=useState(null);
  const [appData,setAppData]=useState(null);
  const [coupleCode,setCoupleCode]=useState(null);
  const [pendingCode,setPendingCode]=useState(null);
  const [unreadMessages,setUnreadMessages]=useState(0);
  const [showHistorial,setShowHistorial]=useState(false);
  const subRef=useRef(null);
  const msgSubRef=useRef(null);

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
          const data=dbToApp(row);
          setCoupleCode(savedCode);
          setAppData(data);
          const savedPartner=getLocalPartner(savedCode);
          if(savedPartner){setPartner(savedPartner);setScreen('app');}
          else setScreen('partner_select');
        } else setScreen('splash');
      } else setScreen('splash');
    })();
  },[]);

  // Realtime couple data
  useEffect(()=>{
    if(!coupleCode)return;
    if(subRef.current)subRef.current.unsubscribe();
    subRef.current=supabase.channel('couple_'+coupleCode)
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'couples',filter:'couple_code=eq.'+coupleCode},(payload)=>{
        setAppData(dbToApp(payload.new));
      }).subscribe();
    return()=>{if(subRef.current)subRef.current.unsubscribe();};
  },[coupleCode]);

  // Unread messages
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
        if(payload.new.sender===pKey&&tab!=='chat'){setUnreadMessages(prev=>prev+1);sendNotif('Nuevo mensaje 😏');}
      }).subscribe();
    return()=>{if(msgSubRef.current)msgSubRef.current.unsubscribe();};
  },[coupleCode,partner]);

  if(screen==='loading')return<div style={{minHeight:'100vh',background:'#0d0a14',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{fontSize:'3rem'}} className="pulse">💑</div></div>;
  if(screen==='splash')return<SplashScreen onNext={()=>setScreen('join_or_create')}/>;
  if(screen==='join_or_create')return<JoinOrCreateScreen onCreated={(data,code)=>{setAppData(data);setCoupleCode(code);setPendingCode(code);setScreen('show_code');}} onJoined={(data,code)=>{setAppData(data);setCoupleCode(code);setScreen('partner_select');}}/>;
  if(screen==='show_code')return<CodeDisplayScreen code={pendingCode} onContinue={()=>setScreen('partner_select')}/>;
  if(screen==='partner_select'||!partner)return<PartnerSelectScreen names={appData?.names||{A:'Ella',B:'Él'}} onSelect={(p)=>{setPartner(p);setLocalPartner(coupleCode,p);setScreen('app');setTab('board');}}/>;

  const names=appData?.names||{A:'Ella',B:'Él'};
  const tabProps={appData,partner,updateData};

  return(
    <div style={{minHeight:'100vh',background:'linear-gradient(180deg,#0d0a14,#13091f)',color:'white'}}>
      {/* Header */}
      <div style={{position:'sticky',top:0,background:'rgba(13,10,20,0.93)',backdropFilter:'blur(12px)',borderBottom:'1px solid rgba(255,255,255,0.06)',padding:'0.65rem 1rem',display:'flex',alignItems:'center',justifyContent:'space-between',zIndex:50}}>
        <h1 className="font-display" style={{color:'#f0e8f8',fontSize:'1.2rem',margin:0}}>💑 Nosotros Dos</h1>
        <div style={{display:'flex',alignItems:'center',gap:'0.6rem'}}>
          <span style={{color:'rgba(200,160,200,0.45)',fontSize:'0.68rem'}}>{coupleCode}</span>
          <span style={{color:'rgba(200,160,200,0.7)',fontSize:'0.82rem'}}>{names[partner]}</span>
          <button onClick={()=>{setPartner(null);setLocalPartner(coupleCode,'');setScreen('partner_select');}} style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'50%',width:'28px',height:'28px',display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(200,160,200,0.7)',cursor:'pointer',fontSize:'0.85rem'}}>↩</button>
          <button onClick={()=>setShowHistorial(true)} style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'50%',width:'28px',height:'28px',display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(200,160,200,0.7)',cursor:'pointer',fontSize:'1rem'}}>☰</button>
        </div>
      </div>

      {/* Content */}
      <div style={{paddingBottom:'72px',minHeight:'calc(100vh - 56px)',overflowY:'auto'}}>
        {tab==='board'&&<BoardTab {...tabProps} coupleCode={coupleCode}/>}
        {tab==='chat'&&<ChatTab {...tabProps} coupleCode={coupleCode} onMarkRead={markMessagesRead}/>}
      </div>

      <BottomNav active={tab} onChange={(t)=>{setTab(t);if(t==='chat')markMessagesRead();}} unreadMessages={unreadMessages}/>

      {showHistorial&&<HistorialPanel {...tabProps} onClose={()=>setShowHistorial(false)}/>}
    </div>
  );
}
