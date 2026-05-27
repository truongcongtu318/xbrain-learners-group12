# Đề xuất dịch vụ AWS cho W7 EduTech - AI Study Buddy

Mục tiêu: chọn kiến trúc **production-ready cho W7 hackathon**, chi phí thấp, có đủ 7 yêu cầu bắt buộc, có optional capability để kéo điểm, và vẫn nói rõ những khoảng cách nếu đưa lên production SaaS thật.

## Hướng chọn tổng thể

Chọn **EduTech - AI Study Buddy** với kiến trúc **serverless, cost-aware, production-oriented**:

- Frontend tĩnh: S3 + CloudFront.
- API entry: API Gateway HTTP API.
- Backend: Lambda.
- AI: Amazon Bedrock InvokeModel, ưu tiên Claude Haiku hoặc model rẻ đủ chất lượng sau benchmark.
- Database: DynamoDB on-demand.
- File storage: S3 private bucket.
- Upload path: API tạo S3 presigned URL, browser upload trực tiếp lên S3.
- Ingestion: S3 upload event kích hoạt Lambda xử lý extraction/chunking, lưu trạng thái vào DynamoDB.
- PDF extraction MVP: pypdf/pdfplumber trước, fallback Textract hoặc Tesseract khi text density thấp hoặc gặp slide scan/table.
- Retrieval MVP: chunk text lưu DynamoDB, truy hồi lexical/keyword top-k, đưa context vào Bedrock.
- Retrieval production target: Bedrock Knowledge Base + S3 Vectors nếu region hỗ trợ và team có thời gian benchmark.
- Không dùng OpenSearch Serverless / RDS / NAT Gateway trong bản demo đầu tiên để tránh fixed cost và giảm rủi ro.

**Định vị dùng để trình bày:** đây là production-ready theo bar W7: live URL, AI thật, persistent state, IAM least privilege, monitoring, cost discipline. Chưa phải production SaaS đầy đủ; những gap còn lại là auth hoàn chỉnh, semantic retrieval, async retry/DLQ sâu hơn, và tenant isolation nghiêm ngặt hơn.

## Mapping 7 mandatory capabilities

| W7 requirement | Dịch vụ đề xuất | Lý do |
|---|---|---|
| 1. User Interface / Entry | S3 static hosting + CloudFront HTTPS + API Gateway HTTP API | CloudFront cho public HTTPS URL rẻ và nhanh. API Gateway HTTP API rẻ hơn REST API, đủ cho demo backend. |
| 2. Application Compute | AWS Lambda | Serverless, không tốn tiền khi idle, phù hợp request/response và ingestion workload nhỏ. |
| 3. AI / ML Feature | Amazon Bedrock InvokeModel | Dùng AI thật từ app. Hỗ trợ summary, Q&A, quiz/flashcard generation. |
| 4. Data Persistence | DynamoDB on-demand | Lưu user state, document metadata, chunk text, quiz history, ingestion status. Chi phí rất thấp với demo traffic. |
| 5. Object Storage | S3 private bucket | Lưu PDF/TXT upload và file gốc. Bật Block Public Access và SSE-S3 hoặc SSE-KMS. |
| 6. Network Foundation | VPC tối giản + VPC endpoints nếu Lambda đặt trong VPC; không dùng NAT Gateway | Không có DB public-facing. DynamoDB/S3 được bảo vệ bằng IAM; nếu dùng VPC thì đi qua Gateway Endpoint cho S3/DynamoDB và Interface Endpoint cho Bedrock. |
| 7. Identity & Access | IAM least privilege + Cognito/JWT nếu kịp; demo fallback bằng test user | IAM least privilege là bắt buộc. Cognito + JWT authorizer production hơn, nhưng W7 cho phép cắt scope bằng demo user nếu thiếu thời gian. |

## Domain A EduTech requirements coverage

