# Design Document: ShramSetu AI

## Overview

ShramSetu AI is a multilingual conversational AI system that empowers Indian workers with knowledge about their labor rights through natural language interactions. The system combines NLP-based intent detection, rule-based compliance engines, and LLM-powered explanations to deliver accurate, accessible information in regional languages through voice and text interfaces.

### Core Design Principles

1. **Accessibility First**: Voice-first design for low-literacy users with multilingual support
2. **Accuracy**: Rule-based compliance calculations backed by structured legal datasets
3. **Simplicity**: LLM-generated explanations simplified for non-technical audiences
4. **Privacy**: Minimal data collection with encryption and anonymization
5. **Scalability**: Stateless architecture supporting concurrent users across channels

### Technology Stack

- **NLP & Intent Detection**: Rasa Open Source (multilingual NLU)
- **LLM Engine**: OpenAI GPT-4 or Anthropic Claude (with fallback to GPT-3.5)
- **STT Service**: Google Cloud Speech-to-Text (supports Indian languages)
- **TTS Service**: Google Cloud Text-to-Speech (supports Indian languages with natural voices)
- **Backend**: Python 3.11+ with FastAPI
- **Database**: PostgreSQL (structured data) + Redis (session state)
- **Message Queue**: Redis for async processing
- **WhatsApp Integration**: Twilio API for WhatsApp Business
- **Web Interface**: React with TypeScript
- **Deployment**: Docker containers on AWS ECS with Application Load Balancer

## Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
│  ┌──────────────────┐              ┌──────────────────┐         │
│  │  WhatsApp Bot    │              │  Web Interface   │         │
│  │  (Twilio API)    │              │  (React + TS)    │         │
│  └────────┬─────────┘              └────────┬─────────┘         │
└───────────┼──────────────────────────────────┼──────────────────┘
            │                                  │
            └──────────────┬───────────────────┘
                           │ HTTPS/TLS
            ┌──────────────▼───────────────────────────────────────┐
            │          API Gateway (FastAPI)                       │
            │  - Request validation                                │
            │  - Rate limiting                                     │
            │  - Authentication                                    │
            └──────────────┬───────────────────────────────────────┘
                           │
            ┌──────────────▼───────────────────────────────────────┐
            │         Conversation Orchestrator                    │
            │  - Session management                                │
            │  - Language detection                                │
            │  - Channel routing                                   │
            └──┬────────┬────────┬────────┬────────┬──────────────┘
               │        │        │        │        │
       ┌───────▼──┐ ┌──▼────┐ ┌─▼─────┐ ┌▼──────┐ ┌▼──────────┐
       │ STT      │ │ Intent│ │ LLM   │ │Compli-│ │ TTS       │
       │ Service  │ │Detect │ │Engine │ │ance   │ │ Service   │
       │          │ │(Rasa) │ │(GPT-4)│ │Engine │ │           │
       └───────┬──┘ └──┬────┘ └─┬─────┘ └┬──────┘ └┬──────────┘
               │       │         │        │         │
               └───────┴─────────┴────────┴─────────┘
                                 │
            ┌────────────────────▼─────────────────────────────────┐
            │              Data Layer                              │
            │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
            │  │ PostgreSQL   │  │    Redis     │  │  S3       │ │
            │  │ (Labor Laws, │  │  (Sessions,  │  │ (Logs,    │ │
            │  │  Query Logs) │  │   Cache)     │  │  Backups) │ │
            │  └──────────────┘  └──────────────┘  └───────────┘ │
            └──────────────────────────────────────────────────────┘
```

### Component Interaction Flow

1. **User Input** → API Gateway validates and routes to Conversation Orchestrator
2. **Session Management** → Orchestrator retrieves/creates session from Redis
3. **Language Detection** → Identifies language from input or session context
4. **Voice Processing** (if voice input) → STT Service converts to text
5. **Intent Detection** → Rasa NLU classifies query intent and extracts entities
6. **Query Processing**:
   - **Compliance queries** → Compliance Engine applies rules from Labor Law Dataset
   - **Explanation queries** → LLM Engine generates simplified response
   - **Complaint generation** → Template Engine + LLM for customization
7. **Response Generation** → Format response in user's language
8. **Voice Synthesis** (if voice session) → TTS Service converts to audio
9. **Logging** → Async write to Query_Log in PostgreSQL
10. **Response Delivery** → Return to client through appropriate channel

## Components and Interfaces

### 1. API Gateway

**Responsibilities**:
- Request validation and sanitization
- Rate limiting (100 requests/minute per user)
- TLS termination
- Authentication for admin endpoints
- CORS handling for web interface

**Interface**:
```python
POST /api/v1/query
Request:
{
  "session_id": "uuid",
  "channel": "whatsapp" | "web",
  "input_type": "text" | "voice",
  "content": "string" | "base64_audio",
  "language": "hi" | "bn" | "ta" | "mr" | "en" | null,
  "metadata": {
    "user_id": "anonymized_id",
    "timestamp": "iso8601"
  }
}

Response:
{
  "session_id": "uuid",
  "response_type": "text" | "voice",
  "content": "string" | "base64_audio",
  "language": "hi" | "bn" | "ta" | "mr" | "en",
  "intent": "esic" | "pf" | "gratuity" | "complaint" | "compliance" | "general",
  "confidence": 0.0-1.0,
  "follow_up_needed": boolean,
  "metadata": {
    "processing_time_ms": number,
    "timestamp": "iso8601"
  }
}
```

### 2. Conversation Orchestrator

**Responsibilities**:
- Session lifecycle management
- Conversation state tracking
- Language consistency enforcement
- Component coordination
- Error handling and fallback logic

**State Machine**:
```
States:
- INIT: Initial state, language detection
- INTENT_DETECTION: Classifying user query
- COLLECTING_INFO: Gathering required parameters
- PROCESSING: Executing compliance logic or LLM generation
- RESPONDING: Formatting and delivering response
- CLARIFYING: Asking follow-up questions
- ERROR: Handling failures

