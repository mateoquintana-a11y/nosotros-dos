import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// ══════════════════════════════════════════════════════
// SUPABASE CONFIG — reemplaza con tus valores
// ══════════════════════════════════════════════════════
const SUPABASE_URL = "https://ybmcolklhlycemampkgk.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_f_IlDvXbDfGFhUh9PcWs7w_l_41b35E";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ══════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════
const FONT_LINK = document.createElement("link");
FONT_LINK.rel = "stylesheet";
FONT_LINK.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap";
document.head.appendChild(FONT_LINK);

const style = document.createElement("style");
style.textContent = `
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  body { margin: 0; background: #0d0a14; font-family: 'DM Sans', sans-serif; }
  .font-display { font-family: 'Cormorant Garamond', serif; }
  ::-webkit-scrollbar { width: 0; }
  input { outline: none; }
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

// ══════════════════════════════════════════════════════
// LOCAL STORAGE (solo para guardar el código de pareja)
// ══════════════════════════════════════════════════════
const LOCAL_KEY = "nd_couple_code";
const getLocalCode = () => { try { return localStorage.getItem(LOCAL_KEY); } catch { return null; } };
const setLocalCode = (c) => { try { localStorage.setItem(LOCAL_KEY, c); } catch {} };

// ══════════════════════════════════════════════════════
// SUPABASE HELPERS
// ══════════════════════════════════════════════════════
const DEFAULT_DATA = (names) => ({
  names: names || { A: "Ella", B: "Él" },
  points: { A: 0, B: 0 },
  preferences: { A: {}, B: {} },
  completed_challenges: [],
  completed_dates: [],
  completed_express: [],
  saved_positions: [],
  matches: [],
});

const dbToApp = (row) => ({
  names: row.names,
  points: row.points,
  preferences: row.preferences,
  completedChallenges: row.completed_challenges || [],
  completedDates: row.completed_dates || [],
  completedExpress: row.completed_express || [],
  savedPositions: row.saved_positions || [],
  matches: row.matches || [],
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
  updated_at: new Date().toISOString(),
});

async function fetchCouple(code) {
  const { data, error } = await supabase
    .from("couples")
    .select("*")
    .eq("couple_code", code.toUpperCase())
    .single();
  if (error) return null;
  return data;
}

async function createCouple(code, names) {
  const def = DEFAULT_DATA(names);
  const { data, error } = await supabase
    .from("couples")
    .insert([{ couple_code: code.toUpperCase(), ...appToDb(dbToApp({ ...def, completed_challenges: def.completedChallenges || [], completed_dates: def.completedDates || [], completed_express: def.completedExpress || [], saved_positions: def.savedPositions || [] })) }])
    .select()
    .single();
  if (error) return null;
  return data;
}

async function updateCouple(code, updates) {
  await supabase
    .from("couples")
    .update({ ...appToDb(updates), updated_at: new Date().toISOString() })
    .eq("couple_code", code.toUpperCase());
}

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
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
    { id:'m09', title:'Recuérdame 💭', desc:'Cuéntense sus recuerdos favoritos de cuando se conocieron. ¿Qué fue lo primero que te gustó?', points:10, time:'15 min' },
    { id:'m10', title:'Cocina para él/ella 🍳', desc:'Prepara su desayuno o cena favorita con todos los detalles. Sin ayuda y sin que lo pida', points:10, time:'30 min' },
    { id:'m11', title:'Rutina de noche juntos 🧴', desc:'Hagan su rutina nocturna juntos: cremas, hablar, sin pantallas. Terminen con un abrazo largo', points:10, time:'20 min' },
    { id:'m12', title:'Detalle sin razón 💐', desc:'Cómprale o prepárale algo pequeño sin ningún motivo especial. Solo porque sí', points:10, time:'5 min' },
  ],
  medium: [
    { id:'med01', title:'Masaje con aceites 🌺', desc:'Masaje por todo el cuerpo con aceites aromáticos. Turnos de 20 min cada uno. Sin prisa', points:20, time:'40 min' },
    { id:'med02', title:'Venda y exploración 😶', desc:'Usen una venda en los ojos y explórense con manos y labios. El que tiene la venda solo recibe', points:20, time:'20 min' },
    { id:'med03', title:'Cuento erótico 📖', desc:'Léanse algo erótico en voz alta y compartan sus reacciones en tiempo real', points:15, time:'15 min' },
    { id:'med04', title:'Exploración con hielo 🧊', desc:'Usen hielo para explorar con el frío diferentes zonas del cuerpo del otro', points:20, time:'20 min' },
    { id:'med05', title:'Striptease lento ✨', desc:'Desvístanse el uno al otro muy lentamente, en silencio, sin prisa', points:20, time:'15 min' },
    { id:'med06', title:'Strip preguntas 🃏', desc:'Preguntas íntimas entre los dos: si no respondes (o te niegas) pierdes una prenda', points:20, time:'30 min' },
    { id:'med07', title:'Sesión de fotos 📸', desc:'Tómense fotos íntimas y divertidas. Para ustedes dos solamente', points:15, time:'20 min' },
    { id:'med08', title:'Solo labios 💋', desc:'15 minutos cada uno explorando el cuerpo del otro únicamente con los labios', points:25, time:'30 min' },
    { id:'med09', title:'Cuéntame un deseo 🎁', desc:'Dile una cosa específica que quieres que te hagan. El otro escucha y lo cumple si puede. Sin juzgar', points:20, time:'15 min' },
    { id:'med10', title:'Solo mirarnos 👁️', desc:'5 minutos de contacto visual sostenido sin hablar. Sin reírse. Luego lo que surja', points:20, time:'10 min' },
    { id:'med11', title:'Exploración con calor 🌡️', desc:'Aceite tibio o vela de masaje segura. Explórense el cuerpo del otro con el calor', points:20, time:'20 min' },
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
    { id:'h08', title:'Seducción completa 💃', desc:'Música, ropa especial, bailen juntos primero. Dejen que la tensión crezca antes de todo', points:30, time:'45 min' },
    { id:'h09', title:'Solo exploración 🌊', desc:'Intimidad usando únicamente caricias y besos. Sin llegar al sexo. Solo explorar hasta no poder más', points:25, time:'30 min' },
    { id:'h10', title:'Grábense 📹', desc:'Sesión con cámara para ustedes dos solos. Lo que quieran grabar, para verlo juntos después', points:30, time:'30+ min' },
    { id:'h11', title:'Hablar sucio toda la sesión 🌶️', desc:'Desde el principio hasta el final, sin parar. Los dos. Sin vergüenza', points:30, time:'30+ min' },
    { id:'h12', title:'Posición nueva + juguete 🔀', desc:'Combinen una posición que no hayan hecho con un juguete. Doble novedad en una sola sesión', points:30, time:'30+ min' },
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
  { id:'e16', title:'Nota en el bolsillo 💌', desc:'Mete una nota descriptiva y atrevida en un bolsillo o lugar donde la encuentre después', points:5, time:'3 min' },
  { id:'e17', title:'Alarma secreta 🔔', desc:'Ponle una alarma en el teléfono con una descripción de lo que le harás esta noche', points:5, time:'2 min' },
  { id:'e18', title:'La mirada 🪞', desc:'Sin decir nada, mírale de arriba abajo lentamente y di solo: "esta noche..."', points:5, time:'1 min' },
  { id:'e19', title:'3 palabras 🫦', desc:'Mándale un mensaje con exactamente 3 palabras que lo/la pongan a pensar el resto del día', points:5, time:'2 min' },
  { id:'e20', title:'Check de temperatura 🌡️', desc:'¿Qué tienes ganas de hacer ahora mismo? Ambos responden sin filtro por mensaje', points:8, time:'5 min' },
  { id:'e21', title:'Cuenta regresiva ⏰', desc:'Dile: "en X minutos quiero que estés en el cuarto". Y cumple sin falta', points:5, time:'1 min' },
  { id:'e22', title:'Playlist de esta noche 🔊', desc:'Mándale una playlist de 5 canciones describiéndole el ambiente que quieres crear', points:5, time:'5 min' },
];

const DATES = [
  { id:'d01', title:'Spa en casa', emoji:'🛁', desc:'Máscaras, aceites, música y vino. Cuídense mutuamente', time:'2h', mood:'Relajante', points:20, steps:['Velas y música suave por toda la casa','Máscaras faciales al mismo tiempo (y ríanse juntos)','Turnos de masaje con aceites aromáticos','Baño o ducha juntos al final','Copa de vino y conversación sin teléfonos'] },
  { id:'d02', title:'Restaurante en casa', emoji:'🍷', desc:'Delivery favorito, velas, vestidos especial. Como si salieran', time:'1.5h', mood:'Romántico', points:20, steps:['Escojan su restaurante favorito para pedir','Vístanse elegante (en serio)','Velas, música y teléfonos en modo avión','Brindis antes de comer','Un postre especial para compartir'] },
  { id:'d03', title:'Cine + masaje', emoji:'🎬', desc:'El que elige la película da masaje durante toda la película', time:'2h', mood:'Relajante', points:15, steps:['Voten por la película (el perdedor da masaje)','Preparen snacks especiales','Manta y almohadas en el piso o cama','El masajista no puede parar hasta que termine','Si los dos quieren lo mismo, turno a mitad'] },
  { id:'d04', title:'Picnic en sala', emoji:'🧺', desc:'Manta en el piso, luces navideñas y snacks favoritos', time:'1.5h', mood:'Divertido', points:15, steps:['Manta grande en el centro de la sala','Luces navideñas como única iluminación','Snacks y bebidas en canasta o tabla','Playlist especial que los dos aprueben','Juego de cartas o preguntas íntimas'] },
  { id:'d05', title:'Juegos + preguntas', emoji:'🎲', desc:'Juego de mesa + preguntas íntimas como penalización', time:'1.5h', mood:'Divertido', points:15, steps:['Escojan su juego de mesa','Preparen 10 preguntas íntimas en papelitos','Quien pierda un turno responde una pregunta','El gran perdedor cumple un reto del otro','Celebren el cierre con algo especial'] },
  { id:'d06', title:'Chefs por una noche', emoji:'👨‍🍳', desc:'Receta nueva que nunca hayan preparado, con música y vino', time:'2h', mood:'Divertido', points:20, steps:['Busquen juntos una receta nueva y ambiciosa','Consigan los ingredientes ese día','Cocinen todo juntos sin dividir tareas','Playlist favorita de fondo','Presenten el plato como en un restaurante'] },
  { id:'d07', title:'Cata en casa', emoji:'🍾', desc:'Cata de vinos o cócteles con quesos, califiquen cada uno', time:'1.5h', mood:'Relajante', points:15, steps:['3-4 vinos, cervezas o ingredientes para cócteles','Quesos, frutas y botanas para acompañar','Califiquen cada uno del 1 al 10 con notas','El que adivine más características gana','El ganador elige algo para hacer esa noche'] },
  { id:'d08', title:'Karaoke privado', emoji:'🎤', desc:'Las canciones más ridículas y las más románticas. Máximo dramatismo', time:'1h', mood:'Divertido', points:15, steps:['YouTube Karaoke en la TV','Regla: 1 romántica por cada 2 ridículas','Puntos al más dramático y entregado','Canción final: dedicada al otro','Video obligatorio del momento'] },
  { id:'d09', title:'Primera cita 2.0', emoji:'💑', desc:'Recrear su primera cita desde casa con la mayor fidelidad posible', time:'2h', mood:'Romántico', points:25, steps:['Recuerden cada detalle de su primera cita','Decoren el espacio lo más parecido posible','Usen o imiten la ropa que llevaban','Recreen las conversaciones que tuvieron entonces','Añadan un "final alternativo" que no tuvieron ese día'] },
  { id:'d10', title:'Sesión fotográfica', emoji:'📸', desc:'Sesión de fotos íntima y divertida, solo para ustedes dos', time:'1h', mood:'Íntimo', points:20, steps:['Varios "sets" en diferentes partes de la casa','Fotos elegantes primero, luego más divertidas','Cambios de ropa entre sets','Algunas más íntimas para el álbum privado','Elijan su foto favorita y guárdenla como fondo'] },
  { id:'d11', title:'Noche de chimenea', emoji:'🔥', desc:'Cobijas en el piso frente a la chimenea, vino y nada de distracciones', time:'2h', mood:'Romántico', points:20, steps:['Prendan la chimenea y apaguen todas las luces','Cobijas y cojines directamente en el piso','Vino o café y algo rico para compartir','Música suave de fondo sin pantallas','Sin agenda: solo estar y ver qué surge'] },
  { id:'d12', title:'Maratón + masaje', emoji:'🍿', desc:'Episodios de una serie nueva con masaje continuo entre los dos', time:'2h', mood:'Relajante', points:15, steps:['Escojan una serie que ninguno haya visto','Definan quién da masaje los primeros episodios','A la mitad cambian de rol','Aceite o crema de manos disponible','Snacks y bebida sin levantarse del sofá'] },
  { id:'d13', title:'Noche de arte', emoji:'🎨', desc:'Pinten juntos algo totalmente libre. Sin habilidad requerida, con todo el drama', time:'1.5h', mood:'Divertido', points:15, steps:['Consigan pinturas, colores o lo que tengan','Cada uno pinta al otro o lo que quiera','Vino o bebida favorita mientras pintan','Al final presenten sus obras con seriedad total','Cuélguenlas en algún lugar de la casa'] },
  { id:'d14', title:'Spa express', emoji:'💆', desc:'Para las noches que tienen poco tiempo pero quieren algo especial', time:'45 min', mood:'Relajante', points:10, steps:['Velas encendidas, teléfonos lejos','Mascarilla facial rápida los dos','15 minutos de masaje cada uno','Ducha o baño juntos al final','Terminen con algo rico y conversación corta'] },
  { id:'d15', title:'Terraza nocturna', emoji:'🌃', desc:'Cobija, bebida, cielo de noche y conversación sin agenda', time:'1h', mood:'Romántico', points:15, steps:['Esperen a que la bebé duerma','Cobija y bebida favorita en la terraza','Teléfonos adentro','Sin tema fijo: hablen de lo que sea','Terminen con un abrazo largo mirando hacia afuera'] },
  { id:'d16', title:'Apuestas íntimas', emoji:'🎰', desc:'Cualquier juego donde cada ronda tiene una apuesta inventada en el momento', time:'1.5h', mood:'Divertido', points:15, steps:['Escojan cualquier juego: cartas, dados, lo que sea','Antes de cada ronda el ganador propone una apuesta íntima','Sin vetar propuestas antes de escucharlas','El gran ganador de la noche elige el cierre','Pueden subir la intensidad de las apuestas con cada ronda'] },
  { id:'d17', title:'Lectura íntima', emoji:'📚', desc:'Cada uno lee al otro algo que haya encontrado erótico o que le guste', time:'1h', mood:'Íntimo', points:15, steps:['Cada uno busca algo antes: un párrafo, un poema, lo que sea','Velas y posición cómoda','El primero lee mientras el otro escucha sin interrumpir','Compartan qué les generó al escuchar','Si hay algo que quieran explorar de lo leído: esa es la noche'] },
  { id:'d18', title:'Teatro en casa', emoji:'🎭', desc:'Improv juntos: escenas ridículas primero, luego ven qué surge', time:'1h', mood:'Divertido', points:15, steps:['Empiecen con escenas totalmente ridículas','Regla: siempre decir que sí a lo que proponga el otro','Vayan escalando la intensidad gradualmente','No hay guion: solo reaccionar','El único final aceptable es uno que los dos quieran'] },
  { id:'d19', title:'Postre de medianoche', emoji:'🍰', desc:'Cuando la bebé duerma, preparen algo dulce y cómanlo en la cama', time:'45 min', mood:'Romántico', points:10, steps:['Esperen que la bebé esté dormida','Preparen algo dulce juntos','Cómanlo en la cama sin mesita de noche','Sin teléfonos, sin TV','Solo los dos, la oscuridad y algo rico'] },
  { id:'d20', title:'Mañana lenta', emoji:'🛌', desc:'Un domingo sin alarmas ni teléfonos. Solo los dos y ver qué surge', time:'Mañana entera', mood:'Íntimo', points:20, steps:['Sin alarma. Que el cuerpo despierte solo','Teléfonos fuera de la habitación hasta el mediodía','Desayuno en la cama si pueden','Sin planes ni agenda','Solo estar presentes el uno con el otro'] },
];

const POSITIONS = [
  { id:'p01', name:'Cowgirl invertida', emoji:'🔄', diff:'Media', cat:'Ella arriba', desc:'Ella arriba mirando hacia los pies de él. Estimulación diferente y muy visual para ambos.', tip:'Ella puede apoyarse en los muslos o rodillas de él para mayor control. El ángulo estimula de forma completamente diferente al cowgirl tradicional.' },
  { id:'p02', name:'Mariposa', emoji:'🦋', diff:'Media', cat:'Variante', desc:'Ella al borde de la cama, él de pie frente a ella. Buena profundidad y contacto visual continuo.', tip:'Él puede sostener sus caderas o elevar sus piernas a diferentes alturas para cambiar el ángulo completamente.' },
  { id:'p03', name:'Piernas al hombro', emoji:'🦵', diff:'Media', cat:'Misionero+', desc:'Como misionero pero con las piernas de ella sobre los hombros de él. Penetración más profunda.', tip:'Empiecen con solo una pierna al hombro para calibrar la comodidad antes de intentar las dos.' },
  { id:'p04', name:'Águila', emoji:'🦅', diff:'Media', cat:'Misionero+', desc:'Ella boca arriba con piernas muy abiertas como alas, él sobre ella. Cara a cara, profunda e íntima.', tip:'Una almohada bajo la cadera de ella cambia el ángulo completamente. Él apoya las manos a los lados para mayor control.' },
  { id:'p05', name:'Cuchara profunda', emoji:'🥄', diff:'Fácil', cat:'De lado', desc:'Cucharita donde ella echa la pierna de arriba hacia atrás sobre la cadera de él. Más contacto piel con piel.', tip:'Ambos tienen manos libres para estimulación adicional. La pierna de ella sobre él da más control del movimiento.' },
  { id:'p06', name:'Movimiento trasero', emoji:'🍑', diff:'Fácil', cat:'Trasera', desc:'Ella boca abajo con caderas levantadas, él encima. Ideal para usar vibrador de pareja o anillo vibrante.', tip:'Un cojín bajo el abdomen de ella ayuda a mantener la posición. El vibrador de pareja queda perfectamente ubicado.' },
  { id:'p07', name:'Doggy Style', emoji:'🐕', diff:'Fácil', cat:'Trasera', desc:'Ella en cuatro, él detrás. Profundo con acceso total de manos para estimulación y juguetes.', tip:'Bajar el torso de ella aumenta la estimulación del punto G. Él puede llegar al clítoris fácilmente con una mano.' },
  { id:'p08', name:'Doble penetración', emoji:'💜', diff:'Difícil', cat:'Juguetes', desc:'Ella con caderas elevadas por almohadas o por ella misma, él desde atrás, con juguete adicional al frente.', tip:'Empiecen con el juguete ya en posición antes de que él entre. La comunicación es clave para ajustar la intensidad.' },
  { id:'p09', name:'Superior femenina', emoji:'👑', diff:'Fácil', cat:'Ella arriba', desc:'Ella arriba inclinada hacia adelante, cara a cara con él. Control total del ritmo y la profundidad desde ella.', tip:'Inclinarse más hacia adelante aumenta la fricción en el clítoris. Él tiene las manos completamente libres.' },
  { id:'p10', name:'Perrito plano', emoji:'🛏️', diff:'Fácil', cat:'Trasera', desc:'Ella completamente boca abajo, él encima como una manta. Máximo contacto corporal.', tip:'Ella puede elevar solo las caderas para aumentar la profundidad. Él puede susurrarle al oído con facilidad.' },
  { id:'p11', name:'Cuna', emoji:'🪷', diff:'Media', cat:'Sentada', desc:'Él sentado con piernas cruzadas, ella en su regazo mirándolo. Muy íntimo y penetración profunda.', tip:'El movimiento es circular más que de vaivén. Los dos pueden abrazarse completamente.' },
  { id:'p12', name:'Arrodillado frente a frente', emoji:'🙏', diff:'Media', cat:'Sentada', desc:'Él arrodillado, ella encima a horcajadas mirándolo. Control desde ella, muy cara a cara.', tip:'Él puede apoyarse en sus talones para más estabilidad. Sus manos quedan libres para explorar.' },
  { id:'p13', name:'Al borde', emoji:'🛋️', diff:'Fácil', cat:'Trasera', desc:'Ella doblada sobre el brazo del sofá, él detrás de pie. Espontáneo y apasionado.', tip:'La altura del brazo del sofá determina el ángulo. Ajustar los pies de ella cambia todo.' },
  { id:'p14', name:'Caderas elevadas', emoji:'🌉', diff:'Fácil', cat:'Variante', desc:'Ella boca arriba con caderas sobre almohada o cojín firme, él arrodillado. El ángulo cambia hacia el punto G.', tip:'Experimentar con la cantidad de almohadas cambia el ángulo. Requiere comunicación para encontrar la altura perfecta.' },
  { id:'p15', name:'La reina', emoji:'👸', diff:'Media', cat:'Oral', desc:'Ella se sienta sobre la cara de él para recibir sexo oral. Él recostado con acceso completo.', tip:'Ella controla completamente la presión y el movimiento. Él puede usar manos y lengua a la vez.' },
  { id:'p16', name:'Bajo el capó', emoji:'🛠️', diff:'Media', cat:'Oral', desc:'Él recostado con la cabeza colgando al borde de la cama, ella en cuclillas sobre su cara.', tip:'La posición invertida de él reduce la tensión en el cuello. Ella controla la altura con sus rodillas.' },
  { id:'p17', name:'Peepshow', emoji:'🎭', diff:'Media', cat:'Oral', desc:'Ella recostada de lado, él perpendicular entre sus piernas para oral desde un ángulo diferente.', tip:'Da acceso fácil a estimulación adicional con manos. Ideal para sesiones largas sin tensión.' },
  { id:'p18', name:'Tabla encima', emoji:'💪', diff:'Difícil', cat:'Trasera', desc:'Él en posición de plancha encima de ella penetrando. Muy intenso, requiere fuerza de core real.', tip:'Pueden transicionar a rodillas cuando se canse. Ella puede envolverlo con las piernas para ayudarlo.' },
  { id:'p19', name:'Posición polo', emoji:'🔀', diff:'Media', cat:'Ella arriba', desc:'Ella encima pero montando solo una pierna de él. Ángulo único, manos libres para ambos.', tip:'Ella baja muy cuidadosamente para evitar lesiones. El ángulo permite giros que el cowgirl normal no permite.' },
  { id:'p20', name:'Oral inverso', emoji:'🔁', diff:'Media', cat:'Oral', desc:'Ella boca abajo, él la estimula oralmente desde atrás. Acceso diferente al clítoris y zona trasera.', tip:'Ella puede apoyarse en sus codos. Él puede alternarse entre diferentes zonas con total libertad.' },
  { id:'p21', name:'Suplex oral', emoji:'🌊', diff:'Media', cat:'Oral', desc:'Él sentado al borde de la cama o silla, ella boca arriba con caderas sobre sus piernas, él se inclina para dar oral.', tip:'Este ángulo reduce la tensión de cuello de él completamente. La elevación facilita el acceso.' },
];

const LEVELS = [
  { min:0,   max:99,   name:'Pareja Romántica',  emoji:'🌹', gradient:'linear-gradient(135deg,#a8456a,#c96b8a)' },
  { min:100, max:299,  name:'Pareja Aventurera', emoji:'💫', gradient:'linear-gradient(135deg,#6d28d9,#8b5cf6)' },
  { min:300, max:599,  name:'Pareja Apasionada', emoji:'🔥', gradient:'linear-gradient(135deg,#c2500a,#e07340)' },
  { min:600, max:9999, name:'Pareja Legendaria', emoji:'✨', gradient:'linear-gradient(135deg,#a87800,#d4a017)' },
];
const getLevel = pts => LEVELS.find(l=>pts>=l.min&&pts<=l.max)||LEVELS[0];
const ICfg = {
  mild:   { label:'Mild',   emoji:'🌸', bg:'rgba(201,107,138,0.12)', border:'rgba(201,107,138,0.3)', accent:'#e07b8a' },
  medium: { label:'Medium', emoji:'🔥', bg:'rgba(224,115,64,0.12)',  border:'rgba(224,115,64,0.3)',  accent:'#e07340' },
  hot:    { label:'Hot',    emoji:'🌶️', bg:'rgba(220,38,38,0.12)',   border:'rgba(220,38,38,0.3)',   accent:'#ef4444' },
};

// ══════════════════════════════════════════════════════
// SHARED UI HELPERS
// ══════════════════════════════════════════════════════
const Btn = ({onClick,children,style:s={},...p}) => (
  <button onClick={onClick} style={{fontFamily:'DM Sans,sans-serif',cursor:'pointer',...s}} {...p}>{children}</button>
);
const inp = (extra={}) => ({width:'100%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'14px',padding:'0.875rem 1rem',color:'white',fontFamily:'DM Sans,sans-serif',fontSize:'1rem',...extra});

// ══════════════════════════════════════════════════════
// SETUP SCREENS
// ══════════════════════════════════════════════════════
function SplashScreen({onNext}) {
  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(160deg,#0d0a14,#1a0d2e,#0d0a14)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'2rem',textAlign:'center'}}>
      <div style={{fontSize:'5rem',marginBottom:'1.5rem',filter:'drop-shadow(0 0 24px rgba(197,110,140,0.5))'}}>💑</div>
      <h1 className="font-display" style={{fontSize:'3.2rem',fontWeight:700,color:'#f0e8f8',margin:'0 0 0.5rem',lineHeight:1.1}}>Nosotros Dos</h1>
      <p style={{color:'#c89fd4',fontSize:'1.1rem',margin:'0 0 3.5rem'}}>Tu espacio íntimo en pareja</p>
      <Btn onClick={onNext} style={{background:'linear-gradient(135deg,#a8456a,#7c3aed)',color:'white',fontWeight:600,fontSize:'1rem',padding:'1rem 2.5rem',borderRadius:'100px',border:'none'}}>
        Comenzar juntos ✨
      </Btn>
    </div>
  );
}

function JoinOrCreateScreen({onCreated, onJoined}) {
  const [mode, setMode] = useState(null); // 'create' | 'join'
  const [nameA, setNameA] = useState('');
  const [nameB, setNameB] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');

  const handleCreate = async () => {
    if(!nameA.trim()||!nameB.trim()) return;
    setLoading(true); setError('');
    const newCode = generateCode();
    setGeneratedCode(newCode);
    const row = await createCouple(newCode, {A:nameA.trim(), B:nameB.trim()});
    if(!row) { setError('Error al crear. Intenta de nuevo.'); setLoading(false); return; }
    setLocalCode(newCode);
    onCreated(dbToApp(row), newCode);
  };

  const handleJoin = async () => {
    if(!code.trim()) return;
    setLoading(true); setError('');
    const row = await fetchCouple(code.trim());
    if(!row) { setError('Código no encontrado. Verifica e intenta de nuevo.'); setLoading(false); return; }
    setLocalCode(code.trim().toUpperCase());
    onJoined(dbToApp(row), code.trim().toUpperCase());
  };

  const cardStyle = {background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'20px',padding:'1.5rem',width:'100%',maxWidth:'340px'};

  if(!mode) return (
    <div style={{minHeight:'100vh',background:'linear-gradient(160deg,#0d0a14,#1a0d2e,#0d0a14)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'2rem',gap:'1rem'}}>
      <div style={{textAlign:'center',marginBottom:'1rem'}}>
        <div style={{fontSize:'3rem',marginBottom:'0.75rem'}}>💝</div>
        <h2 className="font-display" style={{fontSize:'2rem',color:'#f0e8f8',margin:'0 0 0.4rem'}}>¿Cómo quieren empezar?</h2>
        <p style={{color:'rgba(180,150,200,0.7)',fontSize:'0.85rem',margin:0}}>Solo uno de los dos crea. El otro se une con el código.</p>
      </div>
      <Btn onClick={()=>setMode('create')} style={{width:'100%',maxWidth:'300px',background:'linear-gradient(135deg,#a8456a,#7c3aed)',color:'white',fontWeight:600,fontSize:'1rem',padding:'1rem',borderRadius:'14px',border:'none'}}>
        ✨ Crear nuestra pareja
      </Btn>
      <Btn onClick={()=>setMode('join')} style={{width:'100%',maxWidth:'300px',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',color:'white',fontWeight:500,fontSize:'1rem',padding:'1rem',borderRadius:'14px'}}>
        🔗 Unirme con un código
      </Btn>
    </div>
  );

  if(mode==='create') return (
    <div style={{minHeight:'100vh',background:'linear-gradient(160deg,#0d0a14,#1a0d2e,#0d0a14)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'2rem'}}>
      <div style={{...cardStyle}}>
        <Btn onClick={()=>setMode(null)} style={{background:'none',border:'none',color:'rgba(200,160,200,0.7)',fontSize:'0.85rem',padding:'0 0 1rem',display:'block'}}>← Volver</Btn>
        <h3 className="font-display" style={{color:'#f0e8f8',fontSize:'1.5rem',margin:'0 0 1.25rem'}}>Crear pareja ✨</h3>
        {[['👩 Nombre de ella',nameA,setNameA],['👨 Nombre de él',nameB,setNameB]].map(([lbl,val,set])=>(
          <div key={lbl} style={{marginBottom:'0.875rem'}}>
            <label style={{color:'#c89fd4',fontSize:'0.78rem',fontWeight:500,display:'block',marginBottom:'0.4rem'}}>{lbl}</label>
            <input style={inp()} placeholder="Nombre..." value={val} onChange={e=>set(e.target.value)} />
          </div>
        ))}
        {error&&<p style={{color:'#f87171',fontSize:'0.8rem',margin:'0.5rem 0'}}>{error}</p>}
        <Btn onClick={handleCreate} disabled={loading||!nameA.trim()||!nameB.trim()} style={{width:'100%',background:(loading||!nameA.trim()||!nameB.trim())?'rgba(255,255,255,0.08)':'linear-gradient(135deg,#a8456a,#7c3aed)',color:'white',fontWeight:600,fontSize:'1rem',padding:'1rem',borderRadius:'14px',border:'none',marginTop:'0.5rem'}}>
          {loading?<span className="spin">⏳</span>:'Crear y obtener código'}
        </Btn>
      </div>
    </div>
  );

  if(mode==='join') return (
    <div style={{minHeight:'100vh',background:'linear-gradient(160deg,#0d0a14,#1a0d2e,#0d0a14)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'2rem'}}>
      <div style={{...cardStyle}}>
        <Btn onClick={()=>setMode(null)} style={{background:'none',border:'none',color:'rgba(200,160,200,0.7)',fontSize:'0.85rem',padding:'0 0 1rem',display:'block'}}>← Volver</Btn>
        <h3 className="font-display" style={{color:'#f0e8f8',fontSize:'1.5rem',margin:'0 0 0.5rem'}}>Unirme 🔗</h3>
        <p style={{color:'rgba(180,150,200,0.6)',fontSize:'0.82rem',margin:'0 0 1.25rem',lineHeight:1.4}}>Pídele a tu pareja el código de 6 letras que aparece en su pantalla</p>
        <label style={{color:'#c89fd4',fontSize:'0.78rem',fontWeight:500,display:'block',marginBottom:'0.4rem'}}>Código de pareja</label>
        <input style={inp({textTransform:'uppercase',letterSpacing:'0.15em',fontSize:'1.2rem',textAlign:'center'})} placeholder="XXXXXX" maxLength={6} value={code} onChange={e=>setCode(e.target.value.toUpperCase())} />
        {error&&<p style={{color:'#f87171',fontSize:'0.8rem',margin:'0.5rem 0'}}>{error}</p>}
        <Btn onClick={handleJoin} disabled={loading||code.length<6} style={{width:'100%',background:(loading||code.length<6)?'rgba(255,255,255,0.08)':'linear-gradient(135deg,#a8456a,#7c3aed)',color:'white',fontWeight:600,fontSize:'1rem',padding:'1rem',borderRadius:'14px',border:'none',marginTop:'0.875rem'}}>
          {loading?<span className="spin">⏳</span>:'Unirme'}
        </Btn>
      </div>
    </div>
  );
}

function CodeDisplayScreen({code, onContinue}) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(()=>setCopied(false),2000); };
  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(160deg,#0d0a14,#1a0d2e,#0d0a14)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'2rem',textAlign:'center'}}>
      <div style={{fontSize:'3rem',marginBottom:'1rem'}}>🎉</div>
      <h2 className="font-display" style={{color:'#f0e8f8',fontSize:'2rem',margin:'0 0 0.5rem'}}>¡Pareja creada!</h2>
      <p style={{color:'rgba(180,150,200,0.7)',fontSize:'0.88rem',margin:'0 0 2rem',maxWidth:'260px',lineHeight:1.5}}>Comparte este código con tu pareja para que se una desde su celular</p>
      <div style={{background:'rgba(197,110,140,0.15)',border:'2px solid rgba(197,110,140,0.4)',borderRadius:'20px',padding:'1.5rem 2.5rem',marginBottom:'1rem'}}>
        <p style={{color:'rgba(200,160,200,0.6)',fontSize:'0.75rem',margin:'0 0 0.5rem'}}>Tu código de pareja</p>
        <p style={{color:'white',fontSize:'2.5rem',fontWeight:700,letterSpacing:'0.2em',margin:0,fontFamily:'DM Sans,sans-serif'}}>{code}</p>
      </div>
      <Btn onClick={copy} style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',color:'white',padding:'0.6rem 1.5rem',borderRadius:'100px',fontSize:'0.85rem',marginBottom:'1.5rem'}}>
        {copied?'✓ Copiado':'Copiar código'}
      </Btn>
      <Btn onClick={onContinue} style={{background:'linear-gradient(135deg,#a8456a,#7c3aed)',color:'white',fontWeight:600,fontSize:'1rem',padding:'1rem 2.5rem',borderRadius:'100px',border:'none'}}>
        Continuar →
      </Btn>
    </div>
  );
}

function PartnerSelectScreen({names, onSelect}) {
  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(160deg,#0d0a14,#1a0d2e,#0d0a14)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'2rem'}}>
      <div style={{textAlign:'center',marginBottom:'2.5rem'}}>
        <div style={{fontSize:'3.5rem',marginBottom:'1rem'}}>💑</div>
        <h2 className="font-display" style={{fontSize:'2rem',color:'#f0e8f8',margin:'0 0 0.4rem'}}>¿Quién está aquí?</h2>
        <p style={{color:'rgba(180,150,200,0.6)',fontSize:'0.85rem',margin:0}}>Selecciona tu perfil para continuar</p>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem',width:'100%',maxWidth:'300px'}}>
        {[['A','👩',names.A,'rgba(168,69,106,0.2)','rgba(168,69,106,0.4)'],
          ['B','👨',names.B,'rgba(124,58,237,0.2)','rgba(124,58,237,0.4)']].map(([key,em,name,bg,bdr])=>(
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
// MAIN TABS (same as before, condensed)
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
  const completed=(appData.completedChallenges||[]).length+(appData.completedDates||[]).length+(appData.completedExpress||[]).length;
  const saved=(appData.savedPositions||[]).length;
  const allC=[...CHALLENGES.mild,...CHALLENGES.medium,...CHALLENGES.hot];
  const done=appData.completedChallenges||[];
  const avail=allC.filter(c=>!done.includes(c.id));
  const suggested=avail[Math.floor(Date.now()/86400000)%Math.max(avail.length,1)];
  return (
    <div style={{padding:'1rem',display:'flex',flexDirection:'column',gap:'1rem'}}>
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
          <h3 style={{color:'white',fontWeight:600,fontSize:'1rem',margin:'0 0 0.35rem'}}>{suggested.title}</h3>
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
    if(val!==null) setAnim(val===true?'right':'left');
    setTimeout(()=>{
      const newPrefs={...appData.preferences,[partner]:{...(appData.preferences?.[partner]||{}),[qId]:val}};
      let newMatches=[...matches]; let matched=false;
      if(val===true&&partnerPrefs[qId]===true&&!newMatches.includes(qId)){newMatches.push(qId);matched=true;}
      const newPoints={...(appData.points||{A:0,B:0}),[partner]:((appData.points?.[partner])||0)+2};
      updateData({preferences:newPrefs,matches:newMatches,points:newPoints});
      if(matched) setNewMatch(qId);
      setAnim(null);
    },180);
  };
  const editPref=(qId,val)=>{
    const newPrefs={...appData.preferences,[partner]:{...(appData.preferences?.[partner]||{}),[qId]:val}};
    let newMatches=(appData.matches||[]).filter(m=>m!==qId);
    if(val===true&&partnerPrefs[qId]===true) newMatches.push(qId);
    updateData({preferences:newPrefs,matches:newMatches});
  };
  if(newMatch){const q=QUESTIONS.find(q=>q.id===newMatch);return(<div style={{minHeight:'60vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'2rem',textAlign:'center'}}><div style={{fontSize:'4rem',marginBottom:'1rem'}} className="pop">💞</div><h2 className="font-display" style={{color:'#e07b8a',fontSize:'2rem',margin:'0 0 0.75rem'}}>¡Match!</h2><p style={{color:'rgba(240,210,240,0.9)',marginBottom:'0.5rem',fontSize:'0.9rem'}}>¡Los dos dijeron que sí a esto!</p><div style={{background:'rgba(197,110,140,0.15)',border:'1px solid rgba(197,110,140,0.3)',borderRadius:'16px',padding:'1rem',margin:'0.5rem 0 1.5rem',maxWidth:'280px'}}><p style={{color:'white',margin:0,fontSize:'0.9rem',lineHeight:1.4}}>{q?.text}</p></div><Btn onClick={()=>setNewMatch(null)} style={{background:'linear-gradient(135deg,#a8456a,#7c3aed)',color:'white',fontWeight:600,padding:'0.875rem 2rem',borderRadius:'100px',border:'none'}}>Continuar ✨</Btn></div>);}
  if(showAnswered){const answeredQs=QUESTIONS.filter(q=>answered.includes(q.id));const cats=[...new Set(answeredQs.map(q=>q.cat))];return(<div style={{padding:'1rem'}}><div style={{display:'flex',alignItems:'center',gap:'0.75rem',marginBottom:'0.5rem'}}><Btn onClick={()=>setShowAnswered(false)} style={{background:'none',border:'none',color:'rgba(200,160,200,0.8)',fontSize:'0.9rem',padding:0}}>← Volver</Btn><h3 style={{color:'white',fontWeight:600,margin:0}}>Mis respuestas</h3></div><p style={{color:'rgba(200,160,200,0.6)',fontSize:'0.78rem',margin:'0 0 1rem',lineHeight:1.4}}>Puedes cambiar cualquier respuesta. Los matches se actualizan automáticamente.</p>{cats.map(cat=>(<div key={cat} style={{marginBottom:'1.25rem'}}><p style={{color:'#e07b8a',fontSize:'0.78rem',fontWeight:600,margin:'0 0 0.5rem'}}>{cat}</p>{answeredQs.filter(q=>q.cat===cat).map(q=>(<div key={q.id} style={{background:'rgba(255,255,255,0.05)',border:`1px solid ${matches.includes(q.id)?'rgba(197,110,140,0.35)':'rgba(255,255,255,0.08)'}`,borderRadius:'14px',padding:'0.75rem 1rem',display:'flex',alignItems:'center',gap:'0.75rem',marginBottom:'0.4rem'}}><div style={{flex:1}}><p style={{color:'rgba(240,220,240,0.9)',fontSize:'0.82rem',margin:0,lineHeight:1.35}}>{q.text}</p>{matches.includes(q.id)&&<span style={{color:'#e07b8a',fontSize:'0.7rem'}}>💞 Match con {names[pKey]}</span>}</div><div style={{display:'flex',gap:'0.3rem',flexShrink:0}}>{[{v:true,e:'✓',c:'#22c55e'},{v:null,e:'?',c:'#eab308'},{v:false,e:'✕',c:'#ef4444'}].map(({v,e,c})=>(<button key={String(v)} onClick={()=>editPref(q.id,v)} style={{width:'28px',height:'28px',borderRadius:'50%',border:'none',cursor:'pointer',fontSize:'0.8rem',background:prefs[q.id]===v?c:'rgba(255,255,255,0.1)',color:prefs[q.id]===v?'white':'rgba(200,170,200,0.5)'}}>{e}</button>))}</div></div>))}</div>))}</div>);}
  return (
    <div style={{padding:'1rem',display:'flex',flexDirection:'column',minHeight:'calc(100vh - 160px)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.75rem'}}>
        <h2 className="font-display" style={{color:'#f0e8f8',fontSize:'1.5rem',margin:0}}>Descubrir 💫</h2>
        <Btn onClick={()=>setShowAnswered(true)} style={{background:'none',border:'none',color:'#e07b8a',fontSize:'0.82rem',padding:0}}>Ver respuestas</Btn>
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
      {unanswered.length===0?(<div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center'}}><div style={{fontSize:'4rem',marginBottom:'1rem'}}>🎉</div><h3 className="font-display" style={{color:'white',fontSize:'1.8rem',margin:'0 0 0.5rem'}}>¡Todo respondido!</h3><p style={{color:'rgba(200,160,200,0.8)',margin:'0 0 1.5rem',fontSize:'0.9rem'}}>Puedes editar tus respuestas cuando quieras</p><p style={{color:'#e07b8a',fontWeight:600,margin:'0 0 1.5rem'}}>{matches.length} matches con {names[pKey]} 💞</p><Btn onClick={()=>setShowAnswered(true)} style={{background:'rgba(197,110,140,0.15)',border:'1px solid rgba(197,110,140,0.3)',color:'#e07b8a',padding:'0.75rem 1.5rem',borderRadius:'100px',fontSize:'0.9rem'}}>Ver mis respuestas</Btn></div>):(
        <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
          <div style={{marginBottom:'0.75rem'}}><span style={{background:'rgba(124,58,237,0.2)',border:'1px solid rgba(124,58,237,0.3)',color:'#a78bfa',fontSize:'0.75rem',padding:'0.3rem 0.75rem',borderRadius:'100px'}}>{current?.cat}</span></div>
          <div className={`swipe-card ${anim==='left'?'swipe-left':anim==='right'?'swipe-right':''}`} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'28px',padding:'2.5rem 2rem',textAlign:'center',marginBottom:'2rem',width:'100%',maxWidth:'340px',minHeight:'160px',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <p style={{color:'white',fontSize:'1.1rem',lineHeight:1.5,margin:0}}>{current?.text}</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'0.75rem',width:'100%',maxWidth:'300px'}}>
            {[{v:false,e:'✕',l:'No',bg:'rgba(239,68,68,0.15)',bdr:'rgba(239,68,68,0.35)',col:'#f87171'},{v:null,e:'?',l:'Quizás',bg:'rgba(234,179,8,0.15)',bdr:'rgba(234,179,8,0.35)',col:'#fbbf24'},{v:true,e:'✓',l:'Sí',bg:'rgba(34,197,94,0.15)',bdr:'rgba(34,197,94,0.35)',col:'#4ade80'}].map(({v,e,l,bg,bdr,col})=>(
              <button key={l} onClick={()=>answer(current.id,v)} style={{background:bg,border:`1px solid ${bdr}`,borderRadius:'18px',padding:'1rem 0.5rem',display:'flex',flexDirection:'column',alignItems:'center',gap:'0.3rem',cursor:'pointer'}}>
                <span style={{fontSize:'1.6rem',color:col}}>{e}</span>
                <span style={{color:col,fontSize:'0.8rem',fontWeight:500}}>{l}</span>
              </button>
            ))}
          </div>
          <p style={{color:'rgba(200,160,200,0.4)',fontSize:'0.75rem',marginTop:'1rem'}}>{unanswered.length} preguntas restantes</p>
        </div>
      )}
    </div>
  );
}

function ChallengesTab({appData,partner,updateData}) {
  const [intensity,setIntensity]=useState('mild');
  const [selected,setSelected]=useState(null);
  const [done2,setDone2]=useState(false);
  const done=appData.completedChallenges||[];
  const total=(appData.points?.A||0)+(appData.points?.B||0);
  const hotLocked=total<100;
  const complete=(c)=>{if(done.includes(c.id))return;const newDone=[...done,c.id];const newPts={...(appData.points||{A:0,B:0}),[partner]:((appData.points?.[partner])||0)+c.points};updateData({completedChallenges:newDone,points:newPts});setDone2(true);};
  if(selected){const cfg=ICfg[intensity];return(<div style={{padding:'1rem'}} className="fade-up"><Btn onClick={()=>{setSelected(null);setDone2(false);}} style={{background:'none',border:'none',color:'rgba(200,160,200,0.8)',fontSize:'0.9rem',padding:'0 0 1rem',display:'block'}}>← Volver</Btn><div style={{background:cfg.bg,border:`1px solid ${cfg.border}`,borderRadius:'24px',padding:'1.5rem',marginBottom:'1rem'}}><span style={{color:cfg.accent,fontSize:'0.75rem',fontWeight:500}}>{cfg.emoji} {cfg.label}</span><h2 className="font-display" style={{color:'white',fontSize:'1.75rem',margin:'0.3rem 0 0.75rem',lineHeight:1.2}}>{selected.title}</h2><p style={{color:'rgba(220,190,220,0.9)',lineHeight:1.6,margin:'0 0 1rem',fontSize:'0.95rem'}}>{selected.desc}</p><div style={{display:'flex',gap:'1rem'}}><span style={{color:'#e07b8a',fontSize:'0.8rem'}}>⏱ {selected.time}</span><span style={{color:'#d4a017',fontSize:'0.8rem'}}>+{selected.points} pts</span></div></div>{done.includes(selected.id)||done2?(<div style={{background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.3)',borderRadius:'16px',padding:'1.25rem',textAlign:'center'}}><div style={{fontSize:'2.5rem',marginBottom:'0.5rem'}}>✅</div><p style={{color:'#4ade80',fontWeight:600,margin:0}}>¡Reto completado! +{selected.points} pts</p></div>):(<Btn onClick={()=>complete(selected)} style={{width:'100%',background:cfg.accent,color:'white',fontWeight:600,fontSize:'1rem',padding:'1rem',borderRadius:'14px',border:'none'}}>✓ ¡Completado! (+{selected.points} pts)</Btn>)}</div>);}
  return (<div style={{padding:'1rem'}}><h2 className="font-display" style={{color:'#f0e8f8',fontSize:'1.5rem',margin:'0 0 1rem'}}>Retos 🎯</h2><div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'0.5rem',marginBottom:'1rem'}}>{Object.entries(ICfg).map(([key,cfg])=>(<button key={key} onClick={()=>{if(key==='hot'&&hotLocked)return;setIntensity(key);}} style={{background:intensity===key?cfg.accent:(key==='hot'&&hotLocked?'rgba(255,255,255,0.03)':'rgba(255,255,255,0.07)'),border:`1px solid ${intensity===key?cfg.accent:cfg.border}`,borderRadius:'14px',padding:'0.7rem 0.5rem',display:'flex',flexDirection:'column',alignItems:'center',gap:'0.3rem',cursor:key==='hot'&&hotLocked?'default':'pointer',opacity:key==='hot'&&hotLocked?0.5:1}}><span style={{fontSize:'1.2rem'}}>{cfg.emoji}</span><span style={{color:intensity===key?'white':'rgba(200,160,200,0.8)',fontSize:'0.75rem',fontWeight:500,fontFamily:'DM Sans'}}>{cfg.label}</span>{key==='hot'&&hotLocked&&<span style={{color:'rgba(200,160,200,0.5)',fontSize:'0.62rem'}}>🔒 100 pts</span>}</button>))}</div><div style={{display:'flex',flexDirection:'column',gap:'0.6rem'}}>{CHALLENGES[intensity].map(c=>(<button key={c.id} onClick={()=>setSelected(c)} style={{background:done.includes(c.id)?'rgba(255,255,255,0.03)':'rgba(255,255,255,0.06)',border:`1px solid ${ICfg[intensity].border}`,borderRadius:'16px',padding:'1rem',display:'flex',alignItems:'center',justifyContent:'space-between',textAlign:'left',cursor:'pointer',opacity:done.includes(c.id)?0.6:1}}><div style={{flex:1}}><div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}><span style={{color:'white',fontWeight:500,fontSize:'0.9rem',fontFamily:'DM Sans'}}>{c.title}</span>{done.includes(c.id)&&<span style={{color:'#4ade80',fontSize:'0.75rem'}}>✓</span>}</div><p style={{color:'rgba(200,170,200,0.7)',fontSize:'0.78rem',margin:'0.2rem 0 0',lineHeight:1.3}}>{c.desc.slice(0,65)}…</p><div style={{display:'flex',gap:'0.75rem',marginTop:'0.35rem'}}><span style={{color:'rgba(200,160,200,0.5)',fontSize:'0.72rem'}}>{c.time}</span><span style={{color:'#d4a017',fontSize:'0.72rem'}}>+{c.points} pts</span></div></div><span style={{color:'rgba(200,160,200,0.3)',marginLeft:'0.75rem',fontSize:'1.2rem'}}>›</span></button>))}</div></div>);
}

function ExpressTab({appData,partner,updateData}) {
  const [selected,setSelected]=useState(null);
  const [done2,setDone2]=useState(false);
  const done=appData.completedExpress||[];
  const complete=(item)=>{if(done.includes(item.id))return;const newDone=[...done,item.id];const newPts={...(appData.points||{A:0,B:0}),[partner]:((appData.points?.[partner])||0)+item.points};updateData({completedExpress:newDone,points:newPts});setDone2(true);};
  if(selected)return(<div style={{padding:'1rem'}} className="fade-up"><Btn onClick={()=>{setSelected(null);setDone2(false);}} style={{background:'none',border:'none',color:'rgba(200,160,200,0.8)',fontSize:'0.9rem',padding:'0 0 1rem',display:'block'}}>← Volver</Btn><div style={{background:'rgba(234,179,8,0.1)',border:'1px solid rgba(234,179,8,0.3)',borderRadius:'24px',padding:'1.5rem',marginBottom:'1rem'}}><span style={{color:'#fbbf24',fontSize:'0.75rem',fontWeight:500}}>⚡ Express</span><h2 className="font-display" style={{color:'white',fontSize:'1.75rem',margin:'0.3rem 0 0.75rem'}}>{selected.title}</h2><p style={{color:'rgba(220,190,220,0.9)',lineHeight:1.6,margin:'0 0 1rem',fontSize:'0.95rem'}}>{selected.desc}</p><div style={{display:'flex',gap:'1rem'}}><span style={{color:'#fbbf24',fontSize:'0.8rem'}}>⏱ {selected.time}</span><span style={{color:'#d4a017',fontSize:'0.8rem'}}>+{selected.points} pts</span></div></div>{done.includes(selected.id)||done2?(<div style={{background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.3)',borderRadius:'16px',padding:'1.25rem',textAlign:'center'}}><div style={{fontSize:'2.5rem',marginBottom:'0.5rem'}}>✅</div><p style={{color:'#4ade80',fontWeight:600,margin:0}}>¡Lo hiciste! +{selected.points} pts</p></div>):(<Btn onClick={()=>complete(selected)} style={{width:'100%',background:'linear-gradient(135deg,#d97706,#f59e0b)',color:'white',fontWeight:600,fontSize:'1rem',padding:'1rem',borderRadius:'14px',border:'none'}}>⚡ ¡Lo hice! (+{selected.points} pts)</Btn>)}</div>);
  return(<div style={{padding:'1rem'}}><h2 className="font-display" style={{color:'#f0e8f8',fontSize:'1.5rem',margin:'0 0 0.25rem'}}>Express ⚡</h2><p style={{color:'rgba(200,160,200,0.7)',fontSize:'0.83rem',margin:'0 0 1rem'}}>Para cuando tienen poco tiempo pero quieren provocarse</p><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.65rem'}}>{EXPRESS.map(item=>(<button key={item.id} onClick={()=>setSelected(item)} style={{background:done.includes(item.id)?'rgba(255,255,255,0.03)':'rgba(255,255,255,0.06)',border:'1px solid rgba(234,179,8,0.2)',borderRadius:'18px',padding:'1rem',textAlign:'left',cursor:'pointer',opacity:done.includes(item.id)?0.6:1}}><h3 style={{color:'white',fontWeight:500,fontSize:'0.85rem',margin:'0 0 0.35rem',fontFamily:'DM Sans'}}>{item.title}</h3><p style={{color:'rgba(200,170,200,0.7)',fontSize:'0.75rem',margin:'0 0 0.5rem',lineHeight:1.35}}>{item.desc.slice(0,55)}…</p><div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'#fbbf24',fontSize:'0.7rem'}}>{item.time}</span><span style={{color:'#d4a017',fontSize:'0.7rem'}}>+{item.points}</span></div>{done.includes(item.id)&&<div style={{color:'#4ade80',fontSize:'0.7rem',marginTop:'0.25rem'}}>✓ Hecho</div>}</button>))}</div></div>);
}

function DatesTab({appData,partner,updateData}) {
  const [selected,setSelected]=useState(null);
  const [done2,setDone2]=useState(false);
  const [filter,setFilter]=useState('Todos');
  const done=appData.completedDates||[];
  const moods=['Todos','Romántico','Divertido','Relajante','Íntimo'];
  const complete=(d)=>{if(done.includes(d.id))return;const newDone=[...done,d.id];const newPts={...(appData.points||{A:0,B:0}),[partner]:((appData.points?.[partner])||0)+d.points};updateData({completedDates:newDone,points:newPts});setDone2(true);};
  if(selected)return(<div style={{padding:'1rem'}} className="fade-up"><Btn onClick={()=>{setSelected(null);setDone2(false);}} style={{background:'none',border:'none',color:'rgba(200,160,200,0.8)',fontSize:'0.9rem',padding:'0 0 1rem',display:'block'}}>← Volver</Btn><div style={{background:'rgba(197,110,140,0.1)',border:'1px solid rgba(197,110,140,0.25)',borderRadius:'24px',padding:'1.5rem',marginBottom:'1rem',textAlign:'center'}}><div style={{fontSize:'3.5rem',marginBottom:'0.75rem'}}>{selected.emoji}</div><h2 className="font-display" style={{color:'white',fontSize:'1.75rem',margin:'0 0 0.5rem'}}>{selected.title}</h2><p style={{color:'rgba(220,190,220,0.9)',margin:'0 0 0.75rem',fontSize:'0.9rem',lineHeight:1.5}}>{selected.desc}</p><div style={{display:'flex',justifyContent:'center',gap:'1rem'}}><span style={{color:'#e07b8a',fontSize:'0.8rem'}}>⏱ {selected.time}</span><span style={{color:'#a78bfa',fontSize:'0.8rem'}}>{selected.mood}</span><span style={{color:'#d4a017',fontSize:'0.8rem'}}>+{selected.points} pts</span></div></div><div style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'18px',padding:'1.25rem',marginBottom:'1rem'}}><h3 style={{color:'white',fontWeight:600,fontSize:'0.9rem',margin:'0 0 0.75rem',fontFamily:'DM Sans'}}>Cómo hacerlo:</h3>{selected.steps.map((s,i)=>(<div key={i} style={{display:'flex',gap:'0.75rem',marginBottom:'0.6rem',alignItems:'flex-start'}}><span style={{background:'rgba(197,110,140,0.25)',color:'#e07b8a',borderRadius:'50%',width:'22px',height:'22px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.7rem',flexShrink:0,marginTop:'1px'}}>{i+1}</span><p style={{color:'rgba(220,190,220,0.9)',fontSize:'0.83rem',margin:0,lineHeight:1.4}}>{s}</p></div>))}</div>{done.includes(selected.id)||done2?(<div style={{background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.3)',borderRadius:'16px',padding:'1.25rem',textAlign:'center'}}><div style={{fontSize:'2.5rem',marginBottom:'0.5rem'}}>✅</div><p style={{color:'#4ade80',fontWeight:600,margin:0}}>¡Ya tuvieron esta cita!</p></div>):(<Btn onClick={()=>complete(selected)} style={{width:'100%',background:'linear-gradient(135deg,#a8456a,#c96b8a)',color:'white',fontWeight:600,fontSize:'1rem',padding:'1rem',borderRadius:'14px',border:'none'}}>✓ ¡La tuvimos! (+{selected.points} pts)</Btn>)}</div>);
  const filtered=filter==='Todos'?DATES:DATES.filter(d=>d.mood===filter);
  return(<div style={{padding:'1rem'}}><h2 className="font-display" style={{color:'#f0e8f8',fontSize:'1.5rem',margin:'0 0 0.25rem'}}>Citas en Casa 📅</h2><p style={{color:'rgba(200,160,200,0.7)',fontSize:'0.83rem',margin:'0 0 1rem'}}>Momentos especiales sin necesidad de salir</p><div style={{display:'flex',gap:'0.5rem',marginBottom:'1rem',overflowX:'auto',paddingBottom:'0.25rem'}}>{moods.map(m=>(<button key={m} onClick={()=>setFilter(m)} style={{background:filter===m?'#e07b8a':'rgba(255,255,255,0.07)',border:'none',borderRadius:'100px',padding:'0.4rem 0.9rem',color:filter===m?'white':'rgba(200,160,200,0.7)',fontFamily:'DM Sans,sans-serif',fontSize:'0.8rem',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>{m}</button>))}</div><div style={{display:'flex',flexDirection:'column',gap:'0.65rem'}}>{filtered.map(d=>(<button key={d.id} onClick={()=>setSelected(d)} style={{background:done.includes(d.id)?'rgba(255,255,255,0.03)':'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'18px',padding:'1rem',display:'flex',alignItems:'center',gap:'1rem',textAlign:'left',cursor:'pointer',opacity:done.includes(d.id)?0.65:1}}><span style={{fontSize:'2.5rem',flexShrink:0}}>{d.emoji}</span><div style={{flex:1}}><div style={{display:'flex',alignItems:'center',gap:'0.4rem'}}><span style={{color:'white',fontWeight:500,fontFamily:'DM Sans',fontSize:'0.9rem'}}>{d.title}</span>{done.includes(d.id)&&<span style={{color:'#4ade80',fontSize:'0.75rem'}}>✓</span>}</div><p style={{color:'rgba(200,170,200,0.7)',fontSize:'0.78rem',margin:'0.2rem 0 0',lineHeight:1.3}}>{d.desc}</p><div style={{display:'flex',gap:'0.75rem',marginTop:'0.3rem'}}><span style={{color:'rgba(200,160,200,0.5)',fontSize:'0.7rem'}}>{d.time}</span><span style={{color:'#a78bfa',fontSize:'0.7rem'}}>{d.mood}</span><span style={{color:'#d4a017',fontSize:'0.7rem'}}>+{d.points} pts</span></div></div></button>))}</div></div>);
}

function PositionsTab({appData,partner,updateData}) {
  const [selected,setSelected]=useState(null);
  const [filter,setFilter]=useState('Todas');
  const saved=appData.savedPositions||[];
  const cats=['Todas','Guardadas',...new Set(POSITIONS.map(p=>p.cat))];
  const diffCol={'Fácil':'#4ade80','Media':'#fbbf24','Difícil':'#f87171'};
  const toggleSave=(id,e)=>{e&&e.stopPropagation();const newSaved=saved.includes(id)?saved.filter(s=>s!==id):[...saved,id];updateData({savedPositions:newSaved});};
  const filtered=filter==='Todas'?POSITIONS:filter==='Guardadas'?POSITIONS.filter(p=>saved.includes(p.id)):POSITIONS.filter(p=>p.cat===filter);
  if(selected)return(<div style={{padding:'1rem'}} className="fade-up"><Btn onClick={()=>setSelected(null)} style={{background:'none',border:'none',color:'rgba(200,160,200,0.8)',fontSize:'0.9rem',padding:'0 0 1rem',display:'block'}}>← Volver</Btn><div style={{background:'rgba(124,58,237,0.1)',border:'1px solid rgba(124,58,237,0.25)',borderRadius:'24px',padding:'1.5rem',marginBottom:'1rem'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.75rem'}}><div><span style={{color:'#a78bfa',fontSize:'0.75rem'}}>{selected.cat}</span><h2 className="font-display" style={{color:'white',fontSize:'1.75rem',margin:'0.2rem 0 0.2rem'}}>{selected.emoji} {selected.name}</h2><span style={{color:diffCol[selected.diff],fontSize:'0.78rem'}}>{selected.diff}</span></div><button onClick={e=>toggleSave(selected.id,e)} style={{background:'none',border:'none',fontSize:'1.75rem',cursor:'pointer',padding:'0.25rem'}}>{saved.includes(selected.id)?'❤️':'🤍'}</button></div><p style={{color:'rgba(220,190,220,0.9)',lineHeight:1.6,margin:'0 0 1rem',fontSize:'0.95rem'}}>{selected.desc}</p><div style={{background:'rgba(124,58,237,0.2)',border:'1px solid rgba(124,58,237,0.3)',borderRadius:'14px',padding:'1rem'}}><p style={{color:'#a78bfa',fontSize:'0.75rem',fontWeight:600,margin:'0 0 0.35rem'}}>💡 Tip:</p><p style={{color:'rgba(220,190,220,0.9)',fontSize:'0.85rem',margin:0,lineHeight:1.45}}>{selected.tip}</p></div></div></div>);
  return(<div style={{padding:'1rem'}}><h2 className="font-display" style={{color:'#f0e8f8',fontSize:'1.5rem',margin:'0 0 0.25rem'}}>Posiciones 💫</h2><p style={{color:'rgba(200,160,200,0.7)',fontSize:'0.83rem',margin:'0 0 1rem'}}>Exploren juntos · Guarden con ❤️ las que quieran intentar</p><div style={{display:'flex',gap:'0.5rem',marginBottom:'1rem',overflowX:'auto',paddingBottom:'0.25rem'}}>{cats.map(c=>(<button key={c} onClick={()=>setFilter(c)} style={{background:filter===c?'#7c3aed':'rgba(255,255,255,0.07)',border:'none',borderRadius:'100px',padding:'0.4rem 0.9rem',color:filter===c?'white':'rgba(200,160,200,0.7)',fontFamily:'DM Sans,sans-serif',fontSize:'0.8rem',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>{c==='Guardadas'?`❤️ Guardadas (${saved.length})`:c}</button>))}</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.65rem'}}>{filtered.map(p=>(<button key={p.id} onClick={()=>setSelected(p)} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(124,58,237,0.2)',borderRadius:'18px',padding:'1rem',textAlign:'left',cursor:'pointer'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'0.5rem'}}><span style={{fontSize:'1.5rem'}}>{p.emoji}</span><button onClick={e=>toggleSave(p.id,e)} style={{background:'none',border:'none',fontSize:'1rem',cursor:'pointer',padding:0}}>{saved.includes(p.id)?'❤️':'🤍'}</button></div><h3 style={{color:'white',fontWeight:500,fontSize:'0.88rem',margin:'0 0 0.35rem',fontFamily:'DM Sans'}}>{p.name}</h3><p style={{color:'rgba(200,170,200,0.7)',fontSize:'0.75rem',margin:'0 0 0.4rem',lineHeight:1.3}}>{p.desc.slice(0,60)}…</p><span style={{color:diffCol[p.diff],fontSize:'0.7rem'}}>{p.diff}</span></button>))}{filtered.length===0&&<div style={{gridColumn:'1/-1',textAlign:'center',padding:'2rem',color:'rgba(200,160,200,0.5)',fontSize:'0.9rem'}}>{filter==='Guardadas'?'Aún no han guardado posiciones ❤️':'Sin resultados'}</div>}</div></div>);
}

function BottomNav({active,onChange}) {
  const tabs=[{id:'home',emoji:'🏠',label:'Inicio'},{id:'discover',emoji:'💫',label:'Descubrir'},{id:'challenges',emoji:'🎯',label:'Retos'},{id:'express',emoji:'⚡',label:'Express'},{id:'dates',emoji:'📅',label:'Citas'},{id:'positions',emoji:'🔥',label:'Posiciones'}];
  return(<div style={{position:'fixed',bottom:0,left:0,right:0,background:'rgba(13,10,20,0.97)',backdropFilter:'blur(12px)',borderTop:'1px solid rgba(255,255,255,0.07)',display:'grid',gridTemplateColumns:'repeat(6,1fr)',zIndex:100}}>{tabs.map(t=>(<button key={t.id} onClick={()=>onChange(t.id)} style={{padding:'0.6rem 0.25rem',display:'flex',flexDirection:'column',alignItems:'center',gap:'0.15rem',background:'none',border:'none',cursor:'pointer',position:'relative'}}><span style={{fontSize:'1.2rem',filter:active===t.id?'drop-shadow(0 0 6px rgba(224,123,138,0.6))':'none'}}>{t.emoji}</span><span style={{color:active===t.id?'#e07b8a':'rgba(150,120,160,0.6)',fontSize:'0.6rem',fontFamily:'DM Sans,sans-serif',fontWeight:active===t.id?600:400}}>{t.label}</span>{active===t.id&&<div style={{position:'absolute',bottom:0,left:'50%',transform:'translateX(-50%)',width:'4px',height:'4px',borderRadius:'50%',background:'#e07b8a'}} />}</button>))}</div>);
}

// ══════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState('loading');
  const [tab, setTab] = useState('home');
  const [partner, setPartner] = useState(null);
  const [appData, setAppData] = useState(null);
  const [coupleCode, setCoupleCode] = useState(null);
  const [pendingCode, setPendingCode] = useState(null);
  const subRef = useRef(null);

  // Load on mount
  useEffect(()=>{
    (async()=>{
      const savedCode = getLocalCode();
      if(savedCode){
        const row = await fetchCouple(savedCode);
        if(row){ setCoupleCode(savedCode); setAppData(dbToApp(row)); setScreen('partner_select'); }
        else setScreen('splash');
      } else {
        setScreen('splash');
      }
    })();
  },[]);

  // Realtime subscription
  useEffect(()=>{
    if(!coupleCode) return;
    if(subRef.current) subRef.current.unsubscribe();
    subRef.current = supabase
      .channel(`couple_${coupleCode}`)
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'couples',filter:`couple_code=eq.${coupleCode}`},(payload)=>{
        setAppData(dbToApp(payload.new));
      })
      .subscribe();
    return ()=>{ if(subRef.current) subRef.current.unsubscribe(); };
  },[coupleCode]);

  const updateData = useCallback((updates) => {
    setAppData(prev => {
      const next = {...prev,...updates};
      if(coupleCode) updateCouple(coupleCode, next);
      return next;
    });
  },[coupleCode]);

  if(screen==='loading') return <div style={{minHeight:'100vh',background:'#0d0a14',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{fontSize:'3rem'}} className="pulse">💑</div></div>;
  if(screen==='splash') return <SplashScreen onNext={()=>setScreen('join_or_create')} />;
  if(screen==='join_or_create') return <JoinOrCreateScreen
    onCreated={(data, code)=>{ setAppData(data); setCoupleCode(code); setPendingCode(code); setScreen('show_code'); }}
    onJoined={(data, code)=>{ setAppData(data); setCoupleCode(code); setScreen('partner_select'); }}
  />;
  if(screen==='show_code') return <CodeDisplayScreen code={pendingCode} onContinue={()=>setScreen('partner_select')} />;
  if(screen==='partner_select'||!partner) return <PartnerSelectScreen names={appData?.names||{A:'Ella',B:'Él'}} onSelect={(p)=>{setPartner(p);setScreen('app');setTab('home');}}/>;

  const TABS={home:HomeTab,discover:DiscoverTab,challenges:ChallengesTab,express:ExpressTab,dates:DatesTab,positions:PositionsTab};
  const ActiveTab=TABS[tab];
  const names=appData?.names||{A:'Ella',B:'Él'};

  return(
    <div style={{minHeight:'100vh',background:'linear-gradient(180deg,#0d0a14 0%,#13091f 100%)',color:'white'}}>
      <div style={{position:'sticky',top:0,background:'rgba(13,10,20,0.93)',backdropFilter:'blur(12px)',borderBottom:'1px solid rgba(255,255,255,0.06)',padding:'0.75rem 1rem',display:'flex',alignItems:'center',justifyContent:'space-between',zIndex:50}}>
        <h1 className="font-display" style={{color:'#f0e8f8',fontSize:'1.2rem',margin:0}}>💑 Nosotros Dos</h1>
        <div style={{display:'flex',alignItems:'center',gap:'0.6rem'}}>
          <span style={{color:'rgba(200,160,200,0.5)',fontSize:'0.7rem'}}>{coupleCode}</span>
          <span style={{color:'rgba(200,160,200,0.7)',fontSize:'0.82rem'}}>{names[partner]}</span>
          <button onClick={()=>{setPartner(null);setScreen('partner_select');}} style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'50%',width:'28px',height:'28px',display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(200,160,200,0.7)',cursor:'pointer',fontSize:'0.85rem'}}>↩</button>
        </div>
      </div>
      <div style={{paddingBottom:'80px',minHeight:'calc(100vh - 56px)',overflowY:'auto'}}>
        <ActiveTab appData={appData} partner={partner} updateData={updateData} />
      </div>
      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}
