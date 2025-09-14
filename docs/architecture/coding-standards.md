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

## Naming Conventions
| Element | Frontend | Backend | Example |
|---------|----------|---------|---------|
| Components | PascalCase | - | `UserProfile.tsx` |
| Hooks | camelCase with 'use' | - | `useAuth.ts` |
| API Routes | - | kebab-case | `/api/user-profile` |
| Database Tables | - | snake_case | `user_profiles` |
| Functions | camelCase | camelCase | `getUserById()` |
| Constants | UPPER_SNAKE_CASE | UPPER_SNAKE_CASE | `MAX_RETRIES` |
| Interfaces | PascalCase with 'I' prefix optional | PascalCase | `User` or `IUser` |
| File names | PascalCase for components, camelCase for others | camelCase | `Button.tsx`, `apiClient.ts` |
