const STORAGE_KEY='hsc-maths-performance-v3';
const OLD_STORAGE_KEY='hsc-maths-performance-v2';
const PROFILE_KEY='hsc-maths-profile-v1';
const COURSE_META={
  ext1:{label:'Extension 1',full:'Mathematics Extension 1'},
  ext2:{label:'Extension 2',full:'Mathematics Extension 2'}
};
const DEFAULT_STATE={
  activeCourse:'ext1',
  activeStage:'hsc',
  courses:{
    ext1:{prelim:{target:90,tasks:[]},hsc:{target:90,tasks:[]}},
    ext2:{hsc:{target:90,tasks:[]}}
  },
  rankModel:{
    ext1:{school:'',rank:'',cohort:'',year:'2025',data:null},
    ext2:{school:'',rank:'',cohort:'',year:'2025',data:null}
  }
};

const clone=x=>JSON.parse(JSON.stringify(x));
const validNumber=(v,min,max)=>v!==''&&Number.isFinite(Number(v))&&Number(v)>=min&&Number(v)<=max;
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const fmt=(v,d=1)=>Number.isFinite(v)?v.toFixed(d):'--';
const uid=()=>`${Date.now().toString(36)}${Math.random().toString(36).slice(2,7)}`;
function normaliseTask(t){return{id:t?.id||uid(),name:String(t?.name||''),mark:t?.mark??'',outOf:t?.outOf??'',weight:t?.weight??''};}
function loadProfile(){try{return JSON.parse(localStorage.getItem(PROFILE_KEY))||{};}catch{return{};}}

function normaliseSaved(saved){
  const base=clone(DEFAULT_STATE);
  if(!saved||typeof saved!=='object')return base;
  base.activeCourse=COURSE_META[saved.activeCourse]?saved.activeCourse:'ext1';
  base.activeStage=saved.activeStage==='prelim'?'prelim':'hsc';
  for(const course of Object.keys(COURSE_META)){
    const stages=course==='ext1'?['prelim','hsc']:['hsc'];
    for(const stage of stages){
      const src=saved.courses?.[course]?.[stage];
      if(src){
        base.courses[course][stage].target=validNumber(src.target,0,100)?Number(src.target):90;
        base.courses[course][stage].tasks=Array.isArray(src.tasks)?src.tasks.map(normaliseTask):[];
      }
    }
    if(saved.rankModel?.[course])base.rankModel[course]={...base.rankModel[course],...saved.rankModel[course]};
  }
  return base;
}

function loadState(){
  try{
    const current=JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(current)return normaliseSaved(current);
    const old=JSON.parse(localStorage.getItem(OLD_STORAGE_KEY));
    const base=clone(DEFAULT_STATE);
    if(old){
      base.activeCourse=COURSE_META[old.activeCourse]?old.activeCourse:'ext1';
      for(const course of Object.keys(COURSE_META)){
        const oldCourse=old.courses?.[course];
        if(oldCourse){
          base.courses[course].hsc.target=validNumber(oldCourse.target,0,100)?Number(oldCourse.target):90;
          base.courses[course].hsc.tasks=Array.isArray(oldCourse.tasks)?oldCourse.tasks.map(normaliseTask):[];
        }
        if(old.rankModel?.[course])base.rankModel[course]={...base.rankModel[course],...old.rankModel[course]};
      }
    }
    const profile=loadProfile();
    if(profile.school)Object.keys(base.rankModel).forEach(k=>{if(!base.rankModel[k].school)base.rankModel[k].school=profile.school;});
    return base;
  }catch{return clone(DEFAULT_STATE);}
}

const state=loadState();
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));window.HSCCloud?.queue('performance');}

const courseTabs=document.getElementById('course-tabs');
const stageTabs=document.getElementById('stage-tabs');
const taskList=document.getElementById('task-list');
const addTaskButton=document.getElementById('add-task');
const targetInput=document.getElementById('target-mark');
const themeToggle=document.getElementById('theme-toggle');
const themeLabel=themeToggle.querySelector('.theme-label');
const schoolInput=document.getElementById('school-name');
const rankInput=document.getElementById('current-rank');
const cohortInput=document.getElementById('cohort-size');
const yearInput=document.getElementById('reference-year');
const lookupButton=document.getElementById('lookup-school');
const clearRankButton=document.getElementById('clear-rank');

