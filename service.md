# Đề xuất dịch vụ AWS cho W7 EduTech - AI Study Buddy

Mục tiêu: chọn kiến trúc **production-ready cho W7 hackathon**, chi phí thấp, đáp ứng đủ 7 mandatory capabilities, bám sát Domain A EduTech, có optional capability để kéo điểm, và giải thích rõ vì sao chọn luồng Bedrock Knowledge Base + S3 Vectors thay vì tự làm retrieval bằng DynamoDB.

## Hướng chọn tổng thể

Chọn **EduTech - AI Study Buddy** với kiến trúc **serverless + Bedrock Knowledge Base + S3 Vectors**:

- Frontend tĩnh: S3 + CloudFront.
- API entry: API Gateway HTTP API.
- Backend/API orchestration: Lambda.
- AI/RAG chính: Amazon Bedrock Knowledge Base + S3 Vectors.
- Generation model: Claude Haiku hoặc model rẻ đủ chất lượng sau benchmark.
- Embedding model: Titan Text Embeddings v2 hoặc embedding model được Bedrock KB support.
- Data persistence: DynamoDB on-demand.
- Object storage: S3 private bucket.
- Upload path: API tạo S3 presigned URL, browser upload trực tiếp lên S3.
- KB ingestion input: Bedrock KB chỉ ingest từ prefix `kb-input/`.
- PDF preprocessing: pypdf/pdfplumber kiểm tra chất lượng text trước ingestion; Textract/Tesseract chỉ là fallback khi PDF scan/table/image-heavy.
- Retrieval: Bedrock KB retrieve từ S3 Vectors; không tự lưu chunks vào DynamoDB trong path chính.
- Không dùng OpenSearch Serverless / RDS / NAT Gateway trong bản demo đầu tiên để tránh fixed cost và giảm rủi ro.

**Định vị dùng để trình bày:** đây là production-ready theo bar W7: live URL, AI thật, persistent state, IAM least privilege, monitoring, cost discipline, và RAG AWS-native. Chưa phải production SaaS đầy đủ; những gap còn lại là auth hoàn chỉnh, retry/DLQ sâu hơn, tenant isolation nghiêm ngặt hơn, CI/CD và rollback.

## Vì sao dùng Bedrock KB + S3 Vectors, không tự làm DynamoDB lexical retrieval?

Domain A không chỉ yêu cầu “upload PDF rồi hỏi đáp”, mà yêu cầu **Document Intelligence**: citation về slide, retrieval quality measurement, conscious chunking decision, và failure mode mitigation. Vì vậy path chính nên dùng dịch vụ sinh ra cho RAG thay vì tự làm keyword search đơn giản.

| Lựa chọn | Vì sao chọn / không chọn |
|---|---|
| **Bedrock KB + S3 Vectors** | Chọn làm path chính. Bedrock KB xử lý parsing/chunking/embedding/retrieval; S3 Vectors là vector store AWS-managed, không có fixed OCU như OpenSearch Serverless. Dễ defend là kiến trúc RAG production-oriented. |
| DynamoDB lexical retrieval | Không chọn làm path chính vì lexical search dễ miss câu hỏi paraphrase, khó chứng minh semantic retrieval quality, và phải tự viết nhiều logic chunk/retrieve/citation. Chỉ giữ làm fallback khẩn cấp nếu KB setup bị block trong 48h. |
| OpenSearch Serverless | Không chọn cho W7 vì có fixed OCU cost, dễ thành cost driver lớn nhất, trong khi S3 Vectors đủ cho demo và rẻ hơn. |
| Textract everywhere | Không chọn mặc định vì pure-text slides sẽ overpay. Chỉ dùng fallback khi pypdf/pdfplumber cho thấy text density thấp hoặc slide scan/table khó đọc. |

## Mapping 7 mandatory capabilities

