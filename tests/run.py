"""Usage: python3 tests/run.py [index.html] [K runs per scenario, default 8] [out.jsonl]
Hard-rule counters (dup absent lost cert2429 last meal sn arrBr dal staleSN frozenChanged) must be 0."""
from playwright.sync_api import sync_playwright
import json,sys,time,os
K=int(sys.argv[2]) if len(sys.argv)>2 else 8
path=os.path.abspath(sys.argv[1]) if len(sys.argv)>1 else os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','index.html'))
H=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'harness.js'),encoding='utf8').read()
man="nm=>({'24':nm[0],'25':nm[2],'סיור א':nm[4],'סיור ב':nm[5],'23 א':nm[6],'27':nm[7]})"
base=[('base',{}),('certLow3',{'certIdx':[0,3,7]}),('certHigh6',{'certIdx':[0,3,7,10,5,8]}),('lasts3',{'fin':3}),('dal90%',{'dal':'N'}),('dal+split',{'dal':'N','ev':'split'}),
 ('leave-return',{'ev':'leave'}),('leave-early',{'ev':'leaveEarly'}),('join-mid',{'ev':'join'}),('extra-post',{'ev':'extra'}),('manualX1',{'man':man}),('multi-events',{'ev':'multi','fin':2}),
 ('close23/27',{'r1':'10:50','r2':'10:10'}),('24-no-cert-from-11:30',{'r5':'11:30'})]
aft=[('base',{}),('lasts3',{'fin':3}),('day3+night3',{'lng':3,'join':3}),('day3+night3+lasts',{'lng':3,'join':2,'fin':2}),('dal90%',{'dal':'N'}),('leave-return',{'ev':'leave'}),('join-mid',{'ev':'join'}),('extra-post',{'ev':'extra'}),('manualX1',{'man':man})]
out=open(sys.argv[3] if len(sys.argv)>3 else 'results.jsonl','w')
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file://'+path);pg.evaluate("localStorage.clear();sessionStorage.setItem('splashSeen','1')");pg.reload();pg.evaluate(H+";0")
    for mode,lst in (('m',base),('a',aft)):
        for n in (11,12,13):
            for name,o in lst:
                agg={};t=time.time();bad=0
                for k in range(K):
                    oo={**o,'n':n,'mode':mode}
                    if oo.get('dal')=='N':oo['dal']=n-1-(n//6)
                    js="(()=>{const o=%s;%s;return JSON.stringify(__run(o))})()"%(json.dumps({k2:v for k2,v in oo.items() if k2!='man'}),("o.man=%s;"%man) if 'man' in o else "")
                    try:
                        V=json.loads(pg.evaluate(js))
                    except Exception as e:
                        agg['EXC']=agg.get('EXC',0)+1;errs.append(str(e)[:150]);continue
                    for kk,v in V.items():agg[kk]=agg.get(kk,0)+v
                out.write(json.dumps({'mode':mode,'n':n,'sc':name,'K':K,'agg':agg,'s':round(time.time()-t,1)},ensure_ascii=False)+'\n');out.flush()
    out.write(json.dumps({'errs':errs[:10]},ensure_ascii=False)+'\n');out.write('DONE\n');b.close()