| Domain A yêu cầu | Cách đáp ứng trong thiết kế |
|---|---|
| Upload lecture slides | User upload PDF/TXT qua S3 presigned URL; file gốc lưu trong S3 private bucket. |
| One-page study guide với 5 concepts dễ ra thi nhất | Lambda lấy chunks đã xử lý, gọi Bedrock tạo summary một trang và đúng 5 ý chính. |
| Flashcard set | Bedrock sinh danh sách flashcards dạng `front/back`, lưu vào DynamoDB để mở lại sau. |
| Quiz | Bedrock sinh **10 câu multiple-choice** từ uploaded notes, có đáp án đúng và giải thích ngắn. |
| Q&A có citation về slide cụ thể | Mỗi chunk lưu `slide_number`, `doc_id`, `chunk_id`; câu trả lời phải kèm citation như `slide 12, chunk 3`. |
| Track topics studied this week | DynamoDB lưu `StudiedTopic`/`StudyEvent` theo `user_id`, `topic`, `doc_id`, `week_start`; dashboard query theo tuần hiện tại. |
| Document intelligence khó hơn store/retrieve PDF | Extraction pipeline xử lý text, table-like blocks, figure captions nếu extract được, và fallback OCR/Textract cho slide scan/text density thấp. |
| Measured retrieval quality | Evidence Pack ghi precision@k hoặc response-relevance Likert trên ít nhất 5 probe questions từ chính lecture file demo. |
| Conscious chunking decision | Benchmark chunk 500-800 tokens, lưu overlap và đo top-k relevance/latency để bảo vệ quyết định. |
| Failure mode discovered + mitigated | Ghi ít nhất một query bị sai, ví dụ câu hỏi về hình/table bị lexical retrieval miss; mitigation là thêm caption/table extraction, tăng overlap, hoặc fallback Textract/OCR. |

## AI flow để demo

1. User vào CloudFront URL và chọn lecture PDF/TXT.
2. Frontend gọi API Gateway `POST /uploads` để tạo upload session.
3. Lambda tạo `doc_id`, ghi metadata DynamoDB với status `UPLOADING`, và trả về S3 presigned URL.
4. Browser upload file trực tiếp lên S3 private bucket bằng presigned URL.
5. S3 object-created event kích hoạt ingestion Lambda.
6. Ingestion Lambda cập nhật status `PROCESSING`, extract text, đo text density theo từng slide/page, fallback OCR/Textract cho slide scan hoặc bảng/hình khó đọc.
7. Lambda chia chunk 500-800 tokens, có overlap nhỏ và giữ metadata citation.
8. Metadata và chunks lưu vào DynamoDB:
   - `PK = USER#<user_id>`
   - `SK = DOC#<doc_id>` cho metadata
   - `SK = DOC#<doc_id>#CHUNK#<chunk_id>` cho chunk
   - `slide_number`, `chunk_id`, `section_title`, `text_density`
   - `status = UPLOADING | PROCESSING | READY | FAILED`
9. Frontend poll `GET /documents/{doc_id}` đến khi status `READY`.
10. Khi user hỏi câu hỏi:
   - Lambda query chunks của user/doc từ DynamoDB.
   - Tính điểm keyword/lexical match.
   - Chọn top 3-5 chunks làm context.
   - Gọi Bedrock InvokeModel để trả lời dựa trên context.
   - Prompt bắt buộc model trả lời kèm citation về `slide_number` và `chunk_id`.
11. Khi user tạo study guide/flashcards/quiz:
   - Lambda dùng chunks đã chọn hoặc toàn bộ outline để gọi Bedrock.
   - Study guide trả về đúng 5 concepts dễ ra thi nhất.
   - Flashcards trả về danh sách question/answer cards.
   - Quiz trả về 10 câu multiple-choice, đáp án đúng, và giải thích ngắn.
12. Kết quả trả về UI và được ghi vào DynamoDB để chứng minh persistent state và dashboard theo tuần.

## Feature nên demo

Minimum happy path:

- Upload lecture note bằng presigned URL.
- Thấy trạng thái document chuyển từ `PROCESSING` sang `READY`.
- Tạo one-page study guide với 5 concepts dễ ra thi nhất.
- Chat/Q&A dựa trên nội dung đã upload, có citation về slide cụ thể.
- Tạo flashcard set từ lecture.
- Tạo quiz **10 câu** multiple-choice từ uploaded notes.
- Dashboard hiển thị topics đã học trong tuần này.
- Mở lại session mới vẫn thấy document, study guide, flashcards, câu hỏi, quiz history, và studied topics đã lưu.

Custom feature để có điểm Criterion I:

- **Quiz generation theo mức độ khó**: easy / medium / hard.
- **Retrieval quality panel**: show 5 probe questions, expected slide, retrieved slide, và relevance score để chứng minh measurement.

## Optional capability nên chọn

Chọn **Optional #8 - Full Observability**.

Lý do:

- Rẻ hơn và dễ chứng minh hơn Advanced Security phức tạp.
- Không cần service mới đắt tiền.
- Rất hợp rubric vì deployment/evidence chiếm 40%.
- Chứng minh được production thinking bằng metric, alarm, log query thật.

Cần làm:

- CloudWatch dashboard có ít nhất:
  - Lambda invocations/errors/duration.
  - API Gateway 4xx/5xx.
  - Bedrock request count custom metric.
  - Document upload count custom metric.
  - Ingestion failures custom metric.
