#!/usr/bin/env python3
"""每日复盘数据更新：收盘后运行，重新生成 src/data/marketReview.ts

数据管线：
  1. 东方财富涨停池接口 -> 当日全部涨停 + 连板信息
  2. 同花顺 iFinD 日线（ifind_get_price）-> 连板股收盘价序列 -> 本地计算 MACD(12,26,9)
     （iFinD 失败时自动回退东方财富日 K 接口）
  3. 东方财富全市场快照 + 日 K 逐只核验 -> 连涨>=3 / 连跌>=3 名单
     （覆盖当日涨幅前 600 与跌幅前 400，与页面免责声明一致）

用法：
  python3 scripts/update_review.py [--date YYYYMMDD] [--out PATH]
"""
import argparse
import datetime
import json
import os
import subprocess
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_OUT = os.path.join(ROOT, 'src', 'data', 'marketReview.ts')
TMP = '/tmp/review_data'
IFIND_DIR = '/app/.agents/plugins/ifind'
os.makedirs(TMP, exist_ok=True)


def log(*a):
    print('[review]', *a, flush=True)


def curl_json(url, tries=8):
    for i in range(tries):
        try:
            r = subprocess.run(
                ['curl', '-s', '--max-time', '15', '--retry', '2', url],
                capture_output=True, timeout=70)
            if r.returncode == 0 and r.stdout:
                return json.loads(r.stdout.decode('utf-8', 'ignore'))
        except Exception as e:
            log('curl error:', e)
        time.sleep(0.5 * (i + 1))
    return None


# ---------------- 1. 涨停池 ----------------
def fetch_zt_pool(force_date=None):
    """返回 (date_str 'YYYY-MM-DD', total, pool)。force_date 形如 YYYYMMDD。"""
    candidates = []
    if force_date:
        candidates.append(datetime.datetime.strptime(force_date, '%Y%m%d').date())
    else:
        today = datetime.date.today()
        for d in range(8):
            day = today - datetime.timedelta(days=d)
            if day.weekday() < 5:
                candidates.append(day)
    for day in candidates:
        ds = day.strftime('%Y%m%d')
        url = ('https://push2ex.eastmoney.com/getTopicZTPool'
               '?ut=7eea3edcaed734bea9cbfc24409ed989'
               f'&dpt=wz.ztzt&Pageindex=0&pagesize=500&sort=fbt%3Aasc&date={ds}')
        j = curl_json(url)
        if j and j.get('data') and j['data'].get('pool'):
            total = j['data'].get('tc') or len(j['data']['pool'])
            log(f'涨停池: {ds} 共 {total} 只')
            return day.strftime('%Y-%m-%d'), total, j['data']['pool']
        log(f'涨停池 {ds} 无数据，尝试前一天')
    return None, 0, []


def pool_to_zt(p):
    mkt = 'sh' if p.get('m') == 1 else 'sz'
    return {
        'code': mkt + str(p.get('c', '')),
        'name': p.get('n', ''),
        'price': round((p.get('p') or 0) / 1000, 2),
        'pct': round(p.get('zdp') or 0, 2),
        'lbc': p.get('lbc') or 1,
        'hy': (p.get('hybk') or '')[:4],
        'hs': round(p.get('hs') or 0, 2),
        'amount': round((p.get('amount') or 0) / 1e8, 1),
        'fund': round((p.get('fund') or 0) / 1e4),
        'zbc': p.get('zbc') or 0,
    }


# ---------------- 2. iFinD 日线 + MACD ----------------
def to_ifind_ticker(code):
    return code[2:] + ('.SH' if code.startswith('sh') else '.SZ')


