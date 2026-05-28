# Week 7 — Evidence Pack

- [Project Group 12](https://github.com/truongcongtu318/xbrain-learners-group12)
- [Evidence Pack](#evidence-pack)
- [Live URL](https://truongtudev.id.vn/)
- [Section 1 - Cover](#section-1-cover)
- [Section 2 - Pitch and Vision](#section-2-pitch-and-vision)
- [Section 3 - Architecture](#section-3-architecture)
- [Section 4 - Cost Deployment](#section-4-cost-deployment)
- [Section 5 - Security](#section-5-security)
- [Section 6 - Monitoring](#section-6-monitoring)
- [Section 6.5 - Measurement & Decisions](#section-65-measurement--decisions)
- [Section 7 - Lesson Learned](#section-7-lesson-learned)
- [Section 8 - Teardown Plan](#section-8-teardown-plan)


# Section 1. Cover

- Group number: 12
- Member names
  - Ngô Nguyên Phúc
  - Huỳnh Nguyễn Ngọc Tân
  - Tạ Hoàng Huy
  - Trương Công Tú
  - Trần Quang Minh
  - Nguyễn Minh Hoàng
  - Lý Ngọc Hiếu
  - Nguyễn Vũ Hoàng
  - Võ Văn Tuấn Anh
  - Nguyễn Trúc Quỳnh

# Section 2. Pitch and Vision

- **Product Name**: StudyBot (AI Study Buddy)
- **Tagline**: Upload your lecture slides. Get a study guide, flashcard set, and quiz in seconds.
- **Target Audience**: University students, self-learners, and exam-prep candidates facing overwhelming amounts of lecture slides and study materials.
- **Problem Statement**: Students often struggle to extract key testable concepts from bulky lecture slide decks (which contain tables, multi-column layouts, and figures) and have no easy way to quiz themselves or ask questions with direct citations back to the source slides.
- **Value Proposition**: StudyBot uses an intelligent AWS-powered RAG (Retrieval-Augmented Generation) engine to process slide decks, extract structured knowledge, and provide instant summaries, slide-cited Q&A, and auto-generated quizzes. It saves dozens of study hours while grounding every answer in the actual course slides to prevent hallucinations.

# Section 3. Architecture

![Architecture W7](./images/W7-architect.png)

StudyBot is designed with robust network isolation, cost efficiency, and modularity in mind. The architecture implements the 7 mandatory capabilities:

1. **User-Facing Entry (Capability #1)**: 
   - **Frontend Serving**: Amazon CloudFront serving a responsive static Web UI from an Amazon S3 bucket. HTTPS is enabled using CloudFront's default domain `*.cloudfront.net` (zero configuration cost).
   - **API Entry**: Amazon API Gateway (HTTP API) serving as the edge router, forwarding clients' requests securely to our backend compute.
2. **Application Compute (Capability #2)**:
   - **Compute Layer**: AWS Lambda running Python 3.12, handling incoming POST `/upload`, `/query`, and `/quiz` endpoints. Compute is completely stateless, scaling automatically to handle concurrent student queries.
3. **AI / ML Feature (Capability #3)**:
   - **Bedrock Knowledge Bases**: Used to orchestrate the entire RAG pipeline. Document chunking, vector generation, and vector index retrieval are abstracted via Bedrock KBs.
   - **Foundation Model**: Amazon Bedrock utilizing `anthropic.claude-3-5-haiku-20241022-v1:0` for fast, highly accurate, and cost-effective text generation.
   - **Embeddings Model**: `cohere.embed-english-v3` or `amazon.titan-embed-text-v2` for highly accurate vector representations.
4. **Data Persistence (Capability #4)**:
   - **Session & User State**: Amazon DynamoDB storing user session histories, generated flashcards, and student quiz scores. Features on-demand scaling for zero base cost.
5. **Object Storage (Capability #5)**:
   - **Document Storage**: Amazon S3 standard bucket for storing raw uploaded lecture slides. Scoped with strict bucket policies and lifecycle rules.
6. **Network Foundation (Capability #6)**:
   - **VPC Hardening**: Lambda compute runs inside private subnets in our custom VPC. 
   - **Gateway Endpoints**: S3 and DynamoDB are reached via free VPC Gateway Endpoints, avoiding NAT Gateway traffic charges.
   - **Interface Endpoints**: Bedrock runtime is reached via a secure VPC Interface Endpoint in our private subnet, keeping all traffic within AWS backbone networks.
7. **Identity & Access Baseline (Capability #7)**:
   - **IAM Security**: Execution roles apply strict least-privilege policies. Lambda can only write to specific DynamoDB tables, invoke specific Bedrock models, and access the designated S3 bucket.

# Section 4. Cost Deployment

Our architecture is optimized to stay well under the **$100 cap**. By choosing Serverless compute (Lambda), on-demand DynamoDB, and free Gateway endpoints, we successfully avoided high fixed-cost infrastructure (like NAT Gateways or active EC2 instances).

### 4.1 Cost Breakdown (ap-southeast-1 Singapore Pricing)

Below is our cost deployment report. 

> [!NOTE]
> Please insert the actual numbers and screenshots from your Cost Explorer (`Team=G12` filter) during deployment.

| Service | Calculation & Usage | Deployed Cost ($) |
|---------|---------------------|-------------------|
| **AWS Lambda** | `[Insert actual number]` invocations | `$ [Insert actual cost]` |
| **API Gateway HTTP** | `[Insert actual number]` requests | `$ [Insert actual cost]` |
| **Bedrock Claude 3.5 Haiku** | `[Insert actual input/output tokens]` | `$ [Insert actual cost]` |
| **Bedrock Embeddings** | Ingestion of `[Insert actual number]` documents | `$ [Insert actual cost]` |
| **Vector Database (S3 Vectors / OpenSearch)** | `[Insert actual vector usage details]` | `$ [Insert actual cost]` |
| **DynamoDB** | `[Insert actual write/read capacity units consumed]` | `$ [Insert actual cost]` |
| **Amazon S3** | `[Insert actual storage size and request counts]` | `$ [Insert actual cost]` |
| **CloudFront** | Outbound data transfer | `$ [Insert actual cost]` |
| **VPC Interface Endpoint** | Bedrock access endpoint prorated | `$ [Insert actual cost]` |
| **KMS Customer Managed Key** | Prorated for 48 hours | `$ [Insert actual cost]` |
| **Total Spend** | **For the 48-hour build and demo window** | **`$ [Insert total cost]`** |

### 4.2 Cost Discipline Strategy

- **NAT Gateway Avoidance**: NAT Gateway costs $1.08/day plus transfer fees. We bypassed this by utilizing a **VPC Gateway Endpoint** for S3 and DynamoDB, and a single **VPC Interface Endpoint** for Amazon Bedrock. This reduced base networking costs by over 90%.
- **Development Model Choice**: We strictly used `Claude 3.5 Haiku` ($1.00/M input, $5.00/M output) during the development and debugging loops instead of `Claude 3.5 Sonnet` ($3.00/M input, $15.00/M output), saving significant developer budget.
- **Budget Alerts**: Deployed an AWS Budget at $100 with an email notification threshold set at **$80 (80%)** via SNS. Cost Anomaly Detection was turned on immediately.
- **Tagging Strategy**: Applied `Project=W7Capstone`, `Team=G12`, `Owner=Group12`, and `Environment=hackathon` tags to all resources for precise tracking in Cost Explorer.

# Section 5. Security

We hardened our StudyBuddy application by targeting **Advanced Security (Capability #10)**:

1. **Least-Privilege IAM Roles**:
   - The backend Lambda execution role has no wildcard `*` actions. It is scoped to specific resources (e.g. `arn:aws:dynamodb:...:table/StudyBotState` for `PutItem` and `GetItem`).
   - S3 bucket policy strictly enforces SSL-only access and rejects non-KMS encrypted uploads.
2. **Data Encryption at Rest & in Transit**:
   - **At Rest**: Utilized an AWS KMS Customer Managed Key (CMK) with automated key rotation to encrypt the raw document S3 bucket and the DynamoDB tables.
   - **In Transit**: All API requests and frontend distributions are served strictly over **TLS 1.2 / TLS 1.3** via CloudFront and HTTPS API Gateway.
3. **Network Isolation**:
   - Compute Lambdas are placed in private subnets.
   - Security Groups enforce strict traffic limits: the databases and backend APIs accept incoming requests *only* from the specific security groups associated with the API Gateway or Lambda compute, blocking all external/public ingress.

# Section 6. Monitoring

We implemented **Full Observability (Capability #8)** to track application health:

- **CloudWatch Dashboard**: A centralized dashboard tracking Lambda duration, concurrency, error rates, and API Gateway integration latencies.
- **Custom Metric**: Published custom metric `StudyBot/DocumentsIngested` each time a student successfully uploads a document and embeds it into the Bedrock Knowledge Base.
- **CloudWatch Alarms**: Configured a CloudWatch Alarm on Lambda `Errors` metric that sends an immediate email alert via AWS SNS if error rates exceed `[Insert actual threshold, e.g., 2 in a 5-minute window]`.
- **Saved Log Insights Queries**: Built and saved queries to filter for `ERROR` and `WARNING` strings in the Lambda log streams for easy live triage:
  ```sql
  fields @timestamp, @message
  | filter @message like /ERROR/
  | sort @timestamp desc
  | limit 50
  ```

> [!NOTE]
> Please fill out your active monitoring statistics below:
> - **Total Documents Ingested**: `[Insert actual number]`
> - **Average Lambda Latency**: `[Insert actual average latency, e.g., 1.8 seconds]`
> - **Total API Gateway Requests**: `[Insert actual number]`
> - **Current Alarm Status**: `[OK / ALARM]`

# Section 6.5. Measurement & Decisions

### Document Intelligence Strategy

Slide decks present non-trivial data extraction challenges (tables, diagrams, text layouts).
- **Parser Decision**: We benchmarked two extraction approaches:
  - *Approach 1*: Pure text extraction via `pdfplumber` running inside Lambda.
  - *Approach 2*: Amazon Textract for table/layout awareness.
  - *Decision*: We used a **Hybrid strategy**. We parsed text-heavy slides using `pdfplumber` (saving costs, running locally in Lambda for free). If the extracted characters per page fell below a threshold of `[Insert actual threshold, e.g., 100 characters]`, the system automatically fell back to calling Amazon Bedrock Vision or Textract to read image-based pages.
- **Chunking Rationale**: We selected **Semantic Chunking** instead of a fixed character window. This groups sliding notes by context boundaries, keeping bullet points on the same slide intact to preserve study context.

# Section 7. Lesson Learned

1. **Beware the NAT Gateway**: During Day 1, we observed a rapid burn rate. We quickly identified that deploying a NAT Gateway consumes a constant base cost of $1.08/day. Migrating to VPC Gateway and Interface Endpoints instantly cut our running cost.
2. **Speed Over Perfection**: In a 48-hour build window, generic hardcoded test users are far more practical than setting up a complete production-grade Cognito flow with password reset emails.
3. **Data Quality Drives RAG Quality**: An embeddings model cannot search what it cannot parse. Spending extra effort on layout-aware slide parsing paid massive dividends in retrieval precision.
4. **Automated Budget Guardrails**: Setting a budget at $100 and an alert at $80 gave us the confidence to experiment without the constant fear of a surprise credit card bill.

# Section 8. Teardown Plan

To ensure zero continuing personal AWS costs after the hackathon, we will execute this teardown plan by **Sunday 1/6 EOD**:

1. **Delete Vector Storage**: Evict the Bedrock Knowledge Base and tear down the vector index (OpenSearch Serverless collection or S3 Vectors).
2. **Empty & Delete S3 Buckets**: S3 buckets cannot be deleted while containing files. We will empty all uploaded student slides and frontend build files from our S3 buckets, then delete the buckets.
3. **Delete DynamoDB Tables**: Delete the session and state DynamoDB tables.
4. **Delete Compute & API Layers**: Delete AWS Lambda backend functions, Lambda layers, and the API Gateway HTTP API.
5. **Disable CDN**: Delete the CloudFront distribution.
6. **Clean Up Networking**: Delete VPC Interface Endpoints, subnets, and our custom VPC.
7. **Clean Up IAM & KMS**: Delete Customer Managed KMS Keys and IAM roles created specifically for this capstone.
8. **Verification**: Take a Cost Explorer screenshot on Monday to confirm daily spend drops to exactly $0.00.