| W7 requirement | Dịch vụ đề xuất | Lý do |
|---|---|---|
| 1. User Interface / Entry | S3 static hosting + CloudFront HTTPS + API Gateway HTTP API | CloudFront cho public HTTPS URL rẻ và nhanh. API Gateway HTTP API rẻ hơn REST API, đủ cho demo backend. |
| 2. Application Compute | AWS Lambda | Serverless, không tốn tiền khi idle, phù hợp API orchestration, upload session, preprocessing, ingestion status, và Bedrock calls. |
| 3. AI / ML Feature | Bedrock Knowledge Base + S3 Vectors + Bedrock generation model | Dùng AI thật từ app. Hỗ trợ RAG Q&A, citations, study guide, flashcards, quiz. |
| 4. Data Persistence | DynamoDB on-demand | Lưu user state, document metadata, ingestion status, study guide, flashcards, quiz history, studied topics. Không lưu retrieval chunks trong path chính. |
| 5. Object Storage | S3 private bucket | Lưu raw PDF và normalized KB input. Bật Block Public Access và SSE-S3 hoặc SSE-KMS. |
| 6. Network Foundation | Managed services + IAM isolation; VPC endpoints nếu cần hardening | DynamoDB/S3/Bedrock không có DB public-facing như RDS. Access qua IAM least privilege; nếu cần network foundation sâu hơn thì Lambda đặt trong VPC và dùng endpoints, không cần NAT Gateway. |
| 7. Identity & Access | IAM least privilege + Cognito/JWT nếu kịp; demo fallback bằng test user | IAM least privilege là bắt buộc. Cognito + JWT authorizer production hơn, nhưng W7 cho phép cắt scope bằng demo user nếu thiếu thời gian. |

## Domain A EduTech requirements coverage

| Domain A yêu cầu | Cách đáp ứng trong thiết kế |
|---|---|
| Upload lecture slides | User upload PDF qua S3 presigned URL; bản gốc lưu ở `raw/`, bản cho KB ingest nằm ở `kb-input/`. |
| One-page study guide với 5 concepts dễ ra thi nhất | Lambda dùng Retrieve hoặc RetrieveAndGenerate từ KB, rồi gọi generation model tạo study guide đúng 5 ý chính. |
| Flashcard set | Lambda dùng chunks retrieved từ KB để sinh flashcards dạng `front/back`, lưu DynamoDB để mở lại sau. |
| Quiz | Lambda sinh **10 câu multiple-choice** từ nội dung retrieved, có đáp án đúng và giải thích ngắn. |
| Q&A có citation về slide cụ thể | KB trả retrieval citations; file markdown fallback giữ marker `Slide N`. Nếu ingest raw PDF, kiểm tra citation output trong probe questions và ghi evidence. |
| Track topics studied this week | DynamoDB lưu `StudyEvent` theo `user_id`, `topic`, `doc_id`, `week_start`; dashboard query theo tuần hiện tại. |
| Document intelligence khó hơn store/retrieve PDF | Preprocessing Lambda đo text density, quyết định raw PDF hay normalized markdown trước khi KB ingest. Đây là bước chứng minh team hiểu chất lượng input, không chỉ upload PDF vào KB một cách mù quáng. |
| Measured retrieval quality | Evidence Pack ghi precision@k hoặc response-relevance Likert trên ít nhất 5 probe questions từ chính lecture file demo. |
| Conscious chunking decision | Chọn chunking strategy của Bedrock KB trước khi tạo data source; nếu slide có bảng/hình phức tạp thì cân nhắc advanced parsing. Ghi trade-off và measurement. |
| Failure mode discovered + mitigated | Ghi ít nhất một query bị sai, ví dụ câu hỏi về bảng/hình bị retrieve sai; mitigation là dùng normalized markdown, thêm slide markers, hoặc fallback Textract/OCR. |

## S3 prefix strategy

Dùng một bucket private, tách prefix rõ ràng:

```text
s3://studybot-docs/raw/{user_id}/{doc_id}/lecture.pdf
s3://studybot-docs/kb-input/{user_id}/{doc_id}/lecture.pdf
s3://studybot-docs/kb-input/{user_id}/{doc_id}/lecture.md
```