def ifind_closes(tickers, start, end):
    """tickers: ['000978.SZ', ...] -> {ticker: [close, ...]}（按日期升序）"""
    import pandas as pd
    out = {}
    for i in range(0, len(tickers), 3):
        batch = tickers[i:i + 3]
        fp = f'{TMP}/px_{i}.csv'
        if os.path.exists(fp):
            os.remove(fp)
        params = {'ticker': ','.join(batch), 'start_date': start, 'end_date': end,
                  'file_path': fp, 'interval': 'D', 'format': 'json'}
        try:
            subprocess.run(['python3', 'scripts/ifind_tool.py', 'call',
                            '--api-name', 'ifind_get_price',
                            '--params-json', json.dumps(params)],
                           cwd=IFIND_DIR, capture_output=True, timeout=180)
        except Exception as e:
            log('iFinD 调用失败', batch, e)
        if os.path.exists(fp):
            try:
                df = pd.read_csv(fp)
                for t, g in df.groupby('thscode'):
                    g = g.sort_values('time')
                    out[t] = [float(x) for x in g['close']]
            except Exception as e:
                log('iFinD CSV 解析失败', fp, e)
        time.sleep(0.5)
    return out


def em_kline_closes(code, lmt=40, end='20500101'):
    """code 形如 sh600192 / sz000978 -> [(date, close), ...]，失败返回 None。
    优先东方财富日 K，限流时回退腾讯日 K（前复权，仅用于涨跌方向核验）。"""
    secid = ('1.' if code.startswith('sh') else '0.') + code[2:]
    url = (f'https://push2his.eastmoney.com/api/qt/stock/kline/get?secid={secid}'
           f'&klt=101&fqt=0&lmt={lmt}&end={end}&fields1=f1,f2,f3&fields2=f51,f53')
    j = curl_json(url, tries=3)
    if j and j.get('data') and j['data'].get('klines'):
        res = []
        for line in j['data']['klines']:
            parts = line.split(',')
            try:
                res.append((parts[0], float(parts[1])))
            except (ValueError, IndexError):
                pass
        if res:
            return res
    # 腾讯备用通道
    url = f'https://ifzq.gtimg.cn/appstock/app/fqkline/get?param={code},day,,,{lmt},qfq'
    j = curl_json(url, tries=3)
    if j and j.get('code') == 0 and j.get('data') and j['data'].get(code):
        node = j['data'][code]
        rows = node.get('qfqday') or node.get('day') or []
        res = []
        for row in rows:
            try:
                res.append((row[0], float(row[2])))
            except (ValueError, IndexError, TypeError):
                pass
        if res:
            return res
    return None


def macd_of(closes):
    import pandas as pd
    s = pd.Series(closes, dtype=float)
    if len(s) < 10:
        return None
    ema12 = s.ewm(span=12, adjust=False).mean()
    ema26 = s.ewm(span=26, adjust=False).mean()
    dif = ema12 - ema26
    dea = dif.ewm(span=9, adjust=False).mean()
    bar = (dif - dea) * 2
    d, e, b = float(dif.iloc[-1]), float(dea.iloc[-1]), float(bar.iloc[-1])
    n = len(s)
    cross = None
    for k in range(n - 1, max(n - 6, 0), -1):
        prev = float(dif.iloc[k - 1] - dea.iloc[k - 1])
        cur = float(dif.iloc[k] - dea.iloc[k])
        age = n - 1 - k
        if prev <= 0 < cur:
            cross = '今天金叉' if age == 0 else f'{age}天前金叉'
            break
        if prev >= 0 > cur:
            cross = '今天死叉' if age == 0 else f'{age}天前死叉'
            break
    b0, b1 = float(bar.iloc[-1]), float(bar.iloc[-2])
    if b0 > 0:
        shape = '红柱出现' if b1 <= 0 else ('红柱放大' if b0 > b1 else '红柱缩短')
    elif b0 < 0:
        shape = '绿柱出现' if b1 >= 0 else ('绿柱放大' if abs(b0) > abs(b1) else '绿柱缩短')
    else:
        shape = '零轴附近'
    pos = '零轴上方' if (d > 0 and e > 0) else ('零轴下方' if (d < 0 and e < 0) else '零轴附近')
    return {'dif': round(d, 3), 'dea': round(e, 3), 'bar': round(b, 3),
            'cross': cross, 'shape': shape, 'pos': pos}


