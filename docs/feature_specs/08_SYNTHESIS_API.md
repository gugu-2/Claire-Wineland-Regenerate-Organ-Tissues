# Feature Spec 08 — Automated B2B Synthesis API (IDT / Twist / GenScript Direct Checkout)

**Version:** 1.0  
**Priority:** 🔴 Critical  
**Effort Estimate:** 8 days  
**Status:** Not Started  
**Depends On:** Spec 07 (ART Writer), existing `backend/modules/oligo_synthesizer.py`

---

## 1. User-Facing Description

After designing a guide RNA, ART construct, oligo, or primer, the researcher can click **"Order from Synthesis Partner"** and the system will:

1. **Get a live price quote** from IDT, Twist Bioscience, or GenScript — displayed in a modal before any purchase
2. **Submit the order directly** using the researcher's saved API credentials (OAuth2 or API key)
3. **Track order status** — processing → manufacturing → shipped — with a live status badge
4. **Store all order history** locally so the researcher can re-order the same construct

No browser redirection. No copy-pasting sequences into vendor portals. The entire B2B eCommerce flow happens inside the application.

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                    FRONTEND                                           │
│                                                                      │
│  [Order Button] appears in:                                          │
│   • WetLabStudioView.jsx → Oligo panel                               │
│   • ArtResearchView.jsx → ForwardDesignTab export section            │
│   • CrisprDesignerView.jsx → Guide RNA result card                   │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  SynthesisOrderModal.jsx                                      │   │
│  │  ┌─────────────────────────────────────────────────────────┐ │   │
│  │  │ Order Summary                                           │ │   │
│  │  │  Product: gRNA + HDR template (2 oligos)               │ │   │
│  │  │  Sequences: [expandable list]                           │ │   │
│  │  │                                                         │ │   │
│  │  │ Vendor: (•) IDT  ( ) Twist  ( ) GenScript              │ │   │
│  │  │                                                         │ │   │
│  │  │ Scale:    [25nmol ▼]   Purification: [Standard ▼]      │ │   │
│  │  │                                                         │ │   │
│  │  │ [Get Quote →]                                           │ │   │
│  │  │ ─────────────────────────────────────────────────────  │ │   │
│  │  │ 💰 IDT Quote:    $18.40  (3-5 business days)           │ │   │
│  │  │ 💰 Twist Quote:  $22.00  (5-7 business days)           │ │   │
│  │  │ 💰 GenScript:    $16.80  (7-10 business days)          │ │   │
│  │  │                                                         │ │   │
│  │  │ Delivery Address: [Saved Lab Address ▼]                 │ │   │
│  │  │                                                         │ │   │
│  │  │ [🔒 Place Order with IDT]   [Cancel]                   │ │   │
│  │  └─────────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  SynthesisOrdersView.jsx  (new page: Settings → Order History)       │
│  • Table of all past orders                                          │
│  • Live status tracking badges                                       │
│  • Re-order button                                                   │
└──────────────────────────────────────────────────────────────────────┘
         │  POST /api/synthesis/quote
         │  POST /api/synthesis/order
         │  GET  /api/synthesis/orders/{order_id}/status
         ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    BACKEND  (FastAPI)                                 │
│                                                                      │
│  backend/routers/synthesis_router.py                                 │
│  backend/modules/synthesis_api_client.py                             │
│    ├── IDTClient      → OAuth2 client credentials flow               │
│    ├── TwistClient    → API key header auth                          │
│    └── GenScriptClient→ OAuth2 PKCE or API key                       │
│                                                                      │
│  backend/modules/synthesis_validator.py                              │
│    ├── validate_oligo_sequence()   — check for ambiguous bases       │
│    ├── check_length_limits()       — vendor-specific max lengths     │
│    └── detect_hazardous_motifs()   — no select agent sequences       │
└──────────────────────────────────────────────────────────────────────┘
         │  External HTTPS calls
         ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    VENDOR APIs                                        │
│                                                                      │
│  IDT eCommerce API  https://www.idtdna.com/api/                      │
│    OAuth2 client_credentials → Bearer token                          │
│    POST /v1/order/duplexes/quote                                     │
│    POST /v1/order/duplexes                                           │
│    GET  /v1/order/{order_id}                                         │
│                                                                      │
│  Twist Bioscience API  https://developer.twistbioscience.com/        │
│    API key header: X-Twist-API-Key                                   │
│    POST /v1/quotes                                                   │
│    POST /v1/orders                                                   │
│    GET  /v1/orders/{order_id}                                        │
│                                                                      │
│  GenScript API  https://www.genscript.com/api/                       │
│    OAuth2 Bearer token                                               │
│    POST /api/quote/oligos                                            │
│    POST /api/order/submit                                            │
│    GET  /api/order/{order_id}/status                                 │
└──────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                         │
│                                                                      │
│  SQLite table: synthesis_orders                                       │
│  SQLite table: synthesis_credentials (encrypted API keys)            │
│  SQLite table: delivery_addresses                                     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