Transitions:
INIT → INTENT_DETECTION (on first query)
INTENT_DETECTION → COLLECTING_INFO (if parameters needed)
INTENT_DETECTION → PROCESSING (if sufficient info)
COLLECTING_INFO → PROCESSING (when complete)
PROCESSING → RESPONDING (on success)
PROCESSING → ERROR (on failure)
RESPONDING → INIT (conversation continues)
ERROR → CLARIFYING (recoverable error)
ERROR → RESPONDING (with error message)
```

**Session Schema**:
```python
{
  "session_id": "uuid",
  "user_id": "anonymized_id",
  "channel": "whatsapp" | "web",
  "language": "hi" | "bn" | "ta" | "mr" | "en",
  "state": "INIT" | "INTENT_DETECTION" | ...,
  "conversation_history": [
    {
      "role": "user" | "assistant",
      "content": "string",
      "timestamp": "iso8601"
    }
  ],
  "current_intent": "string",
  "collected_entities": {
    "salary": number,
    "employment_duration": number,
    ...
  },
  "created_at": "iso8601",
  "last_activity": "iso8601",
  "ttl": 3600  // seconds
}
```

### 3. Intent Detector (Rasa NLU)

**Responsibilities**:
- Classify user queries into predefined intents
- Extract entities (salary, duration, dates, etc.)
- Handle multilingual input
- Provide confidence scores

**Intents**:
- `esic_eligibility`: Check ESIC eligibility
- `pf_calculation`: Calculate PF contributions
- `gratuity_info`: Gratuity eligibility and calculation
- `complaint_draft`: Generate complaint document
- `compliance_checklist`: Employer compliance requirements
- `general_info`: General labor law questions
- `language_change`: Switch conversation language
- `clarification`: User needs more explanation

**Entity Types**:
- `salary`: Numeric (monthly salary)
- `basic_salary`: Numeric
- `dearness_allowance`: Numeric
- `employment_duration`: Duration (years, months)
- `employer_size`: Numeric (employee count)
- `employment_type`: Categorical (permanent, contractual, gig)
- `industry`: Categorical
- `state`: Categorical (Indian states)
- `violation_type`: Categorical

**Training Data Structure**:
```yaml
nlu:
  - intent: esic_eligibility
    examples: |
      - क्या मैं ESIC के लिए पात्र हूं? (Hindi)
      - আমি কি ESIC এর জন্য যোগ্য? (Bengali)
      - நான் ESIC க்கு தகுதியானவரா? (Tamil)
      - मी ESIC साठी पात्र आहे का? (Marathi)
      - Am I eligible for ESIC?
      - Can I get ESIC benefits?
      - My salary is [15000](salary), am I covered under ESIC?
```

**Confidence Thresholds**:
- High confidence: ≥ 0.75 → Direct routing
- Medium confidence: 0.50-0.74 → Confirm with user
- Low confidence: < 0.50 → Ask clarifying questions

### 4. LLM Engine

**Responsibilities**:
- Generate simplified explanations of labor laws
- Rephrase complex legal text for low-literacy users
- Provide contextual examples
- Translate technical terms to regional languages

**Prompt Template**:
```python
system_prompt = """
You are ShramSetu AI, an assistant helping Indian workers understand their labor rights.

Guidelines:
1. Use simple, clear language appropriate for users with limited education
2. Avoid legal jargon; if technical terms are necessary, define them
3. Provide concrete examples relevant to the user's situation
4. Break complex concepts into short, digestible segments
5. Be empathetic and supportive in tone
6. Respond in {language} language
7. Keep responses under 200 words unless more detail is explicitly requested

Context:
- User's language: {language}
- User's query: {query}
- Intent: {intent}
- Relevant law information: {law_context}
"""

user_prompt = """
Explain the following labor law concept to a worker:

Topic: {topic}
Legal Text: {legal_text}
User's Situation: {user_context}

Provide a clear, simple explanation that helps the user understand their rights.
"""
```

**Configuration**:
- Model: GPT-4-turbo (primary), GPT-3.5-turbo (fallback)
- Temperature: 0.3 (consistent, factual responses)
- Max tokens: 500
- Timeout: 10 seconds
- Retry logic: 2 retries with exponential backoff

### 5. Compliance Engine

**Responsibilities**:
- Apply rule-based logic for eligibility assessments
- Calculate PF contributions, gratuity amounts
- Generate compliance checklists
- Reference Labor Law Dataset for current rules

**Rules Implementation**:

**ESIC Eligibility Rules**:
```python
def check_esic_eligibility(salary: float, employer_size: int, employment_type: str) -> dict:
    """
    ESIC Act 1948 Rules:
    - Applicable to establishments with 10+ employees
    - Wage ceiling: ₹21,000 per month
    - Covers employees, not independent contractors
    """
    eligible = False
    reasons = []
    
    if employer_size < 10:
        reasons.append("Employer has fewer than 10 employees")
    elif salary > 21000:
        reasons.append(f"Salary ₹{salary} exceeds ESIC wage ceiling of ₹21,000")
    elif employment_type not in ["permanent", "contractual"]:
        reasons.append("ESIC does not cover independent contractors or gig workers")
    else:
        eligible = True
        reasons.append("Meets all ESIC eligibility criteria")
    
    return {
        "eligible": eligible,
        "reasons": reasons,
        "contribution_rate_employee": 0.75,  # 0.75% of wages
        "contribution_rate_employer": 3.25,  # 3.25% of wages
        "benefits": [
            "Medical care for self and family",
            "Sickness benefit (70% of wages)",
            "Maternity benefit",
            "Disablement benefit",
            "Dependents' benefit"
        ] if eligible else []
    }
```

**PF Calculation Rules**:
```python
def calculate_pf(basic_salary: float, dearness_allowance: float) -> dict:
    """
    EPF Act 1952 Rules:
    - Applicable to establishments with 20+ employees
    - Wage ceiling: ₹15,000 per month
    - Employee contribution: 12% of (basic + DA)
    - Employer contribution: 12% (3.67% to EPF, 8.33% to EPS)
    """
    wage_base = basic_salary + dearness_allowance
    wage_ceiling = 15000
    
    # Apply ceiling
    contributory_wage = min(wage_base, wage_ceiling)
    
    employee_contribution = contributory_wage * 0.12
    employer_epf = contributory_wage * 0.0367
    employer_eps = contributory_wage * 0.0833
    employer_total = employer_epf + employer_eps
    
    return {
        "wage_base": wage_base,
        "contributory_wage": contributory_wage,
        "ceiling_applied": wage_base > wage_ceiling,
        "employee_contribution": round(employee_contribution, 2),
        "employer_contribution": round(employer_total, 2),
        "employer_epf": round(employer_epf, 2),
        "employer_eps": round(employer_eps, 2),
        "total_monthly": round(employee_contribution + employer_total, 2)
    }
