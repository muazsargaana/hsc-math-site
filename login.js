const form=document.getElementById('auth-form');
const tabs=document.querySelectorAll('[data-mode]');
const title=document.getElementById('auth-title');
const subtitle=document.getElementById('auth-subtitle');
const nameField=document.getElementById('name-field');
const confirmField=document.getElementById('confirm-field');
const email=document.getElementById('auth-email');
const password=document.getElementById('auth-password');
const confirmPassword=document.getElementById('auth-confirm');
const nameInput=document.getElementById('auth-name');
const submit=document.getElementById('auth-submit');
const forgot=document.getElementById('forgot-password');
const message=document.getElementById('auth-message');
let mode=new URLSearchParams(location.search).get('recovery')==='1'?'recovery':'signin';

function setMessage(text,type=''){message.textContent=text;message.className=`auth-message ${type}`.trim();}
function setMode(next){mode=next;tabs.forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));nameField.hidden=mode!=='signup';confirmField.hidden=!['signup','recovery'].includes(mode);forgot.hidden=mode!=='signin';password.autocomplete=mode==='signin'?'current-password':'new-password';
  if(mode==='signin'){title.textContent='Sign in';subtitle.textContent='Use your account to keep your school, mastery and assessment data synced.';submit.textContent='Sign in';}
  if(mode==='signup'){title.textContent='Create account';subtitle.textContent='Create one account for your school profile, mastery and assessments.';submit.textContent='Create account';}
  if(mode==='recovery'){title.textContent='Set new password';subtitle.textContent='Choose a new password for your account.';submit.textContent='Update password';document.getElementById('auth-tabs').hidden=true;}
  setMessage('');
}

tabs.forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
document.querySelectorAll('[data-toggle]').forEach(b=>b.addEventListener('click',()=>{const input=document.getElementById(b.dataset.toggle);input.type=input.type==='password'?'text':'password';b.textContent=input.type==='password'?'Show':'Hide';}));

forgot.addEventListener('click',async()=>{
  const value=email.value.trim();if(!value){setMessage('Enter your email first.','error');email.focus();return;}
  try{forgot.disabled=true;await HSCAuth.resetPassword(value);setMessage('Password reset email sent.','success');}catch(e){setMessage(e.message||'Could not send reset email.','error');}finally{forgot.disabled=false;}
});

form.addEventListener('submit',async e=>{
  e.preventDefault();setMessage('');
  const mail=email.value.trim();const pass=password.value;
  if(mode!=='recovery'&&!mail){setMessage('Enter your email.','error');return;}
  if(pass.length<8){setMessage('Password must be at least 8 characters.','error');return;}
  if(['signup','recovery'].includes(mode)&&pass!==confirmPassword.value){setMessage('Passwords do not match.','error');return;}
  submit.disabled=true;
  try{
    if(mode==='signin'){
      await HSCAuth.signIn(mail,pass);setMessage('Signed in. Loading your account...','success');
      try{await HSCCloud.pullAll();}catch{}
      location.href='/profile/';
    } else if(mode==='signup'){
      const data=await HSCAuth.signUp(mail,pass,nameInput.value.trim());
      if(data.session){try{await HSCCloud.migrateLocalToCloud();}catch{} location.href='/profile/';}
      else setMessage('Account created. Check your email to verify it, then sign in.','success');
    } else {
      await HSCAuth.updatePassword(pass);setMessage('Password updated.','success');setTimeout(()=>location.href='/profile/',600);
    }
  }catch(err){setMessage(err.message||'Authentication failed.','error');}
  finally{submit.disabled=false;}
});

(async()=>{
  try{
    const info=await HSCAuth.init();
    if(!info.configured){setMessage('Account service is waiting for its secure project configuration.','error');submit.disabled=true;return;}
    const session=await HSCAuth.getSession();
    if(session&&mode!=='recovery'){try{await HSCCloud.pullAll();}catch{} location.href='/profile/';}
  }catch(e){setMessage(e.message||'Account service unavailable.','error');}
})();
setMode(mode);