| Layer | Technology | Package / Version | Purpose |
|-------|-----------|-------------------|---------|
| HTTP client | httpx | `httpx>=0.27` | Async HTTP to vendor APIs |
| OAuth2 flow | `authlib` | `authlib>=1.3` | Client credentials grant |
| API key encryption | `cryptography` | `cryptography>=42` | Fernet encrypt stored keys |
| Input validation | Pydantic v2 | `pydantic>=2.7` | Request/response models |
| Task queue | Celery | `celery>=5.3` | Background status polling |
| Database | SQLite via SQLAlchemy | `sqlalchemy>=2.0` | Order history |
| Frontend modal | React + Tailwind | (existing) | Order confirmation modal |
| Frontend state | Zustand | `zustand>=4.5` | Order cart state |
| Frontend notifications | react-hot-toast | `react-hot-toast>=2.4` | "Order placed!" toasts |

---

## 4. OAuth2 / Auth Flow Design

### IDT OAuth2 Client Credentials

```
1. User enters IDT Client ID + Client Secret in Settings page
2. Backend encrypts these with Fernet and stores in synthesis_credentials
3. When ordering:
   a. Backend calls POST https://www.idtdna.com/api/oauth2/token
      Body: {grant_type: client_credentials, client_id: ..., client_secret: ...}
   b. Receives: {access_token, expires_in: 3600}
   c. Caches token in Redis (TTL = expires_in - 60)
   d. Uses Bearer token for all subsequent API calls this session
```

### Twist API Key

```
1. User enters Twist API Key in Settings page
2. Backend stores encrypted in synthesis_credentials
3. All Twist calls include: Header X-Twist-API-Key: {decrypted_key}
```

### Sandbox / Mock Mode

For development and testing — no real orders placed:

```python
SYNTHESIS_SANDBOX_MODE = os.getenv("SYNTHESIS_SANDBOX_MODE", "true")

if SYNTHESIS_SANDBOX_MODE == "true":
    # Return mock quote response with fake prices
    # Return mock order_id "MOCK-{uuid}"
    # Store mock order in synthesis_orders with status "mock_submitted"
```

---

## 5. Backend Module Design

### `backend/modules/synthesis_api_client.py`

```python
class IDTClient:
    def __init__(self, client_id: str, client_secret: str):
        """Initialize with decrypted credentials."""

    async def get_token(self) -> str:
        """OAuth2 client_credentials flow. Cache in Redis."""

    async def get_quote(self, oligos: list[OligoSpec]) -> QuoteResult:
        """
        POST /v1/order/duplexes/quote
        Args: oligos = [{name, sequence, scale, purification}]
        Returns: {vendor: "IDT", total_price, per_oligo_prices, lead_time_days}
        """

    async def create_order(
        self,
        oligos: list[OligoSpec],
        delivery_address: DeliveryAddress,
        po_number: str | None = None
    ) -> OrderResult:
        """
        POST /v1/order/duplexes
        Returns: {vendor: "IDT", order_id, status, estimated_ship_date}
        """

    async def get_order_status(self, order_id: str) -> OrderStatus:
        """
        GET /v1/order/{order_id}
        Returns: {order_id, status, tracking_number, shipped_at}
        """

class TwistClient:
    def __init__(self, api_key: str):
        """Initialize with decrypted API key."""

    async def get_quote(self, constructs: list[OligoSpec]) -> QuoteResult: ...
    async def create_order(self, constructs: list[OligoSpec], address: DeliveryAddress) -> OrderResult: ...
    async def get_order_status(self, order_id: str) -> OrderStatus: ...

class GenScriptClient:
    def __init__(self, api_key: str):
        """Initialize with decrypted API key."""

    async def get_quote(self, oligos: list[OligoSpec]) -> QuoteResult: ...
    async def create_order(self, oligos: list[OligoSpec], address: DeliveryAddress) -> OrderResult: ...
    async def get_order_status(self, order_id: str) -> OrderStatus: ...

def get_client(vendor: str, credentials: dict) -> IDTClient | TwistClient | GenScriptClient:
    """Factory function — returns correct client based on vendor string."""
```

### `backend/modules/synthesis_validator.py`

```python
def validate_oligo_sequence(seq: str) -> list[str]:
    """
    Check for:
    - Ambiguous IUPAC bases (warn, don't block)
    - Non-ATCGU characters (block)
    - Length within vendor limits (IDT: 200nt, Twist: 300nt, GenScript: 500nt)
    Returns: list of warning/error strings
    """

def check_length_limits(seq: str, vendor: str) -> bool:
    """Return True if within vendor's synthesis length limit."""

VENDOR_LIMITS = {"IDT": 200, "Twist": 300, "GenScript": 500}
```

