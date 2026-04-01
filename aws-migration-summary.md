# System Context: Expense Register (AWS SAM + Next.js Serverless)

This document contains the complete system architecture, data models, and deployment details for the Expense Register application. It should be provided to any AI agent working on this codebase to ensure they understand the exact AWS infrastructure and serverless constraints.

## 1. High-Level Architecture
This is a fully serverless AWS application. The Next.js frontend is exported statically and hosted on S3 via CloudFront. The backend is an AWS API Gateway mapping requests to Node.js 20 Lambda functions, which interface with DynamoDB and S3.

![Architecture Flow](https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/AmazonWebservices_Logo.svg/1024px-AmazonWebservices_Logo.svg.png) 
*(Note: Visual representation of API Gateway -> Lambda -> DynamoDB/S3)*

```mermaid
graph TD
    Client[Browser / Next.js SPA] -->|GET /reports| CDN[CloudFront Distribution]
    CDN -->|OAC Authenticated| S3Web[S3 Website Bucket]
    
    Client -->|API Requests| APIGW[API Gateway HTTP API]
    APIGW -->|POST /expenses| L1[CreateExpense Lambda]
    APIGW -->|GET /expenses| L2[ListExpenses Lambda]
    APIGW -->|GET /expenses/{id}| L3[GetExpense Lambda]
    APIGW -->|DELETE /expenses/{id}| L4[DeleteExpense Lambda]
    APIGW -->|GET /presigned-upload| L5[GenPresignedUrl Lambda]
    
    L1 & L2 & L3 & L4 --> DDB[(DynamoDB Table)]
    
    Client -.->|PUT File Directly| S3Receipts[S3 Receipt Bucket]
    L5 -.->|Generates PUT Signature| S3Receipts
    L3 -.->|Generates GET Signature| S3Receipts
```

---

## 2. Directory Structure
```text
expense-register/
├── backend/               # AWS Serverless Backend
│   ├── src/
│   │   ├── handlers/      # Lambda entry points (Node 20)
│   │   └── lib/           # Shared helpers (dynamodb.ts, s3.ts, response.ts)
│   ├── build.mjs          # esbuild script used to compile Lambdas
│   └── package.json       # Backend-only dependencies (@aws-sdk/*)
├── src/                   # Next.js Frontend (Static SPA)
│   ├── app/               # App Router pages (expense/page.tsx, reports/, etc.)
│   ├── components/        # React components (DonutChart, BottomNav)
│   └── lib/               # Frontend helpers (api.ts wrapping fetch)
├── template.yaml          # AWS SAM Infrastructure as Code
├── samconfig.toml         # SAM deployment config
├── .env.local             # Local environment variables
├── next.config.ts         # output: 'export', images: unoptimized
└── package.json           # Frontend dependencies (React, Next, date-fns)
```

---

## 3. Database Schema (DynamoDB)

We use a single-table design named `ExpenseRegister`.

### Base Table
| Attribute | Type | Values |
|-----------|------|--------|
| **PK** (Hash) | String | `EXPENSE#{uuid}` |
| **SK** (Range) | String | `EXPENSE#{uuid}` |
| `id` | String | e.g. `123e4567-e89b-12d3...` |
| `amount` | Number | e.g. `42.50` |
| `date` | String | ISO Date `YYYY-MM-DD` |
| `category` | String | e.g. `Food`, `Transport` |
| `tag` | String | Optional context tag |
| `receiptKey` | String | S3 object key (if a receipt was uploaded) |
| `createdAt` | String | ISO Timestamp |

### Global Secondary Index (`DateIndex`)
Used for querying expenses by date, filtering by categories/tags, and sorting.
| Attribute | Type | Values |
|-----------|------|--------|
| **GSI1PK** (Hash) | String | `ALL_EXPENSES` (Static partition) |
| **GSI1SK** (Range) | String | `{date}#{id}` (Enables date sorting) |

---

## 4. API Endpoints (API Gateway)

All API logic is detached from Next.js. The frontend talks strictly to `NEXT_PUBLIC_API_URL`.

**1. `GET /presigned-upload?filename={name}&contentType={type}`**
- **Returns**: `{ "uploadUrl": "https://s3...", "receiptKey": "uuid-name.jpg" }`
- **Purpose**: Frontend uploads raw files directly to S3 via `PUT` using the `uploadUrl`. It then takes the `receiptKey` and bundles it into the Expense creation payload.

**2. `POST /expenses`**
- **Body**: `{ "amount": 10, "date": "2024-05-01", "category": "Food", "tag": "Lunch", "receiptKey": "uuid-name.jpg" }`

**3. `GET /expenses?page=1&limit=20&startDate=...&endDate=...&search=...`**
- **Returns**: 
  ```json
  {
    "expenses": [{ "id": "...", "amount": 10, ... }],
    "pagination": { "page": 1, "limit": 20, "total": 45, "totalPages": 3 },
    "totalAmount": 1050.50
  }
  ```

**4. `GET /expenses/{id}`**
- **Returns**: The expense object. If the expense has a `receiptKey`, the Lambda resolves it into a temporary, presigned HTTP `receipt_path` for the frontend to render the image.

**5. `DELETE /expenses/{id}`**
- Removes the expense from DynamoDB and deletes the corresponding S3 object if it exists.

---

## 5. Next.js Frontend Caveats (Static Export)

The frontend is built with `npm run build` using `output: 'export'` in `next.config.ts`. Because it compiles into flat HTML files and relies entirely on client-side React processing:

1. **Routing Limitations**: Next.js Static Export does **not** support dynamic wildcard routes smoothly for SPAs. We refactored `/expenses/[id]` to `/expense?id=XYZ` utilizing `useSearchParams()`.
2. **CloudFront SPA Strategy**: Direct deep-links to `/reports` will trigger a `404` hit on S3. `template.yaml` defines a `CustomErrorResponse` in CloudFront mapping `404/403` to `/index.html` with a `200` status. The Nex.js client router intercepts the URL once loaded.
3. **Environment Variables**: The Next.js fetch wrapper (`src/lib/api.ts`) constructs endpoints relying on `.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=https://{api-gateway-id}.execute-api.{region}.amazonaws.com/prod
   ```

---

## 6. Execution Commands

### Local Development
```bash
# Frontend
npm run dev

# Backend (Test a Lambda Event Locally)
# Requirements: AWS SAM CLI running Docker
sam local invoke CreateExpenseFunction --event events/mock.json
```

### Full Deployment
Deploying to AWS requires two strict phases due to decoupled architecture.

**Phase 1: Build & Deploy Backend Infrastructure**
```bash
cd backend
npm install
npm run build      # esbuild bundles Lambdas to backend/dist/
cd ..
sam deploy --no-progressbar
```
*Note: Capture the `WebsiteBucketName` and `ApiUrl` from the terminal output.*

**Phase 2: Build & Sync Static Frontend**
```bash
# Ensure .env.local has the latest NEXT_PUBLIC_API_URL
npm run build
aws s3 sync out/ s3://<WebsiteBucketName> --delete
```
