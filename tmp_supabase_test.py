import urllib.request
base = 'https://eotqzcuhqxlqqapwesah.supabase.co'
key = 'sb_publishable_yEQrF7_clh8ATv996ewoJw__xJEgeY9'
tables = ['notes','activities','emails','products','opportunities','renewals','companies','contacts','tasks','icsr_cases','gap_assessments','gap_responses']
for table in tables:
    url = f"{base}/rest/v1/{table}?select=id&limit=1"
    req = urllib.request.Request(url, headers={'apikey': key, 'Authorization': 'Bearer ' + key})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            data = r.read().decode('utf-8')
            print(table, 'OK', data)
    except urllib.error.HTTPError as e:
        print(table, 'HTTP', e.code, e.read().decode('utf-8'))
    except Exception as exc:
        print(table, 'ERR', exc)
