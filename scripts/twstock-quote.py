"""Optional loopback quote service for the local Vite site."""
import json
import math
import re
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlsplit

import requests
from twstock import realtime

HOST, PORT = '127.0.0.1', 4174
SOURCE = 'https://mis.twse.com.tw/stock/index.jsp'


class QuoteSession(requests.Session):
    def request(self, method, url, **kwargs):
        kwargs.setdefault('timeout', (2, 3))
        return super().request(method, url.replace('http://', 'https://', 1), **kwargs)


def quote(code):
    # Keep twstock's normalizer and market lookup, but bound its network calls.
    with QuoteSession() as session:
        realtime.get_session = lambda: session
        result = realtime.get(code, retry=0)
    if not result.get('success') or result.get('info', {}).get('code') != code:
        raise ValueError('No matching quote')
    snapshot_at = datetime.fromtimestamp(result['timestamp'], timezone.utc)
    raw_price = result['realtime'].get('latest_trade_price')
    price = None if raw_price in (None, '', '-') else float(raw_price)
    if price is not None and (not math.isfinite(price) or price <= 0):
        price = None
    return {'code': code, 'price': price, 'snapshotAt': snapshot_at.isoformat(), 'source': SOURCE}


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        request = urlsplit(self.path)
        code = parse_qs(request.query).get('code', [''])[0]
        if request.path != '/api/twstock/quote':
            self.send_json(404, {'error': '找不到行情服務。'})
        elif not re.fullmatch(r'[A-Z0-9]{4,6}', code):
            self.send_json(400, {'error': '證券代號格式錯誤。'})
        else:
            try:
                self.send_json(200, quote(code))
            except (ValueError, KeyError, TypeError, OSError, requests.RequestException):
                self.send_json(502, {'error': '證交所快照暫時無法取得。'})

    def send_json(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == '__main__':
    with HTTPServer((HOST, PORT), Handler) as server:
        print(f'twstock snapshot service: http://{HOST}:{PORT}', flush=True)
        server.serve_forever()