Quy tắc:

- `raw/` là bản gốc để audit, download, debug extraction.
- `kb-input/` là **prefix duy nhất** Bedrock KB được phép ingest.
- Nếu PDF quality OK: copy raw PDF sang `kb-input/{user_id}/{doc_id}/lecture.pdf`.
- Nếu PDF quality poor: tạo normalized `.md` hoặc `.txt`, upload sang `kb-input/{user_id}/{doc_id}/lecture.md`.
- Không để KB ingest cả `raw/` và `kb-input/` để tránh duplicate chunks.

Câu defend:

> Raw/ là bản gốc để audit và download. kb-input/ là bản duy nhất Bedrock KB ingest. Nếu PDF tốt thì kb-input chứa bản PDF gốc copy sang; nếu PDF kém thì kb-input chứa Markdown đã normalize. Cách này tránh duplicate ingestion và giúp kiểm soát chất lượng dữ liệu đưa vào RAG.

## AI flow để demo

1. User vào CloudFront URL và chọn lecture PDF.
2. Frontend gọi API Gateway `POST /uploads` để tạo upload session.
3. Lambda tạo `doc_id`, ghi DynamoDB status `UPLOADING`, và trả về S3 presigned URL trỏ tới `raw/{user_id}/{doc_id}/lecture.pdf`.
4. Browser upload file trực tiếp lên S3 private bucket.
5. S3 `ObjectCreated` event kích hoạt preprocessing Lambda.
6. Preprocessing Lambda cập nhật status `CHECKING_EXTRACTION`, chạy pypdf/pdfplumber để đo text quality:
   - `avg_chars_per_page`
   - `empty_pages_ratio`
   - `table_detected`
   - `scan_or_image_heavy`
7. Lambda chọn source cho KB:
   - Nếu PDF text quality OK: copy raw PDF sang `kb-input/{user_id}/{doc_id}/lecture.pdf`.
   - Nếu PDF text quality poor: fallback pypdf/pdfplumber/Textract/Tesseract, tạo `lecture.md` hoặc `lecture.txt`, upload sang `kb-input/{user_id}/{doc_id}/lecture.md`.
8. Lambda lưu DynamoDB metadata:
   - `PK = USER#<user_id>`
   - `SK = DOC#<doc_id>`
   - `raw_s3_key`
   - `kb_source_key`
   - `extraction_strategy = RAW_PDF | PYPDF_MARKDOWN | TEXTRACT_MARKDOWN`
   - `avg_chars_per_page`, `empty_pages_ratio`, `fallback_pages`
   - `status = READY_FOR_KB_INGESTION`
9. Lambda gọi Bedrock `StartIngestionJob` cho Knowledge Base data source scoped vào `kb-input/`.
10. Frontend poll `GET /documents/{doc_id}`; Lambda poll/get ingestion status và cập nhật DynamoDB `INGESTING | READY | FAILED`.
11. Khi user hỏi câu hỏi:
   - Lambda kiểm tra document status `READY`.
   - Lambda gọi Bedrock KB `RetrieveAndGenerate` để lấy answer + citations.
   - Nếu cần prompt/citation control tốt hơn, Lambda gọi `Retrieve` trước rồi gọi Bedrock Converse với custom prompt.
   - Q&A event được ghi vào DynamoDB.
12. Khi user tạo study guide/flashcards/quiz:
   - Lambda dùng `Retrieve` để lấy context từ KB.
   - Lambda gọi Bedrock Converse/InvokeModel với prompt riêng.
   - Study guide trả về đúng 5 concepts dễ ra thi nhất.
   - Flashcards trả về danh sách question/answer cards.
   - Quiz trả về 10 câu multiple-choice, đáp án đúng, và giải thích ngắn.
   - Kết quả lưu DynamoDB để mở lại và hiển thị dashboard.
13. Dashboard tuần này query DynamoDB `StudyEvent` để hiển thị topics đã học.

## DynamoDB data model

