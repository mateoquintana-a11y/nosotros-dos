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
  input, textarea { outline: none; }
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
`;
document.head.appendChild(style);

const LOCAL_KEY = "nd_couple_code";
const getLocalCode = () => { try { return localStorage.getItem(LOCAL_KEY); } catch { return null; } };
const setLocalCode = (c) => { try { localStorage.setItem(LOCAL_KEY, c); } catch {} };

const getLastRead = (coupleCode, partner) => { try { return localStorage.getItem(`nd_lastread_${coupleCode}_${partner}`) || '1970-01-01'; } catch { return '1970-01-01'; } };
const setLastRead = (coupleCode, partner) => { try { localStorage.setItem(`nd_lastread_${coupleCode}_${partner}`, new Date().toISOString()); } catch {} };

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
  updated_at: new Date().toISOString(),
});

const DEFAULT_DATA = (names) => ({
  names: names || { A: "Ella", B: "El" },
  points: { A: 0, B: 0 },
  preferences: { A: {}, B: {} },
  completedChallenges: [],
  completedDates: [],
  completedExpress: [],
  savedPositions: [],
  matches: [],
  expressChallenges: [],
});

async function fetchCouple(code) {
  const { data, error } = await supabase.from("couples").select("*").eq("couple_code", code.toUpperCase()).single();
  if (error) return null;
  return data;
}
async function createCouple(code, names) {
  const def = DEFAULT_DATA(names);
  const { data, error } = await supabase.from("couples").insert([{ couple_code: code.toUpperCase(), ...appToDb(def) }]).select().single();
  if (error) return null;
  return data;
}
async function updateCouple(code, updates) {
  await supabase.from("couples").update({ ...appToDb(updates) }).eq("couple_code", code.toUpperCase());
}
function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c = "";
  for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

// ══════════════════════════════════════════════════════
// DATA
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

const CHALLENGES = {
  mild: [
    { id:'m01', title:'Nota escondida 💌', desc:'Escribe una nota romántica y escóndela donde tu pareja la encuentre mañana', points:10, time:'5 min' },
    { id:'m02', title:'Masaje relajante 🤲', desc:'Dale un masaje de 15 minutos sin pedir nada a cambio. Solo dar', points:10, time:'15 min' },
    { id:'m03', title:'Baño con velas 🛁', desc:'Preparen un baño con velas, espuma y música para los dos', points:15, time:'30 min' },
    { id:'m04', title:'Baile en sala 💃', desc:'Bailen juntos en la sala con su canción favorita. Sin excusas', points:10, time:'10 min' },
    { id:'m05', title:'Cena especial 🍷', desc:'Cocinen juntos una cena especial: velas, música y sin teléfonos', points:15, time:'60 min' },
    { id:'m06', title:'Mensajes todo el día 📱', desc:'Mándense mensajes coquetos durante todo el día. Que el otro siempre espere el siguiente', points:10, time:'Todo el día' },
    { id:'m07', title:'5 cosas que amo ❤️', desc:'Dile 5 cosas que te encantan físicamente de tu pareja, con detalle y sin prisa', points:10, time:'5 min' },
    { id:'m08', title:'Look favorito 👗', desc:'Vístete con la ropa que más le gusta a tu pareja y sorpréndelo/a en algún momento del día', points:10, time:'5 min' },
    { id:'m09', title:'Recuérdame 💭', desc:'Cuéntense sus recuerdos favoritos de cuando se conocieron', points:10, time:'15 min' },
    { id:'m10', title:'Cocina para él/ella 🍳', desc:'Prepara su desayuno o cena favorita con todos los detalles. Sin ayuda y sin que lo pida', points:10, time:'30 min' },
    { id:'m11', title:'Rutina de noche juntos 🧴', desc:'Hagan su rutina nocturna juntos: cremas, hablar, sin pantallas. Terminen con un abrazo largo', points:10, time:'20 min' },
    { id:'m12', title:'Detalle sin razón 💐', desc:'Cómprale o prepárale algo pequeño sin ningún motivo especial. Solo porque sí', points:10, time:'5 min' },
  ],
  medium: [
    { id:'med01', title:'Masaje con aceites 🌺', desc:'Masaje por todo el cuerpo con aceites aromáticos. Turnos de 20 min cada uno', points:20, time:'40 min' },
    { id:'med02', title:'Venda y exploración 😶', desc:'Usen una venda en los ojos y explórense con manos y labios. El que tiene la venda solo recibe', points:20, time:'20 min' },
    { id:'med03', title:'Cuento erótico 📖', desc:'Léanse algo erótico en voz alta y compartan sus reacciones en tiempo real', points:15, time:'15 min' },
    { id:'med04', title:'Exploración con hielo 🧊', desc:'Usen hielo para explorar con el frío diferentes zonas del cuerpo del otro', points:20, time:'20 min' },
    { id:'med05', title:'Striptease lento ✨', desc:'Desvístanse el uno al otro muy lentamente, en silencio, sin prisa', points:20, time:'15 min' },
    { id:'med06', title:'Strip preguntas 🃏', desc:'Preguntas íntimas entre los dos: si no respondes pierdes una prenda', points:20, time:'30 min' },
    { id:'med07', title:'Sesión de fotos 📸', desc:'Tómense fotos íntimas y divertidas. Para ustedes dos solamente', points:15, time:'20 min' },
    { id:'med08', title:'Solo labios 💋', desc:'15 minutos cada uno explorando el cuerpo del otro únicamente con los labios', points:25, time:'30 min' },
    { id:'med09', title:'Cuéntame un deseo 🎁', desc:'Dile una cosa específica que quieres que te hagan. El otro escucha y lo cumple', points:20, time:'15 min' },
    { id:'med10', title:'Solo mirarnos 👁️', desc:'5 minutos de contacto visual sostenido sin hablar. Sin reírse. Luego lo que surja', points:20, time:'10 min' },
    { id:'med11', title:'Exploración con calor 🌡️', desc:'Aceite tibio o vela de masaje segura. Explórense con el calor', points:20, time:'20 min' },
    { id:'med12', title:'Ducha juntos con propósito 🚿', desc:'No solo bañarse: con jabón, con tiempo, con atención total al cuerpo del otro', points:20, time:'20 min' },
  ],
  hot: [
    { id:'h01', title:'Nuevo juguete 💜', desc:'Usen un juguete que no hayan probado o que no han usado recientemente', points:30, time:'30+ min' },
    { id:'h02', title:'Posición nueva 🔥', desc:'Prueben una posición de su lista guardada que aún no han intentado', points:25, time:'30+ min' },
    { id:'h03', title:'Frente al espejo 🪞', desc:'Sesión íntima frente a un espejo para explorar visualmente juntos', points:30, time:'30+ min' },
    { id:'h04', title:'Control total 👑', desc:'Turnos de 20 min: el que tiene el turno decide todo. El otro solo dice sí', points:30, time:'40 min' },
    { id:'h05', title:'Masaje íntimo completo 🌡️', desc:'Masaje con aceites calientes por todo el cuerpo, incluyendo todas las zonas', points:30, time:'40 min' },
    { id:'h06', title:'Sí o no en vivo 🎯', desc:'Se proponen cosas en tiempo real y responden: sí, no, o quizás pronto', points:25, time:'20 min' },
    { id:'h07', title:'Sorpresa lista 🎁', desc:'Prepara el ambiente y sorpréndelo/a ya listo/a cuando llegue a la habitación', points:30, time:'Prep 20 min' },
    { id:'h08', title:'Seducción completa 💃', desc:'Música, ropa especial, bailen primero. Dejen que la tensión crezca', points:30, time:'45 min' },
    { id:'h09', title:'Solo exploración 🌊', desc:'Intimidad usando únicamente caricias y besos. Sin llegar al sexo', points:25, time:'30 min' },
    { id:'h10', title:'Grábense 📹', desc:'Sesión con cámara para ustedes dos solos. Para verlo juntos después', points:30, time:'30+ min' },
    { id:'h11', title:'Hablar sucio toda la sesión 🌶️', desc:'Desde el principio hasta el final, sin parar. Los dos. Sin vergüenza', points:30, time:'30+ min' },
    { id:'h12', title:'Posición nueva + juguete 🔀', desc:'Combinen una posición nueva con un juguete. Doble novedad en una sesión', points:30, time:'30+ min' },
  ],
};

const EXPRESS = [
  { id:'e01', title:'Audio secreto 🎙️', desc:'Mándale un audio de voz con algo muy provocador para más tarde esta noche', points:5, time:'2 min' },
  { id:'e02', title:'Promesa escrita 📝', desc:'Una nota con una promesa específica y detallada para esta noche. Sin firmar', points:5, time:'3 min' },
  { id:'e03', title:'El beso cronometrado ⏱️', desc:'Un beso de exactamente 60 segundos. Luego siguen con su día como si nada', points:5, time:'1 min' },
  { id:'e04', title:'Al oído 😏', desc:'Susúrrale algo íntimo al oído mientras están ocupados en otra cosa', points:5, time:'1 min' },
  { id:'e05', title:'Toque secreto 🤭', desc:'Tócale íntimamente de forma sutil mientras hacen algo cotidiano. Continúen como si nada', points:5, time:'1 min' },
  { id:'e06', title:'Foto privada 📷', desc:'Una foto sugerente. Exclusivamente para él/ella. Sin previo aviso', points:8, time:'5 min' },
  { id:'e07', title:'Mini masaje ⚡', desc:'5 minutos de masaje en cuello y hombros. Prométele que continuará en la noche', points:5, time:'5 min' },
  { id:'e08', title:'Fantasía en 3 frases 💭', desc:'Cuéntale en exactamente 3 oraciones lo que le harías si tuvieran 1 hora solos ahora mismo', points:5, time:'3 min' },
  { id:'e09', title:'2 verdades 1 deseo 🎲', desc:'Jueguen "2 verdades y 1 deseo íntimo" por mensajes de texto durante el día', points:8, time:'5 min' },
  { id:'e10', title:'Check-in de deseo 💬', desc:'¿Qué te gustaría que te hiciera en este momento? Respóndanlo ambos sin filtro', points:8, time:'5 min' },
  { id:'e11', title:'Propuesta secreta 🌙', desc:'Dile una cosa específica que quieres hacer con él/ella este fin de semana', points:5, time:'2 min' },
  { id:'e12', title:'Elogio físico 🌹', desc:'Cuéntale 3 cosas específicas de su cuerpo que te vuelven loco/a. Con detalle', points:5, time:'3 min' },
  { id:'e13', title:'Ve al baño y mándale una nude 🚿', desc:'Donde sea que estés ahora mismo. Ve al baño y mándale una foto sin previo aviso', points:8, time:'5 min' },
  { id:'e14', title:'Clip de 15 segundos 🎬', desc:'Grábate haciendo algo sugerente. Mándaselo sin ninguna explicación', points:8, time:'5 min' },
  { id:'e15', title:'Pausa en la rutina 🧦', desc:'Interrúmpelo/a mientras hace algo cotidiano y bésalo/a como si no lo/a hubieras visto en días', points:5, time:'1 min' },
  { id:'e16', title:'Nota en el bolsillo 💌', desc:'Mete una nota descriptiva y atrevida en un bolsillo donde la encuentre después', points:5, time:'3 min' },
  { id:'e17', title:'Alarma secreta 🔔', desc:'Ponle una alarma en el teléfono con una descripción de lo que le harás esta noche', points:5, time:'2 min' },
  { id:'e18', title:'La mirada 🪞', desc:'Sin decir nada, mírale de arriba abajo lentamente y di solo: "esta noche..."', points:5, time:'1 min' },
  { id:'e19', title:'3 palabras 🫦', desc:'Mándale un mensaje con exactamente 3 palabras que lo/la pongan a pensar el resto del día', points:5, time:'2 min' },
  { id:'e20', title:'Check de temperatura 🌡️', desc:'¿Qué tienes ganas de hacer ahora mismo? Ambos responden sin filtro por mensaje', points:8, time:'5 min' },
  { id:'e21', title:'Cuenta regresiva ⏰', desc:'Dile: "en X minutos quiero que estés en el cuarto". Y cumple sin falta', points:5, time:'1 min' },
  { id:'e22', title:'Playlist de esta noche 🔊', desc:'Mándale una playlist de 5 canciones describiéndole el ambiente que quieres crear', points:5, time:'5 min' },
];

const DATES = [
  { id:'d01', title:'Spa en casa', emoji:'🛁', desc:'Máscaras, aceites, música y vino. Cuídense mutuamente', time:'2h', mood:'Relajante', points:20, steps:['Velas y música suave por toda la casa','Máscaras faciales al mismo tiempo','Turnos de masaje con aceites aromáticos','Baño o ducha juntos al final','Copa de vino y conversación sin teléfonos'] },
  { id:'d02', title:'Restaurante en casa', emoji:'🍷', desc:'Delivery favorito, velas, vestidos especial. Como si salieran', time:'1.5h', mood:'Romántico', points:20, steps:['Escojan su restaurante favorito para pedir','Vístanse elegante (en serio)','Velas, música y teléfonos en modo avión','Brindis antes de comer','Un postre especial para compartir'] },
  { id:'d03', title:'Cine + masaje', emoji:'🎬', desc:'El que elige la película da masaje durante toda la película', time:'2h', mood:'Relajante', points:15, steps:['Voten por la película','Preparen snacks especiales','Manta y almohadas en el piso o cama','El masajista no puede parar hasta que termine','Turno a mitad si los dos quieren lo mismo'] },
  { id:'d04', title:'Picnic en sala', emoji:'🧺', desc:'Manta en el piso, luces navideñas y snacks favoritos', time:'1.5h', mood:'Divertido', points:15, steps:['Manta grande en el centro de la sala','Luces navideñas como única iluminación','Snacks y bebidas en canasta o tabla','Playlist especial que los dos aprueben','Juego de cartas o preguntas íntimas'] },
  { id:'d05', title:'Juegos + preguntas', emoji:'🎲', desc:'Juego de mesa + preguntas íntimas como penalización', time:'1.5h', mood:'Divertido', points:15, steps:['Escojan su juego de mesa','Preparen 10 preguntas íntimas en papelitos','Quien pierda un turno responde una pregunta','El gran perdedor cumple un reto del otro','Celebren el cierre con algo especial'] },
  { id:'d06', title:'Chefs por una noche', emoji:'👨‍🍳', desc:'Receta nueva que nunca hayan preparado, con música y vino', time:'2h', mood:'Divertido', points:20, steps:['Busquen juntos una receta nueva','Consigan los ingredientes ese día','Cocinen todo juntos sin dividir tareas','Playlist favorita de fondo','Presenten el plato como en un restaurante'] },
  { id:'d07', title:'Cata en casa', emoji:'🍾', desc:'Cata de vinos o cócteles con quesos, califiquen cada uno', time:'1.5h', mood:'Relajante', points:15, steps:['3-4 vinos o ingredientes para cócteles','Quesos, frutas y botanas','Califiquen del 1 al 10 con notas','El que adivine más características gana','El ganador elige algo para hacer esa noche'] },
  { id:'d08', title:'Karaoke privado', emoji:'🎤', desc:'Las canciones más ridículas y las más románticas', time:'1h', mood:'Divertido', points:15, steps:['YouTube Karaoke en la TV','Regla: 1 romántica por cada 2 ridículas','Puntos al más dramático','Canción final: dedicada al otro','Video obligatorio del momento'] },
  { id:'d09', title:'Primera cita 2.0', emoji:'💑', desc:'Recrear su primera cita desde casa', time:'2h', mood:'Romántico', points:25, steps:['Recuerden cada detalle de su primera cita','Decoren el espacio lo más parecido posible','Usen o imiten la ropa que llevaban','Recreen las conversaciones que tuvieron','Añadan un final alternativo que no tuvieron ese día'] },
  { id:'d10', title:'Sesión fotográfica', emoji:'📸', desc:'Sesión de fotos íntima y divertida, solo para ustedes dos', time:'1h', mood:'Íntimo', points:20, steps:['Varios sets en diferentes partes de la casa','Fotos elegantes primero, luego más divertidas','Cambios de ropa entre sets','Algunas más íntimas para el álbum privado','Elijan su foto favorita y guárdenla'] },
  { id:'d11', title:'Noche de chimenea', emoji:'🔥', desc:'Cobijas en el piso frente a la chimenea, vino y nada de distracciones', time:'2h', mood:'Romántico', points:20, steps:['Prendan la chimenea y apaguen todas las luces','Cobijas y cojines directamente en el piso','Vino o café y algo rico para compartir','Música suave de fondo sin pantallas','Sin agenda: solo estar y ver qué surge'] },
  { id:'d12', title:'Maratón + masaje', emoji:'🍿', desc:'Serie nueva con masaje continuo entre los dos', time:'2h', mood:'Relajante', points:15, steps:['Escojan una serie que ninguno haya visto','Definan quién da masaje los primeros episodios','A la mitad cambian de rol','Aceite o crema de manos disponible','Snacks y bebida sin levantarse del sofá'] },
  { id:'d13', title:'Noche de arte', emoji:'🎨', desc:'Pinten juntos algo totalmente libre con todo el drama', time:'1.5h', mood:'Divertido', points:15, steps:['Consigan pinturas o colores','Cada uno pinta al otro o lo que quiera','Vino o bebida favorita mientras pintan','Al final presenten sus obras con seriedad total','Cuélguenlas en algún lugar de la casa'] },
  { id:'d14', title:'Spa express', emoji:'💆', desc:'Para las noches que tienen poco tiempo pero quieren algo especial', time:'45 min', mood:'Relajante', points:10, steps:['Velas encendidas, teléfonos lejos','Mascarilla facial rápida los dos','15 minutos de masaje cada uno','Ducha o baño juntos al final','Terminen con algo rico y conversación corta'] },
  { id:'d15', title:'Terraza nocturna', emoji:'🌃', desc:'Cobija, bebida, cielo de noche y conversación sin agenda', time:'1h', mood:'Romántico', points:15, steps:['Esperen a que la bebé duerma','Cobija y bebida favorita en la terraza','Teléfonos adentro','Sin tema fijo: hablen de lo que sea','Terminen con un abrazo largo mirando hacia afuera'] },
  { id:'d16', title:'Apuestas íntimas', emoji:'🎰', desc:'Cualquier juego donde cada ronda tiene una apuesta inventada en el momento', time:'1.5h', mood:'Divertido', points:15, steps:['Cualquier juego: cartas, dados, lo que sea','Antes de cada ronda el ganador propone una apuesta','Sin vetar propuestas antes de escucharlas','El gran ganador de la noche elige el cierre','Pueden subir la intensidad de las apuestas con cada ronda'] },
  { id:'d17', title:'Lectura íntima', emoji:'📚', desc:'Cada uno lee al otro algo erótico o que le guste', time:'1h', mood:'Íntimo', points:15, steps:['Cada uno busca algo antes: un párrafo, un poema','Velas y posición cómoda','El primero lee mientras el otro escucha','Compartan qué les generó al escuchar','Si hay algo que quieran explorar: esa es la noche'] },
  { id:'d18', title:'Teatro en casa', emoji:'🎭', desc:'Improv juntos: ridículas primero, luego ven qué surge', time:'1h', mood:'Divertido', points:15, steps:['Empiecen con escenas totalmente ridículas','Regla: siempre decir sí a lo que proponga el otro','Vayan escalando la intensidad gradualmente','No hay guion: solo reaccionar','El único final aceptable es uno que los dos quieran'] },
  { id:'d19', title:'Postre de medianoche', emoji:'🍰', desc:'Cuando la bebé duerma, preparen algo dulce y cómanlo en la cama', time:'45 min', mood:'Romántico', points:10, steps:['Esperen que la bebé esté dormida','Preparen algo dulce juntos','Cómanlo en la cama sin mesita de noche','Sin teléfonos, sin TV','Solo los dos, la oscuridad y algo rico'] },
  { id:'d20', title:'Mañana lenta', emoji:'🛌', desc:'Un domingo sin alarmas ni teléfonos. Solo los dos', time:'Mañana entera', mood:'Íntimo', points:20, steps:['Sin alarma. Que el cuerpo despierte solo','Teléfonos fuera de la habitación hasta el mediodía','Desayuno en la cama si pueden','Sin planes ni agenda','Solo estar presentes el uno con el otro'] },
];

const POSITIONS = [
  { id:'p01', name:'Cowgirl invertida', emoji:'🔄', diff:'Media', cat:'Ella arriba', desc:'Ella arriba mirando hacia los pies de él. Estimulación diferente y muy visual.', tip:'Ella puede apoyarse en los muslos de él para mayor control. Estimulación completamente diferente al cowgirl tradicional.' },
  { id:'p02', name:'Mariposa', emoji:'🦋', diff:'Media', cat:'Variante', desc:'Ella al borde de la cama, él de pie. Buena profundidad y contacto visual continuo.', tip:'Él puede elevar sus piernas a diferentes alturas para cambiar el ángulo completamente.' },
  { id:'p03', name:'Piernas al hombro', emoji:'🦵', diff:'Media', cat:'Misionero+', desc:'Misionero con las piernas de ella sobre los hombros de él. Penetración más profunda.', tip:'Empiecen con solo una pierna al hombro para calibrar la comodidad primero.' },
  { id:'p04', name:'Águila', emoji:'🦅', diff:'Media', cat:'Misionero+', desc:'Ella boca arriba con piernas muy abiertas, él sobre ella. Cara a cara, profunda e íntima.', tip:'Una almohada bajo la cadera de ella cambia el ángulo completamente hacia el punto G.' },
  { id:'p05', name:'Cuchara profunda', emoji:'🥄', diff:'Fácil', cat:'De lado', desc:'Cucharita donde ella echa la pierna de arriba hacia atrás sobre la cadera de él.', tip:'Ambos tienen manos libres para estimulación adicional en esta posición.' },
  { id:'p06', name:'Movimiento trasero', emoji:'🍑', diff:'Fácil', cat:'Trasera', desc:'Ella boca abajo con caderas levantadas, él encima. Ideal para vibrador de pareja.', tip:'Un cojín bajo el abdomen de ella ayuda a mantener la posición. El vibrador queda perfecto aquí.' },
  { id:'p07', name:'Doggy Style', emoji:'🐕', diff:'Fácil', cat:'Trasera', desc:'Ella en cuatro, él detrás. Profundo con acceso total de manos y juguetes.', tip:'Bajar el torso de ella aumenta la estimulación del punto G. Él puede llegar al clítoris fácilmente.' },
  { id:'p08', name:'Doble penetración', emoji:'💜', diff:'Difícil', cat:'Juguetes', desc:'Ella con caderas elevadas por almohadas, él desde atrás, con juguete adicional al frente.', tip:'Empiecen con el juguete ya en posición antes de que él entre. La comunicación es clave aquí.' },
  { id:'p09', name:'Superior femenina', emoji:'👑', diff:'Fácil', cat:'Ella arriba', desc:'Ella arriba inclinada hacia adelante, cara a cara. Control total desde ella.', tip:'Inclinarse más hacia adelante aumenta la fricción en el clítoris. Él tiene las manos libres.' },
  { id:'p10', name:'Perrito plano', emoji:'🛏️', diff:'Fácil', cat:'Trasera', desc:'Ella completamente boca abajo, él encima como una manta. Máximo contacto corporal.', tip:'Ella puede elevar solo las caderas para aumentar la profundidad cuando quieran más.' },
  { id:'p11', name:'Cuna', emoji:'🪷', diff:'Media', cat:'Sentada', desc:'Él sentado con piernas cruzadas, ella en su regazo mirándolo. Muy íntimo.', tip:'El movimiento es circular más que de vaivén. Los dos pueden abrazarse completamente.' },
  { id:'p12', name:'Arrodillado frente a frente', emoji:'🙏', diff:'Media', cat:'Sentada', desc:'Él arrodillado, ella encima a horcajadas mirándolo. Control desde ella, cara a cara.', tip:'Él puede apoyarse en sus talones para estabilidad. Sus manos quedan libres para explorar.' },
  { id:'p13', name:'Al borde', emoji:'🛋️', diff:'Fácil', cat:'Trasera', desc:'Ella doblada sobre el brazo del sofá, él detrás de pie. Espontáneo y apasionado.', tip:'La altura del brazo del sofá determina el ángulo. Ajustar los pies de ella cambia todo.' },
  { id:'p14', name:'Caderas elevadas', emoji:'🌉', diff:'Fácil', cat:'Variante', desc:'Ella boca arriba con caderas sobre almohada firme, él arrodillado. Ángulo hacia el punto G.', tip:'Experimentar con más o menos almohadas cambia el ángulo completamente. Comunicación clave.' },
  { id:'p15', name:'La reina', emoji:'👸', diff:'Media', cat:'Oral', desc:'Ella se sienta sobre la cara de él para recibir sexo oral. Él recostado con acceso completo.', tip:'Ella controla completamente la presión y el movimiento. Él puede usar manos y lengua a la vez.' },
  { id:'p16', name:'Bajo el capó', emoji:'🛠️', diff:'Media', cat:'Oral', desc:'Él recostado con cabeza colgando al borde de la cama, ella en cuclillas sobre su cara.', tip:'La posición invertida de él reduce tensión en el cuello y da un ángulo diferente.' },
  { id:'p17', name:'Peepshow', emoji:'🎭', diff:'Media', cat:'Oral', desc:'Ella recostada de lado, él perpendicular entre sus piernas para oral desde ángulo diferente.', tip:'Da acceso fácil a estimulación adicional con manos. Ideal para sesiones largas.' },
  { id:'p18', name:'Tabla encima', emoji:'💪', diff:'Difícil', cat:'Trasera', desc:'Él en posición de plancha encima de ella. Muy intenso, requiere fuerza real de core.', tip:'Transicionen a rodillas cuando se canse. Ella puede envolverlo con las piernas para ayudarlo.' },
  { id:'p19', name:'Posición polo', emoji:'🔀', diff:'Media', cat:'Ella arriba', desc:'Ella encima montando solo una pierna de él. Ángulo único, manos libres para ambos.', tip:'Ella baja muy cuidadosamente. El ángulo permite giros que el cowgirl normal no permite.' },
  { id:'p20', name:'Oral inverso', emoji:'🔁', diff:'Media', cat:'Oral', desc:'Ella boca abajo, él la estimula oralmente desde atrás. Acceso diferente al clítoris.', tip:'Ella puede apoyarse en sus codos. Él puede alternarse entre zonas con total libertad.' },
  { id:'p21', name:'Suplex oral', emoji:'🌊', diff:'Media', cat:'Oral', desc:'Él sentado al borde, ella boca arriba con caderas sobre sus piernas, él se inclina.', tip:'Este ángulo reduce la tensión de cuello de él completamente. La elevación cambia la sensación.' },
];

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

// ── Express helpers ──
const EXPRESS_WINDOW_MS  = 24 * 60 * 60 * 1000; // 24h
const EXPRESS_BONUS_MS   = 10 * 60 * 1000;       // 10min
const getTimeLeft = (sentAt) => {
  const ms = EXPRESS_WINDOW_MS - (Date.now() - new Date(sentAt).getTime());
  return ms > 0 ? ms : 0;
};
const formatCountdown = (ms) => {
  if(ms<=0) return '00:00';
  const totalSec = Math.floor(ms/1000);
  const h = Math.floor(totalSec/3600);
  const m = Math.floor((totalSec%3600)/60);
  const s = totalSec%60;
  if(h>0) return `${h}h ${m.toString().padStart(2,'0')}m`;
  return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
};

// ══════════════════════════════════════════════════════
// SETUP SCREENS
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
  const [nameA,setNameA]=useState('');
  const [nameB,setNameB]=useState('');
  const [code,setCode]=useState('');
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
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
    if(!row){setError('Código no encontrado. Verifica e intenta de nuevo.');setLoading(false);return;}
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
      <div style={{...card}}>
        <button onClick={()=>setMode(null)} style={{background:'none',border:'none',color:'rgba(200,160,200,0.7)',fontSize:'0.85rem',padding:'0 0 1rem',display:'block',cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>← Volver</button>
        <h3 className="font-display" style={{color:'#f0e8f8',fontSize:'1.5rem',margin:'0 0 1.25rem'}}>Crear pareja ✨</h3>
        {[['👩 Nombre de ella',nameA,setNameA],['👨 Nombre de él',nameB,setNameB]].map(([lbl,val,set])=>(
          <div key={lbl} style={{marginBottom:'0.875rem'}}>
            <label style={{color:'#c89fd4',fontSize:'0.78rem',fontWeight:500,display:'block',marginBottom:'0.4rem'}}>{lbl}</label>
            <input style={inp} placeholder="Nombre..." value={val} onChange={e=>set(e.target.value)} />
          </div>
        ))}
        {error&&<p style={{color:'#f87171',fontSize:'0.8rem',margin:'0.5rem 0'}}>{error}</p>}
        <button onClick={handleCreate} disabled={loading||!nameA.trim()||!nameB.trim()} style={{width:'100%',background:(loading||!nameA.trim()||!nameB.trim())?'rgba(255,255,255,0.08)':'linear-gradient(135deg,#a8456a,#7c3aed)',color:(loading||!nameA.trim()||!nameB.trim())?'rgba(255,255,255,0.3)':'white',fontFamily:'DM Sans,sans-serif',fontWeight:600,fontSize:'1rem',padding:'1rem',borderRadius:'14px',border:'none',cursor:(loading||!nameA.trim()||!nameB.trim())?'default':'pointer',marginTop:'0.5rem'}}>
          {loading?<span className="spin">⏳</span>:'Crear y obtener código'}
        </button>
      </div>
    </div>
  );

  return(
    <div style={{minHeight:'100vh',background:'linear-gradient(160deg,#0d0a14,#1a0d2e,#0d0a14)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'2rem'}}>
      <div style={{...card}}>
        <button onClick={()=>setMode(null)} style={{background:'none',border:'none',color:'rgba(200,160,200,0.7)',fontSize:'0.85rem',padding:'0 0 1rem',display:'block',cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>← Volver</button>
        <h3 className="font-display" style={{color:'#f0e8f8',fontSize:'1.5rem',margin:'0 0 0.5rem'}}>Unirme 🔗</h3>
        <p style={{color:'rgba(180,150,200,0.6)',fontSize:'0.82rem',margin:'0 0 1.25rem',lineHeight:1.4}}>Pídele a tu pareja el código de 6 letras</p>
        <input style={{...inp,textTransform:'uppercase',letterSpacing:'0.15em',fontSize:'1.2rem',textAlign:'center'}} placeholder="XXXXXX" maxLength={6} value={code} onChange={e=>setCode(e.target.value.toUpperCase())} />
        {error&&<p style={{color:'#f87171',fontSize:'0.8rem',margin:'0.5rem 0'}}>{error}</p>}
        <button onClick={handleJoin} disabled={loading||code.length<6} style={{width:'100%',background:(loading||code.length<6)?'rgba(255,255,255,0.08)':'linear-gradient(135deg,#a8456a,#7c3aed)',color:(loading||code.length<6)?'rgba(255,255,255,0.3)':'white',fontFamily:'DM Sans,sans-serif',fontWeight:600,fontSize:'1rem',padding:'1rem',borderRadius:'14px',border:'none',cursor:(loading||code.length<6)?'default':'pointer',marginTop:'0.875rem'}}>
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
        <p style={{color:'rgba(180,150,200,0.6)',fontSize:'0.85rem',margin:0}}>Selecciona tu perfil para continuar</p>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem',width:'100%',maxWidth:'300px'}}>
        {[['A','👩',names.A,'rgba(168,69,106,0.2)','rgba(168,69,106,0.4)'],['B','👨',names.B,'rgba(124,58,237,0.2)','rgba(124,58,237,0.4)']].map(([key,em,name,bg,bdr])=>(
          <button key={key} onClick={()=>onSelect(key)} style={{background:bg,border:`1px solid ${bdr}`,borderRadius:'20px',padding:'1.75rem 1rem',display:'flex',flexDirection:'column',alignItems:'center',gap:'0.75rem',cursor:'pointer'}}>
            <span style={{fontSize:'2.5rem'}}>{em}</span>
            <span style={{color:'white',fontWeight:500,fontFamily:'DM Sans,sans-serif',fontSize:'1rem'}}>{name}</span>
          </button>
        ))}
      </div>
      <p style={{color:'rgba(180,150,200,0.35)',fontSize:'0.72rem',marginTop:'2rem',textAlign:'center',maxWidth:'220px',lineHeight:1.5}}>Sus respuestas se guardan por separado para crear matches sorpresa ✨</p>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// AUDIO PLAYER
// ══════════════════════════════════════════════════════
function AudioPlayer({url,isMe}) {
  const [playing,setPlaying]=useState(false);
  const [progress,setProgress]=useState(0);
  const [duration,setDuration]=useState(0);
  const audioRef=useRef(null);

  useEffect(()=>{
    const a=new Audio(url);
    audioRef.current=a;
    a.addEventListener('loadedmetadata',()=>setDuration(a.duration));
    a.addEventListener('timeupdate',()=>setProgress(a.currentTime/a.duration*100));
    a.addEventListener('ended',()=>{setPlaying(false);setProgress(0);});
    return()=>{a.pause();a.src='';};
  },[url]);

  const toggle=()=>{
    const a=audioRef.current;
    if(!a)return;
    if(playing){a.pause();setPlaying(false);}
    else{a.play();setPlaying(true);}
  };

  const fmt=(s)=>{if(!s||isNaN(s))return'0:00';const m=Math.floor(s/60);const sec=Math.floor(s%60);return`${m}:${sec.toString().padStart(2,'0')}`;};

  return(
    <div style={{display:'flex',alignItems:'center',gap:'0.6rem',minWidth:'180px'}}>
      <button onClick={toggle} style={{background:'rgba(255,255,255,0.15)',border:'none',borderRadius:'50%',width:'36px',height:'36px',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:'1rem',flexShrink:0,color:'white'}}>
        {playing?'⏸':'▶'}
      </button>
      <div style={{flex:1,display:'flex',flexDirection:'column',gap:'0.25rem'}}>
        <div style={{background:'rgba(255,255,255,0.2)',borderRadius:'100px',height:'4px',overflow:'hidden',cursor:'pointer'}} onClick={e=>{
          const rect=e.currentTarget.getBoundingClientRect();
          const pct=(e.clientX-rect.left)/rect.width;
          if(audioRef.current){audioRef.current.currentTime=pct*audioRef.current.duration;}
        }}>
          <div style={{background:'white',height:'100%',width:`${progress}%`,borderRadius:'100px',transition:'width 0.1s'}} />
        </div>
        <span style={{color:'rgba(255,255,255,0.6)',fontSize:'0.65rem'}}>{fmt(duration)}</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// CONVERSATION VIEW
// ══════════════════════════════════════════════════════
function ConversationView({appData,partner,coupleCode,onBack,onMarkRead}) {
  const pKey=partner==='A'?'B':'A';
  const names=appData.names||{A:'Ella',B:'Él'};
  const [messages,setMessages]=useState([]);
  const [input,setInput]=useState('');
  const [cited,setCited]=useState(null);
  const [showQs,setShowQs]=useState(false);
  const [loading,setLoading]=useState(true);
  const [recording,setRecording]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [viewedPhotos,setViewedPhotos]=useState({});
  const bottomRef=useRef(null);
  const inputRef=useRef(null);
  const mediaRecRef=useRef(null);
  const chunksRef=useRef([]);
  const fileInputRef=useRef(null);

  const prefsA=appData.preferences?.A||{};
  const prefsB=appData.preferences?.B||{};
  const discussable=QUESTIONS.filter(q=>{
    const a=prefsA[q.id]; const b=prefsB[q.id];
    if(a===false||b===false)return false;
    if(a===undefined&&b===undefined)return false;
    return true;
  });
  const qStatus=(q)=>{
    const a=prefsA[q.id]; const b=prefsB[q.id];
    if(a===true&&b===true)return'match';
    if(a===true||b===true)return'interest';
    return'maybe';
  };

  const loadMessages=async()=>{
    const {data}=await supabase.from('messages').select('*').eq('couple_code',coupleCode).order('created_at',{ascending:true}).limit(100);
    setMessages(data||[]);
    setLoading(false);
    setLastRead(coupleCode,partner);
    if(onMarkRead)onMarkRead();
  };

  useEffect(()=>{loadMessages();},[coupleCode]);
  useEffect(()=>{if(!loading)setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:'smooth'}),100);},[messages,loading]);
  useEffect(()=>{
    const sub=supabase.channel('msgs_'+coupleCode+'_'+Date.now())
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:'couple_code=eq.'+coupleCode},(payload)=>{
        setMessages(prev=>prev.find(m=>m.id===payload.new.id)?prev:[...prev,payload.new]);
        setLastRead(coupleCode,partner);
        if(onMarkRead)onMarkRead();
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'messages',filter:'couple_code=eq.'+coupleCode},(payload)=>{
        setMessages(prev=>prev.map(m=>m.id===payload.new.id?payload.new:m));
      })
      .subscribe();
    return()=>sub.unsubscribe();
  },[coupleCode]);

  const getSignedUrl=async(path)=>{
    const {data}=await supabase.storage.from('chat-media').createSignedUrl(path,300);
    return data?.signedUrl||null;
  };

  const send=async(extraFields={})=>{
    const text=input.trim();
    if(!text&&!extraFields.media_url)return;
    const msg={couple_code:coupleCode,sender:partner,content:text||'',cited_question_id:cited?.id||null,viewed_by:[partner],...extraFields};
    setInput('');setCited(null);
    await supabase.from('messages').insert([msg]);
  };

  const cancelRecording=()=>{
    if(mediaRecRef.current&&recording){
      // Remove onstop handler so it doesn't upload
      mediaRecRef.current.onstop=null;
      mediaRecRef.current.stop();
      chunksRef.current=[];
      setRecording(false);
    }
  };

  // ── AUDIO ──
  const toggleRecording=async()=>{
    if(recording){
      // Stop and send
      if(mediaRecRef.current) mediaRecRef.current.stop();
      setRecording(false);
    } else {
      // Start recording
      try{
        const stream=await navigator.mediaDevices.getUserMedia({audio:true});
        const mimeType=MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ?'audio/webm;codecs=opus'
          :MediaRecorder.isTypeSupported('audio/webm')
          ?'audio/webm'
          :'audio/mp4';
        const mr=new MediaRecorder(stream,{mimeType});
        chunksRef.current=[];
        mr.ondataavailable=e=>{if(e.data&&e.data.size>0)chunksRef.current.push(e.data);};
        mr.onstop=async()=>{
          stream.getTracks().forEach(t=>t.stop());
          if(chunksRef.current.length===0)return;
          const blob=new Blob(chunksRef.current,{type:mimeType});
          if(blob.size<1000)return; // too short, ignore
          await uploadAudio(blob,mimeType);
        };
        mr.start(100); // collect data every 100ms
        mediaRecRef.current=mr;
        setRecording(true);
      }catch(e){
        alert('No se pudo acceder al micrófono. Verifica los permisos en tu navegador.');
      }
    }
  };

  const uploadAudio=async(blob,mimeType)=>{
    setUploading(true);
    const ext=mimeType.includes('webm')?'webm':'mp4';
    const path=`${coupleCode}/${Date.now()}_audio.${ext}`;
    const {error}=await supabase.storage.from('chat-media').upload(path,blob,{contentType:mimeType});
    if(!error)await send({media_url:path,media_type:'audio',content:'🎙️ Nota de voz'});
    setUploading(false);
  };

  // ── PHOTO ──
  const handlePhoto=async(e)=>{
    const file=e.target.files?.[0];
    if(!file)return;
    setUploading(true);
    const ext=file.name.split('.').pop()||'jpg';
    const path=`${coupleCode}/${Date.now()}_photo.${ext}`;
    const {error}=await supabase.storage.from('chat-media').upload(path,file,{contentType:file.type});
    if(!error)await send({media_url:path,media_type:'photo',content:'📷 Foto (ver 1 vez)'});
    setUploading(false);
    e.target.value='';
  };

  const viewPhoto=async(msg)=>{
    if(viewedPhotos[msg.id])return;
    const url=await getSignedUrl(msg.media_url);
    if(!url)return;
    setViewedPhotos(prev=>({...prev,[msg.id]:url}));
    // Mark as viewed by this partner
    const newViewedBy=[...(msg.viewed_by||[])];
    if(!newViewedBy.includes(partner))newViewedBy.push(partner);
    await supabase.from('messages').update({viewed_by:newViewedBy}).eq('id',msg.id);
    // If both have seen it, delete file from storage
    const bothSeen=newViewedBy.includes('A')&&newViewedBy.includes('B');
    if(bothSeen){
      await supabase.storage.from('chat-media').remove([msg.media_url]);
    }
  };

  const statusGroups=[
    {key:'match',label:'💞 Match — los dos dijeron sí'},
    {key:'interest',label:'✨ Para conversar — uno sí, otro quizás'},
    {key:'maybe',label:'❓ Los dos dijeron quizás'},
  ];

  const renderMessage=(msg,i)=>{
    const isMe=msg.sender===partner;
    const citedQ=msg.cited_question_id?QUESTIONS.find(q=>q.id===msg.cited_question_id):null;
    const showName=i===0||messages[i-1]?.sender!==msg.sender;
    const bubbleBg=isMe?'linear-gradient(135deg,#a8456a,#7c3aed)':'rgba(255,255,255,0.09)';
    const bubbleRadius=isMe?'18px 18px 4px 18px':'18px 18px 18px 4px';

    const renderContent=()=>{
      if(msg.media_type==='audio'){
        if(!msg.media_url)return<span style={{color:'rgba(255,255,255,0.5)',fontSize:'0.8rem'}}>Audio no disponible</span>;
        return<AudioUrlLoader path={msg.media_url} isMe={isMe} />;
      }
      if(msg.media_type==='photo'){
        const alreadyViewed=(msg.viewed_by||[]).includes(partner);
        const localUrl=viewedPhotos[msg.id];
        if(localUrl){
          return(
            <div>
              <img src={localUrl} alt="foto" style={{maxWidth:'200px',maxHeight:'200px',borderRadius:'10px',display:'block'}} onLoad={()=>{}} />
              <p style={{color:'rgba(255,255,255,0.5)',fontSize:'0.65rem',margin:'0.3rem 0 0'}}>Vista ✓ — desaparecerá cuando ambos la vean</p>
            </div>
          );
        }
        if(alreadyViewed&&!isMe){
          return<span style={{color:'rgba(255,255,255,0.5)',fontSize:'0.82rem'}}>📷 Ya viste esta foto</span>;
        }
        if(!alreadyViewed&&!isMe){
          return(
            <button onClick={()=>viewPhoto(msg)} style={{background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.25)',borderRadius:'12px',padding:'0.75rem 1.25rem',color:'white',cursor:'pointer',fontFamily:'DM Sans,sans-serif',fontSize:'0.85rem',fontWeight:500}}>
              👁️ Ver foto (1 vez)
            </button>
          );
        }
        // sent by me
        const theyViewed=(msg.viewed_by||[]).includes(pKey);
        return<span style={{color:'rgba(255,255,255,0.8)',fontSize:'0.82rem'}}>📷 Foto enviada {theyViewed?'· Vista ✓':'· Esperando...'}</span>;
      }
      return<span style={{fontSize:'0.9rem',lineHeight:1.4,wordBreak:'break-word'}}>{msg.content}</span>;
    };

    return(
      <div key={msg.id} style={{display:'flex',flexDirection:'column',alignItems:isMe?'flex-end':'flex-start'}}>
        {showName&&<p style={{color:'rgba(200,160,200,0.5)',fontSize:'0.7rem',margin:'0 0 0.25rem',padding:isMe?'0 0.25rem 0 0':'0 0 0 0.25rem'}}>{names[msg.sender]}</p>}
        <div style={{maxWidth:'82%',display:'flex',flexDirection:'column',alignItems:isMe?'flex-end':'flex-start',gap:'0.2rem'}}>
          {citedQ&&(
            <div style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'0.4rem 0.65rem',fontSize:'0.72rem',color:'rgba(200,160,200,0.7)',lineHeight:1.3}}>
              💬 {citedQ.text}
            </div>
          )}
          <div style={{background:bubbleBg,borderRadius:bubbleRadius,padding:'0.625rem 0.875rem',color:'white'}}>
            {renderContent()}
          </div>
        </div>
      </div>
    );
  };

  return(
    <div style={{position:'fixed',inset:0,zIndex:300,background:'linear-gradient(180deg,#0d0a14,#13091f)',display:'flex',flexDirection:'column'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:'0.75rem',padding:'0.875rem 1rem',borderBottom:'1px solid rgba(255,255,255,0.06)',background:'rgba(13,10,20,0.95)',flexShrink:0}}>
        <button onClick={onBack} style={{background:'none',border:'none',color:'rgba(200,160,200,0.8)',cursor:'pointer',fontSize:'1.3rem',padding:'0.25rem',display:'flex',alignItems:'center'}}>←</button>
        <div style={{flex:1}}>
          <h3 className="font-display" style={{color:'white',fontSize:'1.2rem',margin:0}}>Conversemos 💬</h3>
          <p style={{color:'rgba(200,160,200,0.5)',fontSize:'0.7rem',margin:0}}>{discussable.length} temas · fotos se ven 1 vez · audios desaparecen al verse los dos</p>
        </div>
        <button onClick={()=>setShowQs(!showQs)} style={{background:showQs?'rgba(197,110,140,0.2)':'rgba(255,255,255,0.07)',border:`1px solid ${showQs?'rgba(197,110,140,0.4)':'rgba(255,255,255,0.1)'}`,borderRadius:'100px',color:showQs?'#e07b8a':'rgba(200,160,200,0.7)',fontSize:'0.75rem',padding:'0.35rem 0.75rem',cursor:'pointer',fontFamily:'DM Sans,sans-serif'}}>
          Temas {showQs?'↑':'↓'}
        </button>
      </div>

      {/* Questions panel */}
      {showQs&&(
        <div style={{background:'rgba(255,255,255,0.03)',borderBottom:'1px solid rgba(255,255,255,0.06)',padding:'0.75rem 1rem',maxHeight:'220px',overflowY:'auto',flexShrink:0}}>
          {discussable.length===0?(<p style={{color:'rgba(200,160,200,0.5)',fontSize:'0.82rem',margin:0,textAlign:'center',padding:'1rem 0'}}>Aún no hay temas. Ambos deben responder preguntas primero.</p>)
          :statusGroups.map(({key,label})=>{
            const qs=discussable.filter(q=>qStatus(q)===key);
            if(qs.length===0)return null;
            return(
              <div key={key} style={{marginBottom:'0.875rem'}}>
                <p style={{color:'rgba(200,160,200,0.5)',fontSize:'0.68rem',fontWeight:600,margin:'0 0 0.4rem',textTransform:'uppercase',letterSpacing:'0.05em'}}>{label}</p>
                <div style={{display:'flex',flexDirection:'column',gap:'0.3rem'}}>
                  {qs.map(q=>(
                    <button key={q.id} onClick={()=>{setCited(q);setShowQs(false);inputRef.current?.focus();}} style={{background:cited?.id===q.id?'rgba(197,110,140,0.2)':'rgba(255,255,255,0.05)',border:`1px solid ${cited?.id===q.id?'rgba(197,110,140,0.4)':'rgba(255,255,255,0.07)'}`,borderRadius:'10px',padding:'0.5rem 0.75rem',textAlign:'left',cursor:'pointer',color:'rgba(240,220,240,0.9)',fontSize:'0.78rem',lineHeight:1.4,fontFamily:'DM Sans,sans-serif'}}>
                      {q.text}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Messages */}
      <div style={{flex:1,overflowY:'auto',padding:'1rem',display:'flex',flexDirection:'column',gap:'0.75rem'}}>
        {loading?(
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%'}}>
            <span style={{color:'rgba(200,160,200,0.5)',fontSize:'0.9rem'}} className="pulse">Cargando...</span>
          </div>
        ):messages.length===0?(
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',textAlign:'center',padding:'2rem'}}>
            <div style={{fontSize:'3rem',marginBottom:'0.75rem'}}>💬</div>
            <p style={{color:'rgba(200,160,200,0.7)',margin:'0 0 0.5rem',fontWeight:500,fontFamily:'DM Sans,sans-serif'}}>¡Empiecen la conversación!</p>
            <p style={{color:'rgba(200,160,200,0.4)',fontSize:'0.82rem',margin:0}}>Texto, notas de voz o fotos de un solo uso</p>
          </div>
        ):messages.map((msg,i)=>renderMessage(msg,i))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{padding:'0.75rem 1rem',borderTop:'1px solid rgba(255,255,255,0.06)',background:'rgba(13,10,20,0.95)',flexShrink:0,paddingBottom:'max(0.75rem,env(safe-area-inset-bottom,0.75rem))'}}>
        {cited&&(
          <div style={{display:'flex',alignItems:'center',gap:'0.5rem',background:'rgba(197,110,140,0.1)',border:'1px solid rgba(197,110,140,0.25)',borderRadius:'10px',padding:'0.4rem 0.75rem',marginBottom:'0.5rem'}}>
            <span style={{color:'#e07b8a',fontSize:'0.72rem',flex:1,lineHeight:1.3}}>💬 {cited.text}</span>
            <button onClick={()=>setCited(null)} style={{background:'none',border:'none',color:'rgba(200,160,200,0.5)',cursor:'pointer',fontSize:'1rem',padding:0,flexShrink:0}}>✕</button>
          </div>
        )}
        {uploading&&(
          <div style={{textAlign:'center',padding:'0.4rem',color:'#fbbf24',fontSize:'0.8rem',fontFamily:'DM Sans,sans-serif'}} className="pulse">Subiendo... ⏳</div>
        )}
        <div style={{display:'flex',gap:'0.4rem',alignItems:'center'}}>
          {/* Cámara directa */}
          <button onClick={()=>fileInputRef.current?.click()} disabled={uploading||recording} style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'50%',width:'40px',height:'40px',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:'1.1rem',flexShrink:0,color:'rgba(200,160,200,0.8)'}}>
            📷
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{display:'none'}} onChange={handlePhoto} />

          {/* Audio button — tap to start, tap again to stop & send */}
          <button
            onClick={toggleRecording}
            disabled={uploading}
            style={{background:recording?'rgba(239,68,68,0.35)':'rgba(255,255,255,0.07)',border:`1px solid ${recording?'rgba(239,68,68,0.6)':'rgba(255,255,255,0.1)'}`,borderRadius:'50%',width:'40px',height:'40px',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:'1.1rem',flexShrink:0,color:recording?'#f87171':'rgba(200,160,200,0.8)',transition:'all 0.15s'}}>
            {recording?'⏹':'🎙️'}
          </button>

          {/* Cancel recording — only shows while recording */}
          {recording&&(
            <button onClick={cancelRecording} style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'50%',width:'40px',height:'40px',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:'1rem',flexShrink:0,color:'rgba(200,160,200,0.6)'}}>
              🗑️
            </button>
          )}

          {/* Text input */}
          <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}}
            placeholder={recording?'Grabando — toca ⏹ para enviar':'Escribe algo...'}
            disabled={recording}
            style={{flex:1,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'14px',padding:'0.75rem 1rem',color:'white',fontFamily:'DM Sans,sans-serif',fontSize:'0.9rem'}} />

          {/* Send button */}
          <button onClick={()=>send()} disabled={!input.trim()||recording||uploading} style={{background:(input.trim()&&!recording&&!uploading)?'linear-gradient(135deg,#a8456a,#7c3aed)':'rgba(255,255,255,0.08)',border:'none',borderRadius:'50%',width:'40px',height:'40px',display:'flex',alignItems:'center',justifyContent:'center',cursor:(input.trim()&&!recording&&!uploading)?'pointer':'default',fontSize:'1rem',flexShrink:0,color:'white'}}>
            ➤
          </button>
        </div>
        {recording&&<p style={{color:'#f87171',fontSize:'0.72rem',textAlign:'center',margin:'0.4rem 0 0',fontFamily:'DM Sans,sans-serif'}}>🔴 Grabando — ⏹ para enviar · 🗑️ para cancelar</p>}
      </div>
    </div>
  );
}

// Loads signed URL for audio lazily
function AudioUrlLoader({path,isMe}) {
  const [url,setUrl]=useState(null);
  useEffect(()=>{
    (async()=>{
      const {data}=await supabase.storage.from('chat-media').createSignedUrl(path,300);
      if(data?.signedUrl)setUrl(data.signedUrl);
    })();
  },[path]);
  if(!url)return<span style={{color:'rgba(255,255,255,0.5)',fontSize:'0.8rem'}} className="pulse">Cargando audio...</span>;
  return<AudioPlayer url={url} isMe={isMe} />;
}

// ══════════════════════════════════════════════════════
// HOME TAB
// ══════════════════════════════════════════════════════
function HomeTab({appData,partner}) {
  const names=appData.names||{A:'Ella',B:'Él'};
  const pts=appData.points||{A:0,B:0};
  const total=(pts.A||0)+(pts.B||0);
  const level=getLevel(total);
  const nextLevel=LEVELS.find(l=>l.min>total);
  const progress=nextLevel?((total-level.min)/(nextLevel.min-level.min))*100:100;
  const matches=appData.matches||[];
  const pKey=partner==='A'?'B':'A';
  const expressChallenges=appData.expressChallenges||[];
  const pendingForMe=expressChallenges.filter(c=>c.to===partner&&!c.completed&&!c.expired&&getTimeLeft(c.sentAt)>0);
  const completed=(appData.completedChallenges||[]).length+(appData.completedDates||[]).length+(appData.completedExpress||[]).length;
  const saved=(appData.savedPositions||[]).length;
  const allC=[...CHALLENGES.mild,...CHALLENGES.medium,...CHALLENGES.hot];
  const done=appData.completedChallenges||[];
  const avail=allC.filter(c=>!done.includes(c.id));
  const suggested=avail[Math.floor(Date.now()/86400000)%Math.max(avail.length,1)];

  // Sunday penalty
  const isSunday=new Date().getDay()===0;
  const myPts=pts[partner]||0;
  const theirPts=pts[pKey]||0;
  const isBehind=myPts<theirPts;
  const isTied=myPts===theirPts;

  return(
    <div style={{padding:'1rem',display:'flex',flexDirection:'column',gap:'1rem'}}>
      {/* Sunday card */}
      {isSunday&&(
        <div style={{background:isTied?'rgba(139,92,246,0.15)':isBehind?'rgba(239,68,68,0.12)':'rgba(34,197,94,0.1)',border:`1px solid ${isTied?'rgba(139,92,246,0.4)':isBehind?'rgba(239,68,68,0.35)':'rgba(34,197,94,0.3)'}`,borderRadius:'20px',padding:'1.25rem'}} className="fade-up">
          <p style={{color:isTied?'#a78bfa':isBehind?'#f87171':'#4ade80',fontWeight:700,fontSize:'0.9rem',margin:'0 0 0.35rem'}}>
            {isTied?'🤝 ¡Empate esta semana!':isBehind?'😏 Esta noche toca tomar la iniciativa':'🏆 ¡Van ganando esta semana!'}
          </p>
          <p style={{color:'rgba(220,190,220,0.8)',fontSize:'0.82rem',margin:0,lineHeight:1.4}}>
            {isTied
              ?`Tú ${myPts} pts · ${names[pKey]} ${theirPts} pts · Tienen que acordar cómo será la noche 😉`
              :isBehind
              ?`Tú ${myPts} pts · ${names[pKey]} ${theirPts} pts · La penitencia es clara: pon el ambiente esta noche 🌹`
              :`Tú ${myPts} pts · ${names[pKey]} ${theirPts} pts · ${names[pKey]} tiene que tomar la iniciativa esta noche`
            }
          </p>
        </div>
      )}
      <div style={{background:level.gradient,borderRadius:'24px',padding:'1.25rem'}} className="fade-up">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.75rem'}}>
          <div>
            <p style={{color:'rgba(255,255,255,0.7)',fontSize:'0.75rem',margin:'0 0 0.2rem'}}>Nivel de pareja</p>
            <h2 className="font-display" style={{color:'white',fontSize:'1.5rem',margin:0,fontWeight:700}}>{level.emoji} {level.name}</h2>
          </div>
          <div style={{textAlign:'right'}}>
            <p style={{color:'white',fontWeight:700,fontSize:'1.8rem',margin:0,lineHeight:1}}>{total}</p>
            <p style={{color:'rgba(255,255,255,0.7)',fontSize:'0.7rem',margin:0}}>puntos</p>
          </div>
        </div>
        <div style={{background:'rgba(255,255,255,0.2)',borderRadius:'100px',height:'6px',overflow:'hidden'}}>
          <div style={{background:'rgba(255,255,255,0.9)',height:'100%',width:`${Math.min(progress,100)}%`,borderRadius:'100px'}} />
        </div>
        {nextLevel&&<p style={{color:'rgba(255,255,255,0.65)',fontSize:'0.72rem',margin:'0.4rem 0 0'}}>{nextLevel.min-total} pts para {nextLevel.name}</p>}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem'}}>
        {[['A','👩'],['B','👨']].map(([key,em])=>(
          <div key={key} style={{background:key===partner?'rgba(197,110,140,0.15)':'rgba(255,255,255,0.05)',border:`1px solid ${key===partner?'rgba(197,110,140,0.4)':'rgba(255,255,255,0.08)'}`,borderRadius:'18px',padding:'1rem'}}>
            <div style={{fontSize:'1.5rem',marginBottom:'0.25rem'}}>{em}</div>
            <p style={{color:'white',fontWeight:700,fontSize:'1.3rem',margin:0}}>{pts[key]||0}</p>
            <p style={{color:'rgba(200,160,200,0.8)',fontSize:'0.75rem',margin:'0.1rem 0 0'}}>{names[key]}{key===partner?' · tú':''}</p>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'0.75rem'}}>
        {[{v:completed,l:'Completados',e:'🎯'},{v:matches.length,l:'Matches',e:'💞'},{v:saved,l:'Posiciones',e:'📌'}].map(s=>(
          <div key={s.l} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'16px',padding:'0.875rem',textAlign:'center'}}>
            <div style={{fontSize:'1.3rem',marginBottom:'0.2rem'}}>{s.e}</div>
            <p style={{color:'white',fontWeight:700,fontSize:'1.2rem',margin:0}}>{s.v}</p>
            <p style={{color:'rgba(200,160,200,0.7)',fontSize:'0.7rem',margin:'0.15rem 0 0'}}>{s.l}</p>
          </div>
        ))}
      </div>

      {pendingForMe.length>0&&(
        <div style={{background:'rgba(234,179,8,0.1)',border:'1px solid rgba(234,179,8,0.3)',borderRadius:'18px',padding:'1rem'}}>
          <h3 style={{color:'#fbbf24',fontWeight:600,fontSize:'0.9rem',margin:'0 0 0.25rem'}}>💪 {names[pKey]} te retó ({pendingForMe.length})</h3>
          <p style={{color:'rgba(220,200,160,0.7)',fontSize:'0.78rem',margin:0}}>Revisa la sección Express para verlos</p>
        </div>
      )}

      {matches.length>0&&(
        <div style={{background:'rgba(197,110,140,0.1)',border:'1px solid rgba(197,110,140,0.25)',borderRadius:'18px',padding:'1rem'}}>
          <h3 style={{color:'#e07b8a',fontWeight:600,fontSize:'0.9rem',margin:'0 0 0.5rem'}}>💞 Matches con {names[pKey]} ({matches.length})</h3>
          {matches.slice(0,2).map(id=>{const q=QUESTIONS.find(q=>q.id===id);return q?<div key={id} style={{background:'rgba(255,255,255,0.07)',borderRadius:'10px',padding:'0.5rem 0.75rem',fontSize:'0.78rem',color:'rgba(240,220,240,0.9)',marginBottom:'0.3rem'}}>✓ {q.text}</div>:null;})}
          {matches.length>2&&<p style={{color:'#e07b8a',fontSize:'0.75rem',margin:'0.25rem 0 0'}}>+{matches.length-2} más en Descubrir</p>}
        </div>
      )}

      {suggested&&(
        <div style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'18px',padding:'1rem'}}>
          <p style={{color:'rgba(200,160,200,0.6)',fontSize:'0.72rem',margin:'0 0 0.4rem'}}>💡 Sugerencia para hoy</p>
          <h3 style={{color:'white',fontWeight:600,fontSize:'1rem',margin:'0 0 0.35rem',fontFamily:'DM Sans,sans-serif'}}>{suggested.title}</h3>
          <p style={{color:'rgba(220,190,220,0.8)',fontSize:'0.82rem',margin:'0 0 0.6rem',lineHeight:1.4}}>{suggested.desc}</p>
          <div style={{display:'flex',gap:'0.75rem'}}>
            <span style={{color:'#e07b8a',fontSize:'0.75rem'}}>⏱ {suggested.time}</span>
            <span style={{color:'#d4a017',fontSize:'0.75rem'}}>+{suggested.points} pts</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════
// DISCOVER TAB (con chat)
// ══════════════════════════════════════════════════════
function DiscoverTab({appData,partner,updateData,coupleCode,onMarkRead}) {
  const prefs=appData.preferences?.[partner]||{};
  const answered=Object.keys(prefs);
  const unanswered=QUESTIONS.filter(q=>!answered.includes(q.id));
  const [showAnswered,setShowAnswered]=useState(false);
  const [showChat,setShowChat]=useState(false);
  const [anim,setAnim]=useState(null);
  const [newMatch,setNewMatch]=useState(null);
  const pKey=partner==='A'?'B':'A';
  const partnerPrefs=appData.preferences?.[pKey]||{};
  const matches=appData.matches||[];
  const names=appData.names||{A:'Ella',B:'Él'};
  const current=unanswered[0];

  const prefsA=appData.preferences?.A||{};
  const prefsB=appData.preferences?.B||{};
  const discussableCount=QUESTIONS.filter(q=>{
    const a=prefsA[q.id]; const b=prefsB[q.id];
    if(a===false||b===false)return false;
    if(a===undefined&&b===undefined)return false;
    return true;
  }).length;

  const answer=(qId,val)=>{
    if(val!==null)setAnim(val===true?'right':'left');
    setTimeout(()=>{
      const newPrefs={...appData.preferences,[partner]:{...(appData.preferences?.[partner]||{}),[qId]:val}};
      let newMatches=[...matches];let matched=false;
      if(val===true&&partnerPrefs[qId]===true&&!newMatches.includes(qId)){newMatches.push(qId);matched=true;}
      const newPoints={...(appData.points||{A:0,B:0}),[partner]:((appData.points?.[partner])||0)+2};
      updateData({preferences:newPrefs,matches:newMatches,points:newPoints});
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

  if(showChat)return<ConversationView appData={appData} partner={partner} coupleCode={coupleCode} onBack={()=>setShowChat(false)} onMarkRead={onMarkRead} />;

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
        <div style={{display:'flex',gap:'0.5rem'}}>
          {discussableCount>0&&(
            <button onClick={()=>setShowChat(true)} style={{background:'rgba(197,110,140,0.15)',border:'1px solid rgba(197,110,140,0.35)',borderRadius:'100px',color:'#e07b8a',fontFamily:'DM Sans,sans-serif',fontSize:'0.78rem',padding:'0.35rem 0.75rem',cursor:'pointer'}}>
              💬 Conversar ({discussableCount})
            </button>
          )}
          <button onClick={()=>setShowAnswered(true)} style={{background:'none',border:'none',color:'rgba(200,160,200,0.6)',fontFamily:'DM Sans,sans-serif',fontSize:'0.78rem',cursor:'pointer',padding:0}}>Ver respuestas</button>
        </div>
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
          <p style={{color:'rgba(200,160,200,0.8)',margin:'0 0 0.75rem',fontSize:'0.9rem'}}>Pueden editar respuestas cuando quieran</p>
          {discussableCount>0&&(
            <button onClick={()=>setShowChat(true)} style={{background:'linear-gradient(135deg,#a8456a,#7c3aed)',color:'white',fontFamily:'DM Sans,sans-serif',fontWeight:600,padding:'0.875rem 1.75rem',borderRadius:'100px',border:'none',cursor:'pointer',marginBottom:'0.75rem',fontSize:'0.9rem'}}>
              💬 Ir a Conversar ({discussableCount} temas)
            </button>
          )}
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
  const complete=(c)=>{if(done.includes(c.id))return;const newDone=[...done,c.id];const newPts={...(appData.points||{A:0,B:0}),[partner]:((appData.points?.[partner])||0)+c.points};updateData({completedChallenges:newDone,points:newPts});setDone2(true);};
  if(selected){const cfg=ICfg[intensity];return(<div style={{padding:'1rem'}} className="fade-up"><button onClick={()=>{setSelected(null);setDone2(false);}} style={{background:'none',border:'none',color:'rgba(200,160,200,0.8)',cursor:'pointer',fontFamily:'DM Sans,sans-serif',fontSize:'0.9rem',padding:'0 0 1rem',display:'block'}}>← Volver</button><div style={{background:cfg.bg,border:`1px solid ${cfg.border}`,borderRadius:'24px',padding:'1.5rem',marginBottom:'1rem'}}><span style={{color:cfg.accent,fontSize:'0.75rem',fontWeight:500}}>{cfg.emoji} {cfg.label}</span><h2 className="font-display" style={{color:'white',fontSize:'1.75rem',margin:'0.3rem 0 0.75rem',lineHeight:1.2}}>{selected.title}</h2><p style={{color:'rgba(220,190,220,0.9)',lineHeight:1.6,margin:'0 0 1rem',fontSize:'0.95rem'}}>{selected.desc}</p><div style={{display:'flex',gap:'1rem'}}><span style={{color:'#e07b8a',fontSize:'0.8rem'}}>⏱ {selected.time}</span><span style={{color:'#d4a017',fontSize:'0.8rem'}}>+{selected.points} pts</span></div></div>{done.includes(selected.id)||done2?(<div style={{background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.3)',borderRadius:'16px',padding:'1.25rem',textAlign:'center'}}><div style={{fontSize:'2.5rem',marginBottom:'0.5rem'}}>✅</div><p style={{color:'#4ade80',fontWeight:600,margin:0}}>¡Reto completado! +{selected.points} pts</p></div>):(<button onClick={()=>complete(selected)} style={{width:'100%',background:cfg.accent,color:'white',fontFamily:'DM Sans,sans-serif',fontWeight:600,fontSize:'1rem',padding:'1rem',borderRadius:'14px',border:'none',cursor:'pointer'}}>✓ ¡Completado! (+{selected.points} pts)</button>)}</div>);}
  return(<div style={{padding:'1rem'}}><h2 className="font-display" style={{color:'#f0e8f8',fontSize:'1.5rem',margin:'0 0 1rem'}}>Retos 🎯</h2><div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'0.5rem',marginBottom:'1rem'}}>{Object.entries(ICfg).map(([key,cfg])=>{
    const locked=(key==='medium'&&mediumLocked)||(key==='hot'&&hotLocked);
    const lockPts=key==='medium'?MEDIUM_UNLOCK:HOT_UNLOCK;
    return(<button key={key} onClick={()=>{if(locked)return;setIntensity(key);}} style={{background:intensity===key?cfg.accent:(locked?'rgba(255,255,255,0.03)':'rgba(255,255,255,0.07)'),border:`1px solid ${intensity===key?cfg.accent:cfg.border}`,borderRadius:'14px',padding:'0.7rem 0.5rem',display:'flex',flexDirection:'column',alignItems:'center',gap:'0.3rem',cursor:locked?'default':'pointer',opacity:locked?0.5:1}}><span style={{fontSize:'1.2rem'}}>{cfg.emoji}</span><span style={{color:intensity===key?'white':'rgba(200,160,200,0.8)',fontSize:'0.75rem',fontWeight:500,fontFamily:'DM Sans,sans-serif'}}>{cfg.label}</span>{locked&&<span style={{color:'rgba(200,160,200,0.5)',fontSize:'0.62rem'}}>🔒 {lockPts} pts</span>}</button>);
  })}</div><div style={{display:'flex',flexDirection:'column',gap:'0.6rem'}}>{CHALLENGES[intensity].map(c=>(<button key={c.id} onClick={()=>setSelected(c)} style={{background:done.includes(c.id)?'rgba(255,255,255,0.03)':'rgba(255,255,255,0.06)',border:`1px solid ${ICfg[intensity].border}`,borderRadius:'16px',padding:'1rem',display:'flex',alignItems:'center',justifyContent:'space-between',textAlign:'left',cursor:'pointer',opacity:done.includes(c.id)?0.6:1}}><div style={{flex:1}}><div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}><span style={{color:'white',fontWeight:500,fontSize:'0.9rem',fontFamily:'DM Sans,sans-serif'}}>{c.title}</span>{done.includes(c.id)&&<span style={{color:'#4ade80',fontSize:'0.75rem'}}>✓</span>}</div><p style={{color:'rgba(200,170,200,0.7)',fontSize:'0.78rem',margin:'0.2rem 0 0',lineHeight:1.3}}>{c.desc.slice(0,65)}…</p><div style={{display:'flex',gap:'0.75rem',marginTop:'0.35rem'}}><span style={{color:'rgba(200,160,200,0.5)',fontSize:'0.72rem'}}>{c.time}</span><span style={{color:'#d4a017',fontSize:'0.72rem'}}>+{c.points} pts</span></div></div><span style={{color:'rgba(200,160,200,0.3)',marginLeft:'0.75rem',fontSize:'1.2rem'}}>›</span></button>))}</div></div>);
}

// ══════════════════════════════════════════════════════
// COUNTDOWN HOOK
// ══════════════════════════════════════════════════════
function useCountdown(sentAt) {
  const [ms, setMs] = useState(() => getTimeLeft(sentAt));
  useEffect(()=>{
    const t = setInterval(()=>setMs(getTimeLeft(sentAt)), 1000);
    return ()=>clearInterval(t);
  },[sentAt]);
  return ms;
}

// ══════════════════════════════════════════════════════
// EXPRESS TAB
// ══════════════════════════════════════════════════════
function ExpressTab({appData,partner,updateData}) {
  const [selected,setSelected]=useState(null);
  const [done2,setDone2]=useState(false);
  const [completedChallId,setCompletedChallId]=useState(null);
  const done=appData.completedExpress||[];
  const expressChallenges=appData.expressChallenges||[];
  const pKey=partner==='A'?'B':'A';
  const names=appData.names||{A:'Ella',B:'Él'};
  const now=Date.now();

  // Expire challenges that passed 24h — give points to sender
  useEffect(()=>{
    const expired=expressChallenges.filter(c=>!c.completed&&!c.expired&&c.to===partner&&getTimeLeft(c.sentAt)===0);
    if(expired.length===0)return;
    const newChallenges=expressChallenges.map(c=>{
      if(expired.find(e=>e.id===c.id)){
        return{...c,expired:true};
      }
      return c;
    });
    // Give points to senders
    const newPts={...(appData.points||{A:0,B:0})};
    expired.forEach(c=>{
      const item=EXPRESS.find(e=>e.id===c.expressId);
      if(item) newPts[c.from]=(newPts[c.from]||0)+item.points;
    });
    updateData({expressChallenges:newChallenges,points:newPts});
  },[]);

  const pendingForMe=expressChallenges.filter(c=>c.to===partner&&!c.completed&&!c.expired&&getTimeLeft(c.sentAt)>0);
  const alreadySentActive=(itemId)=>expressChallenges.some(c=>c.from===partner&&c.expressId===itemId&&!c.completed&&!c.expired&&getTimeLeft(c.sentAt)>0);

  const sendChallenge=(item)=>{
    const nc={
      id:Date.now()+'_'+Math.random().toString(36).slice(2),
      expressId:item.id,
      from:partner,
      to:pKey,
      sentAt:new Date().toISOString(),
      completed:false,
      expired:false,
      completedAt:null,
    };
    updateData({expressChallenges:[...expressChallenges,nc]});
  };

  const completeChallenge=(challenge,item)=>{
    const elapsed=Date.now()-new Date(challenge.sentAt).getTime();
    const isBonus=elapsed<=EXPRESS_BONUS_MS;
    const pts=isBonus?item.points*2:item.points;
    const newChallenges=expressChallenges.map(c=>c.id===challenge.id?{...c,completed:true,completedAt:new Date().toISOString()}:c);
    // Only receiver gets points (with possible bonus)
    const newPts={...(appData.points||{A:0,B:0}),[partner]:((appData.points?.[partner])||0)+pts};
    updateData({expressChallenges:newChallenges,points:newPts});
    setCompletedChallId({id:challenge.id,pts,bonus:isBonus});
  };

  const complete=(item)=>{
    if(done.includes(item.id))return;
    const newDone=[...done,item.id];
    const newPts={...(appData.points||{A:0,B:0}),[partner]:((appData.points?.[partner])||0)+item.points};
    updateData({completedExpress:newDone,points:newPts});
    setDone2(true);
  };

  if(selected){
    const pendingChall=pendingForMe.find(c=>c.expressId===selected.id);
    const sent=alreadySentActive(selected.id);
    const isCompleted=done.includes(selected.id);
    return(
      <div style={{padding:'1rem'}} className="fade-up">
        <button onClick={()=>{setSelected(null);setDone2(false);setCompletedChallId(null);}} style={{background:'none',border:'none',color:'rgba(200,160,200,0.8)',cursor:'pointer',fontFamily:'DM Sans,sans-serif',fontSize:'0.9rem',padding:'0 0 1rem',display:'block'}}>← Volver</button>

        {/* Reto recibido con countdown */}
        {pendingChall&&<ChallengeReceived challenge={pendingChall} item={selected} partner={partner} names={names} completedChallId={completedChallId} onComplete={()=>completeChallenge(pendingChall,selected)} />}

        {/* Detalle */}
        <div style={{background:'rgba(234,179,8,0.1)',border:'1px solid rgba(234,179,8,0.3)',borderRadius:'24px',padding:'1.5rem',marginBottom:'1rem'}}>
          <span style={{color:'#fbbf24',fontSize:'0.75rem',fontWeight:500}}>⚡ Express</span>
          <h2 className="font-display" style={{color:'white',fontSize:'1.75rem',margin:'0.3rem 0 0.75rem'}}>{selected.title}</h2>
          <p style={{color:'rgba(220,190,220,0.9)',lineHeight:1.6,margin:'0 0 1rem',fontSize:'0.95rem'}}>{selected.desc}</p>
          <div style={{display:'flex',gap:'1rem',flexWrap:'wrap'}}>
            <span style={{color:'#fbbf24',fontSize:'0.8rem'}}>⏱ {selected.time}</span>
            <span style={{color:'#d4a017',fontSize:'0.8rem'}}>+{selected.points} pts normales</span>
            <span style={{color:'#4ade80',fontSize:'0.8rem'}}>+{selected.points*2} pts si completas en 10 min ⚡</span>
          </div>
        </div>

        {/* Acciones */}
        {!pendingChall&&(
          <div style={{display:'flex',flexDirection:'column',gap:'0.6rem'}}>
            {isCompleted||done2?(
              <div style={{background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.3)',borderRadius:'14px',padding:'1rem',textAlign:'center'}}>
                <p style={{color:'#4ade80',fontWeight:600,margin:0,fontSize:'0.9rem'}}>✅ Ya lo hiciste · +{selected.points} pts</p>
              </div>
            ):(
              <button onClick={()=>complete(selected)} style={{width:'100%',background:'linear-gradient(135deg,#d97706,#f59e0b)',color:'white',fontFamily:'DM Sans,sans-serif',fontWeight:600,fontSize:'1rem',padding:'1rem',borderRadius:'14px',border:'none',cursor:'pointer'}}>
                ⚡ ¡Lo hice! (+{selected.points} pts)
              </button>
            )}
            {sent?(
              <div style={{textAlign:'center',padding:'0.75rem',color:'rgba(200,160,200,0.5)',fontSize:'0.85rem',fontFamily:'DM Sans,sans-serif'}}>
                📨 Reto enviado a {names[pKey]} · esperando respuesta
              </div>
            ):(
              <button onClick={()=>sendChallenge(selected)} style={{width:'100%',background:'rgba(197,110,140,0.15)',border:'1px solid rgba(197,110,140,0.35)',color:'#e07b8a',fontFamily:'DM Sans,sans-serif',fontWeight:600,fontSize:'1rem',padding:'1rem',borderRadius:'14px',cursor:'pointer'}}>
                📨 Retar a {names[pKey]} · tiene 24h para hacerlo
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return(
    <div style={{padding:'1rem'}}>
      <h2 className="font-display" style={{color:'#f0e8f8',fontSize:'1.5rem',margin:'0 0 0.25rem'}}>Express ⚡</h2>
      <p style={{color:'rgba(200,160,200,0.7)',fontSize:'0.83rem',margin:'0 0 1rem'}}>Para cuando tienen poco tiempo pero quieren provocarse</p>

      {pendingForMe.length>0&&(
        <div style={{background:'rgba(234,179,8,0.1)',border:'1px solid rgba(234,179,8,0.3)',borderRadius:'18px',padding:'1rem',marginBottom:'1rem'}}>
          <h3 style={{color:'#fbbf24',fontWeight:600,fontSize:'0.9rem',margin:'0 0 0.75rem'}}>💪 Retos para ti ({pendingForMe.length})</h3>
          <div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
            {pendingForMe.map(challenge=>{
              const item=EXPRESS.find(e=>e.id===challenge.expressId);
              if(!item)return null;
              return<PendingChallengeRow key={challenge.id} challenge={challenge} item={item} names={names} onTap={()=>setSelected(item)} />;
            })}
          </div>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.65rem'}}>
        {EXPRESS.map(item=>(
          <button key={item.id} onClick={()=>setSelected(item)} style={{background:done.includes(item.id)?'rgba(255,255,255,0.03)':'rgba(255,255,255,0.06)',border:'1px solid rgba(234,179,8,0.2)',borderRadius:'18px',padding:'1rem',textAlign:'left',cursor:'pointer',opacity:done.includes(item.id)?0.6:1}}>
            <h3 style={{color:'white',fontWeight:500,fontSize:'0.85rem',margin:'0 0 0.35rem',fontFamily:'DM Sans,sans-serif'}}>{item.title}</h3>
            <p style={{color:'rgba(200,170,200,0.7)',fontSize:'0.75rem',margin:'0 0 0.5rem',lineHeight:1.35}}>{item.desc.slice(0,55)}…</p>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{color:'#fbbf24',fontSize:'0.7rem'}}>{item.time}</span>
              <span style={{color:'#d4a017',fontSize:'0.7rem'}}>+{item.points}</span>
            </div>
            {done.includes(item.id)&&<div style={{color:'#4ade80',fontSize:'0.68rem',marginTop:'0.25rem'}}>✓ Hecho</div>}
            {alreadySentActive(item.id)&&<div style={{color:'#e07b8a',fontSize:'0.68rem',marginTop:'0.25rem'}}>📨 Enviado</div>}
          </button>
        ))}
      </div>
    </div>
  );
}

// Pending challenge row with live countdown
function PendingChallengeRow({challenge,item,names,onTap}) {
  const ms=useCountdown(challenge.sentAt);
  const isBonus=ms>=(EXPRESS_WINDOW_MS-EXPRESS_BONUS_MS);
  return(
    <button onClick={onTap} style={{background:'rgba(255,255,255,0.06)',border:`1px solid ${isBonus?'rgba(74,222,128,0.35)':'rgba(234,179,8,0.2)'}`,borderRadius:'14px',padding:'0.875rem 1rem',display:'flex',alignItems:'center',justifyContent:'space-between',textAlign:'left',cursor:'pointer'}}>
      <div>
        <p style={{color:'white',fontWeight:500,fontSize:'0.88rem',margin:'0 0 0.2rem',fontFamily:'DM Sans,sans-serif'}}>{item.title}</p>
        <p style={{color:'rgba(200,170,200,0.6)',fontSize:'0.75rem',margin:0}}>De {names[challenge.from]} · {isBonus?`⚡ ¡Bonus x2! ${formatCountdown(ms)}`:`⏱ ${formatCountdown(ms)} restantes`}</p>
      </div>
      <span style={{color:isBonus?'#4ade80':'#fbbf24',fontSize:'1.2rem'}}>›</span>
    </button>
  );
}

// Challenge detail when received
function ChallengeReceived({challenge,item,partner,names,completedChallId,onComplete}) {
  const ms=useCountdown(challenge.sentAt);
  const isBonus=ms>0&&(Date.now()-new Date(challenge.sentAt).getTime())<=EXPRESS_BONUS_MS;
  const pKey=partner==='A'?'B':'A';
  if(completedChallId?.id===challenge.id){
    return(
      <div style={{background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.3)',borderRadius:'16px',padding:'1.25rem',marginBottom:'1rem',textAlign:'center'}}>
        <div style={{fontSize:'2rem',marginBottom:'0.25rem'}}>{completedChallId.bonus?'⚡🎉':'🎉'}</div>
        <p style={{color:'#4ade80',fontWeight:600,margin:0,fontSize:'0.95rem'}}>
          {completedChallId.bonus?`¡Bonus x2! +${completedChallId.pts} pts 🔥`:`¡Reto completado! +${completedChallId.pts} pts`}
        </p>
      </div>
    );
  }
  return(
    <div style={{background:isBonus?'rgba(74,222,128,0.1)':'rgba(234,179,8,0.1)',border:`1px solid ${isBonus?'rgba(74,222,128,0.35)':'rgba(234,179,8,0.35)'}`,borderRadius:'16px',padding:'1rem',marginBottom:'1rem'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.5rem'}}>
        <p style={{color:isBonus?'#4ade80':'#fbbf24',fontWeight:600,fontSize:'0.85rem',margin:0}}>
          💪 {names[challenge.from]} te retó
        </p>
        <span style={{color:isBonus?'#4ade80':'#fbbf24',fontWeight:700,fontSize:'0.9rem',fontFamily:'DM Sans,sans-serif'}}>
          {formatCountdown(ms)}
        </span>
      </div>
      {isBonus&&<p style={{color:'#4ade80',fontSize:'0.78rem',margin:'0 0 0.75rem',lineHeight:1.3}}>⚡ ¡Estás a tiempo para el doble de puntos! Complétalo ahora</p>}
      <button onClick={onComplete} style={{width:'100%',background:isBonus?'linear-gradient(135deg,#15803d,#4ade80)':'linear-gradient(135deg,#d97706,#f59e0b)',color:'white',fontFamily:'DM Sans,sans-serif',fontWeight:600,fontSize:'0.9rem',padding:'0.75rem',borderRadius:'12px',border:'none',cursor:'pointer'}}>
        ✅ Completar {isBonus?`(+${item.points*2} pts x2 ⚡)`:`(+${item.points} pts)`}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// DATES TAB
// ══════════════════════════════════════════════════════
function DatesTab({appData,partner,updateData}) {
  const [selected,setSelected]=useState(null);
  const [done2,setDone2]=useState(false);
  const [filter,setFilter]=useState('Todos');
  const done=appData.completedDates||[];
  const moods=['Todos','Romántico','Divertido','Relajante','Íntimo'];
  const complete=(d)=>{if(done.includes(d.id))return;const newDone=[...done,d.id];const newPts={...(appData.points||{A:0,B:0}),[partner]:((appData.points?.[partner])||0)+d.points};updateData({completedDates:newDone,points:newPts});setDone2(true);};
  if(selected)return(<div style={{padding:'1rem'}} className="fade-up"><button onClick={()=>{setSelected(null);setDone2(false);}} style={{background:'none',border:'none',color:'rgba(200,160,200,0.8)',cursor:'pointer',fontFamily:'DM Sans,sans-serif',fontSize:'0.9rem',padding:'0 0 1rem',display:'block'}}>← Volver</button><div style={{background:'rgba(197,110,140,0.1)',border:'1px solid rgba(197,110,140,0.25)',borderRadius:'24px',padding:'1.5rem',marginBottom:'1rem',textAlign:'center'}}><div style={{fontSize:'3.5rem',marginBottom:'0.75rem'}}>{selected.emoji}</div><h2 className="font-display" style={{color:'white',fontSize:'1.75rem',margin:'0 0 0.5rem'}}>{selected.title}</h2><p style={{color:'rgba(220,190,220,0.9)',margin:'0 0 0.75rem',fontSize:'0.9rem',lineHeight:1.5}}>{selected.desc}</p><div style={{display:'flex',justifyContent:'center',gap:'1rem'}}><span style={{color:'#e07b8a',fontSize:'0.8rem'}}>⏱ {selected.time}</span><span style={{color:'#a78bfa',fontSize:'0.8rem'}}>{selected.mood}</span><span style={{color:'#d4a017',fontSize:'0.8rem'}}>+{selected.points} pts</span></div></div><div style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'18px',padding:'1.25rem',marginBottom:'1rem'}}><h3 style={{color:'white',fontWeight:600,fontSize:'0.9rem',margin:'0 0 0.75rem',fontFamily:'DM Sans,sans-serif'}}>Cómo hacerlo:</h3>{selected.steps.map((s,i)=>(<div key={i} style={{display:'flex',gap:'0.75rem',marginBottom:'0.6rem',alignItems:'flex-start'}}><span style={{background:'rgba(197,110,140,0.25)',color:'#e07b8a',borderRadius:'50%',width:'22px',height:'22px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.7rem',flexShrink:0,marginTop:'1px'}}>{i+1}</span><p style={{color:'rgba(220,190,220,0.9)',fontSize:'0.83rem',margin:0,lineHeight:1.4}}>{s}</p></div>))}</div>{done.includes(selected.id)||done2?(<div style={{background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.3)',borderRadius:'16px',padding:'1.25rem',textAlign:'center'}}><div style={{fontSize:'2.5rem',marginBottom:'0.5rem'}}>✅</div><p style={{color:'#4ade80',fontWeight:600,margin:0}}>¡Ya tuvieron esta cita!</p></div>):(<button onClick={()=>complete(selected)} style={{width:'100%',background:'linear-gradient(135deg,#a8456a,#c96b8a)',color:'white',fontFamily:'DM Sans,sans-serif',fontWeight:600,fontSize:'1rem',padding:'1rem',borderRadius:'14px',border:'none',cursor:'pointer'}}>✓ ¡La tuvimos! (+{selected.points} pts)</button>)}</div>);
  const filtered=filter==='Todos'?DATES:DATES.filter(d=>d.mood===filter);
  return(<div style={{padding:'1rem'}}><h2 className="font-display" style={{color:'#f0e8f8',fontSize:'1.5rem',margin:'0 0 0.25rem'}}>Citas en Casa 📅</h2><p style={{color:'rgba(200,160,200,0.7)',fontSize:'0.83rem',margin:'0 0 1rem'}}>Momentos especiales sin necesidad de salir</p><div style={{display:'flex',gap:'0.5rem',marginBottom:'1rem',overflowX:'auto',paddingBottom:'0.25rem'}}>{moods.map(m=>(<button key={m} onClick={()=>setFilter(m)} style={{background:filter===m?'#e07b8a':'rgba(255,255,255,0.07)',border:'none',borderRadius:'100px',padding:'0.4rem 0.9rem',color:filter===m?'white':'rgba(200,160,200,0.7)',fontFamily:'DM Sans,sans-serif',fontSize:'0.8rem',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>{m}</button>))}</div><div style={{display:'flex',flexDirection:'column',gap:'0.65rem'}}>{filtered.map(d=>(<button key={d.id} onClick={()=>setSelected(d)} style={{background:done.includes(d.id)?'rgba(255,255,255,0.03)':'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'18px',padding:'1rem',display:'flex',alignItems:'center',gap:'1rem',textAlign:'left',cursor:'pointer',opacity:done.includes(d.id)?0.65:1}}><span style={{fontSize:'2.5rem',flexShrink:0}}>{d.emoji}</span><div style={{flex:1}}><div style={{display:'flex',alignItems:'center',gap:'0.4rem'}}><span style={{color:'white',fontWeight:500,fontFamily:'DM Sans,sans-serif',fontSize:'0.9rem'}}>{d.title}</span>{done.includes(d.id)&&<span style={{color:'#4ade80',fontSize:'0.75rem'}}>✓</span>}</div><p style={{color:'rgba(200,170,200,0.7)',fontSize:'0.78rem',margin:'0.2rem 0 0',lineHeight:1.3}}>{d.desc}</p><div style={{display:'flex',gap:'0.75rem',marginTop:'0.3rem'}}><span style={{color:'rgba(200,160,200,0.5)',fontSize:'0.7rem'}}>{d.time}</span><span style={{color:'#a78bfa',fontSize:'0.7rem'}}>{d.mood}</span><span style={{color:'#d4a017',fontSize:'0.7rem'}}>+{d.points} pts</span></div></div></button>))}</div></div>);
}

// ══════════════════════════════════════════════════════
// POSITIONS TAB
// ══════════════════════════════════════════════════════
function PositionsTab({appData,partner,updateData}) {
  const [selected,setSelected]=useState(null);
  const [filter,setFilter]=useState('Todas');
  const saved=appData.savedPositions||[];
  const cats=['Todas','Guardadas',...new Set(POSITIONS.map(p=>p.cat))];
  const diffCol={'Fácil':'#4ade80','Media':'#fbbf24','Difícil':'#f87171'};
  const toggleSave=(id,e)=>{e&&e.stopPropagation();const newSaved=saved.includes(id)?saved.filter(s=>s!==id):[...saved,id];updateData({savedPositions:newSaved});};
  const filtered=filter==='Todas'?POSITIONS:filter==='Guardadas'?POSITIONS.filter(p=>saved.includes(p.id)):POSITIONS.filter(p=>p.cat===filter);
  if(selected)return(<div style={{padding:'1rem'}} className="fade-up"><button onClick={()=>setSelected(null)} style={{background:'none',border:'none',color:'rgba(200,160,200,0.8)',cursor:'pointer',fontFamily:'DM Sans,sans-serif',fontSize:'0.9rem',padding:'0 0 1rem',display:'block'}}>← Volver</button><div style={{background:'rgba(124,58,237,0.1)',border:'1px solid rgba(124,58,237,0.25)',borderRadius:'24px',padding:'1.5rem',marginBottom:'1rem'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.75rem'}}><div><span style={{color:'#a78bfa',fontSize:'0.75rem'}}>{selected.cat}</span><h2 className="font-display" style={{color:'white',fontSize:'1.75rem',margin:'0.2rem 0 0.2rem'}}>{selected.emoji} {selected.name}</h2><span style={{color:diffCol[selected.diff],fontSize:'0.78rem'}}>{selected.diff}</span></div><button onClick={e=>toggleSave(selected.id,e)} style={{background:'none',border:'none',fontSize:'1.75rem',cursor:'pointer',padding:'0.25rem'}}>{saved.includes(selected.id)?'❤️':'🤍'}</button></div><p style={{color:'rgba(220,190,220,0.9)',lineHeight:1.6,margin:'0 0 1rem',fontSize:'0.95rem'}}>{selected.desc}</p><div style={{background:'rgba(124,58,237,0.2)',border:'1px solid rgba(124,58,237,0.3)',borderRadius:'14px',padding:'1rem'}}><p style={{color:'#a78bfa',fontSize:'0.75rem',fontWeight:600,margin:'0 0 0.35rem'}}>💡 Tip:</p><p style={{color:'rgba(220,190,220,0.9)',fontSize:'0.85rem',margin:0,lineHeight:1.45}}>{selected.tip}</p></div></div></div>);
  return(<div style={{padding:'1rem'}}><h2 className="font-display" style={{color:'#f0e8f8',fontSize:'1.5rem',margin:'0 0 0.25rem'}}>Posiciones 💫</h2><p style={{color:'rgba(200,160,200,0.7)',fontSize:'0.83rem',margin:'0 0 1rem'}}>Exploren juntos · Guarden con ❤️ las que quieran intentar</p><div style={{display:'flex',gap:'0.5rem',marginBottom:'1rem',overflowX:'auto',paddingBottom:'0.25rem'}}>{cats.map(c=>(<button key={c} onClick={()=>setFilter(c)} style={{background:filter===c?'#7c3aed':'rgba(255,255,255,0.07)',border:'none',borderRadius:'100px',padding:'0.4rem 0.9rem',color:filter===c?'white':'rgba(200,160,200,0.7)',fontFamily:'DM Sans,sans-serif',fontSize:'0.8rem',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>{c==='Guardadas'?`❤️ Guardadas (${saved.length})`:c}</button>))}</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.65rem'}}>{filtered.map(p=>(<button key={p.id} onClick={()=>setSelected(p)} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(124,58,237,0.2)',borderRadius:'18px',padding:'1rem',textAlign:'left',cursor:'pointer'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.5rem'}}><span style={{fontSize:'1.5rem'}}>{p.emoji}</span><button onClick={e=>toggleSave(p.id,e)} style={{background:'none',border:'none',fontSize:'1rem',cursor:'pointer',padding:0}}>{saved.includes(p.id)?'❤️':'🤍'}</button></div><h3 style={{color:'white',fontWeight:500,fontSize:'0.88rem',margin:'0 0 0.35rem',fontFamily:'DM Sans,sans-serif'}}>{p.name}</h3><p style={{color:'rgba(200,170,200,0.7)',fontSize:'0.75rem',margin:'0 0 0.4rem',lineHeight:1.3}}>{p.desc.slice(0,60)}…</p><span style={{color:diffCol[p.diff],fontSize:'0.7rem'}}>{p.diff}</span></button>))}{filtered.length===0&&<div style={{gridColumn:'1/-1',textAlign:'center',padding:'2rem',color:'rgba(200,160,200,0.5)',fontSize:'0.9rem'}}>{filter==='Guardadas'?'Aún no han guardado posiciones ❤️':'Sin resultados'}</div>}</div></div>);
}

// ══════════════════════════════════════════════════════
// BOTTOM NAV + MAIN APP
// ══════════════════════════════════════════════════════
function BottomNav({active,onChange,unreadMessages}) {
  const tabs=[{id:'home',emoji:'🏠',label:'Inicio'},{id:'discover',emoji:'💫',label:'Descubrir'},{id:'challenges',emoji:'🎯',label:'Retos'},{id:'express',emoji:'⚡',label:'Express'},{id:'dates',emoji:'📅',label:'Citas'},{id:'positions',emoji:'🔥',label:'Posiciones'}];
  return(<div style={{position:'fixed',bottom:0,left:0,right:0,background:'rgba(13,10,20,0.97)',backdropFilter:'blur(12px)',borderTop:'1px solid rgba(255,255,255,0.07)',display:'grid',gridTemplateColumns:'repeat(6,1fr)',zIndex:100}}>{tabs.map(t=>(<button key={t.id} onClick={()=>onChange(t.id)} style={{padding:'0.6rem 0.25rem',display:'flex',flexDirection:'column',alignItems:'center',gap:'0.15rem',background:'none',border:'none',cursor:'pointer',position:'relative'}}>
    <div style={{position:'relative',display:'inline-flex'}}>
      <span style={{fontSize:'1.2rem',filter:active===t.id?'drop-shadow(0 0 6px rgba(224,123,138,0.6))':'none'}}>{t.emoji}</span>
      {t.id==='discover'&&unreadMessages>0&&(
        <span style={{position:'absolute',top:'-4px',right:'-6px',background:'#ef4444',color:'white',borderRadius:'50%',minWidth:'16px',height:'16px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.58rem',fontWeight:700,lineHeight:1,padding:'0 2px'}}>{unreadMessages>9?'9+':unreadMessages}</span>
      )}
    </div>
    <span style={{color:active===t.id?'#e07b8a':'rgba(150,120,160,0.6)',fontSize:'0.6rem',fontFamily:'DM Sans,sans-serif',fontWeight:active===t.id?600:400}}>{t.label}</span>
    {active===t.id&&<div style={{position:'absolute',bottom:0,left:'50%',transform:'translateX(-50%)',width:'4px',height:'4px',borderRadius:'50%',background:'#e07b8a'}} />}
  </button>))}</div>);
}

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

  useEffect(()=>{
    (async()=>{
      const savedCode=getLocalCode();
      if(savedCode){
        const row=await fetchCouple(savedCode);
        if(row){setCoupleCode(savedCode);setAppData(dbToApp(row));setScreen('partner_select');}
        else setScreen('splash');
      } else setScreen('splash');
    })();
  },[]);

  useEffect(()=>{
    if(!coupleCode)return;
    if(subRef.current)subRef.current.unsubscribe();
    subRef.current=supabase.channel('couple_'+coupleCode)
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'couples',filter:'couple_code=eq.'+coupleCode},(payload)=>{
        setAppData(dbToApp(payload.new));
      }).subscribe();
    return()=>{if(subRef.current)subRef.current.unsubscribe();};
  },[coupleCode]);

  // Unread messages count
  useEffect(()=>{
    if(!coupleCode||!partner)return;
    const checkUnread=async()=>{
      const lastRead=getLastRead(coupleCode,partner);
      const pKey=partner==='A'?'B':'A';
      const {count}=await supabase.from('messages').select('*',{count:'exact',head:true})
        .eq('couple_code',coupleCode).eq('sender',pKey).gt('created_at',lastRead);
      setUnreadMessages(count||0);
    };
    checkUnread();
    if(msgSubRef.current)msgSubRef.current.unsubscribe();
    msgSubRef.current=supabase.channel('unread_'+coupleCode+'_'+partner)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:'couple_code=eq.'+coupleCode},(payload)=>{
        const pKey=partner==='A'?'B':'A';
        if(payload.new.sender===pKey) setUnreadMessages(prev=>prev+1);
      }).subscribe();
    return()=>{if(msgSubRef.current)msgSubRef.current.unsubscribe();};
  },[coupleCode,partner]);

  // ── All hooks before any early returns ──
  const updateData=useCallback((updates)=>{
    setAppData(prev=>{
      const next={...prev,...updates};
      if(coupleCode)updateCouple(coupleCode,next);
      return next;
    });
  },[coupleCode]);

  const markMessagesRead=useCallback(()=>{
    if(coupleCode&&partner){ setLastRead(coupleCode,partner); setUnreadMessages(0); }
  },[coupleCode,partner]);

  // ── Early returns after all hooks ──
  if(screen==='loading')return<div style={{minHeight:'100vh',background:'#0d0a14',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{fontSize:'3rem'}} className="pulse">💑</div></div>;
  if(screen==='splash')return<SplashScreen onNext={()=>setScreen('join_or_create')} />;
  if(screen==='join_or_create')return<JoinOrCreateScreen onCreated={(data,code)=>{setAppData(data);setCoupleCode(code);setPendingCode(code);setScreen('show_code');}} onJoined={(data,code)=>{setAppData(data);setCoupleCode(code);setScreen('partner_select');}}/>;
  if(screen==='show_code')return<CodeDisplayScreen code={pendingCode} onContinue={()=>setScreen('partner_select')} />;
  if(screen==='partner_select'||!partner)return<PartnerSelectScreen names={appData?.names||{A:'Ella',B:'Él'}} onSelect={(p)=>{setPartner(p);setScreen('app');setTab('home');}}/>;

  const names=appData?.names||{A:'Ella',B:'Él'};
  const expressChallenges=appData?.expressChallenges||[];
  const pendingCount=expressChallenges.filter(c=>c.to===partner&&!c.completed).length;

  const TABS={
    home:(p)=><HomeTab {...p} />,
    discover:(p)=><DiscoverTab {...p} coupleCode={coupleCode} onMarkRead={markMessagesRead} />,
    challenges:(p)=><ChallengesTab {...p} />,
    express:(p)=><ExpressTab {...p} />,
    dates:(p)=><DatesTab {...p} />,
    positions:(p)=><PositionsTab {...p} />,
  };

  const tabProps={appData,partner,updateData};

  return(
    <div style={{minHeight:'100vh',background:'linear-gradient(180deg,#0d0a14,#13091f)',color:'white'}}>
      <div style={{position:'sticky',top:0,background:'rgba(13,10,20,0.93)',backdropFilter:'blur(12px)',borderBottom:'1px solid rgba(255,255,255,0.06)',padding:'0.75rem 1rem',display:'flex',alignItems:'center',justifyContent:'space-between',zIndex:50}}>
        <h1 className="font-display" style={{color:'#f0e8f8',fontSize:'1.2rem',margin:0}}>💑 Nosotros Dos</h1>
        <div style={{display:'flex',alignItems:'center',gap:'0.6rem'}}>
          <span style={{color:'rgba(200,160,200,0.45)',fontSize:'0.7rem'}}>{coupleCode}</span>
          {pendingCount>0&&<span style={{background:'#f59e0b',color:'black',borderRadius:'50%',width:'18px',height:'18px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.65rem',fontWeight:700,flexShrink:0}}>{pendingCount}</span>}
          <span style={{color:'rgba(200,160,200,0.7)',fontSize:'0.82rem'}}>{names[partner]}</span>
          <button onClick={()=>{setPartner(null);setScreen('partner_select');}} style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'50%',width:'28px',height:'28px',display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(200,160,200,0.7)',cursor:'pointer',fontSize:'0.85rem'}}>↩</button>
        </div>
      </div>
      <div style={{paddingBottom:'80px',minHeight:'calc(100vh - 56px)',overflowY:'auto'}}>
        {TABS[tab](tabProps)}
      </div>
      <BottomNav active={tab} onChange={setTab} unreadMessages={unreadMessages} />
    </div>
  );
}
