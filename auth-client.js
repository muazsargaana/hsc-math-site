(function(){
  const AUTH_EVENT='hsc-auth-change';
  let client=null, config=null, initPromise=null;

  async function init(){
    if(initPromise) return initPromise;
    initPromise=(async()=>{
      const response=await fetch('/api/auth-config',{cache:'no-store'});
      config=await response.json();
      if(!config.configured) return {configured:false,client:null};
      if(!window.supabase?.createClient) throw new Error('Supabase client library failed to load.');
      client=window.supabase.createClient(config.url,config.publishableKey,{
        auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'hsc-maths-auth'}
      });
      client.auth.onAuthStateChange((event,session)=>{
        window.dispatchEvent(new CustomEvent(AUTH_EVENT,{detail:{event,session,user:session?.user||null}}));
      });
      return {configured:true,client};
    })();
    return initPromise;
  }

  async function requireClient(){
    const result=await init();
    if(!result.configured||!client) throw new Error('Account service is not configured yet.');
    return client;
  }
  async function getSession(){const c=await requireClient();const {data,error}=await c.auth.getSession();if(error)throw error;return data.session;}
  async function getUser(){const c=await requireClient();const {data,error}=await c.auth.getUser();if(error)throw error;return data.user;}
  async function signUp(email,password,displayName=''){
    const c=await requireClient();
    const {data,error}=await c.auth.signUp({email,password,options:{data:{display_name:displayName},emailRedirectTo:`${location.origin}/profile/`}});
    if(error)throw error;return data;
  }
  async function signIn(email,password){const c=await requireClient();const {data,error}=await c.auth.signInWithPassword({email,password});if(error)throw error;return data;}
  async function signOut(){const c=await requireClient();const {error}=await c.auth.signOut();if(error)throw error;}
  async function resetPassword(email){const c=await requireClient();const {error}=await c.auth.resetPasswordForEmail(email,{redirectTo:`${location.origin}/login/?recovery=1`});if(error)throw error;}
  async function updatePassword(password){const c=await requireClient();const {data,error}=await c.auth.updateUser({password});if(error)throw error;return data;}

  window.HSCAuth={init,getSession,getUser,signUp,signIn,signOut,resetPassword,updatePassword,get client(){return client;},AUTH_EVENT};
  init().catch(console.error);
})();