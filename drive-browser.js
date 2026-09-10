(() => {
  const BASE='https://kwpwbocpjdtntnzjwytk.supabase.co/storage/v1/object/public/resources/';
  const paths=Array.isArray(window.RESOURCE_PATHS)?window.RESOURCE_PATHS:[];
  const root={type:'folder',name:'Resources',children:[]};
  const folders=new Map([['',root]]);
  const pretty=s=>s==='Q_s By Topic'?"Q's By Topic":s.replace(/Q_s/g,"Q's");
  const enc=p=>p.split('/').map(encodeURIComponent).join('/');

  for(const full of paths){
    const parts=full.split('/').filter(Boolean);
    let prefix='';
    let parent=root;
    parts.forEach((part,i)=>{
      const last=i===parts.length-1;
      const next=prefix?`${prefix}/${part}`:part;
      if(last){
        parent.children.push({type:'file',name:part,path:full,url:BASE+enc(full)});
      }else{
        let folder=folders.get(next);
        if(!folder){
          folder={type:'folder',name:pretty(part),rawName:part,path:next,children:[]};
          folders.set(next,folder);
          parent.children.push(folder);
        }
        parent=folder;
        prefix=next;
      }
    });
  }

  const list=document.getElementById('drive-list');
  const title=document.getElementById('drive-title');
  const sub=document.getElementById('drive-subtitle');
  const crumbs=document.getElementById('drive-crumbs');
  const back=document.getElementById('drive-back');
  const home=document.getElementById('drive-home');
  const search=document.getElementById('drive-search');
  if(!list)return;

  let stack=[root];
  const current=()=>stack[stack.length-1];
  const natural=(a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:'base'});

  function renderCrumbs(){
    crumbs.replaceChildren();
    stack.forEach((node,i)=>{
      if(i){const sep=document.createElement('span');sep.className='drive-sep';sep.textContent='/';crumbs.appendChild(sep);}
      const btn=document.createElement('button');
      btn.type='button';btn.className='drive-crumb'+(i===stack.length-1?' current':'');btn.textContent=i===0?'Home':node.name;
      if(i<stack.length-1)btn.onclick=()=>{stack=stack.slice(0,i+1);search.value='';render();};
      crumbs.appendChild(btn);
    });
  }

  function render(){
    const node=current();
    const q=search.value.trim().toLowerCase();
    const items=(node.children||[])
      .filter(x=>!q||x.name.toLowerCase().includes(q))
      .sort((a,b)=>a.type!==b.type?(a.type==='folder'?-1:1):natural(a,b));

    title.textContent=node===root?'Resources':node.name;
    sub.textContent=`${items.length} item${items.length===1?'':'s'}`;
    back.disabled=stack.length===1;
    renderCrumbs();
    list.replaceChildren();

    if(!items.length){
      const empty=document.createElement('div');
      empty.className='drive-empty';
      empty.textContent=q?'No matching items in this folder.':'This folder is empty.';
      list.appendChild(empty);
      return;
    }

    const frag=document.createDocumentFragment();
    for(const item of items){
      const row=document.createElement(item.type==='folder'?'button':'a');
      row.className='drive-item';
      if(item.type==='folder'){
        row.type='button';
        row.onclick=()=>{stack.push(item);search.value='';render();};
      }else{
        row.href=item.url;row.target='_blank';row.rel='noopener noreferrer';
      }
      const main=document.createElement('span');main.className='drive-item-main';
      const icon=document.createElement('span');icon.className=item.type==='folder'?'drive-folder-icon':'drive-file-icon pdf';
      const name=document.createElement('span');name.className='drive-item-name';name.textContent=item.name;
      const meta=document.createElement('span');meta.className='drive-item-meta';meta.textContent=item.type==='folder'?'Folder':'PDF';
      main.append(icon,name);row.append(main,meta);frag.appendChild(row);
    }
    list.appendChild(frag);
  }

  back.onclick=()=>{if(stack.length>1){stack.pop();search.value='';render();}};
  home.onclick=()=>{stack=[root];search.value='';render();};
  search.addEventListener('input',render);
  document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();search.focus();}});
  render();
})();