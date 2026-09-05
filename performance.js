const STORAGE_KEY = "hsc-maths-performance-v1";
const COURSE_META = {
  ext1: { label: "Extension 1", full: "Mathematics Extension 1" },
  ext2: { label: "Extension 2", full: "Mathematics Extension 2" }
};
const DEFAULT_STATE = {
  activeCourse: "ext1",
  courses: {
    ext1: { target: 90, tasks: [] },
    ext2: { target: 90, tasks: [] }
  },
  predictor: { ext1: { assessment: "", exam: "", schoolAverage: "" }, ext2: { assessment: "", exam: "", schoolAverage: "" } }
};

function cloneDefault(){ return JSON.parse(JSON.stringify(DEFAULT_STATE)); }
function loadState(){
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || typeof saved !== "object") return cloneDefault();
    const base = cloneDefault();
    base.activeCourse = COURSE_META[saved.activeCourse] ? saved.activeCourse : "ext1";
    for (const key of Object.keys(COURSE_META)) {
      if (saved.courses?.[key]) {
        base.courses[key].target = validNumber(saved.courses[key].target, 0, 100) ? Number(saved.courses[key].target) : 90;
        base.courses[key].tasks = Array.isArray(saved.courses[key].tasks) ? saved.courses[key].tasks.map(normaliseTask) : [];
      }
      if (saved.predictor?.[key]) base.predictor[key] = { ...base.predictor[key], ...saved.predictor[key] };
    }
    return base;
  } catch { return cloneDefault(); }
}
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function uid(){ return `${Date.now().toString(36)}${Math.random().toString(36).slice(2,7)}`; }
function normaliseTask(task){
  return { id: task?.id || uid(), name: String(task?.name || ""), mark: task?.mark ?? "", outOf: task?.outOf ?? "", weight: task?.weight ?? "" };
}
function validNumber(value,min,max){ const n=Number(value); return value!=="" && Number.isFinite(n) && n>=min && n<=max; }
function num(value){ const n=Number(value); return Number.isFinite(n) ? n : 0; }
function fmt(value,d=1){ return Number.isFinite(value) ? value.toFixed(d) : "--"; }

const state = loadState();
const courseTabs = document.getElementById("course-tabs");
const taskList = document.getElementById("task-list");
const addTaskButton = document.getElementById("add-task");
const targetInput = document.getElementById("target-mark");
const themeToggle = document.getElementById("theme-toggle");
const themeLabel = themeToggle.querySelector(".theme-label");
const assessmentInput = document.getElementById("assessment-estimate");
const examInput = document.getElementById("exam-estimate");
const schoolAverageInput = document.getElementById("school-average");