DynamoDB không lưu retrieval chunks trong path chính. Nó chỉ lưu metadata, status, và sản phẩm học tập.

```text
PK = USER#<user_id>
SK = DOC#<doc_id>
  doc_id
  raw_s3_key
  kb_source_key
  status
  extraction_strategy
  kb_ingestion_job_id
  avg_chars_per_page
  empty_pages_ratio
  created_at

PK = USER#<user_id>
SK = STUDY_GUIDE#<doc_id>
  content
  generated_at

PK = USER#<user_id>
SK = FLASHCARDS#<doc_id>
  cards[]
  generated_at

PK = USER#<user_id>
SK = QUIZ#<doc_id>
  questions[]
  generated_at

PK = USER#<user_id>
SK = STUDY_EVENT#<week_start>#<timestamp>
  topic
  doc_id
  activity
```

## Short-term memory và long-term memory

Trong kiến trúc này, cần tách rõ hai loại dữ liệu:

- **Bedrock KB + S3 Vectors** là document knowledge index: dùng để retrieve kiến thức từ lecture slides.
- **DynamoDB** là app memory: dùng để lưu trạng thái học tập, session, lịch sử, quiz, flashcards, và dashboard của user.

Vì vậy phần memory của app sẽ lưu trong **DynamoDB**, không lưu trong S3 Vectors.

### Short-term memory

Short-term memory là context của phiên học hiện tại. Dùng để làm trải nghiệm chat/study mượt hơn và giúp user quay lại session gần nhất.

Ví dụ DynamoDB item:

```text
PK = USER#<user_id>
SK = SESSION#<session_id>
  current_doc_id
  active_topic
  recent_questions[]
  recent_answers[]
  last_activity_at
  ttl
```

Dữ liệu nên lưu:

- document user đang học;
- 5-10 câu hỏi/trả lời gần nhất;
- topic đang học;
- quiz/flashcard đang mở;
- thời điểm hoạt động cuối cùng.

Có thể đặt TTL 1-7 ngày để tự dọn session cũ.

### Long-term memory

Long-term memory là hồ sơ học tập lâu dài của user. Đây là phần giúp đáp ứng user story Domain A: **track which topics have been studied this week in a personal dashboard**.

Ví dụ DynamoDB item theo topic:

```text
PK = USER#<user_id>
SK = MEMORY#TOPIC#<topic_id>
  topic_name
  last_studied_at
  times_reviewed
  quiz_attempts
  average_score
  weak_points[]
  source_doc_ids[]
```

Ví dụ DynamoDB event log:

```text
PK = USER#<user_id>
SK = STUDY_EVENT#<week_start>#<timestamp>
  doc_id
  topic
  activity = ask | study_guide | flashcard | quiz
  score
  created_at
```

Dữ liệu nên lưu:

- topics đã học trong tuần;
- quiz scores theo topic;
- flashcard progress;
- weak topics;
- study history;
- uploaded documents;
- study guide/quiz/flashcard outputs đã generate.

### Vì sao không dùng Bedrock Agent Memory?

Không nên dùng Bedrock Agent Memory cho W7 vì tăng complexity và không bắt buộc. DynamoDB đủ để chứng minh persistent state, short-term session memory, và long-term learning memory trong 48h.

Câu defend:

> RAG knowledge nằm trong Bedrock KB + S3 Vectors. User/application memory nằm trong DynamoDB. Short-term memory lưu session context và recent Q&A; long-term memory lưu study events, weak topics, quiz scores, flashcard progress. Chúng em tách knowledge retrieval khỏi user learning memory để dễ kiểm soát privacy, cost, và persistence.

## Feature nên demo

Minimum happy path:

- Upload lecture PDF bằng presigned URL.
- Preprocessing quyết định `RAW_PDF` hoặc `PYPDF_MARKDOWN/TEXTRACT_MARKDOWN`.
- Bedrock KB ingestion hoàn tất, document chuyển sang `READY`.
- Chat/Q&A dựa trên KB, có citation.
- Tạo one-page study guide với 5 concepts dễ ra thi nhất.
- Tạo flashcard set từ lecture.
- Tạo quiz **10 câu** multiple-choice từ uploaded notes.
- Dashboard hiển thị topics đã học trong tuần này.
- Mở lại session mới vẫn thấy document, study guide, flashcards, câu hỏi, quiz history, và studied topics đã lưu.

