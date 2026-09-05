(function(){
  const KEYS={profile:'hsc-maths-profile-v1',mastery:'hsc-maths-mastery-v1',performance:'hsc-maths-performance-v3'};
  const reverseKeys=Object.fromEntries(Object.entries(KEYS).map(([stateKey,localKey])=>[localKey,stateKey]));
  const timers=new Map();
  let suppressLocalHook=false;

  async function readyClient(){await window.HSCAuth.init();const session=await window.HSCAuth.getSession();return session?window.HSCAuth.client:null;}
  async function currentUser(){try{return await window.HSCAuth.getUser();}catch{return null;}}

  async function pushState(stateKey){
    const c=await readyClient(); if(!c)return false;
    const user=await currentUser(); if(!user)return false;
    const localKey=KEYS[stateKey]; if(!localKey)return false;
    let payload={}; try{payload=JSON.parse(localStorage.getItem(localKey)||'{}');}catch{}
    if(stateKey==='profile'){
      const row={user_id:user.id,school_name:payload.school||null,school_slug:payload.schoolSlug||null,subjects:payload.subjects||{ext1:true,ext2:false},updated_at:new Date().toISOString()};
      const {error}=await c.from('profiles').upsert(row,{onConflict:'user_id'}); if(error)throw error;
    } else {
      const row={user_id:user.id,state_key:stateKey,payload,updated_at:new Date().toISOString()};
      const {error}=await c.from('user_state').upsert(row,{onConflict:'user_id,state_key'}); if(error)throw error;
    }
    window.dispatchEvent(new CustomEvent('hsc-cloud-sync',{detail:{stateKey,status:'saved'}}));
    return true;
  }

  function queue(stateKey,delay=650){
    clearTimeout(timers.get(stateKey));
    timers.set(stateKey,setTimeout(()=>pushState(stateKey).catch(err=>window.dispatchEvent(new CustomEvent('hsc-cloud-sync',{detail:{stateKey,status:'error',error:err.message}}))),delay));
  }

  async function pullAll(){
    const c=await readyClient(); if(!c)return {signedIn:false};
    const user=await currentUser(); if(!user)return {signedIn:false};
    const [{data:profile,error:profileError},{data:states,error:stateError}]=await Promise.all([
      c.from('profiles').select('school_name,school_slug,subjects,updated_at').eq('user_id',user.id).maybeSingle(),
      c.from('user_state').select('state_key,payload,updated_at').eq('user_id',user.id)
    ]);
    if(profileError)throw profileError;if(stateError)throw stateError;
    suppressLocalHook=true;
    try{
      if(profile){localStorage.setItem(KEYS.profile,JSON.stringify({school:profile.school_name||'',schoolSlug:profile.school_slug||'',subjects:profile.subjects||{ext1:true,ext2:false}}));}
      (states||[]).forEach(row=>{const key=KEYS[row.state_key];if(key&&row.payload)localStorage.setItem(key,JSON.stringify(row.payload));});
      localStorage.setItem('hsc-maths-last-cloud-sync',new Date().toISOString());
    } finally { suppressLocalHook=false; }
    window.dispatchEvent(new CustomEvent('hsc-cloud-hydrated',{detail:{user}}));
    return {signedIn:true,user};
  }

  async function migrateLocalToCloud(){for(const key of Object.keys(KEYS))await pushState(key);}

  const nativeSetItem=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
    nativeSetItem.call(this,key,value);
    if(this===localStorage&&!suppressLocalHook&&reverseKeys[key]) queue(reverseKeys[key]);
  };

  window.HSCCloud={KEYS,queue,pushState,pullAll,migrateLocalToCloud};
})();