"use strict";
const config = window.PORTFOLIO_CONFIG || {};
let lang = "en";
let activeTab = "report";
let version = "defect";
let seconds = 1;
let opened = false;
let verification = null;
const $ = (selector) => document.querySelector(selector);
const t = (en, es) => lang === "es" ? es : en;
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function resolveTimer(current, reduction, build) {
  const remaining = build === "fixed" ? Math.max(0, current - reduction) : current - reduction;
  return { remaining, respawned: build === "fixed" ? remaining === 0 : false };
}
function renderDemo() {
  $("#timer").textContent = seconds;
  $("#timer-fill").style.width = `${Math.max(0, Math.min(100, seconds * 10))}%`;
  const failed = opened && version === "defect";
  $("#state-label").classList.toggle("failed", failed);
  $("#state-label").textContent = !opened ? t("Waiting for a chest interaction", "Esperando la interacción con el cofre") : failed ? t("Invalid timer · teammate still waiting", "Temporizador inválido · sigue esperando") : t("Respawn triggered · timer clamped to 0", "Reaparición activada · temporizador en 0");
  $("#loot").disabled = opened;
  $("#event-log").textContent = !opened ? t("SETUP → timer: 1s / chest reduction: 2s", "INICIO → temporizador: 1 s / reducción: 2 s") : failed ? t("OBSERVED → 1 − 2 = −1s / no respawn", "OBSERVADO → 1 − 2 = −1 s / sin reaparición") : t("OBSERVED → max(0, 1 − 2) = 0s / respawn", "OBSERVADO → max(0, 1 − 2) = 0 s / reaparición");
}
const testCases = [
  {id:"TC-01",start:5,cut:2,remaining:3,respawned:false, en:"Standard reduction",es:"Reducción normal"},
  {id:"TC-02",start:2,cut:2,remaining:0,respawned:true,en:"Exactly reaches zero",es:"Llega exactamente a cero"},
  {id:"TC-03",start:1,cut:2,remaining:0,respawned:true,en:"Crosses the zero boundary",es:"Cruza el límite de cero"},
  {id:"TC-04",start:0,cut:2,remaining:0,respawned:true,en:"Already at zero",es:"Ya está en cero"},
  {id:"TC-05",start:5,cut:0,remaining:5,respawned:false,en:"No reduction",es:"Sin reducción"}
];
function field(label, body) { return `<div class="report-field"><strong>${label}</strong><div>${body}</div></div>`; }
function reportView() {
  return `<p class="report-id">DEMO-001 / RESPAWN TIMER</p>
    <h3 class="report-title">${t("Chest interaction makes the respawn timer negative and leaves the teammate waiting", "Abrir un cofre deja el temporizador en negativo y al compañero esperando")}</h3>
    <div class="report-badges"><span class="severity">${t("Severity: High (demo)", "Severidad: Alta (demo)")}</span><span>${t("Boundary / state transition", "Límite / transición de estado")}</span></div>
    ${field(t("ENVIRONMENT", "ENTORNO"),t("This browser · independent local simulation · defect version", "Este navegador · simulación local independiente · versión con defecto"))}
    ${field(t("PRECONDITION", "PRECONDICIÓN"),t("A teammate is awaiting respawn with 1 second remaining. Chest interaction reduces the timer by 2 seconds.", "Un compañero espera reaparecer con 1 segundo restante. Abrir un cofre reduce el temporizador en 2 segundos."))}
    ${field(t("REPRO STEPS", "PASOS"),`<ol><li>${t("Select the defect version and reset the demo.", "Seleccionar la versión con defecto y reiniciar.")}</li><li>${t("Confirm the timer shows 1 second.", "Confirmar que el temporizador muestra 1 segundo.")}</li><li>${t("Open the chest once.", "Abrir el cofre una vez.")}</li><li>${t("Observe the timer and teammate state.", "Observar el temporizador y el estado del compañero.")}</li></ol>`)}
    ${field(t("EXPECTED", "ESPERADO"),t("Timer stops at 0 and the respawn state activates.", "El temporizador se limita a 0 y se activa la reaparición."))}
    ${field(t("ACTUAL", "OBSERVADO"),t("Timer displays −1 and the teammate remains in the waiting state.", "El temporizador muestra −1 y el compañero sigue esperando."))}
    ${field(t("IMPACT", "IMPACTO"),t("The expected state transition is blocked in this simulation.", "La transición de estado esperada queda bloqueada en esta simulación."))}
    <p class="document-note">${t("Deterministic example, not a production bug. The interactive panel is the reproducible evidence.", "Ejemplo determinista, no es un bug de producción. El panel interactivo es la evidencia reproducible.")}</p>`;
}
function testView() {
  return `<p class="report-id">TEST DESIGN / BOUNDARIES & STATES</p><h3 class="report-title">${t("Cover the rule, then its limits.", "Cubrir la regla y sus límites.")}</h3><p class="document-note">${t("Rule: subtract the reduction without going below zero. At zero, activate respawn. Rows describe expected outcomes; run verification to see execution results.", "Regla: restar la reducción sin bajar de cero. En cero, activar la reaparición. Las filas indican lo esperado; ejecuta la verificación para ver resultados.")}</p>
    <div class="table-scroll"><table class="test-table"><thead><tr><th>ID</th><th>${t("SCENARIO", "ESCENARIO")}</th><th>${t("EXPECTED", "ESPERADO")}</th></tr></thead><tbody>${testCases.map(c=>`<tr><td>${c.id}</td><td>${escapeHTML(c[lang])}<small>${c.start}s − ${c.cut}s</small></td><td>${c.remaining}s · ${c.respawned ? t("respawn", "reaparece") : t("waiting", "esperando")}</td></tr>`).join("")}</tbody></table></div><p class="document-note">${t("Scope: timer calculation and state transition. Network synchronization, animation and real-time countdown are outside this demo.", "Alcance: cálculo del temporizador y transición de estado. Red, animación y cuenta regresiva real quedan fuera de la demo.")}</p>`;
}
function verificationView() {
  let results = verification ? `<div class="table-scroll"><table class="test-table"><thead><tr><th>ID</th><th>${t("OBSERVED", "OBSERVADO")}</th><th>${t("RESULT", "RESULTADO")}</th></tr></thead><tbody>${verification.rows.map(r=>`<tr><td>${r.id}</td><td>${r.remaining}s · ${r.respawned?t("respawn","reaparece"):t("waiting","esperando")}</td><td>${r.pass ? "PASS" : "FAIL"}</td></tr>`).join("")}</tbody></table></div><p class="document-note">${t("Executed locally against", "Ejecutado localmente en")} ${verification.version === "fixed" ? t("the corrected version", "la versión corregida") : t("the defect version", "la versión con defecto")}. ${t("These are demo results only.", "Son resultados únicamente de la demo.")}</p>` : `<div class="verification-item"><span>01</span><div>${t("Reproduce the original failure", "Reproducir el fallo original")}<p>${t("Use 1 second remaining and a 2-second reduction.", "Usar 1 segundo restante y una reducción de 2 segundos.")}</p></div></div><div class="verification-item"><span>02</span><div>${t("Compare the corrected version", "Comparar la versión corregida")}<p>${t("Check both the value and the transition into respawn.", "Verificar el valor y la transición a reaparición.")}</p></div></div><div class="verification-item"><span>03</span><div>${t("Check related boundaries", "Revisar límites relacionados")}<p>${t("Normal reduction, exact zero, crossing zero and no reduction.", "Reducción normal, cero exacto, cruce de cero y sin reducción.")}</p></div></div><p class="document-note">${t("Not executed in this session yet. Run the checks on the selected version.", "Aún no ejecutado en esta sesión. Ejecuta los casos en la versión seleccionada.")}</p>`;
  return `<p class="report-id">RETEST / REGRESSION</p><h3 class="report-title">${t("A fix is a claim to verify.", "Una corrección se verifica.")}</h3>${results}<button class="button outline-dark" id="run-checks" style="margin-top:18px">${t("Run 5 demo checks ↗", "Ejecutar 5 casos de la demo ↗")}</button>`;
}
function renderDocument() {
  $("#document-panel").innerHTML = activeTab === "report" ? reportView() : activeTab === "tests" ? testView() : verificationView();
  $("#document-panel").setAttribute("aria-labelledby", `tab-${activeTab}`);
  document.querySelectorAll("[data-tab]").forEach(b=>{const selected=b.dataset.tab===activeTab;b.setAttribute("aria-selected",String(selected));b.tabIndex=selected?0:-1;});
}
function setLanguage(newLang) {
  lang = newLang;
  document.documentElement.lang=lang;
  document.querySelectorAll("[data-en][data-es]").forEach(el=>{el.textContent=el.dataset[lang].replace(/\\n/g,"\n");});
  document.querySelectorAll("[data-placeholder-en]").forEach(el=>{el.placeholder=el.dataset[lang==="en"?"placeholderEn":"placeholderEs"];});
  $("#language").textContent=lang==="en"?"ES":"EN";
  $("#language").setAttribute("aria-label",lang==="en"?"Switch to Spanish":"Cambiar a inglés");
  $("#form-status").textContent="";
  renderContact();renderDemo();renderDocument();
  exerciseFrame.title = lang === "es" ? "Find//Bug — ejercicio interactivo de QA" : "Find//Bug — interactive QA exercise";
  if (exerciseLoaded && exerciseFrame.contentWindow) exerciseFrame.contentWindow.postMessage({type:"find-bug-language", language:lang}, "*");
}
function renderContact() {
  const links=[];
  if(config.email) links.push(`<a href="mailto:${encodeURIComponent(config.email)}">${escapeHTML(config.email)} ↗</a>`);
  if(config.linkedin && /^https:\/\/(www\.)?linkedin\.com\//.test(config.linkedin)) links.push(`<a href="${escapeHTML(config.linkedin)}" target="_blank" rel="noopener noreferrer">LinkedIn ↗</a>`);
  $("#contact-links").innerHTML=links.join("");
  $("#availability").textContent=config.weeklyHours?t(`${config.weeklyHours} hours / week · schedule by agreement`,`${config.weeklyHours} horas / semana · horario a convenir`):t("Project scope & schedule by agreement", "Alcance y horario a convenir");
  $("#brief-submit").textContent=config.email?t("Open email with project brief ↗","Abrir correo con el brief ↗"):t("Download project brief ↓","Descargar brief del proyecto ↓");
  $("#form-note").textContent=config.email?t("Opens your email app with a draft for Luis. Nothing is sent automatically. Your form entries stay in this page until you open the draft.","Abre tu aplicación de correo con un borrador para Luis. No se envía automáticamente. Los datos permanecen en esta página hasta abrir el borrador."):t("Download a local brief. This form does not send messages; contact details have not been added yet.","Descarga un brief local. Este formulario no envía mensajes; los datos de contacto aún no se han añadido.");
}
function download(filename, content, type="text/plain;charset=utf-8") {
  const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement("a");a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function sampleDocument() {
  const heading=t("Independent QA demonstration","Demostración QA independiente");
  return `# ${heading}\nLuis Eduardo Hurtado Medina — Game QA\n\n${t("Created for this portfolio with an intentionally seeded defect. Not a client project, production bug, or evidence of professional work.","Creado para este portafolio con un defecto intencional. No es un proyecto de cliente, bug de producción ni evidencia del trabajo profesional.")}\n\n## DEMO-001\n${$("#document-panel").innerText}\n\n## ${t("Test cases — expected outcomes","Casos — resultados esperados")}\n${testCases.map(c=>`${c.id}: ${c[lang]} | ${c.start}s - ${c.cut}s | ${t("Expected","Esperado")}: ${c.remaining}s; respawn=${c.respawned}`).join("\n")}\n\n## ${t("Verification in this browser session","Verificación en esta sesión del navegador")}\n${verification?`${verification.version}\n${verification.rows.map(r=>`${r.id}: ${r.remaining}s; respawn=${r.respawned}; ${r.pass?"PASS":"FAIL"}`).join("\n")}`:t("Not executed.","No ejecutada.")}\n\n${t("Outside scope: network, animation, real-time countdown.","Fuera de alcance: red, animación, cuenta regresiva real.")}\n`;
}
$("#language").addEventListener("click",()=>setLanguage(lang==="en"?"es":"en"));
$("#loot").addEventListener("click",()=>{seconds=resolveTimer(seconds,2,version).remaining;opened=true;renderDemo();});
$("#reset").addEventListener("click",()=>{seconds=1;opened=false;renderDemo();});
document.querySelectorAll("input[name=version]").forEach(el=>el.addEventListener("change",()=>{version=el.value;seconds=1;opened=false;verification=null;renderDemo();renderDocument();}));
document.querySelectorAll("[data-tab]").forEach(el=>{
  el.addEventListener("click",()=>{activeTab=el.dataset.tab;renderDocument();});
  el.addEventListener("keydown",event=>{const tabs=[...document.querySelectorAll("[data-tab]")];let index=tabs.indexOf(el);if(event.key==="ArrowRight")index=(index+1)%tabs.length;else if(event.key==="ArrowLeft")index=(index+tabs.length-1)%tabs.length;else if(event.key==="Home")index=0;else if(event.key==="End")index=tabs.length-1;else return;event.preventDefault();activeTab=tabs[index].dataset.tab;renderDocument();tabs[index].focus();});
});
$("#document-panel").addEventListener("click",event=>{if(event.target.id!=="run-checks")return;verification={version,rows:testCases.map(c=>{const actual=resolveTimer(c.start,c.cut,version);return{id:c.id,...actual,pass:actual.remaining===c.remaining&&actual.respawned===c.respawned};})};renderDocument();$("#run-checks").focus();});
$("#download-report").addEventListener("click",()=>{const previous=activeTab;activeTab="report";renderDocument();const content=sampleDocument();activeTab=previous;renderDocument();download(`Luis-Hurtado-QA-sample-${lang}.txt`,content);});
$("#brief-form").addEventListener("submit",event=>{
  event.preventDefault();const form=event.currentTarget;const data=new FormData(form);
  const subject=`Game QA inquiry — ${String(data.get("studio")).replace(/[\r\n]/g," ")}`;
  const body=`${t("Name / studio","Nombre / estudio")}: ${data.get("studio")}\nEmail: ${data.get("email")}\n${t("Platform","Plataforma")}: ${data.get("platform")}\n${t("Service","Servicio")}: ${form.elements.service.selectedOptions[0].textContent}\n\n${t("Game, stage and testing goal","Juego, etapa y objetivo")}:\n${data.get("goal")}\n\n${t("Please let me know your availability and the information needed to define scope and pricing.","Cuéntame tu disponibilidad y qué información necesitas para definir alcance y cotización.")}`;
  if(config.email){const a=document.createElement("a");a.href=`mailto:${encodeURIComponent(config.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;a.click();$("#form-status").textContent=t("Your email app should open. Review the draft and send it there. You can also use the email link or LinkedIn above.","Tu aplicación de correo debería abrirse. Revisa y envía allí el borrador. También puedes usar el correo o LinkedIn de arriba.");}
  else{download("game-qa-project-brief.txt",`${subject}\n\n${body}`);$("#form-status").textContent=t("Brief downloaded. No message was sent.","Brief descargado. No se ha enviado ningún mensaje.");}
});
const exerciseDialog = $("#find-bug-dialog");
const exerciseFrame = $("#find-bug-frame");
let exerciseLoaded = false;
let exercisePreviousOverflow = "";
exerciseFrame.addEventListener("load", () => {
  if (exerciseLoaded) exerciseFrame.contentWindow.postMessage({type:"find-bug-language", language:lang}, "*");
});
$("#open-find-bug").addEventListener("click", () => {
  if (!exerciseLoaded) {
    exerciseFrame.srcdoc = window.FIND_BUG_DOCUMENT;
    exerciseLoaded = true;
  }
  exercisePreviousOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  exerciseDialog.showModal();
});
$("#close-find-bug").addEventListener("click", () => exerciseDialog.close());
exerciseDialog.addEventListener("close", () => {
  document.body.style.overflow = exercisePreviousOverflow;
  $("#open-find-bug").focus();
});
window.addEventListener("message", event => {
  if (event.source !== exerciseFrame.contentWindow) return;
  if (event.data?.type === "find-bug-close" && exerciseDialog.open) exerciseDialog.close();
  if (event.data?.type === "find-bug-language" && ["en","es"].includes(event.data.language) && event.data.language !== lang) setLanguage(event.data.language);
  if (event.data?.type === "find-bug-export" && typeof event.data.content === "string" && event.data.content.length < 1000000) {
    const reportLanguage = ["en","es"].includes(event.data.language) ? event.data.language : lang;
    download("Luis-Hurtado-Find-Bug-" + reportLanguage + ".md", event.data.content, "text/markdown;charset=utf-8");
  }
});
setLanguage("en");
