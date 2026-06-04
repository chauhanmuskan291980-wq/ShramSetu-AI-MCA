# Requirements Document: ShramSetu AI

## Introduction

ShramSetu AI is a multilingual AI-powered conversational assistant designed to educate Indian workers about their labor rights, compliance benefits, and eligibility criteria. The system addresses the critical gap in labor law awareness among blue-collar, gig, and contractual workers who face language barriers and low digital literacy. By providing information in simple, regional languages through voice and text interfaces, ShramSetu AI aims to reduce exploitation, improve compliance transparency, and empower workers with knowledge of their legal rights.

## Glossary

- **System**: The ShramSetu AI conversational assistant platform
- **Worker**: End user seeking information about labor rights (gig workers, factory workers, contractual employees, domestic workers, small business employees)
- **Query**: A question or request for information submitted by a Worker
- **Intent_Detector**: NLP component that identifies the purpose of a Worker's Query
- **LLM_Engine**: Large Language Model that generates simplified explanations
- **Compliance_Engine**: Rule-based system that evaluates eligibility and compliance criteria
- **STT_Service**: Speech-to-Text service that converts voice input to text
- **TTS_Service**: Text-to-Speech service that converts text responses to voice
- **ESIC**: Employee State Insurance Corporation benefits
- **PF**: Provident Fund
- **Gratuity**: Payment made by employer to employee for services rendered
- **Complaint_Draft**: Generated document template for filing labor-related complaints
- **Regional_Language**: Any of the supported Indian languages (Hindi, Bengali, Tamil, Marathi, etc.)
- **WhatsApp_Bot**: Conversational interface accessible through WhatsApp
- **Web_Interface**: Browser-based conversational interface
- **Query_Log**: Database record of Worker interactions
- **Labor_Law_Dataset**: Structured database of Indian labor laws and regulations

## Requirements

### Requirement 1: Multilingual Communication

**User Story:** As a Worker, I want to interact with the System in my preferred Regional_Language, so that I can understand labor rights information without language barriers.

#### Acceptance Criteria

1. WHEN a Worker initiates a conversation, THE System SHALL detect or prompt for the Worker's preferred Regional_Language
2. THE System SHALL support Hindi, Bengali, Tamil, and Marathi as Regional_Languages
3. WHEN a Worker submits a Query in a Regional_Language, THE System SHALL process and respond in the same Regional_Language
4. THE System SHALL maintain language consistency throughout a conversation session
5. WHEN a Worker requests to change language mid-conversation, THE System SHALL switch to the requested Regional_Language for all subsequent responses

### Requirement 2: Voice Interface for Low Literacy Users

**User Story:** As a Worker with low digital literacy, I want to speak my questions instead of typing, so that I can access information without reading or writing.

#### Acceptance Criteria

1. WHEN a Worker provides voice input, THE STT_Service SHALL convert the audio to text with accuracy sufficient for intent detection
2. THE System SHALL support voice input in all supported Regional_Languages
3. WHEN the System generates a response for a voice-initiated Query, THE TTS_Service SHALL convert the text response to speech in the Worker's Regional_Language
4. WHEN voice input is unclear or ambiguous, THE System SHALL request clarification from the Worker
5. THE System SHALL process voice input within 3 seconds of audio completion

### Requirement 3: ESIC Eligibility Assessment

**User Story:** As a Worker, I want to check if I am eligible for ESIC benefits, so that I can claim benefits I am entitled to.

#### Acceptance Criteria

1. WHEN a Worker requests ESIC eligibility information, THE System SHALL collect required parameters (salary, employment type, employer size)
2. WHEN the Compliance_Engine evaluates ESIC eligibility, THE System SHALL apply current ESIC Act rules and thresholds
3. WHEN a Worker is eligible for ESIC, THE System SHALL provide a clear explanation of benefits and enrollment process
4. WHEN a Worker is not eligible for ESIC, THE System SHALL explain the reasons and any alternative benefits
5. THE System SHALL provide ESIC eligibility results in the Worker's Regional_Language