function activeCourse(){ return state.courses[state.activeCourse]; }
function activePredictor(){ return state.predictor[state.activeCourse]; }
function getInitialTheme(){ const saved=localStorage.getItem("hsc-maths-theme"); if(saved==="light"||saved==="dark")return saved; return window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"; }
function applyTheme(theme){ document.documentElement.dataset.theme=theme; themeLabel.textContent=theme==="dark"?"Light":"Dark"; document.querySelector('meta[name="theme-color"]')?.setAttribute("content",theme==="dark"?"#060914":"#eef4ff"); }
themeToggle.addEventListener("click",()=>{ const next=document.documentElement.dataset.theme==="dark"?"light":"dark"; localStorage.setItem("hsc-maths-theme",next); applyTheme(next); });

function renderTabs(){
  const frag=document.createDocumentFragment();
  Object.entries(COURSE_META).forEach(([key,meta])=>{
    const button=document.createElement("button");
    button.type="button"; button.className=`segment-button${state.activeCourse===key?" active":""}`; button.textContent=meta.label;
    button.setAttribute("aria-pressed",state.activeCourse===key?"true":"false");
    button.addEventListener("click",()=>{ state.activeCourse=key; save(); render(); });
    frag.appendChild(button);
  });
  courseTabs.replaceChildren(frag);
}

function taskValidity(task){
  const hasAny = task.mark!=="" || task.outOf!=="";
  const weightOK = validNumber(task.weight,0,100);
  const markOK = task.mark==="" && task.outOf==="" ? false : validNumber(task.mark,0,1000000) && validNumber(task.outOf,0.000001,1000000) && num(task.mark)<=num(task.outOf);
  return { hasAny, weightOK, markOK, complete: weightOK && markOK };
}

function calculate(){
  let totalWeight=0, completedWeight=0, contribution=0, invalidMarks=0;
  for(const task of activeCourse().tasks){
    const v=taskValidity(task);
    if(v.weightOK) totalWeight+=num(task.weight);
    if(v.hasAny && !v.markOK) invalidMarks++;
    if(v.complete){
      completedWeight+=num(task.weight);
      contribution+=(num(task.mark)/num(task.outOf))*num(task.weight);
    }
  }
  const weightedAverage=completedWeight>0 ? contribution/completedWeight*100 : 0;
  const remaining=Math.max(0,100-completedWeight);
  const bestPossible=Math.min(100,contribution+remaining);
  return { totalWeight,completedWeight,contribution,weightedAverage,remaining,bestPossible,invalidMarks };
}

function renderTasks(){
  const frag=document.createDocumentFragment();
  activeCourse().tasks.forEach(task=>{
    const row=document.createElement("div"); row.className="task-row";
    const name=document.createElement("input"); name.type="text"; name.placeholder="e.g. Task 1 - Vectors"; name.value=task.name;
    const pair=document.createElement("div"); pair.className="mark-pair";
    const mark=document.createElement("input"); mark.type="number"; mark.min="0"; mark.step="0.5"; mark.placeholder="mark"; mark.value=task.mark;
    const slash=document.createElement("span"); slash.textContent="/";
    const out=document.createElement("input"); out.type="number"; out.min="0.01"; out.step="0.5"; out.placeholder="out of"; out.value=task.outOf;
    pair.append(mark,slash,out);
    const weightWrap=document.createElement("div"); weightWrap.className="weight-input";
    const weight=document.createElement("input"); weight.type="number"; weight.min="0"; weight.max="100"; weight.step="0.5"; weight.placeholder="20"; weight.value=task.weight; weightWrap.appendChild(weight);
    const contribution=document.createElement("div"); contribution.className="task-contribution";
    const v=taskValidity(task); contribution.textContent=v.complete?`${fmt((num(task.mark)/num(task.outOf))*num(task.weight),2)} pts`:"--";
    if(v.hasAny&&!v.markOK) row.classList.add("task-invalid");
    const remove=document.createElement("button"); remove.type="button"; remove.className="remove-task"; remove.textContent="x"; remove.setAttribute("aria-label",`Remove ${task.name||"task"}`);
    const update=(field,value)=>{ task[field]=value; save(); renderSummary(); contribution.textContent=taskValidity(task).complete?`${fmt((num(task.mark)/num(task.outOf))*num(task.weight),2)} pts`:"--"; row.classList.toggle("task-invalid",taskValidity(task).hasAny&&!taskValidity(task).markOK); };
    name.addEventListener("input",e=>update("name",e.target.value)); mark.addEventListener("input",e=>update("mark",e.target.value)); out.addEventListener("input",e=>update("outOf",e.target.value)); weight.addEventListener("input",e=>update("weight",e.target.value));
    remove.addEventListener("click",()=>{ activeCourse().tasks=activeCourse().tasks.filter(t=>t.id!==task.id); save(); render(); });
    row.append(name,pair,weightWrap,contribution,remove); frag.appendChild(row);
  });
  if(!activeCourse().tasks.length){ const empty=document.createElement("div"); empty.className="mastery-empty"; empty.textContent="No tasks yet. Add your first assessment and enter its mark, maximum mark and weighting."; frag.appendChild(empty); }
  taskList.replaceChildren(frag);
}

function renderSummary(){
  const c=calculate();
  document.getElementById("current-mark").textContent=c.completedWeight?`${fmt(c.weightedAverage)}%`:"0.0%";
  document.getElementById("hero-course-mark").textContent=c.completedWeight?`${fmt(c.weightedAverage)}%`:"--";
  document.getElementById("completed-weight").textContent=`${fmt(c.completedWeight)}%`;
  document.getElementById("remaining-weight").textContent=`${fmt(c.remaining)}%`;
  document.getElementById("locked-contribution").textContent=`${fmt(c.contribution,2)} pts`;
  document.getElementById("best-possible").textContent=`${fmt(c.bestPossible)}%`;
  const warning=document.getElementById("weight-warning");
  const messages=[];
  if(c.totalWeight>100.0001) messages.push(`Your task weightings total ${fmt(c.totalWeight)}%. They cannot exceed 100%.`);
  else if(c.totalWeight<99.999 && activeCourse().tasks.length) messages.push(`Entered task weightings total ${fmt(c.totalWeight)}%. ${fmt(100-c.totalWeight)}% is still unallocated.`);
  if(c.invalidMarks) messages.push(`${c.invalidMarks} task mark${c.invalidMarks===1?" is":"s are"} invalid. A mark cannot exceed its maximum and the maximum must be above 0.`);
  warning.textContent=messages.join(" "); warning.classList.toggle("hidden",!messages.length);
  targetInput.value=activeCourse().target;
  const target=num(activeCourse().target); const targetResult=document.getElementById("target-result");
  if(!c.completedWeight){ targetResult.textContent="Add completed tasks to calculate what you need."; }
  else if(c.remaining<=0){ const gap=c.contribution-target; targetResult.textContent=gap>=0?`Final weighted mark is ${fmt(c.contribution)}%, ${fmt(gap)} points above target.`:`Final weighted mark is ${fmt(c.contribution)}%, ${fmt(Math.abs(gap))} points below target.`; }
  else {
    const required=(target-c.contribution)/c.remaining*100;
    if(required<=0) targetResult.textContent=`Target already secured even if the remaining assessments score 0%.`;
    else if(required>100) targetResult.textContent=`Target is no longer mathematically reachable. You would need ${fmt(required)}% across the remaining ${fmt(c.remaining)}% weighting.`;
    else targetResult.textContent=`You need an average of ${fmt(required)}% across the remaining ${fmt(c.remaining)}% weighting to finish on ${fmt(target)}%.`;
  }
}

targetInput.addEventListener("input",e=>{ const v=Math.max(0,Math.min(100,num(e.target.value))); activeCourse().target=v; save(); renderSummary(); });
addTaskButton.addEventListener("click",()=>{ activeCourse().tasks.push({id:uid(),name:"",mark:"",outOf:"",weight:""}); save(); renderTasks(); renderSummary(); taskList.querySelector(".task-row:last-child input")?.focus(); });

function bandFor(mark){ if(mark>=90)return "E4"; if(mark>=70)return "E3"; if(mark>=50)return "E2"; return "E1"; }
function describeBand(mark){ const band=bandFor(mark); const next=band==="E4"?null:band==="E3"?90:band==="E2"?70:50; if(!next)return "This projection sits in E4, the highest Extension performance band."; return `This projection sits in ${band}. It is ${fmt(next-mark)} normalised marks below the next band boundary.`; }
function examNeeded(assessment,target){ return 2*target-assessment; }
function neededText(value){ if(value<=0)return "Already secured*"; if(value>100)return "Not reachable*"; return `${fmt(value)} /100`; }

function syncPredictorInputs(){ const p=activePredictor(); assessmentInput.value=p.assessment; examInput.value=p.exam; schoolAverageInput.value=p.schoolAverage; }
function renderPredictor(){
  const p=activePredictor(); const assessment=Number(p.assessment), exam=Number(p.exam), school=Number(p.schoolAverage);
  const assessmentOK=validNumber(p.assessment,0,100), examOK=validNumber(p.exam,0,100), schoolOK=validNumber(p.schoolAverage,0,100);
  const badge=document.getElementById("band-badge"), projected=document.getElementById("projected-hsc"), analysis=document.getElementById("band-analysis");
  badge.className="band-badge neutral"; badge.textContent="--"; projected.textContent="--"; analysis.textContent="Enter a valid moderated assessment estimate and exam estimate to generate a projection.";
  document.getElementById("needed-e4").textContent=assessmentOK?neededText(examNeeded(assessment,90)):"--";
  document.getElementById("needed-e3").textContent=assessmentOK?neededText(examNeeded(assessment,70)):"--";
  document.getElementById("school-delta").textContent="--";
  if(!(assessmentOK&&examOK))return;
  const hsc=(assessment+exam)/2, band=bandFor(hsc);
  badge.className=`band-badge ${band.toLowerCase()}`; badge.textContent=band; projected.textContent=fmt(hsc);
  let text=describeBand(hsc)+` On the official /50 Extension scale this is approximately ${fmt(hsc/2,1)}/50.`;
  if(schoolOK){ const delta=hsc-school; document.getElementById("school-delta").textContent=`${delta>=0?"+":""}${fmt(delta)}`; text+=` Your projection is ${fmt(Math.abs(delta))} marks ${delta>=0?"above":"below"} the HSCninja school average you entered. This comparison does not change the projected band.`; }
  analysis.textContent=text;
}
function updatePredictor(field,value){ activePredictor()[field]=value; save(); renderPredictor(); }
assessmentInput.addEventListener("input",e=>updatePredictor("assessment",e.target.value)); examInput.addEventListener("input",e=>updatePredictor("exam",e.target.value)); schoolAverageInput.addEventListener("input",e=>updatePredictor("schoolAverage",e.target.value));
document.getElementById("use-internal").addEventListener("click",()=>{ const c=calculate(); if(!c.completedWeight)return; activePredictor().assessment=fmt(c.weightedAverage); save(); syncPredictorInputs(); renderPredictor(); });
document.getElementById("clear-predictor").addEventListener("click",()=>{ state.predictor[state.activeCourse]={assessment:"",exam:"",schoolAverage:""}; save(); syncPredictorInputs(); renderPredictor(); });

function render(){ renderTabs(); renderTasks(); renderSummary(); syncPredictorInputs(); renderPredictor(); }
applyTheme(getInitialTheme()); render();