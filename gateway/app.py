# app.py
from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
from fastapi import FastAPI, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from zoneinfo import ZoneInfo
from dotenv import load_dotenv

# seus módulos
from config_loader import load_config, build_auth
import xml.etree.ElementTree as ET

# -----------------------------------------------------------------------------
# Configuração de ambiente
# -----------------------------------------------------------------------------
load_dotenv()

APP_TITLE = os.getenv("APP_TITLE", "Gateway Municipal")
APP_VERSION = os.getenv("APP_VERSION", "0.4.1")

DEFAULT_ALLOWED_ORIGINS: List[str] = [
    "http://10.50.30.168:5173",
    "http://10.50.30.168:3000",
    "http://10.50.30.168:8080",
    "http://10.50.30.168",
    "http://localhost:5173",
    "http://localhost:3000",
]

def parse_allowed_origins() -> List[str]:
    env_val = os.getenv("ALLOWED_ORIGINS", "").strip()
    if not env_val:
        return DEFAULT_ALLOWED_ORIGINS
    items = [v.strip().rstrip("/") for v in env_val.split(",") if v.strip()]
    seen, dedup = set(), []
    for x in items:
        if x not in seen:
            seen.add(x)
            dedup.append(x)
    return dedup or DEFAULT_ALLOWED_ORIGINS

ALLOWED_ORIGINS = parse_allowed_origins()