Custom feature để có điểm Criterion I:

- **Quiz generation theo mức độ khó**: easy / medium / hard.
- **Retrieval quality panel**: show 5 probe questions, expected slide, retrieved citation, và relevance score để chứng minh measurement.

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
  - Bedrock KB ingestion started/succeeded/failed.
  - Bedrock retrieve/generate request count.
  - Document upload count custom metric.
  - Preprocessing fallback count.
- Custom metrics từ Lambda:
  - `DocumentsUploaded`
  - `PreprocessSucceeded`
  - `PreprocessFallbackUsed`
  - `KBIngestionStarted`
  - `KBIngestionSucceeded`
  - `KBIngestionFailed`
  - `QuestionsAsked`
  - `StudyGuidesGenerated`
  - `FlashcardsGenerated`
  - `QuizGenerated`
- Alarm:
  - Lambda errors > 0 trong 5 phút, hoặc
  - API 5xx > 0, hoặc
  - `KBIngestionFailed` > 0.
- Log Insights query:
  - tìm lỗi trong Lambda logs.
  - thống kê số request theo endpoint.
  - lọc theo `correlation_id`, `doc_id`, hoặc `kb_ingestion_job_id`.
- Log retention: đặt retention 7-14 ngày, không để unlimited.

Production best practice nếu có thời gian:

- Structured JSON logs.
- Correlation ID từ API request đến Lambda logs.
- CloudTrail evidence cho Bedrock KB ingestion calls.
- Embedded Metric Format/Powertools nếu team dùng Python/TypeScript quen tay; nếu không, `PutMetricData` vẫn đủ cho W7 evidence.

## Bonus nên nhắm tới

Nên chọn 2 bonus khả thi:

| Bonus | Có nên làm? | Lý do |
|---|---:|---|
| E. IaC full coverage | Nên | Dùng SAM/CloudFormation. Không tăng cost, tăng điểm architecture/QnA, dễ teardown. |
| H. Tổng chi phí < $30 + teardown sạch | Nên | S3 Vectors tránh fixed OCU của OpenSearch Serverless, phù hợp cost discipline. |
| F. AI safety mechanism | Nếu còn thời gian | Có thể làm prompt guard/custom filter đơn giản, hoặc Bedrock Guardrails nếu setup kịp. |
| C. Custom domain + HTTPS | Không ưu tiên | CloudFront default HTTPS đã đủ mandatory; custom domain mất thêm thời gian DNS/ACM. |
| A. Multi-region failover | Không nên | Quá nặng cho 48h. |

## Chiến lược tối ưu chi phí

Những dịch vụ nên tránh:

- **NAT Gateway**: có fixed hourly cost và data processing cost. Chỉ dùng nếu bắt buộc.
- **OpenSearch Serverless**: có minimum OCU, dễ thành fixed cost lớn nhất của project.
- **RDS**: có hourly cost, cần subnet/security/connection management. DynamoDB đủ cho metadata/demo state.
- **Textract mọi PDF**: chỉ dùng fallback cho PDF scan/table-heavy; pure-text slide nên để KB ingest raw PDF hoặc dùng pypdf/pdfplumber check nhẹ.
- **Claude Sonnet trong dev loop**: chỉ dùng nếu Haiku không đạt chất lượng sau khi test.

Những lựa chọn nên dùng:

