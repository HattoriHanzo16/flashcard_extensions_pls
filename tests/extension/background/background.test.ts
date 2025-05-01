/**
 * @jest-environment jsdom
 */

// Mock global chrome object
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
    },
    getURL: jest.fn(),
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
  notifications: {
    create: jest.fn(),
    onClicked: {
      addListener: jest.fn(),
    },
    clear: jest.fn()
  },
  action: {
    setBadgeText: jest.fn(),
    setBadgeBackgroundColor: jest.fn()
  },
  contextMenus: {
    create: jest.fn(),
    onClicked: {
      addListener: jest.fn()
    }
  }
} as any; // Use type assertion to avoid TypeScript errors

describe('Background Script API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should mock notification API correctly', () => {
    const notificationId = 'test-notification';
    const notificationOptions = {
      type: 'basic',
      title: 'Test Notification',
      message: 'This is a test notification',
      iconUrl: 'icon.png'
    };
    
    chrome.notifications.create(notificationId, notificationOptions, jest.fn());
    
    expect(chrome.notifications.create).toHaveBeenCalledWith(
      notificationId,
      notificationOptions,
      expect.any(Function)
    );
  });

  it('should mock badge API correctly', () => {
    chrome.action.setBadgeText({ text: '5' });
    chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
    
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '5' });
    expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#FF0000' });
  });

  it('should mock context menu API correctly', () => {
    const menuProperties = {
      id: 'save-flashcard',
      title: 'Save as Flashcard',
      contexts: ['selection']
    };
    
    chrome.contextMenus.create(menuProperties);
    
    expect(chrome.contextMenus.create).toHaveBeenCalledWith(menuProperties);
  });
}); 