function activeRank(){return state.rankModel[state.activeCourse];}
function currentStage(){return state.activeCourse==='ext2'?'hsc':state.activeStage;}
function activeBucket(){return state.courses[state.activeCourse][currentStage()];}
function getInitialTheme(){const s=localStorage.getItem('hsc-maths-theme');if(s==='light'||s==='dark')return s;return matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}
function applyTheme(t){document.documentElement.dataset.theme=t;themeLabel.textContent=t==='dark'?'Light':'Dark';document.querySelector('meta[name="theme-color"]')?.setAttribute('content',t==='dark'?'#060914':'#eef4ff');}
themeToggle.addEventListener('click',()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';localStorage.setItem('hsc-maths-theme',next);applyTheme(next);});

function renderSegmented(container,items,active,onSelect){
  const frag=document.createDocumentFragment();
  items.forEach(item=>{
    const button=document.createElement('button');
    button.type='button';button.className=`segment-button${item.value===active?' active':''}`;button.textContent=item.label;
    button.setAttribute('aria-pressed',item.value===active?'true':'false');button.addEventListener('click',()=>onSelect(item.value));frag.appendChild(button);
  });
  container.replaceChildren(frag);
}
function renderTabs(){
  renderSegmented(courseTabs,Object.entries(COURSE_META).map(([value,m])=>({value,label:m.label})),state.activeCourse,value=>{state.activeCourse=value;if(value==='ext2')state.activeStage='hsc';save();render();});
  const stages=state.activeCourse==='ext1'?[{value:'prelim',label:'Preliminary'},{value:'hsc',label:'HSC'}]:[{value:'hsc',label:'HSC'}];
  renderSegmented(stageTabs,stages,currentStage(),value=>{state.activeStage=value;save();render();});
  document.getElementById('task-stage-label').textContent=currentStage()==='prelim'?'PRELIMINARY TASKS':'HSC TASKS';
}

function taskValidity(task){
  const hasMark=task.mark!==''||task.outOf!=='';
  const weightOK=validNumber(task.weight,0,100);
  const markOK=hasMark&&validNumber(task.mark,0,1e6)&&validNumber(task.outOf,0.000001,1e6)&&num(task.mark)<=num(task.outOf);
  return{hasMark,weightOK,markOK,complete:weightOK&&markOK};
}
function calculate(){
  let totalWeight=0,completedWeight=0,contribution=0,invalidMarks=0;
  for(const task of activeBucket().tasks){
    const v=taskValidity(task);
    if(v.weightOK)totalWeight+=num(task.weight);
    if(v.hasMark&&!v.markOK)invalidMarks++;
    if(v.complete){completedWeight+=num(task.weight);contribution+=(num(task.mark)/num(task.outOf))*num(task.weight);}
  }
  const weightedAverage=completedWeight?contribution/completedWeight*100:0;
  const remaining=Math.max(0,100-completedWeight);
  return{totalWeight,completedWeight,contribution,weightedAverage,remaining,bestPossible:Math.min(100,contribution+remaining),invalidMarks};
}

function renderTasks(){
  const frag=document.createDocumentFragment();
  activeBucket().tasks.forEach(task=>{
    const row=document.createElement('div');row.className='task-row';
    const name=document.createElement('input');name.type='text';name.placeholder=currentStage()==='prelim'?'e.g. Task 1 - Preliminary calculus':'e.g. Task 1 - Vectors';name.value=task.name;
    const pair=document.createElement('div');pair.className='mark-pair';
    const mark=document.createElement('input');mark.type='number';mark.min='0';mark.step='0.5';mark.placeholder='mark';mark.value=task.mark;
    const slash=document.createElement('span');slash.textContent='/';
    const outOf=document.createElement('input');outOf.type='number';outOf.min='0.01';outOf.step='0.5';outOf.placeholder='out of';outOf.value=task.outOf;
    pair.append(mark,slash,outOf);
    const weightWrap=document.createElement('div');weightWrap.className='weight-input';
    const weight=document.createElement('input');weight.type='number';weight.min='0';weight.max='100';weight.step='0.5';weight.placeholder='20';weight.value=task.weight;weightWrap.appendChild(weight);
    const contribution=document.createElement('div');contribution.className='task-contribution';
    const remove=document.createElement('button');remove.type='button';remove.className='remove-task';remove.textContent='x';remove.setAttribute('aria-label','Remove task');
    const refreshRow=()=>{const v=taskValidity(task);contribution.textContent=v.complete?`${fmt((num(task.mark)/num(task.outOf))*num(task.weight),2)} pts`:'--';row.classList.toggle('task-invalid',v.hasMark&&!v.markOK);};
    const update=(field,value)=>{task[field]=value;save();renderSummary();refreshRow();};
    name.addEventListener('input',e=>update('name',e.target.value));mark.addEventListener('input',e=>update('mark',e.target.value));outOf.addEventListener('input',e=>update('outOf',e.target.value));weight.addEventListener('input',e=>update('weight',e.target.value));
    remove.addEventListener('click',()=>{activeBucket().tasks=activeBucket().tasks.filter(x=>x.id!==task.id);save();render();});
    refreshRow();row.append(name,pair,weightWrap,contribution,remove);frag.appendChild(row);
  });
  if(!activeBucket().tasks.length){const empty=document.createElement('div');empty.className='mastery-empty';empty.textContent=currentStage()==='prelim'?'No Preliminary tasks yet.':'No HSC tasks yet.';frag.appendChild(empty);}
  taskList.replaceChildren(frag);
}

function renderSummary(){
  const c=calculate(),bucket=activeBucket();
  document.getElementById('current-mark').textContent=c.completedWeight?`${fmt(c.weightedAverage)}%`:'0.0%';
  document.getElementById('hero-course-mark').textContent=c.completedWeight?`${fmt(c.weightedAverage)}%`:'--';
  document.getElementById('completed-weight').textContent=`${fmt(c.completedWeight)}%`;
  document.getElementById('remaining-weight').textContent=`${fmt(c.remaining)}%`;
  document.getElementById('locked-contribution').textContent=`${fmt(c.contribution,2)} pts`;
  document.getElementById('best-possible').textContent=`${fmt(c.bestPossible)}%`;
  const warning=document.getElementById('weight-warning'),messages=[];
  if(c.totalWeight>100.0001)messages.push(`Your task weightings total ${fmt(c.totalWeight)}%. They cannot exceed 100%.`);
  else if(c.totalWeight<99.999&&bucket.tasks.length)messages.push(`Entered task weightings total ${fmt(c.totalWeight)}%. ${fmt(100-c.totalWeight)}% is still unallocated.`);
  if(c.invalidMarks)messages.push(`${c.invalidMarks} task mark${c.invalidMarks===1?' is':'s are'} invalid.`);
  warning.textContent=messages.join(' ');warning.classList.toggle('hidden',!messages.length);
  targetInput.value=bucket.target;
  const target=num(bucket.target),result=document.getElementById('target-result');
  if(!c.completedWeight)result.textContent='Add completed tasks to calculate what you need.';
  else if(c.remaining<=0)result.textContent=`Final weighted raw mark: ${fmt(c.contribution)}%.`;
  else{
    const required=(target-c.contribution)/c.remaining*100;
    result.textContent=required<=0?'Target already secured mathematically.':required>100?`Target is no longer reachable. You would need ${fmt(required)}% across the remaining weighting.`:`You need ${fmt(required)}% on average across the remaining ${fmt(c.remaining)}% weighting to finish on ${fmt(target)}%.`;
  }
}
targetInput.addEventListener('input',e=>{activeBucket().target=Math.max(0,Math.min(100,num(e.target.value)));save();renderSummary();});
addTaskButton.addEventListener('click',()=>{activeBucket().tasks.push({id:uid(),name:'',mark:'',outOf:'',weight:''});save();renderTasks();renderSummary();taskList.querySelector('.task-row:last-child input')?.focus();});

// Inverse-normal approximation used only to map rank percentile around a school average.
function invNorm(p){
  if(p<=0)return-Infinity;if(p>=1)return Infinity;
  const a=[-39.6968302866538,220.946098424521,-275.928510446969,138.357751867269,-30.6647980661472,2.50662827745924],b=[-54.4760987982241,161.585836858041,-155.698979859887,66.8013118877197,-13.2806815528857],c=[-.00778489400243029,-.322396458041136,-2.40075827716184,-2.54973253934373,4.37466414146497,2.93816398269878],d=[.00778469570904146,.32246712907004,2.445134137143,3.75440866190742],pl=.02425,ph=1-pl;let q,r;
  if(p<pl){q=Math.sqrt(-2*Math.log(p));return(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
  if(p>ph){q=Math.sqrt(-2*Math.log(1-p));return-(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
  q=p-.5;r=q*q;return(((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
}
function officialBand(mark){if(mark>=90)return{code:'E4',label:'Top band'};if(mark>=70)return{code:'E3',label:'E3'};if(mark>=50)return{code:'E2',label:'E2'};return{code:'E1',label:'E1'};}
function rankPercentile(rank,n){return Math.max(.005,Math.min(.995,1-(rank-.5)/n));}
function rankSpread(){return 8;}
function syncRankInputs(){const r=activeRank(),profile=loadProfile();if(!r.school&&profile.school)r.school=profile.school;schoolInput.value=r.school||'';rankInput.value=r.rank||'';cohortInput.value=r.cohort||'';yearInput.value=r.year||'2025';renderRankResult();}
function setLookupStatus(text,error=false){const el=document.getElementById('lookup-status');el.innerHTML=text;el.classList.toggle('lookup-error',error);}
function renderRankResult(){
  const r=activeRank(),data=r.data,rank=Number(r.rank),cohort=Number(r.cohort);
  const badge=document.getElementById('band-badge'),markOut=document.getElementById('projected-hsc'),analysis=document.getElementById('rank-analysis');
  badge.className='band-badge neutral';badge.textContent='--';markOut.textContent='--';analysis.textContent='Enter your school, rank and cohort size.';
  document.getElementById('school-average-out').textContent='--';document.getElementById('rank-percentile').textContent='--';document.getElementById('top-band-count').textContent='--';document.getElementById('confidence-out').textContent='--';
  if(!data||!validNumber(r.rank,1,10000)||!validNumber(r.cohort,2,10000)||rank>cohort)return;
  const avg=Number(data.average);
  if(!Number.isFinite(avg)){analysis.textContent='No usable school-course average was published for this school, so the site will not invent a mark.';return;}
  const latest=(data.history||[]).find(h=>Number.isFinite(Number(h.topBandCount)))||{};
  const top=Number(latest.topBandCount),pct=rankPercentile(rank,cohort),z=invNorm(pct);
  let estimate=avg+z*rankSpread();estimate=Math.max(0,Math.min(100,estimate));
  const band=officialBand(estimate);
  badge.className=`band-badge ${band.code.toLowerCase()}`;badge.textContent=band.code==='E4'?'E4 · Top band':band.code;
  markOut.textContent=fmt(estimate);
  document.getElementById('school-average-out').textContent=`${fmt(avg)} /100`;
  document.getElementById('rank-percentile').textContent=`${Math.round(pct*100)}th`;
  document.getElementById('top-band-count').textContent=Number.isFinite(top)?String(top):'--';
  const years=(data.history||[]).filter(h=>Number.isFinite(Number(h.average))).length;
  document.getElementById('confidence-out').textContent=years>=3?'Higher':years===2?'Medium':'Low';
  const middle=Math.abs(pct-.5)<.06;
  analysis.textContent=middle?`Rank ${rank}/${cohort} is around the middle of the cohort, so the school's recent ${fmt(avg)} course average is the centre of the estimate. Current projection: ${fmt(estimate)}.`:`Rank ${rank}/${cohort} is around the ${Math.round(pct*100)}th percentile. Using ${data.school}'s recent ${COURSE_META[state.activeCourse].label} performance, the current projection is ${fmt(estimate)}.`;
}

async function lookupSchool(){
  const r=activeRank();r.school=schoolInput.value.trim();r.rank=rankInput.value;r.cohort=cohortInput.value;r.year=yearInput.value;save();
  const rank=Number(r.rank),cohort=Number(r.cohort);
  if(!r.school){setLookupStatus('<strong>Choose a school first.</strong>',true);return;}
  if(!Number.isInteger(rank)||!Number.isInteger(cohort)||rank<1||cohort<2||rank>cohort){setLookupStatus('<strong>Check the rank.</strong> Rank must be a whole number from 1 up to the cohort size.',true);return;}
  lookupButton.disabled=true;lookupButton.textContent='Analysing...';setLookupStatus('Looking up recent school-course HSC data...');
  try{
    const q=new URLSearchParams({school:r.school,course:state.activeCourse,year:r.year});
    const response=await fetch(`/api/hsc-school?${q}`);const data=await response.json();if(!response.ok)throw new Error(data.error||'Lookup failed');
    r.data=data;r.school=data.school||r.school;schoolInput.value=r.school;save();renderRankResult();
    setLookupStatus(`<strong>${data.school}</strong> · ${data.course} · ${data.history.length} recent year${data.history.length===1?'':'s'} used.`);
  }catch(error){r.data=null;save();renderRankResult();setLookupStatus(`<strong>Could not get usable school data.</strong> ${error.message||''}`,true);}
  finally{lookupButton.disabled=false;lookupButton.textContent='Analyse school + rank';}
}
lookupButton.addEventListener('click',lookupSchool);
clearRankButton.addEventListener('click',()=>{state.rankModel[state.activeCourse]={school:loadProfile().school||'',rank:'',cohort:'',year:'2025',data:null};save();syncRankInputs();setLookupStatus('<strong>Cleared.</strong> Enter rank and cohort size when ready.');});
[rankInput,cohortInput,yearInput].forEach(el=>el.addEventListener('change',()=>{const r=activeRank();r.rank=rankInput.value;r.cohort=cohortInput.value;r.year=yearInput.value;r.data=null;save();renderRankResult();}));
schoolInput.addEventListener('change',()=>{const r=activeRank();r.school=schoolInput.value.trim();r.data=null;save();renderRankResult();});
if(window.attachSchoolAutocomplete)attachSchoolAutocomplete(schoolInput,item=>{const r=activeRank();r.school=item.name;r.data=null;save();renderRankResult();});

function render(){renderTabs();renderTasks();renderSummary();syncRankInputs();}
applyTheme(getInitialTheme());render();