### Requirement 4: PF Contribution Calculation

**User Story:** As a Worker, I want to calculate my PF contributions, so that I can verify my employer is making correct deductions and contributions.

#### Acceptance Criteria

1. WHEN a Worker requests PF calculation, THE System SHALL collect salary details (basic salary, dearness allowance)
2. WHEN the Compliance_Engine calculates PF contributions, THE System SHALL apply current EPF Act rates (employee and employer contributions)
3. THE System SHALL display both employee contribution and employer contribution amounts
4. THE System SHALL explain the calculation methodology in simple terms in the Worker's Regional_Language
5. WHEN salary exceeds PF wage ceiling, THE System SHALL apply the ceiling limit and explain the cap

### Requirement 5: Gratuity Eligibility Guidance

**User Story:** As a Worker, I want to understand if I am eligible for gratuity, so that I can claim this benefit when leaving employment.

#### Acceptance Criteria

1. WHEN a Worker requests gratuity information, THE System SHALL collect employment duration and salary details
2. WHEN the Compliance_Engine evaluates gratuity eligibility, THE System SHALL apply Payment of Gratuity Act criteria (minimum 5 years service)
3. WHEN a Worker is eligible, THE System SHALL calculate the gratuity amount based on last drawn salary and years of service
4. THE System SHALL explain gratuity calculation formula in simple terms in the Worker's Regional_Language
5. WHEN a Worker is not eligible, THE System SHALL explain the eligibility criteria and time remaining until eligibility

### Requirement 6: Complaint Draft Generation

**User Story:** As a Worker, I want to generate a complaint draft about labor violations, so that I can formally report issues to authorities.

#### Acceptance Criteria

1. WHEN a Worker requests complaint assistance, THE System SHALL identify the type of violation through conversational questions
2. THE System SHALL collect relevant details (employer information, violation description, dates, evidence)
3. WHEN sufficient information is collected, THE System SHALL generate a Complaint_Draft in the appropriate format for the violation type
4. THE Complaint_Draft SHALL be generated in both English and the Worker's Regional_Language
5. THE System SHALL provide guidance on where to submit the Complaint_Draft (labor commissioner, online portal, etc.)

### Requirement 7: Employer Compliance Checklist

**User Story:** As a small business employer, I want to understand my compliance obligations, so that I can ensure I am following labor laws correctly.

#### Acceptance Criteria

1. WHEN an employer requests compliance information, THE System SHALL collect business details (employee count, industry type, state)
2. THE Compliance_Engine SHALL generate a checklist of applicable labor laws based on business parameters
3. THE System SHALL provide explanations for each compliance requirement in simple terms
4. THE System SHALL indicate priority levels for compliance items (mandatory, recommended)
5. THE System SHALL provide compliance checklist in the user's preferred Regional_Language

### Requirement 8: Intent Detection and Query Routing

**User Story:** As a Worker, I want the System to understand my questions accurately, so that I receive relevant information quickly.

#### Acceptance Criteria

1. WHEN a Worker submits a Query, THE Intent_Detector SHALL classify the Query into predefined categories (ESIC, PF, gratuity, complaint, compliance, general)
2. WHEN intent confidence is above threshold, THE System SHALL route the Query to the appropriate processing module
3. WHEN intent confidence is below threshold, THE System SHALL ask clarifying questions to determine intent
4. THE Intent_Detector SHALL handle queries in all supported Regional_Languages
5. WHEN a Query contains multiple intents, THE System SHALL address each intent sequentially or offer to prioritize

### Requirement 9: Simplified Legal Explanations

**User Story:** As a Worker with limited legal knowledge, I want labor law information explained in simple language, so that I can understand my rights without confusion.

#### Acceptance Criteria

1. WHEN the LLM_Engine generates an explanation, THE System SHALL use simple vocabulary appropriate for low literacy users
2. THE System SHALL avoid legal jargon or provide definitions when technical terms are necessary
3. WHEN explaining complex concepts, THE System SHALL use examples relevant to the Worker's context
4. THE System SHALL break down lengthy explanations into digestible segments
5. WHEN a Worker indicates confusion, THE System SHALL rephrase the explanation in simpler terms

