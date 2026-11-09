from playwright.sync_api import sync_playwright
import json,os
APP='file://'+os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','index.html'))
N="תמר*\\nבני\\nגיל\\nרון*\\nמיכל\\nעומר\\nיוסי\\nנועה*\\nשחר\\nלירון\\nדני*\\nאבי\\nחן"
res=[]
def ok(n,c,extra=''):
    res.append((n,bool(c)));print(('PASS' if c else 'FAIL'),n,extra)
with sync_playwright() as p:
    b=p.chromium.launch();pg=b.new_page(viewport={'width':390,'height':844});errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else 0);E=pg.evaluate
    pg.goto(APP);E("localStorage.clear();sessionStorage.setItem('splashSeen','1')");pg.reload()
    ok('load without errors',not errs,errs)
    for mode in ('m','a'):
        E(f"roster.length=0;addNames('{N}');off.clear();chips();pre('{mode}');show('setup');0")
        pg.click('#go');pg.wait_for_timeout(2500)
        r=json.loads(E("JSON.stringify(last.best.rows)"));g=json.loads(E("JSON.stringify(last.g)"))
        ok(f'{mode}: build ok, no missing posts',E("last.best.miss")==0,f"S={len(r)}")
        ok(f'{mode}: every guard once per slot',all(sorted(list(x['asg'].values())+x['br'])==sorted(g) for x in r))
        ok(f'{mode}: result renders',E("document.querySelectorAll('.slot').length")==len(r))
        # reload persistence
        pg.reload();pg.wait_for_timeout(1500)
        ok(f'{mode}: schedule restored after reload',E("!!last && last.best.rows.length")==len(r) if True else 0)
        E("show('setup');0")
    # summon flows
    E(f"roster.length=0;addNames('{N}');off.clear();chips();pre('m');show('setup');0");pg.click('#go');pg.wait_for_timeout(2000)
    ok('summon morning',E("(()=>{const b=last.g[1];return summon(b)})()"))
    E(f"pre('a');show('setup');0");pg.click('#go');pg.wait_for_timeout(2000)
    E("KON.add('חן');0");ok('summon afternoon kon',E("summon('חן')"))
    # patrol removal
    E(f"roster.length=0;addNames('{N}');off.clear();LNG.clear();JOIN.clear();KON.clear();chips();pre('a');$('r7').value='17:30';show('setup');0");pg.click('#go');pg.wait_for_timeout(2000)
    r=json.loads(E("JSON.stringify(last.best.rows)"))
    ok('remove patrol from 17:30',all('סיור ב' not in r[k]['asg'] for k in range(4,len(r))) and all('סיור ב' in r[k]['asg'] for k in range(4)))
    # extra post, split, leave
    E("pre('m');$('r7').value='';show('setup');0");pg.click('#go');pg.wait_for_timeout(2000)
    ok('no console errors in flows',not errs,errs)
    print(sum(1 for _,c in res if not c),'failures of',len(res))
