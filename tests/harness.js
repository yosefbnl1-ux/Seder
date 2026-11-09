window.__names=['תמר*','בני','גיל','רון*','מיכל','עומר','יוסי','נועה*','שחר','לירון','דני*','אבי','חן','ליאור*','גדי','הילה','ניר','שיר','עדן*','טל'];
window.__run=function(o){
 roster=[];cert.clear();fin.clear();LNG.clear();JOIN.clear();NITE.clear();DAL.clear();off.clear();MAN={};SPLIT=[];clearExtra();Object.assign(GATES,{'24':1,'25':1,'29':0});
 const nm=__names.slice(0,o.n).map(x=>x.replace('*',''));roster=nm.slice();
 const certIdx=o.certIdx||[0,3,7,10];certIdx.forEach(i=>{if(i<nm.length)cert.add(nm[i])});
 pre(o.mode,true);
 ['r1','r2','r3','r4','r5','r6'].forEach(k=>{if(o[k]!==undefined)$(k).value=o[k]});
 if(o.fin)for(let i=0;i<o.fin;i++)fin.add(nm[nm.length-1-i]);
 if(o.lng)for(let i=0;i<o.lng;i++)LNG.add(nm[i+4]);
 if(o.join)for(let i=0;i<o.join;i++)JOIN.add(nm[nm.length-1-i-(o.fin||0)]);
 if(o.nf){[...JOIN].slice(0,o.nf).forEach(x=>{fin.add(x);NITE.add(x)})}
 if(o.dal)nm.slice(0,o.dal).forEach(x=>DAL.add(x));
 if(o.man){Object.assign(MAN,o.man(nm))}
 build();
 const cw=()=>{const W=last.W;return{win:{...W.win},noLast:new Set(W.noLast),gate:W.gate,gap:{...(W.gap||{})},first:W.first}};
 const S=last.S;let frozen=null;const snap=JSON.stringify(last.best.rows);
 if(o.ev==='leave'){const x=nm[1],w2=cw();w2.gap[x]=[[3,5]];frozen=3;build(last.best.rows.slice(0,3),last.g,w2)}
 if(o.ev==='leaveEarly'){const x=nm[2],w2=cw();w2.win[x]=[0,5];frozen=3;build(last.best.rows.slice(0,3),last.g,w2)}
 if(o.ev==='join'){addNames('חדש');const w2=cw();w2.win['חדש']=[5,S];frozen=5;build(last.best.rows.slice(0,5),[...last.g,'חדש'],w2)}
 if(o.ev==='extra'){const x={id:'exT',lab:'תגבור',t:'sd',cert:false,dal:false,from:4,to:9};EXTRA.push(x);regExtra(x);frozen=4;build(last.best.rows.slice(0,4),last.g,cw())}
 if(o.ev==='split'){SPLIT.push({from:4,to:9});frozen=4;build(last.best.rows.slice(0,4),last.g,cw())}
 if(o.ev==='multi'){const w2=cw();w2.gap[nm[1]]=[[2,4]];w2.win[nm[2]]=[0,6];frozen=2;build(last.best.rows.slice(0,2),last.g,w2);addNames('חדש');const w3=cw();w3.win['חדש']=[5,S];build(last.best.rows.slice(0,5),[...last.g,'חדש'],w3)}
 const V=__check(frozen,o);V.frozenChanged=frozen&&JSON.stringify(last.best.rows.slice(0,frozen))!==JSON.stringify(JSON.parse(snap).slice(0,frozen))?1:0;return V};
window.__check=function(frozen,o){
 const{g,S,isL,rm,best,W,a,L}=last,rows=best.rows,win=W.win,gap=W.gap||{};
 const pr=(x,s)=>s>=win[x][0]&&s<win[x][1]&&!(gap[x]||[]).some(([p,q])=>s>=p&&s<q);
 const V={dup:0,absent:0,lost:0,empty:0,cert2429:0,cert25:0,last:0,meal:0,dbl:0,sitAfter:0,tri:0,sn:0,arrBr:0,dal:0,far:0,nonDalPatrolSlots:0,staleSN:0};
 const F=(x,s)=>{const r=rows[s];for(const id in r.asg)if(r.asg[id]===x)return id;return r.br.includes(x)?'BR':null};
 rows.forEach((r,s)=>{const vals=Object.values(r.asg).concat(r.br);V.dup+=vals.length-new Set(vals).size;
  vals.forEach(x=>{if(win[x]&&!pr(x,s))V.absent++});
  g.forEach(x=>{if(pr(x,s)&&!vals.includes(x))V.lost++});
  DISP.forEach(d=>{if(!rm[s].includes(d)&&!r.asg[d])V.empty++});
  DISP.forEach(d=>{if(rm[s].includes(d)||rm[s].includes(d+'c')||!W.gate[d])return;const x=r.asg[d];if(x&&!cert.has(x)){if(d==='25')V.cert25++;else V.cert2429++}});
  if(s>0){r.br.forEach(x=>{if(rows[s-1].br.includes(x)&&pr(x,s-1))V.dbl++});
   for(const id in r.asg){const x=r.asg[id];if(PM[id].t==='si'&&rows[s-1].br.includes(x))V.sitAfter++}
   g.forEach(x=>{if(pr(x,s)&&r.br.includes(x)&&(win[x][0]===s||(gap[x]||[]).some(([,q])=>q===s)))V.arrBr++});
   const o2=rows[s-1].asg;for(const id in r.asg){const x=r.asg[id];for(const i2 in o2)if(o2[i2]===x&&farMv(PM[i2].k,PM[id].k))V.far++}}
  if(r.asg['סנח']&&s+1<S){const x=r.asg['סנח'];if(pr(x,s+1)&&!rows[s+1].br.includes(x))V.sn++}
 });
 const run={};rows.forEach((r,s)=>{const sd=new Set(Object.entries(r.asg).filter(([i])=>PM[i].t==='sd').map(([,x])=>x));g.forEach(x=>{run[x]=sd.has(x)?(run[x]||0)+1:0;if(run[x]===3)V.tri++})});
 g.forEach(x=>{if(fin.has(x)&&!NITE.has(x)&&!W.noLast.has(x)){const e=win[x][1]-1;if(e>=0&&e<S&&!rows[e].br.includes(x))V.last++}});
 if(isL.some(Boolean))g.forEach(x=>{const ls=[...Array(S).keys()].filter(s=>isL[s]&&pr(x,s));if(ls.length>=2&&!ls.some(s=>rows[s].br.includes(x)))V.meal++});
 for(let s=0;s<S;s++){const pa=['סיור א','סיור ב'].filter(d=>!rm[s].includes(d)&&rows[s].asg[d]);if(pa.length&&DAL.size){const sp=(W.dal&&W.dal[s]||[]).includes('סיור ב'),h=d=>DAL.has(rows[s].asg[d]);if(sp?!pa.every(h):!pa.some(h))V.dal++}}
 // fairness among full-time guards
 const ft=g.filter(x=>win[x][0]===0&&win[x][1]===S&&!(gap[x]||[]).length);const cnt=k=>ft.map(x=>{let c=0;rows.forEach(r=>{if(k==='br'?r.br.includes(x):Object.entries(r.asg).some(([id,y])=>y===x&&PM[id].t===k))c++});return c});
 const rg=v=>v.length?Math.max(...v)-Math.min(...v):0;
 V.rBr=rg(cnt('br'));V.rSi=rg(cnt('si'));V.rSd=rg(cnt('sd'));
 if(frozen){const orig=window.__prev;}
 return V};
