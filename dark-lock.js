(function(){
  try{localStorage.setItem('hsc-maths-theme','dark');}catch{}
  document.documentElement.dataset.theme='dark';
  document.documentElement.style.colorScheme='dark';
  const enforce=()=>{if(document.documentElement.dataset.theme!=='dark')document.documentElement.dataset.theme='dark';};
  new MutationObserver(enforce).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
})();