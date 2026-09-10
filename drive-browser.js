(() => {
  const ROOT_URL = 'https://drive.google.com/drive/folders/14l4d3NYTNsP0nF46R5HM3jkvlmD5z7kc';
  const rootSeeds = [
    {type:'folder',name:'Ext 1',url:'https://drive.google.com/drive/folders/1zwoUvfYZSYbhh4a-ddAeDELPgeeoCfKa',children:[]},
    {type:'folder',name:'Ext 2',url:'https://drive.google.com/drive/folders/1CGN4e7ngt0o_IyeqEHwtl0XoTznBb_OX',children:[]},
    {type:'folder',name:'RHHS',url:'https://drive.google.com/drive/folders/1Mqd21aR7Xr6G3Y7Lq0hJlgJbwu3Y4kMw',children:[
      {type:'folder',name:'Internals',url:'https://drive.google.com/drive/folders/1Io3sULCt9kSNC9po5iZdLBPZbXZPqYeM',children:[
        {type:'folder',name:'Ext 1 - Prelim',url:'https://drive.google.com/drive/folders/1RczhPL8WCiL-gXIq0SSc3-VEEk03HYBa',children:[]},
        {type:'folder',name:'Ext 1 - HSC',url:'https://drive.google.com/drive/folders/1rD1-JnKCnYtLUoYwXy-zJAekLHRqiAnz',children:[]},
        {type:'folder',name:'Ext 2',url:'https://drive.google.com/drive/folders/1uE9cOt5mB3430D2NJVNWxWUY-izCJNhX',children:[]}
      ]},
      {type:'folder',name:'Smarter Math',url:'https://drive.google.com/drive/folders/1hZ4xUhzKxWrTxbdM-oEajgGgjnmBkiTX',children:[
        {type:'folder',name:'Ext 1 - Prelim',url:'https://drive.google.com/drive/folders/1NpTKe9gyqtrTA6lc0WyjcUwn9evdW2xh',children:[]},
        {type:'folder',name:'Ext 1 - HSC',url:'https://drive.google.com/drive/folders/1vd6Lx0XiHfWpJ-gV0capaA1NWKKXggkK',children:[]},
        {type:'folder',name:'Ext 2 - HSC',url:'https://drive.google.com/drive/folders/1HOM_lNI2c_ie7lm1t1h9Gj0B6AxQTIwA',children:[]}
      ]}
    ]}
  ];

  function clone(x){ return JSON.parse(JSON.stringify(x)); }
  function normalizeCourseName(name){
    if(name === 'Mathematics Extension 1') return 'Ext 1';
    if(name === 'Mathematics Extension 2') return 'Ext 2';
    return name;
  }
  function getGenerated(){
    if(!Array.isArray(window.resources) && typeof resources === 'undefined') return [];
    const src = Array.isArray(window.resources) ? window.resources : resources;
    return clone(src || []).map(n => ({...n,name:normalizeCourseName(n.name)}));
  }
  function getExternal(){
    if(typeof externalResources === 'undefined' || !Array.isArray(externalResources)) return [];
    return externalResources
      .filter(c => c.course === 'Mathematics Extension 1' || c.course === 'Mathematics Extension 2')
      .map(c => ({type:'folder',name:normalizeCourseName(c.course),children:clone(c.categories || [])}));
  }
  function mergeFolders(base, extra){
    extra.forEach(node => {
      const found = base.find(x => x.type === 'folder' && x.name === node.name);
      if(found){
        found.children = found.children || [];
        (node.children || []).forEach(ch => {
          const same = found.children.find(x => x.type === ch.type && x.name === ch.name);
          if(!same) found.children.push(ch);
          else if(ch.type === 'folder') mergeFolders(same.children || (same.children=[]), ch.children || []);
        });
      } else base.push(node);
    });
  }

  const root = {type:'folder',name:'HSC Maths Drive',url:ROOT_URL,children:clone(rootSeeds)};
  const generated = getGenerated();
  const external = getExternal();
  mergeFolders(root.children, generated);
  mergeFolders(root.children, external);

  const ext1 = root.children.find(x=>x.name==='Ext 1');
  const ext2 = root.children.find(x=>x.name==='Ext 2');
  if(ext1 && !ext1.children.length){
    ext1.children = [
      {type:'folder',name:'Organisation Trial Papers',url:'https://drive.google.com/drive/folders/1DargUYsHIBoFEDybkQeRyaUh_STpi7ui',children:[]},
      {type:'folder',name:'Internal Assessments',url:'https://drive.google.com/drive/folders/1DaqQSg2qkEaVAyinyroLD7Hu9AbmZJI0',children:[]},
      {type:'folder',name:"Q's By Topic",url:'https://drive.google.com/drive/folders/1FZPcAX7s2Q78aKhj9L_LcUMO-fFLgyfG',children:[]},
      {type:'folder',name:'Notes',url:'https://drive.google.com/drive/folders/1_i2XDZkp375t7fHvy5qSESTnjTtHZ1xs',children:[]}
    ];
  }
  if(ext2 && !ext2.children.length){
    ext2.children = [
      {type:'folder',name:'Organisation Trial Papers',url:'https://drive.google.com/drive/folders/1pMXoeQlbzw8MRzvEyA2jeJHJg3FkWt4Q',children:[]},
      {type:'folder',name:'Internal Assessments',url:'https://drive.google.com/drive/folders/1v9DvsZlVBZMVr76PgTaS_E4BYP-zxsP7',children:[]},
      {type:'folder',name:"Q's By Topic",url:'https://drive.google.com/drive/folders/1Gfp2SAgop27icSCcgxKYE7u5yAc3xSg_',children:[]},
      {type:'folder',name:'Notes',url:'https://drive.google.com/drive/folders/1whfIbTyKdg3ITwKucCmwR88nKt4NobR2',children:[]}
    ];
  }

  const list = document.getElementById('drive-list');
  const title = document.getElementById('drive-title');
  const sub = document.getElementById('drive-subtitle');
  const crumbs = document.getElementById('drive-crumbs');
  const back = document.getElementById('drive-back');
  const home = document.getElementById('drive-home');
  const search = document.getElementById('drive-search');
  const openDrive = document.getElementById('drive-open');
  if(!list) return;

  let stack = [root];
  const current = () => stack[stack.length-1];
  const natural = (a,b) => a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:'base'});
  const kind = n => n.type === 'folder' ? 'Folder' : (/\.pdf($|\?)/i.test(n.name)||/drive\.google\.com\/file\//i.test(n.url||'') ? 'PDF' : 'File');

  function renderCrumbs(){
    crumbs.replaceChildren();
    stack.forEach((node,i)=>{
      if(i){ const sep=document.createElement('span'); sep.className='drive-sep'; sep.textContent='/'; crumbs.appendChild(sep); }
      const b=document.createElement('button'); b.type='button'; b.className='drive-crumb'+(i===stack.length-1?' current':''); b.textContent=i===0?'My Drive':node.name;
      if(i<stack.length-1) b.onclick=()=>{stack=stack.slice(0,i+1);search.value='';render();};
      crumbs.appendChild(b);
    });
  }

  function render(){
    const node=current();
    const q=search.value.trim().toLowerCase();
    const items=(node.children||[]).filter(x=>!q||x.name.toLowerCase().includes(q)).sort((a,b)=>a.type!==b.type?(a.type==='folder'?-1:1):natural(a,b));
    title.textContent=node===root?'Resources':node.name;
    sub.textContent=`${items.length} item${items.length===1?'':'s'}`;
    back.disabled=stack.length===1;
    openDrive.href=node.url||ROOT_URL;
    renderCrumbs();
    list.replaceChildren();
    if(!items.length){
      const e=document.createElement('div'); e.className='drive-empty'; e.textContent=q?'No matching items in this folder.':'This folder is empty here. Use “Open in Drive” for the live folder.'; list.appendChild(e); return;
    }
    const frag=document.createDocumentFragment();
    items.forEach(item=>{
      const row=document.createElement(item.type==='folder'?'button':'a');
      row.className='drive-item';
      if(item.type==='folder'){
        row.type='button';
        row.onclick=()=>{
          if(item.children && item.children.length){ stack.push(item); search.value=''; render(); }
          else if(item.url){ window.open(item.url,'_blank','noopener'); }
        };
      }else{
        row.href=item.url||'#'; row.target='_blank'; row.rel='noopener noreferrer';
      }
      const main=document.createElement('span'); main.className='drive-item-main';
      const icon=document.createElement('span'); icon.className=item.type==='folder'?'drive-folder-icon':'drive-file-icon'+(kind(item)==='PDF'?' pdf':'');
      const name=document.createElement('span'); name.className='drive-item-name'; name.textContent=item.name;
      const meta=document.createElement('span'); meta.className='drive-item-meta'; meta.textContent=kind(item);
      main.append(icon,name); row.append(main,meta); frag.appendChild(row);
    });
    list.appendChild(frag);
  }

  back.onclick=()=>{if(stack.length>1){stack.pop();search.value='';render();}};
  home.onclick=()=>{stack=[root];search.value='';render();};
  search.addEventListener('input',render);
  document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();search.focus();}});
  render();
})();