# -----------------------------------------------------------------------------
# App e Middleware
# -----------------------------------------------------------------------------
app = FastAPI(title=APP_TITLE, version=APP_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# Fuso horário
# -----------------------------------------------------------------------------
TZ = ZoneInfo("America/Sao_Paulo")

def now_brt_iso() -> str:
    return datetime.now(TZ).isoformat(timespec="seconds")

def epoch_ms(dt: Optional[datetime] = None) -> int:
    if dt is None:
        dt = datetime.now(timezone.utc)
    return int(dt.timestamp() * 1000)

# -----------------------------------------------------------------------------
# Config
# -----------------------------------------------------------------------------
try:
    CFG: Dict[str, Any] = load_config()
except Exception as e:
    CFG = {}
    print(f"[gateway] Aviso: falha ao carregar config_loader.load_config(): {e}")

def _service_base_url(service: str) -> str:
    services = (CFG or {}).get("services") or {}
    svc = services.get(service)
    if not svc:
        raise KeyError(f"Serviço '{service}' não encontrado no config.")
    base = svc.get("base_url") or svc.get("url") or svc.get("endpoint")
    if not base:
        raise KeyError(f"Serviço '{service}' não possui 'base_url' no config.")
    return str(base)

def _service_auth_headers(service: str) -> Dict[str, str]:
    try:
        headers = build_auth(CFG, service)
        if not isinstance(headers, dict):
            return {}
        return {str(k): str(v) for k, v in headers.items()}
    except Exception:
        return {}

# -----------------------------------------------------------------------------
# Cliente HTTP
# -----------------------------------------------------------------------------
@app.on_event("startup")
async def _startup():
    timeout = httpx.Timeout(30.0, connect=5.0)
    app.state.http = httpx.AsyncClient(timeout=timeout)

@app.on_event("shutdown")
async def _shutdown():
    http: httpx.AsyncClient = app.state.http
    await http.aclose()

# -----------------------------------------------------------------------------
# Modelos
# -----------------------------------------------------------------------------
class ProxyPayload(BaseModel):
    data: Optional[Dict[str, Any]] = None

# -----------------------------------------------------------------------------
# Rotas utilitárias
# -----------------------------------------------------------------------------
@app.get("/health")
async def health() -> Dict[str, Any]:
    return {
        "ok": True,
        "service": APP_TITLE,
        "version": APP_VERSION,
        "time_brt": now_brt_iso(),
        "allowed_origins": ALLOWED_ORIGINS,
    }

@app.get("/time")
async def time_endpoint() -> Dict[str, Any]:
    now_utc = datetime.now(timezone.utc)
    now_brt = datetime.now(TZ)
    return {
        "now_brt": now_brt.isoformat(timespec="seconds"),
        "now_utc": now_utc.isoformat(timespec="seconds"),
        "epoch_ms": epoch_ms(now_utc),
    }

@app.post("/echo")
async def echo(body: Dict[str, Any] | None = None, request: Request = None):
    return {
        "received": body or {},
        "method": request.method if request else "POST",
        "time_brt": now_brt_iso(),
    }

# -----------------------------------------------------------------------------
# Proxy genérico
# -----------------------------------------------------------------------------
@app.api_route(
    "/_proxy/{service}/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
)
async def proxy_service(
    service: str,
    path: str,
    request: Request,
    body: Optional[ProxyPayload] = None,
):
    try:
        base = _service_base_url(service).rstrip("/")
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    target_url = f"{base}/{path}".rstrip("/")

    params = dict(request.query_params)
    fwd_headers: Dict[str, str] = _service_auth_headers(service)
    origin = request.headers.get("origin")
    if origin:
        fwd_headers.setdefault("X-Client-Origin", origin)

    json_payload = (body.data if body and body.data is not None else None)
    method = request.method.upper()
    http: httpx.AsyncClient = app.state.http

    try:
        resp = await http.request(
            method=method,
            url=target_url,
            params=params,
            json=json_payload,
            headers=fwd_headers,
        )
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Upstream {service} indisponível: {e}")

    content_type = resp.headers.get("content-type", "application/octet-stream")
    return Response(
        content=resp.content,
        status_code=resp.status_code,
        media_type=content_type,
        headers={"x-gateway-service": service},
    )

# -----------------------------------------------------------------------------
# HEXAGON API - Dicionários
# -----------------------------------------------------------------------------
EVENT_DICT = {
    "POP01": "ACIDENTE SEM VITIMA", "POP02": "ACIDENTE COM VITIMA", "POP03": "ACIDENTE COM OBITO",
    "POP04": "INCENDIO EM VEICULO", "POP05": "BOLSAO DE AGUA EM VIA", "POP06": "MANIFESTACAO EM LOCAL PUBLICO",
    "POP07": "INCENDIO EM IMOVEL", "POP08": "SINAIS DE TRANSITO COM MAU FUNCIONAMENTO", "POP09": "REINTEGRACAO DE POSSE",
    "POP10": "QUEDA DE ARVORE", "POP11": "QUEDA DE POSTE", "POP12": "ACIDENTE COM QUEDA DE CARGA",
    "POP13": "INCENDIO NO ENTORNO DE VIAS PUBLICAS", "POP14": "INCENDIO DENTRO DE TUNEIS", "POP15": "VAZAMENTO DE AGUA E ESGOTO",
    "POP16": "FALTA CRITICA DE ENERGIA OU APAGAO", "POP17": "IMPLOSAO", "POP18": "ESCAPAMENTO DE GAS",
    "POP19": "EVENTO NAO PROGRAMADO", "POP20": "ATROPELAMENTO", "POP21": "AFUNDAMENTO DE PISTA OU BURACO NA VIA",
    "POP22": "ABALROAMENTO", "POP23": "OBRA/MANUTENÇÃO EM LOCAL PUBLICO", "POP24": "OPERACAO POLICIAL",
    "POP25": "ACIONAMENTO DE SIRENES", "POP26": "ALAGAMENTO", "POP27": "ENCHENTE OU INUNDACAO",
    "POP28": "LAMINA DE AGUA", "POP29": "ACIDENTE AMBIENTAL", "POP30": "INCIDENTE COM BUEIRO",
    "POP31": "QUEDA DE ARVORE SOBRE FIACAO", "POP32": "RESIDUOS NA VIA", "POP33": "INCENDIO EM VEGETACAO",
    "POP34": "DESLIZAMENTO", "POP35": "QUEDA DE ESTRUTURA DE ALVENARIA",
    "POP36": "RESGATE OU REMOCAO DE ANIMAIS TERRESTRES E AEREOS", "POP37": "REMOCAO DE ANIMAIS MORTOS NA AREIA",
    "POP38": "RESGATE DE ANIMAL MARINHO PRESO EM REDE OU ENCALHADO", "POP39": "ANIMAL EM LOCAL PUBLICO",
    "POP40": "QUEDA DE CARGA VIVA DE GRANDE PORTE", "POP41": "QUEDA DE CARGA VIVA DE PEQUENO PORTE",
    "POP42": "PROTOCOLO DE VIA", "POP43": "PROTOCOLO DE CICLOVIA", "POP44": "ENGUICO NA VIA",
    "POP45": "PROTOCOLO DE CALOR - NC2", "POP46": "PROTOCOLO DE CALOR - NC3", "POP47": "PROTOCOLO DE CALOR - NC4",
    "POP48": "PROTOCOLO DE CALOR - NC5", "POP49": "PROTOCOLO DE PARQUES", "POP50": "OCORRENCIA EM PARQUE AEROPORTUARIO",
    "POP51": "INTERRUPÇÃO PARCIAL OU TOTAL DE MODAL DE TRANSPORTE", "POP52": "FIAÇÃO PARTIDA/ARREADA", "POP53": "RESSACA/MARÉ ALTA"
}

PRIORIDADE_DICT = {1: "BAIXA", 2: "MÉDIA", 3: "ALTA", 4: "MUITO ALTA"}

# -----------------------------------------------------------------------------
# ROTA: Ocorrências Hexagon - DADOS REAIS
# -----------------------------------------------------------------------------
@app.get("/api/ocorrencias")
async def get_ocorrencias():
    """
    Busca ocorrências abertas da API Hexagon
    """
    HEXAGON_API_BASE = "https://api.corio-oncall.com.br/hxgnEvents/api"
    HEXAGON_USER = "APIOpenedEvent"
    HEXAGON_PASS = "12345"
    
    http: httpx.AsyncClient = app.state.http
    
    try:
        # Autenticar
        print("[HEXAGON] 🔐 Autenticando...")
        auth_url = f"{HEXAGON_API_BASE}/Events/Login"
        auth_payload = {"UserName": HEXAGON_USER, "Password": HEXAGON_PASS}
        
        auth_resp = await http.post(auth_url, json=auth_payload, timeout=10.0)
        
        if auth_resp.status_code != 200:
            print(f"[HEXAGON] ❌ Erro na autenticação: {auth_resp.status_code}")
            return []
        
        auth_data = auth_resp.json()
        token = auth_data.get("AccessToken")
        
        if not token:
            print(f"[HEXAGON] ❌ Token não encontrado")
            return []
        
        print(f"[HEXAGON] ✅ Autenticado! Token: {token[:20]}...")
        
        # Buscar eventos
        print("[HEXAGON] 📡 Buscando ocorrências...")
        events_url = f"{HEXAGON_API_BASE}/Events/OpenedEvents"
        events_payload = {"token": token}
        
        events_resp = await http.post(events_url, json=events_payload, timeout=10.0)
        
        if events_resp.status_code != 200:
            print(f"[HEXAGON] ❌ Erro ao buscar eventos: {events_resp.status_code}")
            return []
        
        eventos = events_resp.json()
        print(f"[HEXAGON] 📊 {len(eventos)} eventos encontrados")
        
        # Formatar
        ocorrencias = []
        for item in eventos:
            event_id = str(item.get("EventId", ""))
            tipo_codigo = item.get("AgencyEventTypeCode", "")
            tipo = EVENT_DICT.get(tipo_codigo, "OUTROS")
            prioridade_num = item.get("Priority", 1)
            prioridade = PRIORIDADE_DICT.get(prioridade_num, "BAIXA")
            
            lat = item.get("Latitude")
            lon = item.get("Longitude")
            
            # Só adicionar se tiver coordenadas
            if lat and lon:
                ocorrencias.append({
                    "id_c": event_id,
                    "incidente": tipo,
                    "location": item.get("Location", "Sem descrição"),
                    "lat": lat,
                    "lon": lon,
                    "prio": prioridade,
                    "status": "Em andamento",
                    "data": now_brt_iso()
                })
        
        print(f"[HEXAGON] ✅ {len(ocorrencias)} ocorrências válidas (com coordenadas)")
        return ocorrencias
        
    except httpx.TimeoutException:
        print("[HEXAGON] ⏱️  Timeout")
        return []
    except Exception as e:
        print(f"[HEXAGON] ❌ Erro: {e}")
        import traceback
        traceback.print_exc()
        return []

# -----------------------------------------------------------------------------
# Exemplos de endpoints específicos
# -----------------------------------------------------------------------------
class BairrosChuvaResp(BaseModel):
    timestamp: str
    bairros: List[Dict[str, Any]]

@app.get("/chuvas/bairros", response_model=BairrosChuvaResp)
async def chuvas_bairros(
    request: Request,
    service: str = Query("alerta_rio", description="Serviço do config_loader"),
    endpoint: str = Query("api/v1/chuvas/bairros", description="Caminho no serviço"),
):
    """
    Exemplo: agregar/formatar resposta do serviço 'alerta_rio'
    """
    try:
        base = _service_base_url(service).rstrip("/")
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))

    url = f"{base}/{endpoint}".rstrip("/")
    http: httpx.AsyncClient = app.state.http
    headers = _service_auth_headers(service)

    try:
        r = await http.get(url, headers=headers, params=dict(request.query_params))
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Upstream {service} indisponível: {e}")

    if r.status_code >= 400:
        raise HTTPException(status_code=r.status_code, detail=r.text)

    data = r.json() if "application/json" in (r.headers.get("content-type") or "") else {}
    return {
        "timestamp": now_brt_iso(),
        "bairros": data.get("bairros", data)
    }