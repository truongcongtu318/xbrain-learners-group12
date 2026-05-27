# De xuat dich vu AWS cho W7 EduTech - AI Study Buddy

Muc tieu: chon kien truc re nhat co the, van dap ung day du 7 yeu cau bat buoc cua W7, co optional capability de keo diem, va co bonus kha thi.

## Huong chon tong the

Chon **EduTech - AI Study Buddy** voi kien truc **serverless toi gian**:

- Frontend tinh: S3 + CloudFront.
- Backend: API Gateway HTTP API + Lambda.
- AI: Amazon Bedrock InvokeModel, uu tien Claude Haiku hoac model re du chat luong.
- Database: DynamoDB on-demand.
- File storage: S3 private bucket.
- Retrieval: chunk text luu DynamoDB, truy hoi lexical/keyword top-k, dua context vao Bedrock.
- Khong dung OpenSearch Serverless / Bedrock Knowledge Base trong ban demo dau tien de tranh fixed cost va giam rui ro.

## Mapping 7 mandatory capabilities

| W7 requirement | Dich vu de xuat | Ly do |
|---|---|---|
| 1. User Interface | S3 static hosting + CloudFront HTTPS | Re, don gian, co HTTPS qua CloudFront, trainer mo duoc public URL. |
| 2. Application Compute | API Gateway HTTP API + AWS Lambda | Serverless, khong ton tien khi idle, phu hop happy path hackathon. |
| 3. AI / ML Feature | Amazon Bedrock InvokeModel | Dung AI that tu app. Ho tro summary, Q&A, quiz/flashcard. |
| 4. Data Persistence | DynamoDB on-demand | Luu user state, document metadata, chunk text, quiz history. Chi phi rat thap voi demo traffic. |
| 5. Object Storage | S3 private bucket | Luu PDF/TXT upload va file goc. Bat Block Public Access. |
| 6. Network Foundation | VPC toi gian + private resources; tranh NAT Gateway | DB khong public. Neu Lambda can vao VPC thi dung VPC endpoints cho S3/DynamoDB/Bedrock thay vi NAT Gateway. |
| 7. Identity & Access | IAM least privilege + demo user/header `X-User-Id` | IAM least privilege la bat buoc. User login khong bat buoc, nen dung demo user de tiet kiem thoi gian. |

## AI flow de demo

1. User upload lecture PDF/TXT.
2. Lambda nhan file qua API Gateway.
3. File goc duoc luu vao S3 private bucket.
4. Lambda extract text.
5. Text duoc chia chunk 500-800 tokens.
6. Metadata va chunks luu vao DynamoDB:
   - `PK = USER#<user_id>`
   - `SK = DOC#<doc_id>` cho metadata
   - `SK = DOC#<doc_id>#CHUNK#<chunk_id>` cho chunk
7. Khi user hoi cau hoi:
   - Lambda lay chunks cua user/doc tu DynamoDB.
   - Tinh diem keyword/lexical match.
   - Chon top 3-5 chunks lam context.
   - Goi Bedrock InvokeModel de tra loi dua tren context.
8. Ket qua tra ve UI kem citation/chunk source.

## Feature nen demo

Minimum happy path:

- Upload lecture note.
- Tao summary 5 y chinh.
- Chat/Q&A dua tren noi dung da upload.
- Tao quiz 5 cau trac nghiem.
- Mo lai session moi van thay document da upload.

Custom feature de co diem Criterion I:

- **Quiz generation theo muc do kho**: easy / medium / hard.
- Hoac **flashcard generation**: tao question/answer cards tu lecture.

## Optional capability nen chon

Chon **Optional #8 - Full Observability**.

Ly do:

- Re hon va de chung minh hon Advanced Security phuc tap.
- Khong can service moi dat tien.
- Rat hop rubric vi deployment/evidence chiem 40%.

Can lam:

- CloudWatch dashboard co it nhat:
  - Lambda invocations/errors.
  - API Gateway 4xx/5xx.
  - Bedrock request count custom metric.
  - Document upload count custom metric.
- Custom metrics tu Lambda:
  - `DocumentsUploaded`
  - `QuestionsAsked`
  - `BedrockCalls`
  - `QuizGenerated`
- Alarm:
  - Lambda errors > 0 trong 5 phut, hoac
  - API 5xx > 0.
- Log Insights query:
  - tim loi trong Lambda logs.
  - thong ke so request theo endpoint.

## Bonus nen nham toi

Nen chon 2 bonus kha thi:

| Bonus | Co nen lam? | Ly do |
|---|---:|---|
| E. IaC full coverage | Nen | Dung SAM/CloudFormation. Khong tang cost, tang diem architecture/QnA. |
| H. Tong chi phi < $30 + teardown sach | Nen | Kien truc serverless nay co kha nang duoi $30 rat cao. |
| F. AI safety mechanism | Neu con thoi gian | Co the lam prompt guard/custom filter don gian, khong can them service. |
| C. Custom domain + HTTPS | Khong uu tien | CloudFront default HTTPS da du mandatory; custom domain mat them thoi gian DNS/ACM. |
| A. Multi-region failover | Khong nen | Qua nang cho 48h. |

