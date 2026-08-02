# VESP2P — Dashboard USDT/VES P2P

Dashboard en tiempo real para el mercado P2P **USDT/VES** (Bolívares), que reúne el precio de 7+ exchanges (Binance P2P, Bybit, OKX, Bitget, MEXC, BingX, Saldo), la **tasa oficial del BCV** y la **brecha entre el dólar oficial y el paralelo**. Con tendencias, velas OHLC, análisis técnico y proyecciones — en español, para cualquier usuario.

## ✨ Características

- **Resumen de un vistazo:** Precio del dólar paralelo en grande, tendencia de las últimas 24 h con sparkline, dónde comprar/vender USDT al mejor precio y la tasa oficial BCV con su brecha.
- **Exchanges en vivo:** Ranking para comprar y vender USDT con precio, spread y **brecha vs BCV** por exchange.
- **Análisis completo:**
  - Gráfico de tendencia del historial con selector de rango (1 semana / 1 mes / 3 meses / todo).
  - Gráfico de velas OHLC (timeframes de 5 min a 24 h).
  - Panel de algoritmo: RSI, medias móviles (MA5/MA20), volatilidad, señal de tendencia y fuerza.
  - Tabla **BCV vs P2P** con la brecha oficial histórica.
  - Proyección de precios con recomendaciones de compra/venta.
- **Alertas configurables** de spread y precio.
- **Datos persistentes:** El histórico se guarda cada 5 min en Supabase, con 8,000+ snapshots acumulados y agregación de velas por SQL en Postgres.

## 🛠️ Stack

- **Next.js 14 (App Router)** + React + TypeScript
- **Tailwind CSS** + **Shadcn/ui**
- **Supabase** (Postgres + Edge Functions + pg_cron)
- **Cloudflare Workers** (OpenNext) para producción
- **`lucide-react`**, **`date-fns`**

## 📊 Arquitectura de datos

```
CriptoYa API ──► Edge Function "rates" (Supabase) ──► /api/rates ──► Dashboard en vivo
Binance P2P ──► Edge Function "scraper" (cada 5 min) ──► tabla marketsnapshot (Supabase) ──► /api/history, /api/candles
BCV (bcv.today) ──► Edge Function "bcv" (diario 01:00) ──► tabla bcv_rates ──► /api/bcv
```

### Tablas (Supabase)

| Tabla | Propósito |
|---|---|
| `marketsnapshot` | Snapshots de precio cada 5 min (buyprice, sellprice, spread, volúmenes, IQR) |
| `bcv_rates` | Tasa oficial diaria del BCV |

### Funciones RPC

| Función | Uso |
|---|---|
| `get_candles(p_timeframe, p_limit)` | Velas OHLC agregadas en Postgres |
| `get_bcv_analysis(p_days)` | Tasa BCV diaria vs promedio P2P |
| `upsert_snapshot` | Inserción/actualización de snapshots |

Las migraciones SQL están versionadas en [`supabase/migrations/`](supabase/migrations/).

### Edge Functions

| Función | Frecuencia | Origen |
|---|---|---|
| `scraper` | pg_cron cada 5 min | Binance P2P → `marketsnapshot` |
| `rates` | on-demand | Proxy CriptoYa (evita bloqueo IP de Cloudflare) |
| `bcv` | pg_cron diario 01:00 | bcv.today → `bcv_rates` |

## 🚀 Instalación y configuración

### Requisitos

- Node.js 18+
- npm
- Un proyecto en [Supabase](https://supabase.com)
- Cuenta de [Cloudflare Workers](https://workers.cloudflare.com) (para deploy)

### 1. Variables de entorno

Crea un archivo `.env.local` en la raíz:

```bash
# Supabase REST endpoint (Settings → API)
SUPABASE_URL="https://TU_PROJECT_REF.supabase.co"
SUPABASE_SECRET_KEY="sb_secret_..."
```

> `.env.local` está en `.gitignore` y no se sube al repositorio.

### 2. Base de datos

Aplica las migraciones:

```bash
npx supabase db push
```

(o crea las tablas/funciones manualmente desde los archivos en `supabase/migrations/`).

### 3. Edge Functions

Desplegar las funciones de Supabase:

```bash
supabase functions deploy scraper --no-verify-jwt
supabase functions deploy rates --no-verify-jwt
supabase functions deploy bcv --no-verify-jwt
```

Configura los secrets de las funciones:

```bash
supabase secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
```

Programa los crons en Supabase (SQL Editor):

```sql
-- Scraper cada 5 min
select cron.schedule('scraper', '*/5 * * * *', $$ select net.http_post(
  url := 'https://TU_PROJECT_REF.supabase.co/functions/v1/scraper',
  headers := '{"Authorization": "Bearer TU_SECRET", "Content-Type": "application/json"}'::jsonb
) $$);

-- BCV diario 01:00
select cron.schedule('bcv-daily', '0 1 * * *', $$ select net.http_post(
  url := 'https://TU_PROJECT_REF.supabase.co/functions/v1/bcv',
  headers := '{"Authorization": "Bearer TU_SECRET", "Content-Type": "application/json"}'::jsonb,
  body := '{}'::jsonb
) $$);
```

> Usa la **service role key** como `TU_SECRET` para que las funciones escriban en la base.

### 4. Correr en local

```bash
npm install
npm run dev
```

Disponible en `http://localhost:3000`.

## 📦 Deploy en Cloudflare Workers

```bash
npx wrangler login
npm run deploy
```

Esto ejecuta `opennextjs-cloudflare build && opennextjs-cloudflare deploy` y publica el worker `vesp2p`.

Variables del worker (configuradas en `wrangler.jsonc` o por Dashboard):

```bash
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SECRET_KEY
```

## 🔌 API Endpoints

| Endpoint | Descripción |
|---|---|
| `GET /api/rates` | Precios en vivo de todos los exchanges, mejor compra/venta, spread global y promedio |
| `GET /api/history?limit=N&downsample=M` | Historial de precios (keyset pagination, downsampling server-side) |
| `GET /api/candles?timeframe=1h&limit=N` | Velas OHLC (agregadas por SQL en Postgres) |
| `GET /api/bcv` | Tasa oficial BCV + brecha vs P2P |
| `GET /api/bcv?history=true&days=90` | Historial BCV vs P2P diario |
| `GET /api/cron` | (legacy) Trigger manual del scraper |

## 🧪 Scripts

```bash
npm run dev       # desarrollo
npm run build     # build Next.js
npm run start     # servidor producción local
npm run deploy    # build OpenNext + deploy a Cloudflare
npm run scraper   # scraper local (backfill de snapshots)
npm run lint      # ESLint
```

## ⚙️ Configuración de Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Copia la URL y la service role key de **Settings → API**.
3. Aplica las migraciones (`supabase/migrations/`).
4. Despliega las 3 edge functions y configura los crons.
5. Pon `SUPABASE_URL` y `SUPABASE_SECRET_KEY` en `.env.local` y en el worker.

---

**¿Te gusta este proyecto?** Dale una estrella en GitHub.

**Desarrollado para la comunidad P2P de Venezuela** 🇻🇪