### Requirement 10: Multi-Channel Access

**User Story:** As a Worker, I want to access the System through WhatsApp or web browser, so that I can use the channel most convenient for me.

#### Acceptance Criteria

1. THE System SHALL provide a Web_Interface accessible through standard web browsers
2. THE System SHALL provide a WhatsApp_Bot accessible through WhatsApp messaging
3. WHEN a Worker interacts through either channel, THE System SHALL provide equivalent functionality
4. THE System SHALL maintain conversation context within a session regardless of channel
5. THE Web_Interface SHALL be responsive and functional on mobile devices

### Requirement 11: Query Logging and Analytics

**User Story:** As a system administrator, I want to track Worker queries and system usage, so that I can improve the System and understand user needs.

#### Acceptance Criteria

1. WHEN a Worker submits a Query, THE System SHALL create a Query_Log entry with timestamp, language, intent, and anonymized user identifier
2. THE System SHALL store Query_Logs securely without capturing personally identifiable information beyond what is necessary
3. THE System SHALL aggregate Query_Logs to generate usage statistics (popular topics, language distribution, success rates)
4. WHEN storing Query_Logs, THE System SHALL comply with data privacy regulations
5. THE System SHALL retain Query_Logs for analysis while implementing appropriate data retention policies

### Requirement 12: Labor Law Dataset Management

**User Story:** As a system administrator, I want to maintain an up-to-date Labor_Law_Dataset, so that Workers receive accurate and current information.

#### Acceptance Criteria

1. THE System SHALL store labor law information in a structured Labor_Law_Dataset
2. WHEN labor laws are updated, THE System SHALL allow administrators to update the Labor_Law_Dataset
3. THE Compliance_Engine SHALL reference the Labor_Law_Dataset when evaluating eligibility and compliance
4. THE System SHALL version control Labor_Law_Dataset updates to track changes over time
5. WHEN the Labor_Law_Dataset is updated, THE System SHALL apply changes to new queries immediately

### Requirement 13: Response Time and Performance

**User Story:** As a Worker, I want to receive responses quickly, so that I can get information without long waits.

#### Acceptance Criteria

1. WHEN a Worker submits a text Query, THE System SHALL provide an initial response within 2 seconds
2. WHEN a Worker submits a voice Query, THE System SHALL provide an initial response within 5 seconds (including STT processing)
3. WHEN processing requires extended time, THE System SHALL provide a progress indicator or acknowledgment message
4. THE System SHALL handle at least 100 concurrent user sessions without performance degradation
5. WHEN the System experiences high load, THE System SHALL queue requests and inform users of expected wait time

### Requirement 14: Error Handling and Fallback

**User Story:** As a Worker, I want the System to handle errors gracefully, so that I can still get help even when technical issues occur.

#### Acceptance Criteria

1. WHEN the Intent_Detector cannot classify a Query, THE System SHALL offer topic suggestions or ask clarifying questions
2. WHEN the STT_Service fails to process voice input, THE System SHALL prompt the Worker to try again or use text input
3. WHEN the LLM_Engine is unavailable, THE System SHALL provide rule-based responses or inform the Worker of temporary unavailability
4. WHEN an error occurs, THE System SHALL log the error details for administrator review
5. THE System SHALL provide contact information for human assistance when automated resolution fails

### Requirement 15: Security and Privacy

**User Story:** As a Worker, I want my personal information protected, so that I can use the System without privacy concerns.

#### Acceptance Criteria

1. WHEN a Worker provides personal information, THE System SHALL encrypt data in transit using TLS
2. THE System SHALL store sensitive Worker data with encryption at rest
3. THE System SHALL not share Worker information with third parties without explicit consent
4. WHEN a Worker requests data deletion, THE System SHALL remove personal information while retaining anonymized analytics
5. THE System SHALL implement authentication for administrative functions to prevent unauthorized access