## Chien luoc toi uu chi phi

Nhung dich vu nen tranh:

- **NAT Gateway**: co fixed hourly cost va data processing cost. Chi dung neu bat buoc.
- **OpenSearch Serverless**: co minimum OCU, de thanh fixed cost lon nhat cua project.
- **RDS**: co hourly cost, can subnet/security/connection management. DynamoDB du cho demo.
- **Claude Sonnet trong dev loop**: chi dung neu Haiku khong dat chat luong sau khi test.

Nhung lua chon nen dung:

- API Gateway **HTTP API** thay vi REST API.
- DynamoDB **on-demand**.
- Lambda memory vua du, bat dau 512MB hoac 1024MB neu PDF parsing cham.
- S3 + CloudFront cho frontend.
- Bedrock model re nhat dat chat luong, benchmark 5-10 cau hoi truoc khi chot.
- Xoa resource thua moi ngay.
- Tag moi resource:
  - `Project=W7Capstone`
  - `Team=G<N>`
  - `Owner=<name>`
  - `Environment=hackathon`

Muc tieu chi phi thuc te: **duoi $5-10 trong 48h** neu traffic demo nho va khong dung NAT/OpenSearch/RDS. Muc tieu bonus: **duoi $30**.

## Decision blocks nen dua vao Evidence Pack

### Decision 1: DynamoDB lexical retrieval thay vi Bedrock KB + OpenSearch Serverless

**Decision:** Dung DynamoDB de luu chunks va lexical top-k retrieval cho demo EduTech.

**Alternatives considered:**

- Bedrock Knowledge Base + OpenSearch Serverless: retrieval semantic tot hon, nhung co fixed cost va them provisioning risk.
- Bedrock Knowledge Base + S3 Vectors: re hon OpenSearch, nhung can kiem tra region availability va team chua chac da quen setup.

**Measurement nen thu thap:**

- 10 cau hoi test tren 1-2 lecture files.
- Response relevance diem 1-5.
- Latency p50/p95 cho query.
- Estimated cost cua DynamoDB vs OpenSearch trong 48h.

**Trade-off accepted:**

- Lexical retrieval kem semantic hon vector search.
- Doi lai chi phi thap, de debug, de giai thich, du cho scope demo.

### Decision 2: Claude Haiku/model re thay vi Sonnet trong dev

**Decision:** Dung Claude Haiku hoac model re du chat luong cho summary/Q&A/quiz.

**Alternatives considered:**

- Claude Sonnet: chat luong cao hon, nhung dat hon va khong can thiet cho happy path.
- Llama/Titan/Cohere/Mistral: can benchmark nhanh theo task neu co thoi gian.

**Measurement nen thu thap:**

- 5-10 prompt mau.
- Diem chat luong cau tra loi.
- Token/cost uoc tinh moi query.
- Latency moi query.

**Trade-off accepted:**

- Cau tra loi co the kem sau hon Sonnet.
- Doi lai cost thap va phu hop hard cap $100.

## Kien truc de ve trong slide

Flow:

```text
Browser
  -> CloudFront HTTPS
  -> S3 static frontend
  -> API Gateway HTTP API
  -> Lambda backend
      -> S3 private bucket: raw lecture files
      -> DynamoDB: user state, docs, chunks, quiz history
      -> Bedrock InvokeModel: summary, Q&A, quiz
      -> CloudWatch Logs/Metrics
```

Security notes:

- S3 bucket block public access.
- Lambda role chi co quyen can thiet:
  - `s3:GetObject`, `s3:PutObject` tren bucket project.
  - `dynamodb:GetItem`, `PutItem`, `Query`, `UpdateItem` tren table project.
  - `bedrock:InvokeModel` tren model da chon.
  - `cloudwatch:PutMetricData`.
  - `logs:CreateLogStream`, `logs:PutLogEvents`.
- Khong commit AWS keys.
- Dung environment variables cho config.

## Ket luan

Lua chon phu hop nhat cho team:

**EduTech Study Buddy + S3/CloudFront + API Gateway HTTP API + Lambda + DynamoDB + S3 + Bedrock InvokeModel + CloudWatch Observability + SAM/CloudFormation.**

Kien truc nay dap ung du 7 mandatory, co Optional #8 de keo diem, co Bonus E va H kha thi, chi phi thap, va de giai thich trong QnA.


Cách defend trong QnA:

"DynamoDB là managed service với IAM-based access control, không có public/private subnet concept như RDS. Chúng em đã implement least-privilege IAM roles để isolate access. Việc không dùng VPC giúp tránh NAT Gateway cost ($1.08/day) và giảm cold start latency, phù hợp với cost optimization goal (<$30)."