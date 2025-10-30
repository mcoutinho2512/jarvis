import httpx, sys
from config_loader import load_config, build_auth

def pick_test_endpoint(api_name, api_cfg):
    eps = api_cfg.get("endpoints", {})
    if api_name == "alerta_rio":
        return eps.get("previsao_estendida")
    if eps:
        return next(iter(eps.values()))
    return None

def main():
    cfg = load_config()
    any_fail = False
    for name, api in cfg.items():
        base = (api.get("base_url") or "").rstrip("/")
        ep = pick_test_endpoint(name, api)
        if not base or not ep:
            print(f"⚠️  [{name}] base_url ou endpoint não configurados.")
            any_fail = True
            continue
        url = f"{base}{ep}"
        auth = build_auth(api)
        try:
            with httpx.Client(timeout=api.get("timeout_s", 5)) as client:
                r = client.get(url, headers=auth["headers"], params=auth["params"], auth=auth["auth"])
            if r.status_code == 200:
                print(f"✅ [{name}] {url} -> 200 OK")
            else:
                print(f"⚠️  [{name}] {url} -> HTTP {r.status_code}")
                any_fail = True
        except Exception as e:
            print(f"❌ [{name}] erro ao acessar {url}: {e}")
            any_fail = True
    sys.exit(1 if any_fail else 0)

if __name__ == "__main__":
    main()
