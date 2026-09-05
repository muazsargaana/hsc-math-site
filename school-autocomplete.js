(function(){
  function attachSchoolAutocomplete(input,onSelect){
    if(!input||input.dataset.autocompleteAttached==='1')return;
    input.dataset.autocompleteAttached='1';
    const wrap=input.parentElement;if(!wrap)return;wrap.classList.add('autocomplete-wrap');
    const box=document.createElement('div');box.className='school-suggestions';box.hidden=true;box.setAttribute('role','listbox');wrap.appendChild(box);
    input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-expanded','false');
    let timer=0,active=-1,items=[],controller=null,requestId=0;

    function close(){box.hidden=true;box.replaceChildren();items=[];active=-1;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');}
    function choose(item){input.value=item.name;close();onSelect?.(item);input.dispatchEvent(new Event('change',{bubbles:true}));}
    function paint(){
      const frag=document.createDocumentFragment();
      items.forEach((item,i)=>{
        const button=document.createElement('button');button.type='button';button.id=`school-option-${requestId}-${i}`;button.className='school-suggestion'+(i===active?' active':'');button.setAttribute('role','option');button.setAttribute('aria-selected',i===active?'true':'false');
        const strong=document.createElement('strong');strong.textContent=item.name;const small=document.createElement('small');small.textContent='NSW HSC school';button.append(strong,small);
        button.addEventListener('mousedown',e=>e.preventDefault());button.addEventListener('click',()=>choose(item));frag.appendChild(button);
      });
      box.replaceChildren(frag);box.hidden=!items.length;input.setAttribute('aria-expanded',items.length?'true':'false');
      if(active>=0&&items[active])input.setAttribute('aria-activedescendant',`school-option-${requestId}-${active}`);else input.removeAttribute('aria-activedescendant');
    }
    async function search(){
      const q=input.value.trim();if(q.length<2){controller?.abort();close();return;}
      controller?.abort();controller=new AbortController();const id=++requestId;
      try{
        const response=await fetch(`/api/schools?q=${encodeURIComponent(q)}`,{signal:controller.signal});
        if(!response.ok)throw new Error('School search unavailable');const data=await response.json();
        if(id!==requestId||input.value.trim()!==q)return;
        items=Array.isArray(data.schools)?data.schools:[];active=-1;paint();
      }catch(error){if(error?.name!=='AbortError'&&id===requestId)close();}
    }
    input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(search,140);});
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