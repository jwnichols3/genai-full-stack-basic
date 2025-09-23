# Coding Standards

## Critical Fullstack Rules

- **Type Sharing:** Always define types in packages/shared and import from there
- **API Calls:** Never make direct HTTP calls - use the service layer
- **Environment Variables:** Access only through config objects, never process.env directly
- **Error Handling:** All API routes must use the standard error handler
- **State Updates:** Never mutate state directly - use proper state management patterns
- **Auth Tokens:** Store only in memory, never in localStorage/cookies for access tokens
- **Input Validation:** Validate all user inputs on both frontend and backend
- **Async Operations:** Always handle loading and error states in UI
- **Code Splitting:** Lazy load heavy components and routes
- **Test Coverage:** Minimum 80% coverage for critical business logic
- **HTML Validation:** Never nest block elements inside Typography components
- **Region Configuration:** Always specify default regions that match infrastructure deployment

## Naming Conventions

| Element         | Frontend                                        | Backend          | Example                      |
| --------------- | ----------------------------------------------- | ---------------- | ---------------------------- |
| Components      | PascalCase                                      | -                | `UserProfile.tsx`            |
| Hooks           | camelCase with 'use'                            | -                | `useAuth.ts`                 |
| API Routes      | -                                               | kebab-case       | `/api/user-profile`          |
| Database Tables | -                                               | snake_case       | `user_profiles`              |
| Functions       | camelCase                                       | camelCase        | `getUserById()`              |
| Constants       | UPPER_SNAKE_CASE                                | UPPER_SNAKE_CASE | `MAX_RETRIES`                |
| Interfaces      | PascalCase with 'I' prefix optional             | PascalCase       | `User` or `IUser`            |
| File names      | PascalCase for components, camelCase for others | camelCase        | `Button.tsx`, `apiClient.ts` |

## Material-UI & React Best Practices

### HTML Structure & DOM Validation

**Critical Rule**: Never nest block-level components inside `<Typography>` elements.

```typescript
// ❌ WRONG - Causes DOM nesting validation errors
<Typography variant="h6">
  Title
  <Chip label="count" />  {/* Block element inside <p> */}
</Typography>

// ✅ CORRECT - Use Box with flexbox layout
<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
  <Typography variant="h6">Title</Typography>
  <Chip label="count" />
</Box>
```

**Common Invalid Nesting Patterns to Avoid**:
- `<Chip>` inside `<Typography>`
- `<Button>` inside `<Typography>`
- `<IconButton>` inside `<Typography>`
- `<Alert>` inside `<Typography>`
- Any Material-UI component that renders as `<div>` inside Typography

### Component Structure Patterns

**Layout Components**:
```typescript
// Use Box for layout containers
<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
  <Typography variant="h6">Header</Typography>
  <Box sx={{ display: 'flex', gap: 1 }}>
    <Chip label="status" />
    <IconButton>...</IconButton>
  </Box>
</Box>
```

**Card Headers with Counts**:
```typescript
// Standard pattern for cards with counts
<Card>
  <CardContent>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
      <Typography variant="h6" component="h3">Section Title</Typography>
      {count > 0 && <Chip label={count} size="small" color="primary" />}
    </Box>
    {/* Card content */}
  </CardContent>
</Card>
```

### Typography Component Guidelines

**When to use `component` prop**:
```typescript
// For semantic HTML structure
<Typography variant="h6" component="h3">  {/* h6 styling, h3 semantics */}
<Typography variant="body1" component="div">  {/* Allow block children */}
```

**Text-only in Typography**:
- Only put plain text and inline elements (`<span>`, `<em>`, `<strong>`) inside Typography
- Use separate Typography elements for each text block

## AWS Lambda Best Practices

### Region Configuration

**Always Set Explicit Defaults**:
```typescript
// Match your infrastructure deployment region
const getRegionFromQuery = (event: APIGatewayProxyEvent): string => {
  const queryRegion = event.queryStringParameters?.region;
  return queryRegion ?? 'us-west-2';  // Same as CDK deployment region
};
```

**Environment Variables**:
```typescript
// Use environment variables when possible
const region = process.env.AWS_REGION || process.env.CDK_DEFAULT_REGION || 'us-west-2';
```

### Debug Logging

**Always Include Region Info**:
```typescript
console.log('Request details', {
  requestId,
  userId,
  region,
  queryRegion: event.queryStringParameters?.region,
  selectedRegion: region,
});
```

### Error Handling

**Distinguish Error Types**:
```typescript
// Handle different AWS error types
if (error.name === 'UnauthorizedOperation') {
  return createResponse(403, { error: 'ACCESS_DENIED' });
}
if (error.name === 'InvalidInstanceID.NotFound') {
  return createResponse(404, { error: 'INSTANCE_NOT_FOUND' });
}
```