- API Gateway **HTTP API** thay vì REST API.
- S3 **presigned URL** cho upload để tránh API Gateway payload limit và giảm Lambda duration.
- Bedrock KB + **S3 Vectors** thay vì OpenSearch Serverless nếu region hỗ trợ.
- DynamoDB **on-demand** cho metadata/status/history.
- Lambda memory bắt đầu 512MB; tăng 1024MB nếu preprocessing PDF chậm và đo lại duration.
- S3 + CloudFront cho frontend.
- Bedrock model rẻ nhất đạt chất lượng, benchmark 5-10 câu hỏi trước khi chốt.
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
- Bedrock KB service role chỉ đọc prefix `kb-input/` và chỉ ghi/query đúng S3 Vectors index.
- Lambda role chỉ có quyền cần thiết:
  - `s3:GetObject`, `s3:PutObject`, `s3:CopyObject` trên bucket project.
  - `dynamodb:GetItem`, `PutItem`, `Query`, `UpdateItem` trên table project.
  - `bedrock-agent:StartIngestionJob`, `bedrock-agent:GetIngestionJob` trên KB/data source.
  - `bedrock-agent-runtime:Retrieve`, `RetrieveAndGenerate` trên KB.
  - `bedrock-runtime:Converse` hoặc `bedrock:InvokeModel` trên model đã chọn nếu dùng custom generation.
  - `cloudwatch:PutMetricData` nếu dùng custom metric.
  - `logs:CreateLogStream`, `logs:PutLogEvents`.
- Không commit AWS keys.
- Dùng environment variables cho config không nhạy cảm: table name, bucket name, KB id, data source id, model id.
- Không để secret trong environment variables; nếu có secret thì dùng SSM Parameter Store hoặc Secrets Manager.
- Validate input tại API boundary: file type, file size, user_id/doc_id, prompt length.

Auth khuyến nghị:

- **Production-oriented path:** Cognito User Pool + API Gateway JWT authorizer. JWT claim `sub` làm `user_id`.
- **Hackathon fallback:** hardcoded test user hoặc `X-User-Id` cho demo. Nếu dùng fallback, phải nói rõ đây là scope cut cho W7, không phải production auth.

## Decision blocks nên đưa vào Evidence Pack

### Decision 1: Bedrock KB + S3 Vectors thay vì DynamoDB lexical retrieval

**Decision:** Dùng Bedrock Knowledge Base backed by S3 Vectors làm RAG path chính cho Q&A trên lecture slides.

**Alternatives considered:**

- DynamoDB lexical retrieval: rẻ và dễ code, nhưng kém semantic retrieval, dễ miss paraphrase, và phải tự viết chunk/retrieve/citation logic.
- OpenSearch Serverless vector store: mạnh và phổ biến, nhưng có fixed OCU cost, không tối ưu cho $100 hard cap.
- Bedrock KB + S3 Vectors: AWS-native, ít code hơn, không có fixed OCU như OpenSearch Serverless, phù hợp hackathon cost discipline.

**Measurement nên thu thập:**

- Precision@k hoặc response-relevance Likert trên ít nhất 5 probe questions.
- Retrieval citation có trỏ đúng slide/chunk không.
- Latency p50/p95 cho Q&A.
- Estimated cost của S3 Vectors vs OpenSearch Serverless trong 48h.

**Trade-off accepted:**

- Setup KB/S3 Vectors cần kiểm tra region availability và IAM kỹ hơn DynamoDB lexical.
- Đổi lại retrieval production-oriented hơn và dễ defend hơn trong QnA.

### Decision 2: `kb-input/` prefix duy nhất cho KB ingestion

**Decision:** Bedrock KB chỉ ingest từ `kb-input/`, không ingest trực tiếp từ `raw/`.

**Alternatives considered:**

- KB ingest trực tiếp `raw/`: đơn giản hơn khi PDF OK, nhưng dễ duplicate nếu sau đó tạo bản normalized.
- KB ingest cả `raw/` và `kb-input/`: dễ cấu hình sai, có thể retrieve cả raw và processed version của cùng document.
- Dùng `kb-input/` duy nhất: rõ ràng, kiểm soát quality tốt, dễ debug và teardown.

**Measurement nên thu thập:**

- Số document trong `kb-input/` bằng số document intended for ingestion.
- Không có duplicate result trong top-k retrieval.
- Ingestion success/failure count theo `doc_id`.

