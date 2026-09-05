(function(){
  function attachSchoolAutocomplete(input,onSelect){
    if(!input) return;
    const wrap=input.parentElement;
    if(!wrap) return;
    wrap.classList.add('autocomplete-wrap');
    const box=document.createElement('div');
    box.className='school-suggestions';
    box.hidden=true;
    wrap.appendChild(box);
    let timer=0,active=-1,items=[];

    function close(){box.hidden=true;box.replaceChildren();items=[];active=-1;}
    function choose(item){input.value=item.name;close();onSelect?.(item);input.dispatchEvent(new Event('change',{bubbles:true}));}
    function paint(){
      const frag=document.createDocumentFragment();
      items.forEach((item,i)=>{
        const b=document.createElement('button');
        b.type='button';b.className='school-suggestion'+(i===active?' active':'');
        const strong=document.createElement('strong');strong.textContent=item.name;
        const small=document.createElement('small');small.textContent='HSCninja school';
        b.append(strong,small);b.addEventListener('mousedown',e=>e.preventDefault());b.addEventListener('click',()=>choose(item));frag.appendChild(b);
      });
      box.replaceChildren(frag);box.hidden=!items.length;
    }
    async function search(){
      const q=input.value.trim();
      if(q.length<2){close();return;}
      try{
        const r=await fetch(`/api/schools?q=${encodeURIComponent(q)}`);
        const data=await r.json();
        items=Array.isArray(data.schools)?data.schools:[];active=-1;paint();
      }catch{close();}
    }
    input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(search,120);});
    input.addEventListener('keydown',e=>{
      if(box.hidden||!items.length)return;
      if(e.key==='ArrowDown'){e.preventDefault();active=(active+1)%items.length;paint();}
      else if(e.key==='ArrowUp'){e.preventDefault();active=(active-1+items.length)%items.length;paint();}
      else if(e.key==='Enter'&&active>=0){e.preventDefault();choose(items[active]);}
      else if(e.key==='Escape')close();
    });
    input.addEventListener('blur',()=>setTimeout(close,120));
  }
  window.attachSchoolAutocomplete=attachSchoolAutocomplete;
})();