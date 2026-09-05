(function(){
  function texify(input){
    let s=String(input??'').trim();
    if(!s)return '';
    s=s
      .replace(/\bx-double-dot\b/g,'\\ddot{x}')
      .replace(/\bx-dot\b/g,'\\dot{x}')
      .replace(/integral\s+([^,;.]+?)\s+d([a-zA-Z])/gi,'\\int $1\\,d$2')
      .replace(/sqrt\(([^()]*)\)/g,'\\sqrt{$1}')
      .replace(/conjugate\(([^()]*)\)/gi,'\\overline{$1}')
      .replace(/\bVar\(/g,'\\operatorname{Var}(')
      .replace(/\bE\(/g,'\\operatorname{E}(')
      .replace(/\bArg\(/g,'\\operatorname{Arg}(')
      .replace(/\barg\(/g,'\\arg(')
      .replace(/\bRe\(/g,'\\operatorname{Re}(')
      .replace(/\bIm\(/g,'\\operatorname{Im}(')
      .replace(/\bBin\(/g,'\\operatorname{Bin}(')
      .replace(/\bnCr\b/g,'\\binom{n}{r}')
      .replace(/\bnPr\b/g,'{}^{n}P_{r}')
      .replace(/d\^2([A-Za-z])\/d([A-Za-z])\^2/g,'\\frac{d^2$1}{d$2^2}')
      .replace(/d2([A-Za-z])\/d([A-Za-z])2/g,'\\frac{d^2$1}{d$2^2}')
      .replace(/d([A-Za-z])\/d([A-Za-z])/g,'\\frac{d$1}{d$2}')
      .replace(/([A-Za-z])\s*dot\s*([A-Za-z])/g,'$1\\cdot $2')
      .replace(/\+\/-/g,'\\pm ')
      .replace(/<=/g,'\\le ')
      .replace(/>=/g,'\\ge ')
      .replace(/!=/g,'\\ne ')
      .replace(/~/g,'\\sim ')
      .replace(/\bpi\b/g,'\\pi')
      .replace(/\btheta\b/g,'\\theta')
      .replace(/\balpha\b/g,'\\alpha')
      .replace(/\bbeta\b/g,'\\beta')
      .replace(/\bgamma\b/g,'\\gamma')
      .replace(/\bdelta\b/g,'\\delta')
      .replace(/\blambda\b/g,'\\lambda')
      .replace(/\bmu\b/g,'\\mu')
      .replace(/\bsigma\b/g,'\\sigma')
      .replace(/\bomega\b/g,'\\omega')
      .replace(/\bsin\b/g,'\\sin')
      .replace(/\bcos\b/g,'\\cos')
      .replace(/\btan\b/g,'\\tan')
      .replace(/\barcsin\b/g,'\\arcsin')
      .replace(/\barccos\b/g,'\\arccos')
      .replace(/\barctan\b/g,'\\arctan')
      .replace(/\be\^\(([^()]*)\)/g,'e^{$1}')
      .replace(/([A-Za-z0-9)])\^\(([^()]*)\)/g,'$1^{$2}')
      .replace(/([A-Za-z0-9)])\^(-?\d+|n|r)/g,'$1^{$2}')
      .replace(/_\(([^()]*)\)/g,'_{$1}')
      .replace(/_([A-Za-z0-9]+)/g,'_{$1}');
    s=s.replace(/\|([^|]+)\|/g,'\\left|$1\\right|');
    return s;
  }

  const patterns=[
    /\bx-double-dot\s*=\s*[^,;.]+?(?=\s+(?:where|when|for|to|and|or|given)\b|[,;.]|$)/gi,
    /\bx-dot\s*=\s*[^,;.]+?(?=\s+(?:where|when|for|to|and|or|given)\b|[,;.]|$)/gi,
    /\bx-(?:double-)?dot\b/gi,
    /\b(?:d\^2[A-Za-z]\/d[A-Za-z]\^2|d2[A-Za-z]\/d[A-Za-z]2|d[A-Za-z]\/d[A-Za-z])\s*=\s*[^,;.]+?(?=\s+(?:where|when|for|to|and|or|given)\b|[,;.]|$)/g,
    /\b(?:E|Var|P)\([^)]+\)\s*=\s*[^,;.]+?(?=\s+(?:where|when|for|to|and)\b|[,;.]|$)/gi,
    /\bX\s*~\s*Bin\([^)]+\)/g,
    /\b(?:d\^2[A-Za-z]\/d[A-Za-z]\^2|d2[A-Za-z]\/d[A-Za-z]2|d[A-Za-z]\/d[A-Za-z])\b/g,
    /\b[A-Za-z](?:\([^)]*\))?(?:\^\(?[-A-Za-z0-9+]+\)?)?\s*(?:=|<=|>=|!=|<|>|~)\s*[^,;.]+?(?=\s+(?:where|when|for|to|and|or)\b|[,;.]|$)/g,
    /\b[A-Za-z]\s+dot\s+[A-Za-z]\s*=\s*[^,;.]+?(?=\s+(?:where|when|for|to|and|or)\b|[,;.]|$)/gi,
    /\b(?:arcsin|arccos|arctan|sin|cos|tan)(?:\^-?\d+)?\s*(?:\([^)]*\)|[A-Za-z0-9]+)(?:\s*(?:=|<=|>=|<|>)\s*[^,;.]+?)?(?=\s+(?:where|when|for|to|and|or)\b|[,;.]|$)/gi,
    /sqrt\([^)]*\)/gi,
    /\|[^|]+\|(?:\^2)?/g,
    /\b(?:nCr|nPr)\b/g,
    /\b(?:E|Var|P|Arg|arg|Re|Im)\([^)]+\)/g,
    /\be\^\([^)]*\)/g,
    /\b[A-Za-z0-9]+\^\(?[-A-Za-z0-9+]+\)?/g,
    /(?:\(|\[)-?pi(?:\/\d+)?\s*,\s*-?pi(?:\/\d+)?(?:\]|\))/gi,
    /\b(?:pi|theta|alpha|beta|gamma|delta|lambda|mu|sigma|omega)(?:\/\d+)?\b/gi
  ];

  function rangesFor(text){
    const ranges=[];
    for(const pattern of patterns){pattern.lastIndex=0;let m;while((m=pattern.exec(text))){const start=m.index,end=start+m[0].length;if(end>start)ranges.push({start,end});if(pattern.lastIndex===m.index)pattern.lastIndex++;}}
    ranges.sort((a,b)=>a.start-b.start||(b.end-b.start)-(a.end-a.start));
    const merged=[];
    for(const r of ranges){if(!merged.length||r.start>=merged[merged.length-1].end)merged.push({...r});else if(r.end>merged[merged.length-1].end)merged[merged.length-1].end=r.end;}
    return merged;
  }

  function renderTex(el,tex,displayMode=false){if(!el)return;if(window.katex?.render){try{window.katex.render(tex,el,{throwOnError:false,strict:false,displayMode,trust:false});return;}catch{}}el.textContent=tex;}
  function renderExpression(el,tex,displayMode=false){renderTex(el,tex,displayMode);}
  function renderRichText(el,text){
    if(!el)return;const value=String(text??''),ranges=rangesFor(value);el.replaceChildren();
    if(!ranges.length){el.textContent=value;el.dataset.mathRendered='1';return;}
    let pos=0;
    for(const r of ranges){if(r.start>pos)el.append(document.createTextNode(value.slice(pos,r.start)));const span=document.createElement('span');span.className='inline-math';renderTex(span,texify(value.slice(r.start,r.end)),false);el.append(span);pos=r.end;}
    if(pos<value.length)el.append(document.createTextNode(value.slice(pos)));el.dataset.mathRendered='1';
  }
  function renderDataTex(root=document){root.querySelectorAll?.('[data-tex]:not([data-math-rendered])').forEach(el=>{renderTex(el,el.dataset.tex||'',el.dataset.display==='true');el.dataset.mathRendered='1';});}
  function enhance(root=document){renderDataTex(root);root.querySelectorAll?.('.skill-name:not([data-math-rendered]),.nesa-detail p:not([data-math-rendered])').forEach(el=>renderRichText(el,el.textContent));root.querySelectorAll?.('.nesa-detail summary').forEach(el=>{if(el.textContent==='View NESA wording')el.textContent='View syllabus wording';});}
  function start(){enhance(document);const observer=new MutationObserver(records=>{for(const record of records){for(const node of record.addedNodes){if(node.nodeType!==1)continue;if(node.matches?.('.skill-name:not([data-math-rendered]),.nesa-detail p:not([data-math-rendered])'))renderRichText(node,node.textContent);enhance(node);}}});observer.observe(document.body,{childList:true,subtree:true});}
  window.HSCMath={texify,renderExpression,renderRichText,renderDataTex,enhance};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();