- Custom metrics từ Lambda:
  - `DocumentsUploaded`
  - `DocumentsProcessed`
  - `QuestionsAsked`
  - `BedrockCalls`
  - `QuizGenerated`
  - `IngestionFailed`
- Alarm:
  - Lambda errors > 0 trong 5 phút, hoặc
  - API 5xx > 0, hoặc
  - `IngestionFailed` > 0.
- Log Insights query:
  - tìm lỗi trong Lambda logs.
  - thống kê số request theo endpoint.
  - lọc theo `correlation_id` hoặc `doc_id`.
- Log retention: đặt retention 7-14 ngày, không để unlimited.

Production best practice nếu có thời gian:

- Structured JSON logs.
- Correlation ID từ API request đến Lambda logs.
- Embedded Metric Format/Powertools nếu team dùng Python/TypeScript quen tay; nếu không, `PutMetricData` vẫn đủ cho W7 evidence.

## Bonus nên nhắm tới

Nên chọn 2 bonus khả thi:

| Bonus | Có nên làm? | Lý do |
|---|---:|---|
| E. IaC full coverage | Nên | Dùng SAM/CloudFormation. Không tăng cost, tăng điểm architecture/QnA, dễ teardown. |
| H. Tổng chi phí < $30 + teardown sạch | Nên | Kiến trúc serverless này có khả năng dưới $30 rất cao nếu không dùng NAT/OpenSearch/RDS. |
| F. AI safety mechanism | Nếu còn thời gian | Có thể làm prompt guard/custom filter đơn giản, không cần thêm service. |
| C. Custom domain + HTTPS | Không ưu tiên | CloudFront default HTTPS đã đủ mandatory; custom domain mất thêm thời gian DNS/ACM. |
| A. Multi-region failover | Không nên | Quá nặng cho 48h. |

## Chiến lược tối ưu chi phí

Những dịch vụ nên tránh:

- **NAT Gateway**: có fixed hourly cost và data processing cost. Chỉ dùng nếu bắt buộc.
- **OpenSearch Serverless**: có minimum OCU, dễ thành fixed cost lớn nhất của project.
- **RDS**: có hourly cost, cần subnet/security/connection management. DynamoDB đủ cho demo.
- **Claude Sonnet trong dev loop**: chỉ dùng nếu Haiku không đạt chất lượng sau khi test.

Những lựa chọn nên dùng:

- API Gateway **HTTP API** thay vì REST API.
- S3 **presigned URL** cho upload để tránh API Gateway payload limit và giảm Lambda duration.
- DynamoDB **on-demand**.
- Lambda memory bắt đầu 512MB; tăng 1024MB nếu PDF parsing chậm và đo lại duration.
- S3 + CloudFront cho frontend.
- Bedrock model rẻ nhất đạt chất lượng, benchmark 5-10 câu hỏi trước khi chốt.
- S3/DynamoDB Gateway Endpoint nếu Lambda chạy trong VPC; Bedrock Interface Endpoint nếu cần private routing.
- Xóa resource thừa mỗi ngày.
- Tag mọi resource:
  - `Project=W7Capstone`
  - `Team=G<N>`
  - `Owner=<name>`
  - `Environment=hackathon`

Mục tiêu chi phí thực tế: **dưới $10-20 trong 48h** nếu traffic demo nhỏ và không dùng NAT/OpenSearch/RDS. Mục tiêu bonus: **dưới $30**. Tránh claim dưới $5 nếu kiến trúc quá mỏng, vì W7 có under-deployment flag.

## Security và production guardrails

Bắt buộc nên có:

- S3 bucket Block Public Access.
- S3 server-side encryption: SSE-S3 là đủ cho W7; SSE-KMS nếu chọn Advanced Security.
- IAM Lambda role chỉ có quyền cần thiết:
  - `s3:GetObject`, `s3:PutObject` trên bucket project.
  - `dynamodb:GetItem`, `PutItem`, `Query`, `UpdateItem` trên table project.
  - `bedrock:InvokeModel` trên model đã chọn.
  - `cloudwatch:PutMetricData` nếu dùng custom metric.
  - `logs:CreateLogStream`, `logs:PutLogEvents`.
- Không commit AWS keys.
- Dùng environment variables cho config không nhạy cảm: table name, bucket name, model id.
- Không để secret trong environment variables; nếu có secret thì dùng SSM Parameter Store hoặc Secrets Manager.
- Validate input tại API boundary: file type, file size, user_id/doc_id, prompt length.

