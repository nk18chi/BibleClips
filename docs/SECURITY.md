# BibleClips Security Guide

## Core Principles

1. **Defense in Depth** - Multiple layered security controls
2. **Least Privilege** - Minimum necessary permissions
3. **Separation of Concerns** - Isolate sensitive operations

## Authentication

### Supabase Auth

- Email/password authentication
- JWT-based sessions
- Secure token storage (httpOnly cookies)
- Password requirements: minimum 8 characters

### Session Management

| Setting | Value |
|---------|-------|
| Session duration | 7 days |
| Refresh token rotation | Enabled |
| Secure cookies | Production only |

### Password Security

- Passwords hashed with bcrypt (via Supabase)
- No plain-text password storage
- Password reset via secure email token

## Authorization

### Role-Based Access Control

| Role | Description |
|------|-------------|
| `USER` | Standard authenticated user |
| `ADMIN` | Platform administrator |

### Permission Matrix

| Action | Anonymous | USER | ADMIN |
|--------|-----------|------|-------|
| View approved clips | Yes | Yes | Yes |
| View pending clips | No | Own only | All |
| Submit clip | No | Yes | Yes |
| Vote on clip | No | Yes | Yes |
| Approve/reject clips | No | No | Yes |
| Manage categories | No | No | Yes |
| Feature clips | No | No | Yes |

### Row Level Security (RLS)

All tables have RLS policies enabled:

```sql
-- Example: clips table
CREATE POLICY "Anyone can view approved clips"
  ON clips FOR SELECT
  USING (status = 'APPROVED');

CREATE POLICY "Users can view own pending clips"
  ON clips FOR SELECT
  USING (auth.uid() = submitted_by AND status = 'PENDING');

CREATE POLICY "Admins can view all clips"
  ON clips FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

CREATE POLICY "Authenticated users can insert clips"
  ON clips FOR INSERT
  WITH CHECK (auth.uid() = submitted_by);
```

## Input Validation

### Server-Side Validation

All user input validated with Zod schemas:

```typescript
// packages/validation/src/clip.ts
import { z } from 'zod';

export const clipSubmissionSchema = z.object({
  youtubeVideoId: z.string().regex(/^[a-zA-Z0-9_-]{11}$/),
  startTime: z.number().int().min(0),
  endTime: z.number().int().min(1),
  title: z.string().min(1).max(200),
  titleJa: z.string().max(200).optional(),
  verses: z.array(verseSchema).min(1).max(10),
  categoryIds: z.array(z.string().uuid()).min(1).max(5),
}).refine(data => data.endTime > data.startTime, {
  message: 'End time must be after start time',
});
```

### SQL Injection Prevention

- Supabase client uses parameterized queries
- Never concatenate user input into queries

```typescript
// GOOD
const { data } = await supabase
  .from('clips')
  .select('*')
  .eq('book', userInput);

// BAD - Never do this
const { data } = await supabase
  .rpc('raw_query', { query: `SELECT * FROM clips WHERE book = '${userInput}'` });
```

### XSS Prevention

- React escapes output by default
- Use `dangerouslySetInnerHTML` sparingly
- Sanitize any HTML content with DOMPurify

```typescript
// If HTML rendering is needed
import DOMPurify from 'dompurify';

const sanitizedHtml = DOMPurify.sanitize(userContent);
```

## API Security

### Rate Limiting

Implement rate limiting for sensitive endpoints:

| Endpoint | Limit |
|----------|-------|
| Login | 5 requests/minute |
| Register | 3 requests/minute |
| Submit clip | 10 requests/hour |
| Vote | 60 requests/minute |

### CORS

Configure CORS for API routes:

```typescript
// next.config.js
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: process.env.NEXT_PUBLIC_APP_URL },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};
```

## Data Protection

### Environment Variables

- Never commit secrets to git
- Use `.env.local` for local development
- Use Vercel environment variables for production
- Mark sensitive variables appropriately

### Sensitive Data

| Data | Protection |
|------|------------|
| Passwords | Hashed (bcrypt via Supabase) |
| Email addresses | Accessible only to user/admin |
| API keys | Server-side only (no `NEXT_PUBLIC_` prefix) |

### Data Retention

- Rejected clips: Delete after 30 days
- User data: Retain until account deletion
- Logs: Retain for 90 days

## Content Security

### YouTube Content

- Only embed approved YouTube videos
- Validate YouTube video IDs format
- Respect YouTube Terms of Service

### User Content

- Admin reviews all submitted clips
- Reject inappropriate content
- Allow community flagging (future)

## Security Headers

Configure security headers in Next.js:

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com; frame-src https://www.youtube.com;"
  }
];
```

## Incident Response

### Security Issue Reporting

1. Document the issue
2. Assess impact and severity
3. Contain the issue
4. Fix and deploy
5. Post-incident review

### Severity Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| Critical | Data breach, auth bypass | Immediate |
| High | XSS, injection vulnerabilities | 24 hours |
| Medium | Information disclosure | 1 week |
| Low | Best practice violations | 1 month |

## Compliance Considerations

### GDPR (Future)

- Provide data export functionality
- Implement account deletion
- Cookie consent for EU users

### Terms of Service

- YouTube API Terms of Service compliance
- Bible API terms compliance
- Clear user terms of service

## Security Checklist

### Development

- [ ] Validate all user input
- [ ] Use parameterized queries
- [ ] No secrets in code
- [ ] RLS policies tested

### Deployment

- [ ] Environment variables secured
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Error messages don't leak info

### Ongoing

- [ ] Regular dependency updates
- [ ] Monitor for vulnerabilities
- [ ] Review access logs
- [ ] Rotate API keys quarterly