### `backend/routers/synthesis_router.py`

```python
@router.post("/api/synthesis/quote")
async def get_multi_vendor_quote(payload: QuotePayload) -> list[QuoteResult]:
    """Get quotes from all configured vendors in parallel (asyncio.gather)."""

@router.post("/api/synthesis/order")
async def place_order(payload: OrderPayload) -> OrderResult:
    """Place order with selected vendor. Store in synthesis_orders table."""

@router.get("/api/synthesis/orders")
async def list_orders() -> list[SynthesisOrder]:
    """Return all orders from synthesis_orders table."""

@router.get("/api/synthesis/orders/{order_id}/status")
async def get_order_status(order_id: str) -> OrderStatus:
    """Live-check vendor API for current status."""

@router.post("/api/synthesis/credentials")
async def save_credentials(payload: CredentialPayload):
    """Encrypt and store vendor API credentials."""

@router.delete("/api/synthesis/credentials/{vendor}")
async def delete_credentials(vendor: str):
    """Remove stored credentials for a vendor."""
```

### Pydantic Models

```python
class OligoSpec(BaseModel):
    name: str
    sequence: str
    scale: Literal["25nmol", "100nmol", "250nmol", "1umol"] = "25nmol"
    purification: Literal["Standard", "HPLC", "PAGE"] = "Standard"

class QuotePayload(BaseModel):
    oligos: list[OligoSpec]
    vendors: list[Literal["IDT", "Twist", "GenScript"]] = ["IDT"]

class OrderPayload(BaseModel):
    oligos: list[OligoSpec]
    vendor: Literal["IDT", "Twist", "GenScript"]
    delivery_address_id: int
    po_number: str | None = None
    sandbox_mode: bool = True     # MUST be explicitly set to False for real orders

class QuoteResult(BaseModel):
    vendor: str
    total_price_usd: float
    per_oligo_prices: dict[str, float]
    lead_time_days: int
    currency: str = "USD"

class OrderResult(BaseModel):
    vendor: str
    order_id: str
    status: str
    estimated_ship_date: str | None
    tracking_number: str | None
```

---

## 6. Database Schema

```sql
CREATE TABLE synthesis_credentials (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor      TEXT UNIQUE NOT NULL,       -- 'IDT', 'Twist', 'GenScript'
    credential_type TEXT NOT NULL,           -- 'oauth2', 'api_key'
    encrypted_data  BLOB NOT NULL,           -- Fernet-encrypted JSON
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE synthesis_orders (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id        TEXT UNIQUE NOT NULL,   -- vendor-assigned or MOCK-{uuid}
    vendor          TEXT NOT NULL,
    oligos_json     TEXT NOT NULL,           -- JSON array of OligoSpec
    total_price_usd REAL,
    status          TEXT DEFAULT 'submitted',
    tracking_number TEXT,
    delivery_address_id INTEGER,
    po_number       TEXT,
    sandbox_mode    BOOLEAN DEFAULT 1,
    submitted_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    shipped_at      DATETIME,
    FOREIGN KEY (delivery_address_id) REFERENCES delivery_addresses(id)
);

CREATE TABLE delivery_addresses (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    label           TEXT NOT NULL,          -- "Main Lab", "Dr. Smith's Office"
    institution     TEXT,
    street_1        TEXT NOT NULL,
    street_2        TEXT,
    city            TEXT NOT NULL,
    state           TEXT,
    zip_code        TEXT NOT NULL,
    country         TEXT DEFAULT 'US',
    is_default      BOOLEAN DEFAULT 0,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 7. Frontend Component Design

### `SynthesisOrderModal.jsx`

```
┌─────────────────────────────────────────────────────────────────┐
│  🧬 Order from Synthesis Partner                           [X]   │
│─────────────────────────────────────────────────────────────────│
│  Order Contents:                                                 │
│  ▼ gRNA: ACGUAGCUAGCUAGCUA (18 nt)                             │
│  ▼ HDR template: AGCUAGCUAGCUA... (80 nt)                       │
│                                                                  │
│  Vendor: [•] IDT  [ ] Twist  [ ] GenScript                       │
│                                                                  │
│  Scale: [25 nmol ▼]    Purification: [Standard ▼]               │
│                                                                  │
│  [💰 Get Quotes from All Vendors]                                │
│  ─────────────────────────────────────────────────────────────  │
│  Quote Results:                                                  │
│  ✅ IDT:       $18.40  (3-5 days)  [Select]                     │
│     Twist:     $22.00  (5-7 days)  [Select]                     │
│     GenScript: $16.80  (7-10 days) [Select]                     │
│  ─────────────────────────────────────────────────────────────  │
│  Delivery: [Main Lab - Building 3 ▼]  [+ Add Address]           │
│  PO Number (optional): [________________]                        │
│                                                                  │
│  ⚠️ Sandbox Mode ON — no real order will be placed               │
│                                                                  │
│  [🔒 Place Order with IDT ($18.40)]    [Cancel]                 │
└─────────────────────────────────────────────────────────────────┘
```

### `SynthesisOrdersView.jsx` (Order History page)

```
┌─────────────────────────────────────────────────────────────────┐
│  Synthesis Order History                                         │
│─────────────────────────────────────────────────────────────────│
│  🔍 Search orders...   [Filter by vendor ▼]   [Filter status ▼] │
│─────────────────────────────────────────────────────────────────│
│  Order ID      │ Vendor │ Items │ Price  │ Status     │ Date     │
│  IDT-2024-8821 │ IDT    │ 2     │ $18.40 │ ✅ Shipped  │ Oct 14   │
│  MOCK-abc123   │ IDT    │ 1     │ $9.20  │ 🔵 Mock     │ Oct 12   │
│  IDT-2024-8801 │ IDT    │ 4     │ $44.00 │ 🔄 Mfg     │ Oct 10   │
│─────────────────────────────────────────────────────────────────│
│  [Re-order] button on each row                                   │
└─────────────────────────────────────────────────────────────────┘
```

### `SettingsView.jsx` — Synthesis Credentials section

```
┌─────────────────────────────────────────────────────────────────┐
│  Synthesis Partner Credentials                                   │
│─────────────────────────────────────────────────────────────────│
│  IDT                                                             │
│    Client ID:     [________________________]                     │
│    Client Secret: [••••••••••••••••••••••••]                     │
│    [💾 Save]  [🗑 Remove]   Status: ✅ Connected                 │
│─────────────────────────────────────────────────────────────────│
│  Twist Bioscience                                                │
│    API Key: [________________________]                           │
│    [💾 Save]  [🗑 Remove]   Status: ⚪ Not configured            │
│─────────────────────────────────────────────────────────────────│
│  GenScript                                                       │
│    API Key: [________________________]                           │
│    [💾 Save]  [🗑 Remove]   Status: ⚪ Not configured            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Integration Points with Existing Code