**Trade-off accepted:**

- PDF OK cần copy thêm từ `raw/` sang `kb-input/`, tốn thêm một object S3 rất nhỏ.
- Đổi lại tránh duplicate ingestion và dễ giải thích kiến trúc.

### Decision 3: Hybrid preprocessing thay vì Textract mặc định

**Decision:** Dùng pypdf/pdfplumber để kiểm tra text quality trước; chỉ fallback Textract/Tesseract khi text density thấp hoặc slide scan/table/image-heavy.

**Alternatives considered:**

- Textract cho mọi PDF: mạnh hơn với table/form/scanned pages, nhưng overpay cho pure-text slides và tăng chi phí theo số trang.
- Bedrock Vision đọc từng slide image: tốt hơn cho diagram/figure-heavy deck, nhưng latency và cost cao cho demo 40-slide.
- Không preprocess: ít code nhất, nhưng khó chứng minh Domain A Core Challenge nếu gặp slide scan/table/figure-heavy.

**Measurement nên thu thập:**

- Text density theo từng slide/page.
- Tỷ lệ page extract sạch bằng pypdf/pdfplumber trên lecture demo.
- Số page phải fallback OCR/Textract.
- Extraction/preprocessing latency p50/p95 và estimated cost per upload.

**Trade-off accepted:**

- Pipeline phức tạp hơn upload thẳng vào KB.
- Đổi lại đáp ứng đúng Core Challenge của Domain A: có xử lý chất lượng input, có fallback path, và có measurement.

### Decision 4: Claude Haiku/model rẻ thay vì Sonnet trong dev

**Decision:** Dùng Claude Haiku hoặc model rẻ đủ chất lượng cho study guide/Q&A/flashcards/quiz trong dev và demo mặc định.

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
          -> write/read DynamoDB metadata and status
          -> start/get Bedrock KB ingestion job
          -> call Bedrock KB RetrieveAndGenerate for Q&A
          -> call Bedrock Retrieve + Converse for study guide/flashcards/quiz
          -> write study events for weekly topic dashboard
          -> publish CloudWatch metrics/logs
  -> S3 private bucket
      -> raw/{user_id}/{doc_id}/lecture.pdf
      -> kb-input/{user_id}/{doc_id}/lecture.pdf OR lecture.md
  -> Preprocessing Lambda
      -> pypdf/pdfplumber text quality check
      -> copy raw PDF to kb-input/ if quality OK
      -> create normalized markdown via fallback if quality poor
  -> Bedrock Knowledge Base
      -> data source scoped to kb-input/
      -> parse/chunk/embed selected source
      -> store vectors in S3 Vectors
  -> DynamoDB
      -> user state, doc metadata, ingestion status
      -> study guide, flashcards, quiz history, studied topics
  -> CloudWatch Dashboard/Alarms/Logs Insights