# ---------------- 3. 连涨 / 连跌 ----------------
def fetch_clist(po, max_pages):
    """po=1 涨幅降序, po=0 涨幅升序。遇到涨跌幅符号越界即提前停止；
    单页失败会重试，主节点限流时切换延迟镜像节点（收盘后数据一致）。"""
    hosts = ['push2.eastmoney.com', 'push2delay.eastmoney.com']
    stocks = []
    pn, fails, host_i = 1, 0, 0
    while pn <= max_pages:
        url = (f'https://{hosts[host_i]}/api/qt/clist/get?fid=f3'
               f'&po={po}&pz=100&pn={pn}&np=1&fltt=2&invt=2'
               '&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23&fields=f12,f14,f3,f2')
        j = curl_json(url)
        if not j or not j.get('data') or not j['data'].get('diff'):
            fails += 1
            if fails >= 3:
                if host_i + 1 < len(hosts):
                    host_i += 1
                    fails = 0
                    log(f'clist 切换到镜像节点 {hosts[host_i]}')
                    continue
                log(f'clist po={po} 第 {pn} 页多次失败，提前结束')
                break
            time.sleep(2)
            continue
        fails = 0
        batch = j['data']['diff']
        stocks += batch
        last_pct = batch[-1].get('f3')
        if isinstance(last_pct, (int, float)):
            if po == 1 and last_pct <= 0:
                break
            if po == 0 and last_pct >= 0:
                break
        pn += 1
        time.sleep(0.2)
    return stocks


def streak_of(closes):
    """收盘价序列 -> 连涨(正)/连跌(负)天数；最后一天平盘返回 0"""
    if len(closes) < 2:
        return 0
    diffs = [closes[i] - closes[i - 1] for i in range(1, len(closes))]
    if abs(diffs[-1]) < 1e-9:
        return 0
    sign = 1 if diffs[-1] > 0 else -1
    cnt = 0
    for d in reversed(diffs):
        if d * sign > 1e-9:
            cnt += 1
        else:
            break
    return cnt * sign


def collect_streaks(clist, want_up, label):
    """逐只拉日 K 核验连涨/连跌（并发），返回 StreakStock 列表（按天数降序，取前 24）。
    涨跌幅与现价以最新一根日 K 的收盘价重算，与榜单口径一致。"""
    from concurrent.futures import ThreadPoolExecutor

    candidates = []
    for s in clist:
        pct, price = s.get('f3'), s.get('f2')
        if not isinstance(pct, (int, float)) or not isinstance(price, (int, float)):
            continue
        if want_up and pct <= 0:
            continue
        if not want_up and pct >= 0:
            continue
        code6 = str(s.get('f12', ''))
        prefix = 'sh' if code6[:1] in ('6', '9') else 'sz'
        candidates.append((prefix + code6, s.get('f14', ''), pct, price))

    def check(item):
        code, name, pct, price = item
        kl = em_kline_closes(code, lmt=12)
        if not kl or len(kl) < 2:
            return None
        closes = [c for _, c in kl]
        st = streak_of(closes)
        if (want_up and st >= 3) or (not want_up and st <= -3):
            return {'code': code, 'name': name, 'streak': abs(st),
                    'pct': round(pct, 2), 'price': round(price, 2)}
        return None

    out = []
    with ThreadPoolExecutor(max_workers=8) as ex:
        for i, r in enumerate(ex.map(check, candidates)):
            if r:
                out.append(r)
            if (i + 1) % 100 == 0:
                log(f'{label}: {i + 1}/{len(candidates)} 已核验，命中 {len(out)}')
    out.sort(key=lambda x: (-x['streak'], -x['pct'] if want_up else x['pct']))
    return out[:24]


# ---------------- 4. 生成 TS ----------------
HEADER = '''/**
 * 每日复盘数据（收盘后快照）
 * 涨停/连板池：东方财富涨停池接口；日线历史：同花顺 iFinD；
 * MACD(12,26,9) 由日线收盘价本地计算；连涨/连跌：全市场快照+日线核验。
 * 本文件由 scripts/update_review.py 自动生成，请勿手改。
 * 生成时间：{date} 收盘后
 */

export interface ZtStock {{
  code: string;   // sh600xxx / sz000xxx
  name: string;
  price: number;
  pct: number;    // 涨跌幅 %
  lbc: number;    // 连板数
  hy: string;     // 行业
  hs: number;     // 换手率 %
  amount: number; // 成交额（亿）
  fund: number;   // 封单金额（万）
  zbc: number;    // 炸板次数
}}

export interface LianbanStock extends ZtStock {{
  macd: {{
    dif: number;
    dea: number;
    bar: number;
    cross: string | null;  // 最近 5 日内的金叉/死叉
    shape: string;         // 红柱放大/红柱缩短/绿柱放大/绿柱缩短…
    pos: string;           // 零轴上方/下方
  }};
}}

export interface StreakStock {{
  code: string;
  name: string;
  streak: number; // 连涨/连跌天数（正数）
  pct: number;    // 当日涨跌幅 %
  price: number;
}}
'''


