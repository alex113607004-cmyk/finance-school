"""Build a key-free, prebuilt local Windows package using the Python stdlib."""
import argparse, json, pathlib, zipfile
root = pathlib.Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--output', default='dist/pages/downloads/finance-school-windows-local.zip')
args = parser.parse_args()
output = root / args.output
web = root / 'dist/pages'
if not (web / 'index.html').is_file():
    raise SystemExit('Run npm run build:pages first')
output.parent.mkdir(parents=True, exist_ok=True)
readme = '''台美股本機版（Windows，免登入）

1. 先安裝 Node.js LTS（至少 22.12，建議 24）：https://nodejs.org/
2. 將整個 ZIP 解壓縮到自己的資料夾，雙擊「啟動本機版.cmd」。
   不要直接在 ZIP 視窗內執行。
3. 網站自動開啟。第一次在「本機分時行情」貼上 Fugle API Key 並儲存。
   不需要另設密碼、不需要登入、不需要 Cloudflare。
4. 點股票星號加入本機自選股，查看分時走勢與開盤虛線。
   本機收藏與原 GitHub Pages 收藏分開保存在瀏覽器。

保留啟動視窗；關閉即停止服務。若瀏覽器未自動開啟：
http://127.0.0.1:4178/#watchlist/all

Key 只存在這個資料夾下的 .local/fugle-local.json，不會上傳到 GitHub 或 Cloudflare。
請不要分享 .local 資料夾。需要改 Key 或移除時，用網站內的按鈕操作。
盤後資料會嘗試讀取已發布最新快照；失敗保留原始日期。分時依你的 Fugle 方案查詢。
沒有當日成交資料、方案不足或配額用盡時會顯示原因，不填模擬價格。

這個套件已包含網站，不需要安裝 Git 或 npm 套件。
'''
with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as z:
    for file in sorted(web.rglob('*')):
        if file.is_file() and 'downloads' not in file.relative_to(web).parts:
            z.write(file, 'dist/pages/' + file.relative_to(web).as_posix())
    for relative in ['scripts/start-local.mjs', 'scripts/local-server.mjs', 'worker/intraday.mjs', '啟動本機版.cmd', '啟動本機版.command', '.gitignore']:
        z.write(root / relative, relative)
    z.writestr('package.json', json.dumps({'name':'finance-school-local','private':True,'type':'module','engines':{'node':'>=22.12.0'},'scripts':{'start:local':'node scripts/start-local.mjs'}}, ensure_ascii=False, indent=2))
    z.writestr('開始使用.txt', readme)
with zipfile.ZipFile(output) as z:
    assert not any('.local' in pathlib.PurePosixPath(n).parts for n in z.namelist())
    assert '啟動本機版.cmd' in z.namelist()
    assert 'dist/pages/index.html' in z.namelist()
    print(json.dumps({'file':str(output.relative_to(root)),'files':len(z.namelist()),'bytes':output.stat().st_size,'secretsIncluded':False},ensure_ascii=False))