```

**Gratuity Calculation Rules**:
```python
def calculate_gratuity(last_drawn_salary: float, years_of_service: float) -> dict:
    """
    Payment of Gratuity Act 1972:
    - Minimum 5 years of continuous service
    - Formula: (Last drawn salary × 15 × Years of service) / 26
    - Maximum: ₹20,00,000
    """
    eligible = years_of_service >= 5
    
    if not eligible:
        return {
            "eligible": False,
            "years_remaining": round(5 - years_of_service, 1),
            "amount": 0
        }
    
    # Calculate gratuity
    gratuity_amount = (last_drawn_salary * 15 * years_of_service) / 26
    gratuity_amount = min(gratuity_amount, 2000000)  # Cap at ₹20 lakhs
    
    return {
        "eligible": True,
        "years_of_service": years_of_service,
        "last_drawn_salary": last_drawn_salary,
        "gratuity_amount": round(gratuity_amount, 2),
        "capped": gratuity_amount >= 2000000,
        "formula_explanation": "(₹{} × 15 × {} years) / 26".format(
            last_drawn_salary, years_of_service
        )
    }
```

**Compliance Checklist Generator**:
```python
def generate_compliance_checklist(
    employee_count: int,
    industry: str,
    state: str
) -> list:
    """
    Generate applicable labor law compliance requirements
    """
    checklist = []
    
    # Universal requirements
    checklist.append({
        "law": "Payment of Wages Act 1936",
        "requirement": "Pay wages on time (within 7 days for <1000 employees)",
        "priority": "mandatory",
        "applicable": True
    })
    
    # Employee count based
    if employee_count >= 10:
        checklist.append({
            "law": "ESIC Act 1948",
            "requirement": "Register establishment and employees with ESIC",
            "priority": "mandatory",
            "applicable": True
        })
    
    if employee_count >= 20:
        checklist.append({
            "law": "EPF Act 1952",
            "requirement": "Register with EPFO and deduct PF contributions",
            "priority": "mandatory",
            "applicable": True
        })
    
    if employee_count >= 50:
        checklist.append({
            "law": "Factories Act 1948",
            "requirement": "Obtain factory license and maintain safety standards",
            "priority": "mandatory",
            "applicable": industry in ["manufacturing", "factory"]
        })
    
    # State-specific
    if state in ["Maharashtra", "Karnataka", "Tamil Nadu"]:
        checklist.append({
            "law": "Shops and Establishments Act",
            "requirement": "Register under state Shops and Establishments Act",
            "priority": "mandatory",
            "applicable": True
        })
    
    return [item for item in checklist if item["applicable"]]
```

### 6. STT Service (Google Cloud Speech-to-Text)

**Responsibilities**:
- Convert voice input to text
- Support Indian language variants
- Handle background noise and accents
- Provide transcription confidence scores

**Configuration**:
```python
stt_config = {
    "encoding": "LINEAR16",
    "sample_rate_hertz": 16000,
    "language_codes": {
        "hi": "hi-IN",  # Hindi
        "bn": "bn-IN",  # Bengali
        "ta": "ta-IN",  # Tamil
        "mr": "mr-IN",  # Marathi
        "en": "en-IN"   # English (Indian accent)
    },
    "enable_automatic_punctuation": True,
    "enable_word_confidence": True,
    "model": "default",  # Use 'phone_call' for telephony
    "use_enhanced": True,  # Enhanced model for better accuracy
    "max_alternatives": 1,
    "profanity_filter": False
}
```

**Quality Thresholds**:
- Confidence ≥ 0.85: Accept transcription
- Confidence 0.70-0.84: Accept but flag for review
- Confidence < 0.70: Request user to repeat

### 7. TTS Service (Google Cloud Text-to-Speech)

**Responsibilities**:
- Convert text responses to natural-sounding speech
- Support Indian language voices
- Maintain consistent voice per session
- Optimize audio quality for mobile networks

**Configuration**:
```python
tts_config = {
    "voices": {
        "hi": {"language_code": "hi-IN", "name": "hi-IN-Wavenet-D", "gender": "FEMALE"},
        "bn": {"language_code": "bn-IN", "name": "bn-IN-Wavenet-A", "gender": "FEMALE"},
        "ta": {"language_code": "ta-IN", "name": "ta-IN-Wavenet-A", "gender": "FEMALE"},
        "mr": {"language_code": "mr-IN", "name": "mr-IN-Wavenet-A", "gender": "FEMALE"},
        "en": {"language_code": "en-IN", "name": "en-IN-Wavenet-D", "gender": "FEMALE"}
    },
    "audio_config": {
        "audio_encoding": "MP3",
        "speaking_rate": 0.9,  # Slightly slower for clarity
        "pitch": 0.0,
        "volume_gain_db": 0.0,
        "sample_rate_hertz": 24000
    }
}
```

### 8. Complaint Draft Generator

**Responsibilities**:
- Collect violation details through conversational flow
- Generate formatted complaint documents
- Provide bilingual output (English + regional language)
- Include submission guidance

**Template Structure**:
```python
complaint_template = {
    "header": {
        "to": "The Labour Commissioner",
        "subject": "Complaint regarding {violation_type}",
        "date": "{current_date}"
    },
    "body": {
        "complainant_details": {
            "name": "{worker_name}",
            "address": "{worker_address}",
            "contact": "{worker_contact}"
        },
        "employer_details": {
            "name": "{employer_name}",
            "address": "{employer_address}",
            "industry": "{industry_type}"
        },
        "complaint_details": {
            "violation_type": "{violation_type}",
            "description": "{detailed_description}",
            "dates": "{incident_dates}",
            "evidence": "{evidence_list}",
            "relief_sought": "{requested_action}"
        }
    },
    "footer": {
        "signature": "Complainant's Signature",
        "verification": "I verify that the contents of this complaint are true to the best of my knowledge."
    }
}
```

**Violation Types**:
- Non-payment of wages
- PF/ESIC non-deduction or non-deposit
- Gratuity denial
- Wrongful termination
- Unsafe working conditions
- Discrimination or harassment
- Overtime violations

## Data Models

### Database Schema (PostgreSQL)

**Labor Laws Table**:
```sql
CREATE TABLE labor_laws (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    law_name VARCHAR(255) NOT NULL,
    act_year INTEGER,
    section VARCHAR(100),
    description TEXT NOT NULL,
    applicability_criteria JSONB,  -- {employee_count, industry, state}
    effective_date DATE NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    language VARCHAR(5) DEFAULT 'en',
    source_url TEXT,
    INDEX idx_law_name (law_name),
    INDEX idx_applicability (applicability_criteria)
);
```

**Compliance Rules Table**:
```sql
CREATE TABLE compliance_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_type VARCHAR(50) NOT NULL,  -- 'esic', 'pf', 'gratuity', etc.
    rule_name VARCHAR(255) NOT NULL,
    parameters JSONB NOT NULL,  -- {wage_ceiling, contribution_rate, etc.}
    calculation_logic TEXT,  -- Python function or formula
    effective_from DATE NOT NULL,
    effective_to DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_rule_type (rule_type),
    INDEX idx_effective_dates (effective_from, effective_to)
);
```

**Query Logs Table**:
```sql
CREATE TABLE query_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    anonymized_user_id VARCHAR(255),
    channel VARCHAR(20) NOT NULL,  -- 'whatsapp', 'web'
    language VARCHAR(5) NOT NULL,
    input_type VARCHAR(10) NOT NULL,  -- 'text', 'voice'
    query_text TEXT,
    detected_intent VARCHAR(50),
    intent_confidence DECIMAL(3,2),
    response_text TEXT,
    processing_time_ms INTEGER,
    error_occurred BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_session (session_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_intent (detected_intent),
    INDEX idx_language (language)
);
```

**User Sessions Table** (for persistent session data):
```sql
CREATE TABLE user_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anonymized_user_id VARCHAR(255),
    channel VARCHAR(20) NOT NULL,
    language VARCHAR(5),
    state VARCHAR(50),
    conversation_context JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    INDEX idx_user (anonymized_user_id),
    INDEX idx_expires (expires_at)
);
```

**Complaint Drafts Table**:
```sql
CREATE TABLE complaint_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES user_sessions(session_id),
    violation_type VARCHAR(100) NOT NULL,
    complaint_data JSONB NOT NULL,
    draft_text_english TEXT,
    draft_text_regional TEXT,
    regional_language VARCHAR(5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_session (session_id),
    INDEX idx_violation_type (violation_type)
);
```

### Redis Data Structures

**Session Cache**:
```
Key: session:{session_id}
Type: Hash
TTL: 3600 seconds (1 hour)
Fields:
  - user_id: anonymized_user_id
  - channel: whatsapp|web
  - language: hi|bn|ta|mr|en
  - state: INIT|INTENT_DETECTION|...
  - conversation_history: JSON array
  - current_intent: string
  - collected_entities: JSON object
  - created_at: timestamp
  - last_activity: timestamp
