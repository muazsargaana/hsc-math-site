(function(){
  const watched=['hsc-maths-profile-v1','hsc-maths-mastery-v1','hsc-maths-performance-v3'];
  const snapshot=()=>watched.map(k=>localStorage.getItem(k)||'').join('\u001f');
  async function hydrate(){
    if(!window.HSCCloud||!window.HSCAuth)return;
    try{
      const before=snapshot();
      const result=await window.HSCCloud.pullAll();
      if(!result?.signedIn)return;
      const after=snapshot();
      if(before!==after){
        const key=`hsc-hydrated:${location.pathname}`;
        const token=after.length+':'+after.slice(0,64)+':'+after.slice(-64);
        if(sessionStorage.getItem(key)!==token){sessionStorage.setItem(key,token);location.reload();}
      }
    }catch(error){console.warn('Cloud hydration skipped:',error?.message||error);}
  }
  hydrate();
})();