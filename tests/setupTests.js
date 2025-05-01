// Import Jest globals
const { beforeEach } = require('@jest/globals');

// Mock the chrome API for extension tests
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
    getURL: jest.fn().mockImplementation((path) => `chrome-extension://mock-extension-id/${path}`),
  },
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn(),
    },
    local: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn(),
    create: jest.fn(),
  },
};

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
}); 