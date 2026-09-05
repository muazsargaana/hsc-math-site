const PROFILE_KEY='hsc-maths-profile-v1';
const schoolInput=document.getElementById('profile-school');
const ext1=document.getElementById('subject-ext1');
const ext2=document.getElementById('subject-ext2');
const schoolMeta=document.getElementById('school-meta');
const themeToggle=document.getElementById('theme-toggle');
const themeLabel=themeToggle.querySelector('.theme-label');

function load(){
  try{return JSON.parse(localStorage.getItem(PROFILE_KEY))||{school:'',schoolSlug:'',subjects:{ext1:true,ext2:true}};}
  catch{return{school:'',schoolSlug:'',subjects:{ext1:true,ext2:true}};}
}
const profile=load();
function save(){localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));document.getElementById('save-state').textContent='Saved locally';}
function getInitialTheme(){const s=localStorage.getItem('hsc-maths-theme');if(s==='light'||s==='dark')return s;return matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}
function applyTheme(t){document.documentElement.dataset.theme=t;themeLabel.textContent=t==='dark'?'Light':'Dark';}
themeToggle.addEventListener('click',()=>{const n=document.documentElement.dataset.theme==='dark'?'light':'dark';localStorage.setItem('hsc-maths-theme',n);applyTheme(n);});

schoolInput.value=profile.school||'';ext1.checked=profile.subjects?.ext1!==false;ext2.checked=profile.subjects?.ext2===true;
function renderMeta(){schoolMeta.textContent=profile.school?`${profile.school} will be used automatically by the HSC rank predictor.`:'No school selected yet.';}
attachSchoolAutocomplete(schoolInput,item=>{profile.school=item.name;profile.schoolSlug=item.slug||'';save();renderMeta();});
schoolInput.addEventListener('change',()=>{profile.school=schoolInput.value.trim();if(!profile.school)profile.schoolSlug='';save();renderMeta();});
ext1.addEventListener('change',()=>{profile.subjects=profile.subjects||{};profile.subjects.ext1=ext1.checked;save();});
ext2.addEventListener('change',()=>{profile.subjects=profile.subjects||{};profile.subjects.ext2=ext2.checked;save();});
applyTheme(getInitialTheme());renderMeta();