```

**Rate Limiting**:
```
Key: ratelimit:{user_id}:{minute}
Type: String (counter)
TTL: 60 seconds
Value: request count
```

**Intent Detection Cache**:
```
Key: intent_cache:{query_hash}
Type: Hash
TTL: 86400 seconds (24 hours)
Fields:
  - intent: detected intent
  - confidence: confidence score
  - entities: JSON object
```

### API Response Models

**Query Response**:
```typescript
interface QueryResponse {
  session_id: string;
  response_type: 'text' | 'voice';
  content: string;  // Text or base64 audio
  language: 'hi' | 'bn' | 'ta' | 'mr' | 'en';
  intent: string;
  confidence: number;
  follow_up_needed: boolean;
  suggestions?: string[];  // Follow-up question suggestions
  metadata: {
    processing_time_ms: number;
    timestamp: string;
  };
}
```

**ESIC Eligibility Response**:
```typescript
interface ESICEligibilityResponse extends QueryResponse {
  eligibility_result: {
    eligible: boolean;
    reasons: string[];
    contribution_rate_employee: number;
    contribution_rate_employer: number;
    monthly_employee_contribution?: number;
    monthly_employer_contribution?: number;
    benefits: string[];
  };
}
```

**PF Calculation Response**:
```typescript
interface PFCalculationResponse extends QueryResponse {
  calculation_result: {
    wage_base: number;
    contributory_wage: number;
    ceiling_applied: boolean;
    employee_contribution: number;
    employer_contribution: number;
    employer_epf: number;
    employer_eps: number;
    total_monthly: number;
    explanation: string;
  };
}
```

**Gratuity Response**:
```typescript
interface GratuityResponse extends QueryResponse {
  gratuity_result: {
    eligible: boolean;
    years_of_service?: number;
    years_remaining?: number;
    gratuity_amount?: number;
    capped?: boolean;
    formula_explanation?: string;
  };
}
```

**Complaint Draft Response**:
```typescript
interface ComplaintDraftResponse extends QueryResponse {
  complaint_draft: {
    draft_id: string;
    violation_type: string;
    draft_english: string;
    draft_regional: string;
    submission_guidance: {
      authority: string;
      address: string;
      online_portal?: string;
      required_documents: string[];
    };
  };
}
```


## Conversation Flow and State Management

### Language Detection Flow

```
User initiates conversation
    ↓
Check session for existing language preference
    ↓
If no preference:
    ↓
    Analyze input text/audio for language signals
    ↓
    If detected with high confidence (>0.8):
        Set language and proceed
    ↓
    If low confidence or ambiguous:
        Send multilingual prompt:
        "Please select your language / कृपया अपनी भाषा चुनें / 
         আপনার ভাষা নির্বাচন করুন / உங்கள் மொழியைத் தேர்ந்தெடுக்கவும் / 
         कृपया आपली भाषा निवडा"
        Options: Hindi, Bengali, Tamil, Marathi, English
    ↓
Store language preference in session
```

### Intent Detection and Routing Flow

```
Receive user query
    ↓
Preprocess text (normalize, clean)
    ↓
Send to Rasa NLU for intent classification
    ↓
Receive intent + confidence + entities
    ↓
If confidence >= 0.75:
    Route to appropriate handler
    ↓
If confidence 0.50-0.74:
    Confirm with user:
    "Did you want to know about {intent}?"
    ↓
