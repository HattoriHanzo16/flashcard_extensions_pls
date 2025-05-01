/**
 * @jest-environment jsdom
 */

import fetchMock from 'jest-fetch-mock';

// Mock global chrome object
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
    },
    getURL: jest.fn(),
    lastError: undefined
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
  }
} as any; // Use type assertion to avoid TypeScript errors

// Mock the API_BASE_URL
jest.mock('../../../extension/src/config', () => ({
  API_BASE_URL: 'http://localhost:3000/api'
}));

// Setup fetch mock
fetchMock.enableMocks();

describe('Content Script API', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
    jest.clearAllMocks();
  });

  it('should successfully mock fetch API', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ id: '123' }));
    
    const response = await fetch('http://localhost:3000/api/flashcards', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ test: true }),
    });
    
    const data = await response.json();
    
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(data).toEqual({ id: '123' });
  });

  it('should mock chrome API correctly', () => {
    const callback = jest.fn();
    chrome.runtime.sendMessage({ action: 'test' }, callback);
    
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      { action: 'test' },
      callback
    );
  });
}); 