| Existing File | How It Integrates |
|---------------|-------------------|
| `backend/modules/oligo_synthesizer.py` | `synthesis_api_client.py` uses output from `oligo_synthesizer.design_oligos()` as input `OligoSpec` list |
| `frontend/src/components/WetLabStudioView.jsx` | Add "Order" button to oligo results panel |
| `frontend/src/components/CrisprDesignerView.jsx` | Add "Order gRNA" button to guide RNA result cards |
| Spec 07 (ART Writer) | ART ForwardDesignTab export sends oligos to `SynthesisOrderModal` |
| `backend/routers/auth_router.py` | Synthesis credential management sits under authenticated routes |
| `backend/modules/aart_modeler.py` | ART constructs can be ordered via synthesis API |
| `frontend/src/App.jsx` | Add route `/orders` for `SynthesisOrdersView` |
| `backend/main.py` | Include `synthesis_router` in app |

---

## 9. Day-by-Day Execution Plan

| Day | Task |
|-----|------|
| 1 | DB migration: create `synthesis_orders`, `synthesis_credentials`, `delivery_addresses` tables. Install `httpx`, `authlib`, `cryptography`. |
| 2 | Build `synthesis_api_client.py`: `IDTClient` with OAuth2 token flow + mock mode. Unit test token fetch in sandbox. |
| 3 | Build `TwistClient` and `GenScriptClient` (API key auth). Implement `synthesis_validator.py`. |
| 4 | Build all endpoints in `synthesis_router.py`. Wire `asyncio.gather` for parallel multi-vendor quoting. |
| 5 | Build `SynthesisOrderModal.jsx` — quote display, vendor selector, address picker. |
| 6 | Add "Order" button to `WetLabStudioView.jsx` and `CrisprDesignerView.jsx`. Wire modal open/close. |
| 7 | Build `SynthesisOrdersView.jsx` (order history table + status badges). Build credential settings UI in `SettingsView.jsx`. |
| 8 | End-to-end sandbox test: design gRNA → get mock quote → place mock order → confirm in order history. Push. |

---

## 10. Security Considerations

| Risk | Mitigation |
|------|------------|
| API keys stored in plain text | All credentials encrypted with Fernet before DB write; encryption key stored in env var `SYNTHESIS_ENCRYPTION_KEY` |
| Accidental real orders in dev | `sandbox_mode: true` is the default; must be explicitly overridden; UI shows bright warning banner |
| Sequence exfiltration | All vendor API calls use HTTPS only; no logging of full sequences in audit_logs |
| Replay attacks on order endpoint | Each order request includes a client-generated `idempotency_key` UUID |