def emit_ts(date_str, zt_total, lb_total, max_lbc, zt, lianban, up3, down3):
    j = lambda v: json.dumps(v, ensure_ascii=False)
    return (HEADER.format(date=date_str)
            + f'\nexport const REVIEW = {{\n'
            + f"  date: '{date_str}',\n"
            + f'  ztTotal: {zt_total},\n'
            + f'  lbTotal: {lb_total},\n'
            + f'  maxLbc: {max_lbc},\n'
            + f'  zt: {j(zt)} as ZtStock[],\n'
            + f'  lianban: {j(lianban)} as LianbanStock[],\n'
            + f'  up3: {j(up3)} as StreakStock[],\n'
            + f'  down3: {j(down3)} as StreakStock[],\n'
            + '};\n')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--date', help='强制使用某日涨停池 YYYYMMDD')
    ap.add_argument('--out', default=DEFAULT_OUT)
    args = ap.parse_args()

    date_str, zt_total, pool = fetch_zt_pool(args.date)
    if not pool:
        log('未获取到涨停池数据，退出')
        raise SystemExit(1)

    zt = [pool_to_zt(p) for p in pool]
    zt.sort(key=lambda x: -x['lbc'])
    lianban = [dict(s) for s in zt if s['lbc'] >= 2]
    max_lbc = max((s['lbc'] for s in zt), default=1)
    log(f'涨停 {zt_total} 只，连板 {len(lianban)} 只，最高 {max_lbc} 板')

    # 连板股 MACD：iFinD 日线（前复权），失败回退东方财富
    end = date_str
    start = (datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
             - datetime.timedelta(days=100)).strftime('%Y-%m-%d')
    tickers = [to_ifind_ticker(s['code']) for s in lianban]
    closes_map = ifind_closes(tickers, start, end) if tickers else {}
    log(f'iFinD 日线获取 {len(closes_map)}/{len(tickers)}')
    for s in lianban:
        closes = closes_map.get(to_ifind_ticker(s['code']))
        if not closes:
            kl = em_kline_closes(s['code'], lmt=60)
            closes = [c for _, c in kl] if kl else None
            if closes:
                log(f"{s['name']} 回退东方财富日 K")
        m = macd_of(closes) if closes else None
        s['macd'] = m or {'dif': 0, 'dea': 0, 'bar': 0, 'cross': None,
                          'shape': '数据不足', 'pos': '零轴附近'}

    # 连涨 / 连跌：候选取自实时榜单、核验用最新日 K（含当日 bar）。
    # 本脚本设计为收盘后运行（见 cron），此时三者口径天然一致；
    # 盘中运行则得到"截至当前"的快照。
    gainers = fetch_clist(po=1, max_pages=6)   # 涨幅前 600
    losers = fetch_clist(po=0, max_pages=4)    # 跌幅前 400
    log(f'快照: 涨幅榜 {len(gainers)}，跌幅榜 {len(losers)}')
    if len(gainers) < 100 or len(losers) < 100:
        log('榜单数据明显不完整（可能触发接口限流），为保险起见本次不写入，保留旧数据')
        raise SystemExit(2)
    up3 = collect_streaks(gainers, True, '连涨')
    down3 = collect_streaks(losers, False, '连跌')
    if not up3 and not down3:
        log('连涨连跌核验结果为空，疑似数据异常，本次不写入')
        raise SystemExit(2)
    log(f'连涨>=3: {len(up3)}（展示前24），连跌>=3: {len(down3)}（展示前24）')

    ts = emit_ts(date_str, zt_total, len(lianban), max_lbc, zt, lianban, up3, down3)
    with open(args.out, 'w', encoding='utf-8') as f:
        f.write(ts)
    log(f'已写入 {args.out}')


if __name__ == '__main__':
    main()