Auth khuyến nghị:

- **Production-oriented path:** Cognito User Pool + API Gateway JWT authorizer. JWT claim `sub` làm `user_id`.
- **Hackathon fallback:** hardcoded test user hoặc `X-User-Id` cho demo. Nếu dùng fallback, phải nói rõ đây là scope cut cho W7, không phải production auth.

## Decision blocks nên đưa vào Evidence Pack

### Decision 1: Hybrid PDF extraction thay vì Textract mặc định

**Decision:** Dùng pypdf/pdfplumber trước cho text-heavy PDFs, fallback Tesseract hoặc Textract khi text density thấp, slide scan, hoặc table/figure caption bị mất.

**Alternatives considered:**

- Textract cho mọi PDF: mạnh hơn với table/form/scanned pages, nhưng overpay cho pure-text slides và tăng chi phí theo số trang.
- Bedrock Vision đọc từng slide image: tốt hơn cho diagram/figure-heavy deck, nhưng latency và cost cao cho demo 40-slide.
- pypdf only: rẻ và nhanh, nhưng fail với image-based slides và bảng/hình phức tạp.

**Measurement nên thu thập:**

- Text density theo từng slide/page, ví dụ ký tự trên mỗi page.
- Tỷ lệ page extract sạch bằng pypdf/pdfplumber trên lecture demo.
- Số page phải fallback OCR/Textract.
- Extraction latency p50/p95 và estimated cost per upload.

**Trade-off accepted:**

- Pipeline phức tạp hơn pypdf only.
- Đổi lại đáp ứng đúng Core Challenge của Domain A: không chỉ store/retrieve PDF, mà có xử lý slide scan/table/figure caption và có measurement.

### Decision 2: Presigned S3 upload thay vì upload file qua API Gateway/Lambda

**Decision:** Dùng S3 presigned URL để browser upload lecture file trực tiếp lên S3 private bucket.

**Alternatives considered:**

- Upload qua API Gateway -> Lambda -> S3: đơn giản hơn để code, nhưng bị giới hạn payload, Lambda giữ connection lâu, và tốn duration cho việc copy file.
- Public S3 upload bucket: nhanh để demo nhưng sai security baseline vì user có thể ghi document vào bucket nếu policy lỗi.

**Measurement nên thu thập:**

- File size demo lớn nhất, ví dụ 5-10MB PDF.
- Upload latency với presigned URL.
- Lambda duration giảm vì Lambda chỉ tạo URL, không stream file.
- Số lỗi upload trong CloudWatch/API Gateway.

**Trade-off accepted:**

- Flow phức tạp hơn một bước: API tạo URL, browser upload S3, ingestion Lambda xử lý sau.
- Đổi lại production hơn, scale tốt hơn, và tránh payload limit.

### Decision 3: DynamoDB lexical retrieval thay vì Bedrock KB + OpenSearch Serverless trong MVP

**Decision:** Dùng DynamoDB để lưu chunks và lexical top-k retrieval cho demo EduTech.

**Alternatives considered:**

- Bedrock Knowledge Base + OpenSearch Serverless: retrieval semantic tốt hơn, nhưng có fixed cost và thêm provisioning risk.
- Bedrock Knowledge Base + S3 Vectors: rẻ hơn OpenSearch, production hơn lexical, nhưng cần kiểm tra region availability và team chưa chắc đã quen setup.

**Measurement nên thu thập:**

- 10 câu hỏi test trên 1-2 lecture files.
- Response relevance điểm 1-5.
- Precision@k: top 3 chunks có chứa nội dung đúng không.
- Latency p50/p95 cho query.
- Estimated cost của DynamoDB lexical vs OpenSearch/S3 Vectors trong 48h.

**Trade-off accepted:**

- Lexical retrieval kém semantic hơn vector search, dễ miss câu hỏi paraphrase.
- Đổi lại chi phí thấp, dễ debug, dễ giải thích, đủ cho scope demo nếu measurement đạt ngưỡng.

### Decision 4: Claude Haiku/model rẻ thay vì Sonnet trong dev

**Decision:** Dùng Claude Haiku hoặc model rẻ đủ chất lượng cho summary/Q&A/quiz trong dev và demo mặc định.

**Alternatives considered:**

- Claude Sonnet: chất lượng cao hơn, nhưng đắt hơn và không cần thiết nếu Haiku đạt ngưỡng trên sample queries.
- Llama/Titan/Cohere/Mistral: cần benchmark nhanh theo task nếu có thời gian và model access có sẵn.

**Measurement nên thu thập:**

