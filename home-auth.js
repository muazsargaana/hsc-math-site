(function(){
  const signedOut=document.getElementById('home-auth-prompt');
  const accountLink=document.getElementById('nav-account-link');
  const accountText=document.getElementById('nav-account-text');

  function shortIdentity(user){
    const name=user?.user_metadata?.display_name?.trim();
    if(name) return name.split(/\s+/)[0];
    const email=user?.email||'';
    return email ? email.split('@')[0] : 'Account';
  }

  function setSignedOut(){
    signedOut?.removeAttribute('hidden');
    if(accountLink){accountLink.href='/login/';accountLink.classList.add('nav-account-cta');}
    if(accountText) accountText.textContent='Sign in';
  }

  function setSignedIn(user){
    signedOut?.setAttribute('hidden','');
    if(accountLink){accountLink.href='/profile/';accountLink.classList.remove('nav-account-cta');}
    if(accountText) accountText.textContent=shortIdentity(user);
  }

  async function refresh(){
    try{
      const info=await window.HSCAuth.init();
      if(!info.configured){setSignedOut();return;}
      const session=await window.HSCAuth.getSession();
      if(session?.user) setSignedIn(session.user); else setSignedOut();
    }catch{setSignedOut();}
  }

  window.addEventListener('hsc-auth-change',e=>{
    const user=e.detail?.user;
    if(user)setSignedIn(user);else setSignedOut();
  });

  refresh();
})();