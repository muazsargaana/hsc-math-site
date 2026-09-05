const COURSE_LABELS={ext1:'Mathematics Extension 1',ext2:'Mathematics Extension 2'};

function decode(s=''){return s.replace(/&amp;/g,'&').replace(/&#39;|&#x27;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/&nbsp;/g,' ');}
function strip(s=''){return decode(s.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();}
function norm(s=''){return strip(s).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
function slugify(s=''){return s.toLowerCase().replace(/&/g,' and ').replace(/['’]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}
function numberFromCell(value){const cleaned=String(value||'').replace(/,/g,'').match(/-?\d+(?:\.\d+)?/);return cleaned?Number(cleaned[0]):null;}

async function getHtml(url){const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 HSC-Maths-Hub/1.0'},signal:AbortSignal.timeout(8000)});if(!r.ok)throw new Error(`Source returned ${r.status}`);return r.text();}

function findSchoolSlug(listHtml,schoolName){
  const wanted=norm(schoolName),re=/<a[^>]+href=["']([^"']*\/honour\/roll\/school\/([^\/?#"']+)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m,best=null,bestScore=-Infinity;
  while((m=re.exec(listHtml))){
    const name=strip(m[3]);if(!name)continue;const n=norm(name);let score=-Infinity;
    if(n===wanted)score=10000;
    else if(n.startsWith(wanted))score=8000-Math.abs(n.length-wanted.length);
    else if(n.includes(wanted)||wanted.includes(n))score=6000-Math.abs(n.length-wanted.length);
    else{const words=new Set(n.split(' ')),parts=wanted.split(' ').filter(Boolean),matched=parts.filter(x=>words.has(x)).length;if(matched)score=matched*1000-Math.abs(n.length-wanted.length);}
    if(score>bestScore){bestScore=score;best={slug:m[2],name};}
  }
  return bestScore>=1000?best:null;
}

function parseCourseRow(html,courseName){
  const rows=html.match(/<tr[\s\S]*?<\/tr>/gi)||[];
  for(const row of rows){
    const cells=(row.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi)||[]).map(strip);
    const idx=cells.findIndex(c=>norm(c)===norm(courseName));
    if(idx<0)continue;
    const after=cells.slice(idx+1);
    const topBand=numberFromCell(after[0]);
    // HSCninja's course table is Course | Band 6/E4 | State Ranks | Avg. HSC Mark.
    // Read the average from the final column rather than filtering out legitimate low averages.
    const avgCandidate=numberFromCell(after[after.length-1]);
    const average=Number.isFinite(avgCandidate)&&avgCandidate>=0&&avgCandidate<=100?avgCandidate:null;
    const topBandCount=Number.isFinite(topBand)&&topBand>=0?topBand:null;
    return{topBandCount,average};
  }
  return null;
}

module.exports=async(req,res)=>{
  try{
    const school=String(req.query.school||'').trim(),courseKey=String(req.query.course||'ext1');
    const year=Math.max(2019,Math.min(2025,Number(req.query.year)||2025)),course=COURSE_LABELS[courseKey];
    if(!school||!course)return res.status(400).json({error:'Missing school or course'});

    let slug=slugify(school),matchedName=school;
    try{const listHtml=await getHtml(`https://www.hscninja.com/honour/roll/school/list/year/${year}`);const found=findSchoolSlug(listHtml,school);if(found){slug=found.slug;matchedName=found.name;}}catch{}

    const years=[year,year-1,year-2].filter(y=>y>=2019),history=[];
    for(const y of years){
      try{const html=await getHtml(`https://www.hscninja.com/honour/roll/school/${slug}/year/${y}?tab=courses`);const row=parseCourseRow(html,course);if(row&&(row.average!=null||row.topBandCount!=null))history.push({year:y,...row});}catch{}
    }
    if(!history.length)return res.status(404).json({error:'No usable HSCninja course data was found for that school and course.'});

    const yearWeights=[0.55,0.30,0.15];let weighted=0,totalWeight=0;
    history.forEach((h,i)=>{if(Number.isFinite(h.average)){const w=yearWeights[i]||0.1;weighted+=h.average*w;totalWeight+=w;}});
    const average=totalWeight?weighted/totalWeight:null;
    res.setHeader('Cache-Control','s-maxage=21600, stale-while-revalidate=86400');
    return res.status(200).json({school:matchedName,slug,course,referenceYear:year,average,history,source:'HSCninja'});
  }catch{return res.status(500).json({error:'School data lookup failed'});}
};