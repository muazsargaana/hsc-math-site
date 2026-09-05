const PROFILE_KEY='hsc-maths-profile-v1';
const schoolInput=document.getElementById('profile-school');
const ext1=document.getElementById('subject-ext1');
const ext2=document.getElementById('subject-ext2');
const schoolMeta=document.getElementById('school-meta');
const themeToggle=document.getElementById('theme-toggle');
const themeLabel=themeToggle.querySelector('.theme-label');
const signedOutPanel=document.getElementById('signed-out-panel');
const signedInPanel=document.getElementById('signed-in-panel');
const accountStatus=document.getElementById('account-status');
const accountName=document.getElementById('account-name');
const accountEmail=document.getElementById('account-email');
const accountAvatar=document.getElementById('account-avatar');
const syncState=document.getElementById('sync-state');

function load(){try{return JSON.parse(localStorage.getItem(PROFILE_KEY))||{school:'',schoolSlug:'',subjects:{ext1:true,ext2:false}};}catch{return{school:'',schoolSlug:'',subjects:{ext1:true,ext2:false}};}}
const profile=load();
function save(){localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));document.getElementById('save-state').textContent='Saved';window.HSCCloud?.queue('profile');}
function getInitialTheme(){const s=localStorage.getItem('hsc-maths-theme');if(s==='light'||s==='dark')return s;return matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}
function applyTheme(t){document.documentElement.dataset.theme=t;themeLabel.textContent=t==='dark'?'Light':'Dark';}
themeToggle.addEventListener('click',()=>{const n=document.documentElement.dataset.theme==='dark'?'light':'dark';localStorage.setItem('hsc-maths-theme',n);applyTheme(n);});

function applyProfileToForm(){schoolInput.value=profile.school||'';ext1.checked=profile.subjects?.ext1!==false;ext2.checked=profile.subjects?.ext2===true;renderMeta();}
function renderMeta(){schoolMeta.textContent=profile.school?`${profile.school} will be used automatically by the HSC rank predictor.`:'No school selected yet.';}
attachSchoolAutocomplete(schoolInput,item=>{profile.school=item.name;profile.schoolSlug=item.slug||'';save();renderMeta();});
schoolInput.addEventListener('change',()=>{profile.school=schoolInput.value.trim();if(!profile.school)profile.schoolSlug='';save();renderMeta();});
ext1.addEventListener('change',()=>{profile.subjects=profile.subjects||{};profile.subjects.ext1=ext1.checked;save();});
ext2.addEventListener('change',()=>{profile.subjects=profile.subjects||{};profile.subjects.ext2=ext2.checked;save();});

async function renderAccount(){
  try{
    const info=await HSCAuth.init();
    if(!info.configured){accountStatus.textContent='SETUP';accountStatus.className='status-chip local';signedOutPanel.hidden=false;signedInPanel.hidden=true;return;}
    const session=await HSCAuth.getSession();const user=session?.user||null;
    signedOutPanel.hidden=Boolean(user);signedInPanel.hidden=!user;
    if(!user){accountStatus.textContent='SIGNED OUT';accountStatus.className='status-chip local';return;}
    accountStatus.textContent='SIGNED IN';accountStatus.className='status-chip';
    const display=user.user_metadata?.display_name||user.email?.split('@')[0]||'Account';
    accountName.textContent=display;accountEmail.textContent=user.email||'';accountAvatar.textContent=display.trim().charAt(0).toUpperCase()||'A';
  }catch{accountStatus.textContent='OFFLINE';}
}

document.getElementById('sync-now')?.addEventListener('click',async()=>{try{syncState.textContent='Syncing...';await HSCCloud.migrateLocalToCloud();syncState.textContent='Synced just now.';}catch(e){syncState.textContent=e.message||'Sync failed.';}});
document.getElementById('sign-out')?.addEventListener('click',async()=>{await HSCAuth.signOut();location.href='/login/';});
window.addEventListener('hsc-cloud-sync',e=>{if(e.detail.status==='saved')syncState.textContent='Saved to cloud.';if(e.detail.status==='error')syncState.textContent='Cloud sync error.';});
window.addEventListener('hsc-auth-change',renderAccount);

applyTheme(getInitialTheme());applyProfileToForm();renderAccount();