- 5-10 prompt mẫu.
- Điểm chất lượng câu trả lời 1-5.
- Token/cost ước tính mỗi query.
- Latency mỗi query.

**Trade-off accepted:**

- Câu trả lời có thể kém sâu hơn Sonnet.
- Đổi lại cost thấp và phù hợp hard cap $100.
- Chỉ upgrade lên model đắt hơn nếu có evidence chất lượng tốt hơn đáng kể.

## Kiến trúc để vẽ trong slide

Flow:

```text
Browser
  -> CloudFront HTTPS
  -> S3 static frontend
  -> API Gateway HTTP API
      -> Lambda API handlers
          -> create presigned upload URL
          -> query DynamoDB document/status/chunks
          -> call Bedrock InvokeModel for study guide/Q&A/flashcards/quiz
          -> write study events for weekly topic dashboard
          -> publish CloudWatch metrics/logs
  -> S3 private bucket: raw lecture files
      -> S3 ObjectCreated event
      -> Lambda ingestion worker
          -> extract text with pypdf/pdfplumber
          -> fallback OCR/Textract for low text density pages
          -> chunk text with slide_number/chunk_id citation metadata
          -> write metadata/chunks/status to DynamoDB
  -> DynamoDB: user state, docs, chunks, study guide, flashcards, quiz history, studied topics
  -> Bedrock InvokeModel: summary, Q&A, quiz
  -> CloudWatch Dashboard/Alarms/Logs Insights
```

Security notes:

- CloudFront public, S3 frontend origin configured safely.
- Upload bucket private, Block Public Access bật.
- Raw document objects encrypted at rest.
- API Gateway dùng JWT authorizer nếu kịp; fallback test user cho W7 demo.
- Lambda role scoped theo ARN, không dùng wildcard rộng.
- DynamoDB không public-facing như RDS; access qua IAM, và có VPC endpoint nếu Lambda đặt trong VPC.
- Không commit AWS keys hoặc secrets.

## W7 production-ready vs production SaaS thật

**Đủ tốt cho W7:**

- Live HTTPS URL.
- AI invocation thật từ app.
- Persistent state trong DynamoDB.
- File upload vào S3 private bucket.
- Study guide, flashcards, 10-question quiz, Q&A citation theo slide, và weekly topic dashboard.
- Non-trivial document extraction có fallback path và measurement.
- Retrieval quality measurement trên ít nhất 5 probe questions.
- IAM least privilege baseline.
- Cost discipline dưới $30 nếu không dùng fixed-cost services.
- Observability có dashboard, metric, alarm, log query.

**Chưa đủ cho production SaaS thật:**

- Nếu dùng `X-User-Id` fallback thì auth chưa an toàn; production cần Cognito/JWT hoặc auth provider thật.
- Lexical retrieval chưa đủ mạnh cho paraphrase/semantic questions; production nên benchmark Bedrock KB + S3 Vectors hoặc vector store khác.
- Ingestion async cần retry/DLQ rõ hơn nếu xử lý nhiều files.
- Multi-tenant isolation cần enforce bằng auth claims, IAM/data model, và retrieval filter nghiêm ngặt.
- Cần CI/CD, IaC đầy đủ, canary/rollback, dependency scanning, và alarm set đầy đủ nếu launch thật.

## Cách defend trong QnA

"DynamoDB là managed service với IAM-based access control, không có public/private subnet concept như RDS. Chúng em implement least-privilege IAM roles để isolate access. Việc không dùng VPC cho path mặc định giúp tránh NAT Gateway cost ($1.08/day) và giảm cold start latency, phù hợp với cost optimization goal (<$30). Nếu trainer yêu cầu network foundation rõ hơn, Lambda có thể đặt trong VPC và dùng Gateway Endpoint cho S3/DynamoDB cùng Interface Endpoint cho Bedrock, vẫn không cần NAT Gateway."

## Kết luận

Lựa chọn phù hợp nhất cho team:

**EduTech Study Buddy + S3/CloudFront + API Gateway HTTP API + Lambda + S3 presigned upload + async ingestion Lambda + DynamoDB + Bedrock InvokeModel + CloudWatch Observability + SAM/CloudFormation.**

Kiến trúc này đáp ứng đủ 7 mandatory, production-oriented hơn bản upload trực tiếp qua Lambda, có Optional #8 để kéo điểm, có Bonus E và H khả thi, chi phí thấp, và dễ giải thích trong QnA. Nếu còn thời gian sau khi happy path ổn định, nâng cấp tiếp theo nên là Cognito/JWT và semantic retrieval bằng Bedrock KB + S3 Vectors.
