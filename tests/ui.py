from playwright.sync_api import sync_playwright
import json,os
APP='file://'+os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','index.html'))
N="תמר*\\nבני\\nגיל\\nרון*\\nמיכל\\nעומר\\nיוסי\\nנועה*\\nשחר\\nלירון\\nדני*\\nאבי\\nחן"
with sync_playwright() as p:
    b=p.chromium.launch();errs=[]
    for vp in ({'width':390,'height':844},{'width':1280,'height':800}):
        pg=b.new_page(viewport=vp);pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else 0);E=pg.evaluate
        pg.goto(APP);E("localStorage.clear();sessionStorage.setItem('splashSeen','1')");pg.reload()
        E(f"addNames('{N}');off.clear();chips();pre('m');0")
        for n in ('בני','גיל','יוסי','מיכל','חן'):
            pg.click(f'.mn[data-n="{n}"]')
            for k in ('k','l','d','t'):
                try: pg.click(f'.tg.f[data-k="{k}"][data-n="{n}"], .star[data-k="{k}"][data-n="{n}"]',timeout=1500)
                except Exception as e: pass
            pg.click(f'.mn[data-n="{n}"]')
        pg.click('#go');pg.wait_for_timeout(2500)
        for tab in ('n3','n1','n2'):
            pg.click('#'+tab);pg.wait_for_timeout(200)
        # panel actions
        E("document.querySelectorAll('#pg2 details').forEach(d=>d.open=true);0")
        for sel in ('#spa','#exa'):
            try: pg.click(sel,timeout=1500);pg.wait_for_timeout(600)
            except Exception as e: print(vp['width'],sel,'skip',str(e)[:60])
        print(vp['width'],'slots',E("document.querySelectorAll('.slot').length"),'sumcard visible',E("getComputedStyle($('sumc')).display"),'errs',errs)