If confidence < 0.50:
    Ask clarifying question:
    "I can help you with:
     - ESIC eligibility
     - PF calculations
     - Gratuity information
     - Filing complaints
     - Compliance requirements
     What would you like to know about?"
```

### Parameter Collection Flow (Example: ESIC Eligibility)

```
Intent: esic_eligibility detected
    ↓
Check collected_entities in session:
    - salary: required
    - employer_size: required
    - employment_type: required
    ↓
For each missing parameter:
    ↓
    Generate contextual question:
    "What is your monthly salary?" (in user's language)
    ↓
    Wait for user response
    ↓
    Extract entity from response
    ↓
    Validate entity (e.g., salary > 0)
    ↓
    If invalid, ask again with guidance
    ↓
    Store in collected_entities
    ↓
When all parameters collected:
    ↓
    Call Compliance Engine
    ↓
    Generate response with LLM for explanation
    ↓
    Return to user
```

### Multi-Turn Conversation Example

```
User: "मुझे ESIC के बारे में जानना है" (I want to know about ESIC)
System: [Intent: esic_eligibility, Confidence: 0.82]
        "आपकी मासिक सैलरी कितनी है?" (What is your monthly salary?)

User: "15000 रुपये" (15000 rupees)
System: [Entity: salary=15000]
        "आपकी कंपनी में कितने कर्मचारी हैं?" 
        (How many employees are in your company?)

User: "लगभग 25" (About 25)
System: [Entity: employer_size=25]
        "आप किस तरह के कर्मचारी हैं - स्थायी या अनुबंध पर?"
        (What type of employee are you - permanent or contractual?)

User: "स्थायी" (Permanent)
System: [Entity: employment_type=permanent]
        [All parameters collected, calling Compliance Engine]
        
        "अच्छी खबर! आप ESIC के लिए पात्र हैं। 
        
        आपकी सैलरी ₹15,000 है जो ₹21,000 की सीमा से कम है।
        आपकी कंपनी में 25 कर्मचारी हैं (10 से ज्यादा होने चाहिए)।
        आप स्थायी कर्मचारी हैं।
        
        ESIC के फायदे:
        - आपके और परिवार के लिए मुफ्त इलाज
        - बीमारी पर 70% सैलरी
        - मातृत्व लाभ
        - विकलांगता लाभ
        
        आपका योगदान: ₹112.50 प्रति माह (0.75%)
        कंपनी का योगदान: ₹487.50 प्रति माह (3.25%)
        
        क्या आप जानना चाहते हैं कि ESIC में कैसे रजिस्टर करें?"
```

### Error Handling Flow

```
Error occurs during processing
    ↓
Classify error type:
    ↓
    STT_FAILURE:
        "I couldn't understand the audio. Please try again or type your question."
    ↓
    INTENT_UNCLEAR:
        "I'm not sure I understood. Could you rephrase your question?"
        [Provide topic suggestions]
    ↓
    LLM_TIMEOUT:
        "This is taking longer than expected. Let me try a simpler explanation..."
        [Fall back to template-based response]
    ↓
    LLM_UNAVAILABLE:
        "I'm having technical difficulties. Here's basic information..."
        [Use rule-based response from database]
    ↓
    MISSING_DATA:
        "I don't have information about this specific case. 
         Please contact: [helpline number]"
    ↓
    VALIDATION_ERROR:
        "The information provided seems incorrect. 
         For example, salary should be a positive number."
    ↓
Log error to database
    ↓
If error persists (3+ times in session):
    Offer human assistance:
    "I'm having trouble helping with this. 
     Would you like to speak with a human advisor?
     Call: 1800-XXX-XXXX (toll-free)"
```

### Session Timeout and Cleanup

```
Session created with TTL = 3600 seconds (1 hour)
    ↓
On each user interaction:
    Update last_activity timestamp
    Reset TTL to 3600 seconds
    ↓
If no activity for 30 minutes:
    Send reminder (if channel supports):
    "Are you still there? Your session will expire in 30 minutes."
    ↓
If no activity for 60 minutes:
    Save session to PostgreSQL (if contains valuable data)
    Delete from Redis
    ↓
On next user message:
    Check if session exists in Redis
    If not, check PostgreSQL for recent session (<24 hours)
    If found, restore to Redis
    If not found, create new session
```

## Error Handling

### Error Categories and Responses

**1. Input Processing Errors**

| Error Type | Cause | System Response | User Message (English) | Recovery Action |
|------------|-------|-----------------|------------------------|-----------------|
| STT_LOW_CONFIDENCE | Poor audio quality, background noise | Request retry | "I couldn't hear you clearly. Please try again in a quiet place or type your question." | Offer text input alternative |
| STT_TIMEOUT | Audio too long or service delay | Timeout after 10s | "The audio is too long. Please keep your question under 30 seconds." | Truncate or request shorter input |
| LANGUAGE_DETECTION_FAILED | Mixed languages or unclear input | Ask explicitly | "I couldn't detect your language. Please select: Hindi / Bengali / Tamil / Marathi / English" | Show language selection menu |
| INVALID_AUDIO_FORMAT | Unsupported audio codec | Reject with guidance | "Audio format not supported. Please use voice recording in your app." | Provide format requirements |

**2. Intent Detection Errors**

| Error Type | Cause | System Response | User Message (English) | Recovery Action |
|------------|-------|-----------------|------------------------|-----------------|
| LOW_CONFIDENCE | Ambiguous query | Ask clarification | "I'm not sure what you're asking about. Are you interested in: [list topics]?" | Provide topic menu |
| NO_INTENT_MATCH | Out-of-scope query | Polite redirect | "I can help with labor rights questions about ESIC, PF, gratuity, complaints, and compliance. What would you like to know?" | List capabilities |
| MULTIPLE_INTENTS | Complex multi-part query | Decompose | "I see you're asking about multiple things. Let's start with [first intent]. We can cover the others after." | Handle sequentially |

**3. Data Collection Errors**

| Error Type | Cause | System Response | User Message (English) | Recovery Action |
|------------|-------|-----------------|------------------------|-----------------|
| INVALID_ENTITY | Wrong data type (e.g., text for salary) | Request correction | "Salary should be a number. For example: 15000. What is your monthly salary?" | Provide example |
| OUT_OF_RANGE | Unrealistic value | Validate and confirm | "Did you mean ₹150,000? That seems high. Please confirm your monthly salary." | Ask confirmation |
| MISSING_REQUIRED | User skips question | Re-ask with context | "I need to know your salary to check ESIC eligibility. What is your monthly salary in rupees?" | Explain why needed |

**4. Processing Errors**

| Error Type | Cause | System Response | User Message (English) | Recovery Action |
|------------|-------|-----------------|------------------------|-----------------|
| LLM_TIMEOUT | API delay >10s | Use fallback | "Let me give you a quick answer..." [Use template] | Template-based response |
| LLM_ERROR | API failure | Graceful degradation | "I'm having technical issues. Here's basic information from our database..." | Use rule-based response |
| COMPLIANCE_RULE_MISSING | Outdated or missing rule | Acknowledge limitation | "I don't have the latest information on this. Please check with: [official source]" | Provide official contact |
| DATABASE_ERROR | Connection failure | Retry with fallback | "Having trouble accessing data. Retrying..." | Retry 2x, then use cache |

**5. Channel-Specific Errors**

| Error Type | Cause | System Response | User Message (English) | Recovery Action |
|------------|-------|-----------------|------------------------|-----------------|
| WHATSAPP_RATE_LIMIT | Too many messages | Throttle | "Please wait a moment before sending another message." | Queue with delay |
| WHATSAPP_MEDIA_FAILED | Media upload/download failure | Fallback to text | "Couldn't process the audio. Please type your question." | Offer text alternative |
| WEB_SESSION_EXPIRED | Session timeout | Restore or restart | "Your session expired. Let me restore your conversation..." | Attempt restore from DB |

### Error Logging

All errors are logged to PostgreSQL with the following structure:

```python
error_log_entry = {
    "error_id": "uuid",
    "session_id": "uuid",
    "error_type": "STT_TIMEOUT",
    "error_category": "INPUT_PROCESSING",
    "error_message": "Speech-to-text service timeout after 10 seconds",
    "stack_trace": "...",
    "user_input": "base64_audio_sample",
    "system_state": {
        "intent": "esic_eligibility",
        "collected_entities": {...},
        "conversation_turn": 3
    },
    "recovery_action": "OFFERED_TEXT_INPUT",
    "timestamp": "iso8601",
    "resolved": False
}
```

### Fallback Strategies

**LLM Unavailable → Template-Based Responses**:
```python
template_responses = {
    "esic_eligibility": """
    ESIC eligibility depends on:
    1. Monthly salary under ₹21,000
    2. Employer has 10+ employees
    3. You are a permanent or contractual employee (not self-employed)
    
    If you meet these criteria, you are eligible for ESIC benefits including:
    - Free medical care for you and your family
    - Sickness benefit (70% of wages)
    - Maternity benefit
    - Disability benefit
    
    For more details, visit: esic.nic.in or call 1800-XXX-XXXX
    """,
    # ... other templates
}
```

**Database Unavailable → In-Memory Cache**:
- Keep last 100 frequently accessed labor law rules in Redis
- Serve from cache with disclaimer: "This information was last updated on [date]"
- Queue database writes for when connection is restored

**All Services Down → Graceful Shutdown**:
```
"ShramSetu AI is temporarily unavailable due to technical issues.
Please try again in a few minutes or contact our helpline:
Phone: 1800-XXX-XXXX (toll-free)
WhatsApp: +91-XXXXX-XXXXX
We apologize for the inconvenience."
```

## Testing Strategy

### Testing Approach

ShramSetu AI requires a dual testing strategy combining unit tests for specific scenarios and property-based tests for universal correctness guarantees. Given the critical nature of labor law information, comprehensive testing is essential to ensure accuracy, reliability, and user trust.

### Unit Testing

**Scope**: Specific examples, edge cases, integration points, and error conditions

**Framework**: pytest (Python)

**Test Categories**:

1. **Component Unit Tests**:
   - Intent detection accuracy for sample queries in each language
   - Entity extraction correctness
   - Compliance rule calculations with known inputs
   - Template rendering with sample data
   - API endpoint request/response validation

2. **Integration Tests**:
   - End-to-end conversation flows
   - Multi-turn dialogue state management
   - Channel-specific message formatting (WhatsApp vs Web)
   - Database read/write operations
   - External service integration (STT, TTS, LLM)

3. **Edge Case Tests**:
   - Empty or null inputs
   - Extremely long text inputs (>10,000 characters)
   - Special characters and emoji in queries
   - Concurrent session handling
   - Session timeout and restoration
   - Rate limiting enforcement

4. **Error Condition Tests**:
   - STT service failures
   - LLM API timeouts
   - Database connection failures
   - Invalid audio formats
   - Malformed API requests
   - Authentication failures

**Example Unit Tests**:
```python
def test_esic_eligibility_basic():
    """Test ESIC eligibility for a typical eligible worker"""
    result = check_esic_eligibility(
        salary=15000,
        employer_size=25,
        employment_type="permanent"
    )
    assert result["eligible"] == True
    assert result["contribution_rate_employee"] == 0.75

def test_pf_calculation_with_ceiling():
    """Test PF calculation when salary exceeds ceiling"""
    result = calculate_pf(basic_salary=20000, dearness_allowance=5000)
    assert result["ceiling_applied"] == True
    assert result["contributory_wage"] == 15000
    assert result["employee_contribution"] == 1800  # 12% of 15000

def test_gratuity_ineligible_short_service():
    """Test gratuity calculation for worker with <5 years service"""
    result = calculate_gratuity(
        last_drawn_salary=30000,
        years_of_service=3.5
    )
    assert result["eligible"] == False
    assert result["years_remaining"] == 1.5
```

### Property-Based Testing

**Scope**: Universal properties that must hold across all valid inputs

**Framework**: Hypothesis (Python)

**Configuration**: Minimum 100 iterations per property test

**Test Tagging**: Each property test references its design document property
- Format: `# Feature: shramsetu-ai, Property {number}: {property_text}`

**Property Test Categories**:

1. **Calculation Invariants**: Mathematical properties that always hold
2. **State Consistency**: Session state remains valid through transitions
3. **Language Consistency**: Responses match input language
4. **Data Integrity**: Database operations preserve data correctness
5. **API Contract**: Responses conform to schema specifications

### Test Environment

**Test Data**:
- Synthetic labor law dataset (subset of production data)
- Anonymized query logs from beta testing
- Generated test cases covering all intents and entities
- Multilingual test queries (100+ per language)

**Test Infrastructure**:
- Isolated test database (PostgreSQL)
- Mock external services (STT, TTS, LLM) for unit tests
- Staging environment with real services for integration tests
- Load testing environment for performance validation

**CI/CD Integration**:
- Run unit tests on every commit (must pass to merge)
- Run property tests nightly (100 iterations per property)
- Run integration tests on staging before production deployment
- Performance tests weekly with load simulation

### Performance Testing

**Load Testing Scenarios**:
1. 100 concurrent users, sustained for 10 minutes
2. Spike test: 0 to 500 users in 1 minute
3. Stress test: Gradually increase to failure point
4. Endurance test: 50 concurrent users for 2 hours

**Performance Targets**:
- Text query response: <2 seconds (p95)
- Voice query response: <5 seconds (p95)
- API availability: >99.5%
- Error rate: <0.5%
- Concurrent sessions: 100+ without degradation

### Security Testing

**Security Test Categories**:
1. **Input Validation**: SQL injection, XSS, command injection attempts
2. **Authentication**: Admin endpoint access control
3. **Rate Limiting**: Verify throttling under abuse scenarios
4. **Data Privacy**: Ensure PII is encrypted and anonymized
5. **API Security**: Test for common OWASP vulnerabilities

**Tools**:
- OWASP ZAP for vulnerability scanning
- Bandit for Python security linting
- Manual penetration testing before production launch

### Monitoring and Observability

**Metrics to Track**:
- Request rate, response time, error rate (per endpoint)
- Intent detection accuracy and confidence distribution
- LLM token usage and cost
- STT/TTS API usage and latency
- Database query performance
- Session duration and conversation length
- User satisfaction (implicit: conversation completion rate)

**Logging**:
- Structured JSON logs with correlation IDs
- Log levels: DEBUG (dev), INFO (staging), WARNING/ERROR (production)
- Sensitive data redaction in logs
- Centralized logging with Elasticsearch/CloudWatch

**Alerting**:
- Error rate >1% for 5 minutes
- Response time p95 >5 seconds
- External service failures
- Database connection pool exhaustion
- Disk space <20%



## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Language and Localization Properties

**Property 1: Language Detection or Prompt**
*For any* conversation initiation, the system should either successfully detect the user's language with high confidence (≥0.8) or prompt the user to select a language.
**Validates: Requirements 1.1**

**Property 2: Supported Language Coverage**
*For any* of the supported languages (Hindi, Bengali, Tamil, Marathi, English), the system should be able to process input and generate output in that language.
**Validates: Requirements 1.2**

**Property 3: Language Consistency Across Operations**
*For any* query in a given language, the response should be in the same language, and this consistency should be maintained throughout the session for all operations (ESIC, PF, gratuity, complaints, compliance).
**Validates: Requirements 1.3, 1.4, 3.5, 4.4, 5.4, 7.5**

**Property 4: Language Switching**
*For any* session where a language change is requested, all subsequent responses should be in the new language until another change is requested.
**Validates: Requirements 1.5**

### Voice Interface Properties

**Property 5: Voice Input Processing**
*For any* valid audio input in a supported language, the STT service should produce text output that can be used for intent detection.
**Validates: Requirements 2.1**

**Property 6: Multilingual Voice Support**
*For any* supported language, voice input in that language should be processable by the STT service.
**Validates: Requirements 2.2**

**Property 7: Voice Response Generation**
*For any* voice-initiated query, the response should be converted to speech in the same language as the input.
**Validates: Requirements 2.3**

**Property 8: Voice Clarification on Low Confidence**
*For any* voice input where STT confidence is below threshold (<0.70), the system should request clarification from the user.
**Validates: Requirements 2.4**

### ESIC Eligibility Properties

**Property 9: ESIC Parameter Collection**
*For any* ESIC eligibility request, the system should collect all three required parameters (salary, employment type, employer size) before making an eligibility determination.
**Validates: Requirements 3.1**

**Property 10: ESIC Eligibility Rules**
*For any* ESIC eligibility evaluation with salary ≤ ₹21,000, employer size ≥ 10, and employment type in {permanent, contractual}, the result should be eligible; otherwise, the result should be ineligible with appropriate reasons.
**Validates: Requirements 3.2**

**Property 11: ESIC Eligible Response Content**
*For any* ESIC eligibility result where eligible=true, the response should contain a non-empty benefits list and enrollment process information.
**Validates: Requirements 3.3**

**Property 12: ESIC Ineligible Response Content**
*For any* ESIC eligibility result where eligible=false, the response should contain specific reasons for ineligibility.
**Validates: Requirements 3.4**

### PF Calculation Properties

**Property 13: PF Parameter Collection**
*For any* PF calculation request, the system should collect both required parameters (basic salary and dearness allowance) before performing the calculation.
**Validates: Requirements 4.1**

**Property 14: PF Calculation Correctness**
*For any* PF calculation with basic salary B and dearness allowance D, the employee contribution should equal min(B+D, 15000) × 0.12, and the employer contribution should equal min(B+D, 15000) × 0.12.
**Validates: Requirements 4.2**

**Property 15: PF Response Completeness**
*For any* PF calculation result, the response should contain both employee_contribution and employer_contribution fields with non-negative values.
**Validates: Requirements 4.3**

**Property 16: PF Ceiling Application**
*For any* PF calculation where (basic_salary + dearness_allowance) > ₹15,000, the contributory_wage should be capped at ₹15,000, and the response should indicate ceiling_applied=true.
**Validates: Requirements 4.5**

### Gratuity Properties

**Property 17: Gratuity Parameter Collection**
*For any* gratuity request, the system should collect both required parameters (employment duration and last drawn salary) before making an eligibility determination.
**Validates: Requirements 5.1**

**Property 18: Gratuity Eligibility Rule**
*For any* gratuity evaluation, if years_of_service < 5, the result should be eligible=false; if years_of_service ≥ 5, the result should be eligible=true.
**Validates: Requirements 5.2**

**Property 19: Gratuity Calculation Formula**
*For any* eligible gratuity calculation with salary S and years Y, the gratuity amount should equal min((S × 15 × Y) / 26, 2000000).
**Validates: Requirements 5.3**

**Property 20: Gratuity Ineligible Response**
*For any* gratuity result where eligible=false and years_of_service < 5, the response should contain years_remaining = 5 - years_of_service.
**Validates: Requirements 5.5**

### Complaint Generation Properties

**Property 21: Complaint Violation Type Collection**
*For any* complaint request, the system should identify and collect the violation type before proceeding to collect other details.
**Validates: Requirements 6.1**

**Property 22: Complaint Required Fields**
*For any* complaint draft generation, all required fields (employer information, violation description, dates, evidence) should be collected before generating the draft.
**Validates: Requirements 6.2**

**Property 23: Complaint Draft Structure**
*For any* generated complaint draft, the document should contain all required sections (header with to/subject/date, body with complainant/employer/complaint details, footer with signature/verification).
**Validates: Requirements 6.3**

**Property 24: Bilingual Complaint Generation**
*For any* complaint draft, two versions should be generated: one in English and one in the user's regional language.
**Validates: Requirements 6.4**

**Property 25: Complaint Submission Guidance**
*For any* complaint draft response, submission guidance should be included with at least one submission method (authority name, address, or online portal).
**Validates: Requirements 6.5**

### Compliance Checklist Properties

**Property 26: Compliance Parameter Collection**
*For any* compliance checklist request, the system should collect all three required parameters (employee count, industry type, state) before generating the checklist.
**Validates: Requirements 7.1**

**Property 27: Compliance Applicability Rules**
*For any* compliance checklist generation, the checklist should include all applicable laws based on business parameters (e.g., ESIC if employee_count ≥ 10, EPF if employee_count ≥ 20) and exclude non-applicable laws.
**Validates: Requirements 7.2**

**Property 28: Compliance Item Completeness**
*For any* compliance checklist item, the item should have a non-empty explanation field and a priority field with value in {mandatory, recommended}.
**Validates: Requirements 7.3, 7.4**

### Intent Detection Properties

**Property 29: Intent Classification Domain**
*For any* query processed by the intent detector, the returned intent should be one of the predefined categories: {esic_eligibility, pf_calculation, gratuity_info, complaint_draft, compliance_checklist, general_info, language_change, clarification}.
**Validates: Requirements 8.1**

**Property 30: High Confidence Routing**
*For any* query with intent confidence ≥ 0.75, the system should route the query to the appropriate processing module without asking for confirmation.
**Validates: Requirements 8.2**

**Property 31: Low Confidence Clarification**
*For any* query with intent confidence < 0.50, the system should respond with clarifying questions or topic suggestions rather than attempting to process the query.
**Validates: Requirements 8.3**

**Property 32: Multilingual Intent Detection**
*For any* query in any supported language, the intent detector should be able to classify the query and return an intent with a confidence score.
**Validates: Requirements 8.4**

**Property 33: Multi-Intent Handling**
*For any* query classified with multiple intents, the system should either address each intent sequentially or ask the user to prioritize.
**Validates: Requirements 8.5**

### Explanation Quality Properties

**Property 34: Confusion Response**
*For any* user message indicating confusion (e.g., "I don't understand", "please explain again"), the system should provide a rephrased explanation.
**Validates: Requirements 9.5**

### Multi-Channel Properties

**Property 35: Channel Functional Equivalence**
*For any* query, the core functionality and response content should be equivalent regardless of whether the query comes through WhatsApp or web interface.
**Validates: Requirements 10.3**

**Property 36: Cross-Channel Session Consistency**
*For any* session, the conversation history and collected entities should be preserved and accessible regardless of which channel is used to access the session.
**Validates: Requirements 10.4**

### Logging Properties

**Property 37: Query Log Creation**
*For any* query submitted by a user, a query log entry should be created with all required fields populated (timestamp, language, intent, anonymized_user_id).
**Validates: Requirements 11.1**

**Property 38: PII Exclusion in Logs**
*For any* query log entry, personally identifiable fields (full name, phone number, address, email) should not be stored in the query_text or response_text fields.
**Validates: Requirements 11.2**

**Property 39: Log Aggregation**
*For any* set of query logs, the aggregation functions should produce valid statistics including intent distribution, language distribution, and average confidence scores.
**Validates: Requirements 11.3**

### Dataset Management Properties

**Property 40: Dataset Update Reflection**
*For any* update to the Labor_Law_Dataset, subsequent compliance evaluations should use the updated rules and produce different results if the rules changed.
**Validates: Requirements 12.2, 12.3, 12.5**

**Property 41: Dataset Versioning**
*For any* update to the Labor_Law_Dataset, a new version number should be created, and the previous version should be preserved in the version history.
**Validates: Requirements 12.4**

### Performance and Reliability Properties

**Property 42: Long Operation Acknowledgment**
*For any* operation that takes longer than 2 seconds to process, the system should send a progress indicator or acknowledgment message to the user.
**Validates: Requirements 13.3**

**Property 43: High Load Queueing**
*For any* request received when the system is under high load (>80% capacity), the request should be queued, and the user should receive a wait time estimate.
**Validates: Requirements 13.5**

### Error Handling Properties

**Property 44: Unclassifiable Query Handling**
*For any* query that cannot be classified (confidence < 0.50 for all intents), the system should respond with topic suggestions or clarifying questions rather than an error message.
**Validates: Requirements 14.1**

**Property 45: STT Failure Fallback**
*For any* voice input where the STT service fails or returns an error, the system should prompt the user to try again or offer text input as an alternative.
**Validates: Requirements 14.2**

**Property 46: LLM Unavailability Fallback**
*For any* query requiring LLM processing where the LLM service is unavailable or times out, the system should fall back to template-based responses or inform the user of temporary unavailability.
**Validates: Requirements 14.3**

**Property 47: Error Logging**
*For any* error that occurs during query processing, an error log entry should be created with error type, error message, and system state information.
**Validates: Requirements 14.4**

**Property 48: Repeated Failure Human Assistance**
*For any* session where 3 or more consecutive errors occur, the system should provide contact information for human assistance.
**Validates: Requirements 14.5**

### Security Properties

**Property 49: Data Deletion Compliance**
*For any* data deletion request for a user, all personal information fields should be set to null or removed, while anonymized query logs should be retained.
**Validates: Requirements 15.4**

