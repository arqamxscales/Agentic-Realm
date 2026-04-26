# API Reference

## POST /api/chat

Generates AI responses and persists signed-in chat turns.

### Request body

```json
{
  "agentSlug": "technology",
  "conversationId": "optional-uuid",
  "messages": [
    { "role": "user", "content": "How can we reduce cloud cost?" }
  ]
}
```

### Response body

```json
{
  "agent": {
    "slug": "technology",
    "name": "Technology Agent",
    "description": "..."
  },
  "answer": "...",
  "conversationId": "uuid-or-null",
  "persisted": true
}
```

## GET /api/chat/history

Returns the latest conversation and messages for the authenticated user.

Optional query:

- `conversationId` to fetch a specific conversation

### Response body

```json
{
  "authenticated": true,
  "conversation": {
    "id": "uuid",
    "title": "...",
    "agent_slug": "technology",
    "updated_at": "..."
  },
  "messages": [
    {
      "id": "uuid",
      "role": "user",
      "content": "...",
      "created_at": "..."
    }
  ]
}
```

## GET /api/chat/conversations

Returns all conversation threads for the authenticated user.

### Response body

```json
{
  "authenticated": true,
  "conversations": [
    {
      "id": "uuid",
      "title": "New conversation",
      "agent_slug": "technology",
      "updated_at": "..."
    }
  ]
}
```

## POST /api/chat/conversations

Creates a new conversation thread.

### Request body

```json
{
  "title": "Optional title",
  "agentSlug": "technology"
}
```

## GET /api/chat/conversations/[id]

Returns a single thread and all user/assistant messages in it.
