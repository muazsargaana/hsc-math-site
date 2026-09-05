const COURSE_LABELS = { ext1: 'Mathematics Extension 1', ext2: 'Mathematics Extension 2' };

function strip(s='') {
  return s.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
}
function norm(s='') { return strip(s).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(); }
function slugify(s='') { return s.toLowerCase().replace(/&/g,' and ').replace(/['’]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); }

async function getHtml(url) {
  const r = await fetch(url,{headers:{'user-agent':'Mozilla/5.0 HSC-Maths-Hub/1.0'}});
  if(!r.ok) throw new Error(`Source returned ${r.status}`);
  return await r.text();
}

function findSchoolSlug(listHtml, schoolName) {
  const wanted = norm(schoolName);
  const re = /<a[^>]+href=["']([^"']*\/honour\/roll\/school\/([^\/?#"']+)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m, best=null, bestScore=-1;
  while((m=re.exec(listHtml))) {
    const name=strip(m[3]); if(!name) continue;
    const n=norm(name);
    let score=0;
    if(n===wanted) score=1000;
    else if(n.includes(wanted)||wanted.includes(n)) score=500-Math.abs(n.length-wanted.length);
    else {
      const a=new Set(n.split(' ')), b=wanted.split(' ');
      score=b.filter(x=>a.has(x)).length*10-Math.abs(n.length-wanted.length)/10;
    }
    if(score>bestScore){ bestScore=score; best={slug:m[2],name}; }
  }
  return bestScore>=10 ? best : null;
}

function parseCourseRow(html, courseName) {
  const rows = html.match(/<tr[\s\S]*?<\/tr>/gi) || [];
  for(const row of rows) {
    const text=strip(row);
    if(!norm(text).includes(norm(courseName))) continue;
    const cells=(row.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi)||[]).map(strip);
    if(!cells.length) continue;
    const idx=cells.findIndex(c=>norm(c)===norm(courseName)||norm(c).includes(norm(courseName)));
    if(idx<0) continue;
    const after=cells.slice(idx+1);
    const b6 = Number((after[0]||'').replace(/[^0-9.]/g,''));
    const avgCandidates=after.map(x=>Number((x||'').replace(/[^0-9.]/g,''))).filter(x=>Number.isFinite(x)&&x>=40&&x<=100);
    const avg = avgCandidates.length ? avgCandidates[avgCandidates.length-1] : null;
    return { topBandCount:Number.isFinite(b6)?b6:null, average:Number.isFinite(avg)?avg:null };
  }
  const plain=strip(html);
  const pos=norm(plain).indexOf(norm(courseName));
  if(pos>=0) {
    const chunk=plain.slice(Math.max(0,pos-100),pos+260);
    const nums=(chunk.match(/\b\d+(?:\.\d+)?\b/g)||[]).map(Number);
    const avg=nums.filter(x=>x>=40&&x<=100).pop() ?? null;
    return {topBandCount:null,average:avg};
  }
  return null;
}

module.exports = async (req,res) => {
  try {
    const school=String(req.query.school||'').trim();
    const courseKey=String(req.query.course||'ext1');
    const year=Math.max(2019,Math.min(2025,Number(req.query.year)||2025));
    const course=COURSE_LABELS[courseKey];
    if(!school||!course) return res.status(400).json({error:'Missing school or course'});

    let slug=slugify(school), matchedName=school;
    try {
      const listHtml=await getHtml(`https://www.hscninja.com/honour/roll/school/list/year/${year}`);
      const found=findSchoolSlug(listHtml,school);
      if(found){ slug=found.slug; matchedName=found.name; }
    } catch {}

    const years=[year,year-1,year-2].filter(y=>y>=2019);
    const history=[];
    for(const y of years){
      try{
        const html=await getHtml(`https://www.hscninja.com/honour/roll/school/${slug}/year/${y}?tab=courses`);
        const row=parseCourseRow(html,course);
        if(row&&(row.average!=null||row.topBandCount!=null)) history.push({year:y,...row});
      }catch{}
    }
    if(!history.length) return res.status(404).json({error:'No usable HSCninja course data found for that school/course. Try the school name exactly as HSCninja shows it.'});
    const weights=[0.55,0.3,0.15];
    let wsum=0, asum=0;
    history.forEach((h,i)=>{ if(h.average!=null){const w=weights[i]||0.1;asum+=h.average*w;wsum+=w;} });
    const average=wsum?asum/wsum:null;
    res.setHeader('Cache-Control','s-maxage=21600, stale-while-revalidate=86400');
    return res.status(200).json({school:matchedName,slug,course,referenceYear:year,average,history,source:'HSCninja'});
  } catch(e) {
    return res.status(500).json({error:'School data lookup failed'});
  }
};