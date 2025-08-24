# N8N Webhook API Specification

## Overview
This document defines the JSON format for communication between the Persona AI Link application and N8N workflows.

## Session Creation Webhook

### Request Format (Frontend → N8N)

When a new chat session is created, the frontend sends this payload to N8N:

```json
{
  "event_type": "session_created",
  "sessionId": "uuid-v4-string",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "user_context": {
    "user_agent": "Mozilla/5.0...",
    "ip_address": "192.168.1.1",
    "referrer": "https://example.com"
  },
  "session_data": {
    "initial_message": "Hello, I need help with...",
    "language": "en",
    "platform": "web"
  }
}
```

### Response Format (N8N → Frontend)

N8N should respond with this JSON structure:

```json
[
  {
    "output": {
      "success": true,
      "sessionId": "uuid-v4-string",
      "session_name": "AI Assistant: Data Analysis Help",
      "message": "Hello! I'm your AI assistant. I can see you need help with data analysis. How can I assist you today?"
    }
  }
]
```

## Chat Message Webhook

### Request Format (Frontend → N8N)

For ongoing chat messages:

```json
{
  "event_type": "chat_message",
  "sessionId": "uuid-v4-string",
  "message_id": "msg-uuid-v4-string",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "message": {
    "content": "Can you help me analyze this data?",
    "role": "user",
    "message_order": 3
  },
  "context": {
    "session_name": "AI Assistant: Data Analysis Help",
    "previous_messages": [
      {
        "content": "Hello, I need help with...",
        "role": "user",
        "timestamp": "2024-01-15T10:30:00.000Z"
      },
      {
        "content": "Hello! I'm your AI assistant...",
        "role": "assistant",
        "timestamp": "2024-01-15T10:30:15.000Z"
      }
    ]
  }
}
```

### Response Format (N8N → Frontend)

```json
[
  {
    "output": {
      "success": true,
      "sessionId": "uuid-v4-string",
      "message_id": "msg-uuid-v4-string",
      "message": "I'd be happy to help you analyze your data! Please share the dataset or describe what specific analysis you need.",
      "session_name_update": "Data Analysis: Customer Insights"
    }
  }
]
```

## Error Response Format

When N8N encounters an error:

```json
[
  {
    "output": {
      "success": false,
      "error": {
        "code": "PROCESSING_ERROR",
        "message": "Unable to process the request due to AI service timeout",
        "details": "The AI model took longer than 30 seconds to respond"
      },
      "sessionId": "uuid-v4-string",
      "fallback_message": "I'm experiencing some technical difficulties. Please try again in a moment."
    }
  }
]
```

## Field Descriptions

### Core Fields
- `success`: Boolean indicating if the request was processed successfully
- `sessionId`: Unique identifier for the chat session
- `session_name`: Human-readable name for the session (can be updated during conversation)
- `message`: The AI response message content (supports Markdown)
- `message_id`: Unique identifier for individual messages

### Metadata Fields
- `workflow_id`: N8N workflow identifier
- `execution_id`: Unique execution identifier for debugging
- `processing_time_ms`: Time taken to process the request
- `ai_model`: AI model used for generating the response
- `confidence_score`: AI confidence in the response (0-1)
- `suggested_actions`: Array of suggested user actions

### Session Name Guidelines
- Should be descriptive and meaningful
- Maximum 255 characters
- Can be updated during the conversation based on context
- Examples: "AI Assistant: Data Analysis Help", "Code Review: React Components", "Travel Planning: Europe Trip"

## Implementation Notes

1. **Session Name Updates**: The `session_name` can be updated in any response. The frontend should update the database and UI accordingly.

2. **Error Handling**: Always include a `fallback_message` in error responses to provide a user-friendly message.

3. **Markdown Support**: The `message` field supports Markdown formatting for rich text display.

4. **Backwards Compatibility**: The current webhook implementation should continue to work, with new fields being optional.

5. **Timeout Handling**: N8N workflows should respond within 30 seconds to avoid frontend timeouts.