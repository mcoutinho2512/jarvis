import os
import yaml
from typing import Dict, Any

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "config", "apis.yml")

def load_config() -> Dict[str, Any]:
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

def build_auth(params: Dict[str, Any]) -> Dict[str, Any]:
    auth_cfg = params.get("auth", {}) or {}
    a_type = auth_cfg.get("type", "none")
    out = {"headers": {}, "params": {}, "auth": None}

    if a_type == "bearer":
        token = os.getenv(auth_cfg.get("token_env", ""), "")
        if token:
            out["headers"]["Authorization"] = f"Bearer {token}"
    elif a_type == "header":
        key = auth_cfg.get("header_name")
        val = os.getenv(auth_cfg.get("header_env", ""), "")
        if key and val:
            out["headers"][key] = val
    elif a_type == "query":
        key = auth_cfg.get("query_name")
        val = os.getenv(auth_cfg.get("query_env", ""), "")
        if key and val:
            out["params"][key] = val
    elif a_type == "basic":
        user = os.getenv(auth_cfg.get("basic_user_env", ""), "")
        pwd  = os.getenv(auth_cfg.get("basic_pass_env", ""), "")
        if user or pwd:
            out["auth"] = (user, pwd)
    return out
