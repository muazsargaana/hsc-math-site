(() => {
  const ROOT_URL='https://drive.google.com/drive/folders/14l4d3NYTNsP0nF46R5HM3jkvlmD5z7kc';
  const F=(name,url,children=[])=>({type:'folder',name,url,children});
  const root={type:'folder',name:'HSC Maths Drive',url:ROOT_URL,children:[
    F('Ext 1','https://drive.google.com/drive/folders/1zwoUvfYZSYbhh4a-ddAeDELPgeeoCfKa',[
      F('Organisation Trial Papers','https://drive.google.com/drive/folders/1DargUYsHIBoFEDybkQeRyaUh_STpi7ui'),
      F('Internal Assessments','https://drive.google.com/drive/folders/1DaqQSg2qkEaVAyinyroLD7Hu9AbmZJI0'),
      F("Q's By Topic",'https://drive.google.com/drive/folders/1FZPcAX7s2Q78aKhj9L_LcUMO-fFLgyfG'),
      F('Notes','https://drive.google.com/drive/folders/1_i2XDZkp375t7fHvy5qSESTnjTtHZ1xs')
    ]),
    F('Ext 2','https://drive.google.com/drive/folders/1CGN4e7ngt0o_IyeqEHwtl0XoTznBb_OX',[
      F('Organisation Trial Papers','https://drive.google.com/drive/folders/1pMXoeQlbzw8MRzvEyA2jeJHJg3FkWt4Q'),
      F('Internal Assessments','https://drive.google.com/drive/folders/1v9DvsZlVBZMVr76PgTaS_E4BYP-zxsP7'),
      F("Q's By Topic",'https://drive.google.com/drive/folders/1Gfp2SAgop27icSCcgxKYE7u5yAc3xSg_'),
      F('Notes','https://drive.google.com/drive/folders/1whfIbTyKdg3ITwKucCmwR88nKt4NobR2')
    ]),
    F('RHHS','https://drive.google.com/drive/folders/1Mqd21aR7Xr6G3Y7Lq0hJlgJbwu3Y4kMw',[
      F('Internals','https://drive.google.com/drive/folders/1Io3sULCt9kSNC9po5iZdLBPZbXZPqYeM',[
        F('Ext 1 - Prelim','https://drive.google.com/drive/folders/1RczhPL8WCiL-gXIq0SSc3-VEEk03HYBa'),
        F('Ext 1 - HSC','https://drive.google.com/drive/folders/1rD1-JnKCnYtLUoYwXy-zJAekLHRqiAnz'),
        F('Ext 2','https://drive.google.com/drive/folders/1uE9cOt5mB3430D2NJVNWxWUY-izCJNhX')
      ]),
      F('Smarter Math','https://drive.google.com/drive/folders/1hZ4xUhzKxWrTxbdM-oEajgGgjnmBkiTX',[
        F('Ext 1 - Prelim','https://drive.google.com/drive/folders/1NpTKe9gyqtrTA6lc0WyjcUwn9evdW2xh'),
        F('Ext 1 - HSC','https://drive.google.com/drive/folders/1vd6Lx0XiHfWpJ-gV0capaA1NWKKXggkK'),
        F('Ext 2 - HSC','https://drive.google.com/drive/folders/1HOM_lNI2c_ie7lm1t1h9Gj0B6AxQTIwA')
      ])
    ])
  ]};

  const clone=x=>JSON.parse(JSON.stringify(x));
  const normName=n=>n==='Mathematics Extension 1'?'Ext 1':n==='Mathematics Extension 2'?'Ext 2':n;
  const normalizeNode=n=>({type:n.type||(Array.isArray(n.children)?'folder':'file'),name:n.name,url:n.url,children:Array.isArray(n.children)?n.children.map(normalizeNode):undefined});
  const findFolder=(arr,name)=>arr.find(x=>x.type==='folder'&&x.name===name);
  function mergeMatching(target,source){
    (source||[]).forEach(raw=>{
      const node=normalizeNode(raw), found=findFolder(target,node.name);
      if(found&&node.type==='folder'){
        found.children=found.children||[];
        (node.children||[]).forEach(ch=>{
          const same=found.children.find(x=>x.name===ch.name&&x.type===ch.type);
          if(!same) found.children.push(ch);
          else if(ch.type==='folder') mergeMatching(same.children||(same.children=[]),ch.children||[]);
        });
      }
    });
  }

  try{
    const generated=typeof resources!=='undefined'&&Array.isArray(resources)?clone(resources):[];
    generated.forEach(course=>{
      const target=findFolder(root.children,normName(course.name));
      if(target) mergeMatching(target.children,course.children||[]);
    });
    if(typeof externalResources!=='undefined'&&Array.isArray(externalResources)){
      externalResources.forEach(course=>{
        const target=findFolder(root.children,normName(course.course));
        if(target) mergeMatching(target.children,(course.categories||[]).map(normalizeNode));
      });
    }
  }catch(e){console.warn('Resource merge skipped',e);}

  const list=document.getElementById('drive-list'),title=document.getElementById('drive-title'),sub=document.getElementById('drive-subtitle'),crumbs=document.getElementById('drive-crumbs'),back=document.getElementById('drive-back'),home=document.getElementById('drive-home'),search=document.getElementById('drive-search'),openDrive=document.getElementById('drive-open');
  if(!list)return;
  let stack=[root];
  const current=()=>stack[stack.length-1];
  const natural=(a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:'base'});
  const kind=n=>n.type==='folder'?'Folder':(/\.pdf$/i.test(n.name||'')?'PDF':'File');

  function crumbsRender(){
    crumbs.replaceChildren();
    stack.forEach((node,i)=>{
      if(i){const s=document.createElement('span');s.className='drive-sep';s.textContent='/';crumbs.appendChild(s);}
      const b=document.createElement('button');b.type='button';b.className='drive-crumb'+(i===stack.length-1?' current':'');b.textContent=i===0?'My Drive':node.name;
      if(i<stack.length-1)b.onclick=()=>{stack=stack.slice(0,i+1);search.value='';render();};
      crumbs.appendChild(b);
    });
  }
  function openFolder(item){
    if(item.children&&item.children.length){stack.push(item);search.value='';render();}
    else if(item.url)window.open(item.url,'_blank','noopener');
  }
  function render(){
    const node=current(),q=search.value.trim().toLowerCase();
    const items=(node.children||[]).filter(x=>!q||x.name.toLowerCase().includes(q)).sort((a,b)=>a.type!==b.type?(a.type==='folder'?-1:1):natural(a,b));
    title.textContent=node===root?'Resources':node.name;sub.textContent=`${items.length} item${items.length===1?'':'s'}`;back.disabled=stack.length===1;openDrive.href=node.url||ROOT_URL;crumbsRender();list.replaceChildren();
    if(!items.length){const e=document.createElement('div');e.className='drive-empty';e.textContent=q?'No matching items in this folder.':'No indexed items here yet. Open the live Drive folder.';list.appendChild(e);return;}
    const frag=document.createDocumentFragment();
    items.forEach(item=>{
      const row=document.createElement(item.type==='folder'?'button':'a');row.className='drive-item';
      if(item.type==='folder'){row.type='button';row.onclick=()=>openFolder(item);}else{row.href=item.url||'#';row.target='_blank';row.rel='noopener noreferrer';}
      const main=document.createElement('span');main.className='drive-item-main';const icon=document.createElement('span');icon.className=item.type==='folder'?'drive-folder-icon':'drive-file-icon'+(kind(item)==='PDF'?' pdf':'');const name=document.createElement('span');name.className='drive-item-name';name.textContent=item.name;const meta=document.createElement('span');meta.className='drive-item-meta';meta.textContent=kind(item);main.append(icon,name);row.append(main,meta);frag.appendChild(row);
    });list.appendChild(frag);
  }
  back.onclick=()=>{if(stack.length>1){stack.pop();search.value='';render();}};home.onclick=()=>{stack=[root];search.value='';render();};search.addEventListener('input',render);document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();search.focus();}});render();
})();