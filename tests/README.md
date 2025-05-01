# Testing Documentation

This directory contains tests for both the server and browser extension components of the flashcard application.

## Test Structure

The test suite is organized as follows:

```
tests/
├── setupTests.js              # Global test setup
├── server/                    # Server tests
│   ├── models/                # Database model tests
│   ├── controllers/           # API controller tests
│   └── routes/                # API routes integration tests
└── extension/                 # Extension tests
    ├── content/               # Content script tests
    ├── background/            # Background script tests
    └── popup/                 # Popup UI tests
```

## Running Tests

To run all tests:

```bash
npm test
```

To run tests in watch mode (useful during development):

```bash
npm run test:watch
```

To run a specific test file or directory:

```bash
npx jest tests/server/models
```

## Test Environment

- **Server Tests**: The server tests use an in-memory MongoDB database for testing.
- **Extension Tests**: The extension tests use JSDOM to simulate a browser environment and mock Chrome extension APIs.

## Mocking

The test suite uses several mocking strategies:

- **API Mocking**: `jest-fetch-mock` is used to mock fetch requests to the server.
- **Chrome API Mocking**: Chrome extension APIs are mocked in `setupTests.js`.
- **Database Mocking**: MongoDB connections use a test database that's cleared between tests.

## Writing New Tests

When adding new tests, consider the following guidelines:

1. **Unit Tests**: Write isolated tests for individual functions and components.
2. **Integration Tests**: Write tests that verify different parts of the system work together.
3. **Mocking**: Use appropriate mocks for external dependencies.
4. **Cleanup**: Ensure tests clean up after themselves to avoid affecting other tests.

## Coverage

Test coverage is automatically collected and reported when tests are run. You can view coverage reports in the console or in the `coverage/` directory after running tests. 