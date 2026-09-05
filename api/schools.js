function decodeHtml(s='') {
  return s
    .replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"')
    .replace(/&nbsp;/g,' ').replace(/&#x27;/g,"'").replace(/&apos;/g,"'");
}
function strip(s='') { return decodeHtml(s.replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim(); }
function norm(s='') { return strip(s).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(); }
function score(name, q) {
  const n=norm(name), x=norm(q);
  if(!x) return 0;
  if(n===x) return 10000;
  if(n.startsWith(x)) return 8000-(n.length-x.length);
  const words=n.split(' ');
  if(words.some(w=>w.startsWith(x))) return 7000-(n.length-x.length);
  if(n.includes(x)) return 6000-(n.length-x.length);
  const parts=x.split(' ').filter(Boolean);
  const matched=parts.filter(p=>words.some(w=>w.startsWith(p)||w.includes(p))).length;
  return matched ? matched*1000-Math.abs(n.length-x.length) : -1;
}
async function getHtml(url) {
  const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 HSC-Maths-Hub/1.0'}});
  if(!r.ok) throw new Error(`Source returned ${r.status}`);
  return await r.text();
}
function parseSchools(html) {
  const out=new Map();
  const re=/<a[^>]+href=["'](?:https?:\/\/www\.hscninja\.com)?\/honour\/roll\/school\/([^\/?#"']+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while((m=re.exec(html))) {
    const slug=m[1], name=strip(m[2]);
    if(!name || /^view details$/i.test(name) || name.length<3) continue;
    if(!out.has(slug)) out.set(slug,{name,slug});
  }
  return [...out.values()];
}
module.exports=async(req,res)=>{
  const q=String(req.query.q||'').trim();
  const year=Math.max(2020,Math.min(2025,Number(req.query.year)||2025));
  if(q.length<2) return res.status(200).json({schools:[]});
  try{
    const html=await getHtml(`https://www.hscninja.com/honour/roll/school/list/year/${year}`);
    const schools=parseSchools(html)
      .map(s=>({...s,_score:score(s.name,q)})).filter(s=>s._score>=0)
      .sort((a,b)=>b._score-a._score || a.name.localeCompare(b.name))
      .slice(0,12).map(({_score,...s})=>s);
    res.setHeader('Cache-Control','s-maxage=21600, stale-while-revalidate=86400');
    return res.status(200).json({schools,source:'HSCninja'});
  }catch{
    return res.status(500).json({schools:[],error:'School search unavailable'});
  }
};