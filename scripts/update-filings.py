"""Strict first-release TSMC EPS importer. Requires Python 3 + pdftotext (poppler-utils).
Never backfills an old observation using a later restated report. Unknown layouts fail closed.
"""
import calendar, datetime as dt, hashlib, json, pathlib, re, subprocess, tempfile, urllib.request, urllib.error

path = pathlib.Path('data/2330-filings.json')
data = json.loads(path.read_text())
today = dt.datetime.now(dt.timezone(dt.timedelta(hours=8))).date()
data['warnings'] = []
data['verificationSources'] = []
def get(url):
    # Company-maintained public IR CDN is also linked by TSMC search/canonical pages.
    # A GitHub runner may be denied by one hostname; never substitute a third-party mirror.
    candidates=[url]
    if url.startswith('https://investor.tsmc.com/'):
        candidates.append(url.replace('https://investor.tsmc.com/','https://investor.cld.tsmc.com/',1))
    error=None
    for candidate in candidates:
        try:
            request=urllib.request.Request(candidate,headers={'User-Agent':'finance-school/2.0 (+https://github.com/alex113607004-cmyk/finance-school; educational source verification)','Accept':'text/html,application/pdf'})
            with urllib.request.urlopen(request, timeout=35) as response:
                body=response.read()
                data['verificationSources'].append({'url':response.geturl(),'checkedAt':dt.datetime.now(dt.timezone.utc).isoformat()})
                return body
        except (urllib.error.URLError,TimeoutError) as e:
            print(json.dumps({'sourceCheckFailed':candidate,'status':getattr(e,'code','network')}))
            error=e
    raise error
def text_pdf(url):
    raw = get(url)
    with tempfile.TemporaryDirectory() as tmp:
        pdf, txt = pathlib.Path(tmp)/'source.pdf', pathlib.Path(tmp)/'source.txt'
        pdf.write_bytes(raw)
        subprocess.run(['pdftotext','-layout',str(pdf),str(txt)], check=True, capture_output=True)
        return txt.read_text(), hashlib.sha256(raw).hexdigest()
try:
    subprocess.run(['pdftotext','-v'],check=True,capture_output=True)
    # Recheck newest known quarter and every completed later quarter (including unannounced).
    last = max(data['reports'],key=lambda r:(r['year'],r['quarter']))
    for n in range(last['year']*4+last['quarter']-1, today.year*4+(today.month-1)//3):
        year, q0 = divmod(n,4); q=q0+1
        page=f'https://investor.tsmc.com/chinese/quarterly-results/{year}/q{q}'
        try: html=get(page).decode()
        except urllib.error.HTTPError as e:
            if e.code==404: continue
            raise
        match=re.search(r'href="([^"]*EarningsRelease[^"<]*\.pdf)"',html)
        if not match: raise ValueError(f'{year}Q{q} 未確認首次公告連結')
        source='https://investor.tsmc.com'+match[1] if match[1].startswith('/') else match[1]
        text, digest=text_pdf(source)
        head=re.search(r'EPS of NT\$([\d.]+)',text)
        eps=re.search(r'diluted earnings per share of NT\$([\d.]+)',text)
        date=re.search(r'R.O.C., (\w+ \d+, \d{4})',text)
        end=f'{year}-{q*3:02}-{calendar.monthrange(year,q*3)[1]}'
        end_words=dt.date.fromisoformat(end).strftime('%B %d, %Y').replace(' 0',' ')
        if not all([head,eps,date]) or head[1]!=eps[1] or end_words not in text[:550]:
            raise ValueError(f'{year}Q{q} EPS 或會計期間格式不符，未匯入')
        announcement=dt.datetime.strptime(date[1],'%B %d, %Y').date()
        if announcement>today: continue
        existing=next((r for r in data['reports'] if r['year']==year and r['quarter']==q),None)
        if existing:
            if existing['sha256']!=digest:
                data['reviewRequired']=True
                raise ValueError('已保存的首次公告版本發生變更，保留原版數字並停止估值，須人工核對')
        else:
            data['reports'].append({'year':year,'quarter':q,'periodStart':f'{year}-{q0*3+1:02}-01','periodEnd':end,'announcedOn':str(announcement),'availableFrom':str(announcement+dt.timedelta(days=1)),'eps':float(eps[1]),'epsBasis':'單季稀釋 EPS／合併／新台幣元／普通股','version':'該季首次財報新聞稿（非後續年報重編值）','source':source,'sourcePage':page,'sha256':digest,'verified':True})
        # Only accept the known consolidated, YTD NTD-million cash-flow table layout.
        if (year,q)>=(data['cashflow']['year'],data['cashflow']['quarter']):
            fs=re.search(r'href="([^"]*/reports/[^"]*/FS(?:_audited)?\.pdf)"',html)
            if not fs: raise ValueError('現金流報表連結格式改變')
            fsource='https://investor.tsmc.com'+fs[1] if fs[1].startswith('/') else fs[1]
            # Year-end IR pages often replace January's unaudited FS with February's audit.
            # Do not assign the earlier release date to the replacement PDF.
            if '/reports/'+announcement.strftime('%Y-%m')+'/' not in fsource:
                data['warnings'].append(f'{year}Q{q} 現金流連結為後續版本，公告日未核實；保留前期現金流')
                continue
            ft,fh=text_pdf(fsource);section=ft[ft.find('Consolidated Condensed Cash Flow Statements'):]
            label={1:'Three Months',2:'Six Months',3:'Nine Months',4:'Year'}[q]
            amounts=re.search(r'Net Cash Generated by Operating Activities\s+([\d,()\-]+)\s+([\d,()\-]+)',section)
            if not amounts or not re.search(label+r'\s+'+str(year),section[:1200]) or 'Millions of New Taiwan Dollars' not in section[:500]:
                data['warnings'].append(f'{year}Q{q} 現金流新格式尚未核實；保留前期並標明期間')
            else:
                amount=int(amounts[2].replace(',','').replace('(','-').replace(')',''))
                data['cashflow']={'year':year,'quarter':q,'periodStart':f'{year}-01-01','periodEnd':end,'amount':amount,'unit':'新台幣百萬元','basis':'合併營業活動淨現金流；年初至季末累計，不與其他累計季度相加','announcedOn':str(announcement),'source':fsource+'#page=4','sourcePage':page,'page':4,'sha256':fh,'unaudited':True}
    data['checkedAt']=dt.datetime.now(dt.timezone.utc).isoformat()
except Exception as e:
    # Keep last successful checkedAt; after 8 days valuation is explicitly unavailable.
    data['warnings'].append('公司公告更新失敗：'+str(e))
data['reports'].sort(key=lambda r:(r['year'],r['quarter']))
path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'filings':len(data['reports']),'checkedAt':data['checkedAt'],'warnings':data['warnings']},ensure_ascii=False))