```

Security notes:

- CloudFront public, S3 frontend origin configured safely.
- Upload bucket private, Block Public Access bật.
- Raw document objects encrypted at rest.
- KB input prefix controlled; KB không ingest `raw/` để tránh duplicate.
- API Gateway dùng JWT authorizer nếu kịp; fallback test user cho W7 demo.
- Lambda role scoped theo ARN/prefix, không dùng wildcard rộng.
- Bedrock KB service role scoped to `kb-input/` and S3 Vectors index.
- DynamoDB không public-facing như RDS; access qua IAM, và có VPC endpoint nếu Lambda đặt trong VPC.
- Không commit AWS keys hoặc secrets.

## W7 production-ready vs production SaaS thật

**Đủ tốt cho W7:**

- Live HTTPS URL.
- AI invocation thật từ app.
- Persistent state trong DynamoDB.
- File upload vào S3 private bucket.
- Bedrock KB + S3 Vectors RAG path.
- Study guide, flashcards, 10-question quiz, Q&A citation, và weekly topic dashboard.
- Non-trivial document preprocessing có fallback path và measurement.
- Retrieval quality measurement trên ít nhất 5 probe questions.
- IAM least privilege baseline.
- Cost discipline dưới $30 nếu không dùng fixed-cost services.
- Observability có dashboard, metric, alarm, log query.

**Chưa đủ cho production SaaS thật:**

- Nếu dùng `X-User-Id` fallback thì auth chưa an toàn; production cần Cognito/JWT hoặc auth provider thật.
- Tenant isolation cần enforce bằng auth claims, KB metadata filters, IAM/data model, và test cross-user leakage.
- Ingestion async cần retry/DLQ rõ hơn nếu xử lý nhiều files.
- Cần CI/CD, IaC đầy đủ, canary/rollback, dependency scanning, và alarm set đầy đủ nếu launch thật.
- Cần chính sách retention/delete cho raw files, kb-input files, vector entries, và DynamoDB records.

## Cách defend trong QnA

**Vì sao không tự extract/chunk/lưu chunks vào DynamoDB?**

"Vì core feature là RAG trên lecture slides. Bedrock Knowledge Base đã xử lý parsing/chunking/embedding/retrieval và trả citations. Nếu tự làm bằng DynamoDB lexical retrieval thì rẻ nhưng kém semantic, dễ miss paraphrase, và phải tự viết nhiều logic. Chúng em chỉ dùng pypdf/pdfplumber/Textract trước ingestion để kiểm soát chất lượng input, không dùng chúng làm retrieval engine chính."

**Vì sao vẫn cần pypdf/pdfplumber nếu dùng Bedrock KB?**

"Không phải để thay KB. pypdf/pdfplumber là quality gate trước ingestion. Nếu PDF text tốt, KB ingest bản PDF. Nếu PDF scan/table-heavy, chúng em tạo markdown/txt sạch hơn rồi cho KB ingest bản đã normalize. Cách này đáp ứng Domain A vì chúng em chứng minh có xử lý document intelligence, không chỉ upload PDF mù quáng."

**Vì sao dùng S3 Vectors thay vì OpenSearch Serverless?**

"OpenSearch Serverless có fixed OCU cost và dễ thành cost driver trong 48h. S3 Vectors là AWS-managed vector store, setup nhẹ hơn và phù hợp $100 hard cap. Với demo traffic W7, S3 Vectors đủ cho RAG path và dễ defend về cost discipline."

**Vì sao DynamoDB vẫn xuất hiện?**

"DynamoDB không dùng để lưu retrieval chunks trong path chính. DynamoDB lưu state của app: user, document metadata, ingestion status, study guide, flashcards, quiz history, và studied topics. Retrieval thuộc về Bedrock KB + S3 Vectors."

**DynamoDB/VPC defend:**

"DynamoDB là managed service với IAM-based access control, không có public/private subnet concept như RDS. Chúng em implement least-privilege IAM roles để isolate access. Việc không dùng VPC cho path mặc định giúp tránh NAT Gateway cost và giảm cold start latency. Nếu trainer yêu cầu network foundation rõ hơn, Lambda có thể đặt trong VPC và dùng Gateway Endpoint cho S3/DynamoDB cùng Interface Endpoint cho Bedrock, vẫn không cần NAT Gateway."

## Kết luận

Lựa chọn phù hợp nhất cho team:

**EduTech Study Buddy + S3/CloudFront + API Gateway HTTP API + Lambda + S3 presigned upload + pypdf/pdfplumber quality gate + Bedrock Knowledge Base + S3 Vectors + DynamoDB metadata/state + CloudWatch Observability + SAM/CloudFormation.**

Kiến trúc này đáp ứng đủ 7 mandatory, bám sát Domain A, production-oriented hơn DynamoDB lexical retrieval, có Optional #8 để kéo điểm, có Bonus E và H khả thi, chi phí thấp, và dễ giải thích trong QnA. Nếu KB/S3 Vectors bị block bởi region/model access trong 48h, fallback khẩn cấp mới là DynamoDB lexical retrieval.