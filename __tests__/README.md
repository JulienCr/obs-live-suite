# OBS Live Suite - Test Suite

## Test Structure

```
__tests__/
├── models/              # Data model tests
│   ├── Guest.test.ts
│   └── Macro.test.ts
├── services/            # Service layer tests
│   ├── ChannelManager.test.ts
│   └── MacroEngine.test.ts
├── components/          # React component tests
│   ├── CountdownRenderer.test.tsx
│   ├── LowerThirdRenderer.test.tsx
│   └── PosterRenderer.test.tsx
├── utils/               # Utility function tests
│   ├── Logger.test.ts
│   └── cn.test.ts
├── config/              # Configuration tests
│   └── AppConfig.test.ts
├── api/                 # API route tests
│   └── updater-check.test.ts
├── integration/         # Integration tests
│   └── api-routes.test.ts
├── functional/          # Functional/E2E tests
│   ├── server-initialization.test.ts
│   ├── api-endpoints.test.ts
│   ├── websocket-communication.test.ts
│   └── database-operations.test.ts
└── README.md
```

## Running Tests

### Run All Tests
```bash
pnpm test
```

### Run Tests in Watch Mode
```bash
pnpm test:watch
```

### Run Tests with Coverage
```bash
pnpm test:coverage
```

### Run Specific Test File
```bash
pnpm test Guest.test.ts
```

## Test Categories

### Unit Tests
- **Models**: Zod schema validation and model class methods
- **Utils**: Utility functions (logger, class name merger)
- **Config**: Configuration loading and getters
- **Components**: React overlay renderers with WebSocket integration
- **API**: API route handlers and type safety

### Integration Tests
- **Services**: Service layer interactions
- **API Routes**: Endpoint request/response validation

### Functional Tests
- **Server Initialization**: Full server startup and initialization flow
- **API Endpoints**: Real HTTP endpoint testing with actual services
- **WebSocket Communication**: Real-time messaging and client connections
- **Database Operations**: Full CRUD operations on all tables

### Coverage Goals
- Branches: 50%
- Functions: 50%
- Lines: 50%
- Statements: 50%

## Writing New Tests

### Model Tests
Test schema validation and model class methods:
```typescript
describe('ModelName', () => {
  it('should validate valid data', () => {
    const result = schema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});
```

### Service Tests
Test service methods and interactions:
```typescript
describe('ServiceName', () => {
  it('should perform action', async () => {
    const result = await service.doSomething();
    expect(result).toBeDefined();
  });
});
```

### API Tests
Test endpoint behavior and type safety:
```typescript
describe('API Endpoint', () => {
  it('should handle properly typed data', () => {
    interface DataRow {
      id: string;
      value: number;
    }
    const data: DataRow[] = [{ id: 'test', value: 1 }];
    expect(data[0].id).toBe('test');
  });
});
```

### Component Tests
Test React components with mocked WebSocket:
```typescript
describe('ComponentName', () => {
  it('should render when data is received', async () => {
    render(<Component />);
    mockWs.simulateMessage({ type: 'show', data: {} });
    await waitFor(() => {
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });
});
```

## Mocking

### WebSocket Mock
WebSocketHub is mocked in service tests to avoid actual connections.

### Database Mock
DatabaseService is mocked to avoid file system operations during tests.

### OBS Mock
OBS adapters are mocked to test without actual OBS connection.

## Test Best Practices

1. **Isolation**: Each test should be independent
2. **Clarity**: Test names should clearly describe what they test
3. **Coverage**: Aim for high coverage of critical paths
4. **Speed**: Keep tests fast by mocking external dependencies
5. **Assertions**: Use specific, meaningful assertions

## CI/CD Integration

Tests should be run:
- Before commits (pre-commit hook)
- On pull requests
- Before deployment

## Known Limitations

- WebSocket integration tests require manual testing
- OBS connection tests require actual OBS instance
- UI component tests are minimal (can be expanded)
- E2E tests not included (future enhancement)

