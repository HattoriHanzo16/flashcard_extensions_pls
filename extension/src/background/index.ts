// Background script for PLS-Flashcards

// Keep track of content script loaded status
const contentScriptLoaded = new Map<number, boolean>();

// Create a context menu item for saving selected text as flashcards
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.remove('saveAsFlashcard', () => {
    chrome.contextMenus.create({
      id: 'saveAsFlashcard',
      title: 'Save as Flashcard',
      contexts: ['selection']
    });
  });
});

// Reset loaded status when tab is updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    contentScriptLoaded.set(tabId, false);
    
    if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://') && !tab.url.startsWith('devtools://')) {
      setTimeout(() => {
        checkContentScriptLoaded(tabId).catch(() => {});
      }, 500);
    } else {
      contentScriptLoaded.set(tabId, false);
    }
  }
});

// Check if content script is loaded in a tab
const checkContentScriptLoaded = async (tabId: number): Promise<void> => {
  try {
    const tab = await chrome.tabs.get(tabId);
    
    if (!tab.url) {
      contentScriptLoaded.set(tabId, false);
      return;
    }
    
    if (tab.url === 'undefined') {
      contentScriptLoaded.set(tabId, false);
      return;
    }
    
    const restrictedPrefixes = [
      'chrome://', 
      'chrome-extension://', 
      'devtools://',
      'about:',
      'data:',
      'file:',
      'view-source:'
    ];
    
    for (const prefix of restrictedPrefixes) {
      if (tab.url.startsWith(prefix)) {
        contentScriptLoaded.set(tabId, false);
        return;
      }
    }
    
    chrome.tabs.sendMessage(
      tabId, 
      { action: 'ping' }, 
      (response) => {
        if (chrome.runtime.lastError) {
          contentScriptLoaded.set(tabId, false);
        } else if (response && response.status === 'pong') {
          contentScriptLoaded.set(tabId, true);
        } else {
          contentScriptLoaded.set(tabId, false);
        }
      }
    );
  } catch (err) {
    contentScriptLoaded.set(tabId, false);
  }
};

// Mark content script as loaded when it sends a ready message
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'contentScriptReady' && sender.tab?.id) {
    contentScriptLoaded.set(sender.tab.id, true);
    sendResponse({ status: 'acknowledged' });
  }
  
  if (message.action === 'ping') {
    sendResponse({ status: 'pong' });
  }
  
  if (message.action === 'createContextMenu') {
    try {
      chrome.contextMenus.remove(message.data.id, () => {
        chrome.contextMenus.create(message.data);
        sendResponse({ status: 'success' });
      });
    } catch (error) {
      sendResponse({ status: 'error', message: error });
    }
    return true;
  } else if (message.action === 'showNotification') {
    try {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'assets/icon-128.png',
        title: message.data.title,
        message: message.data.message
      });
      sendResponse({ status: 'success' });
    } catch (error) {
      sendResponse({ status: 'error', message: error });
    }
  }
  
  return true;
});

// Helper function to safely inject content script
const injectContentScript = async (tabId: number): Promise<boolean> => {
  try {
    const tab = await chrome.tabs.get(tabId);
    
    if (!tab.url) {
      return false;
    }
    
    if (tab.url === 'undefined') {
      return false;
    }
    
    if (tab.url.startsWith('chrome://') || 
        tab.url.startsWith('chrome-extension://') || 
        tab.url.startsWith('devtools://') ||
        tab.url.startsWith('about:') ||
        tab.url.startsWith('data:') ||
        tab.url.startsWith('file:') ||
        tab.url.startsWith('view-source:')) {
      return false;
    }
    
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });
    
    return new Promise(resolve => {
      setTimeout(() => {
        checkContentScriptLoaded(tabId);
        
        setTimeout(() => {
          const isLoaded = contentScriptLoaded.get(tabId) || false;
          resolve(isLoaded);
        }, 500);
      }, 1000);
    });
  } catch (err) {
    return false;
  }
};

// Helper function to safely send a message to content script
const safelySendMessageToContent = (tabId: number, message: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'saveAsFlashcard' && tab?.id) {
    const tabId = tab.id;
    
    if (!tab.url || 
        tab.url === 'undefined' || 
        tab.url.startsWith('chrome://') || 
        tab.url.startsWith('chrome-extension://') || 
        tab.url.startsWith('devtools://')) {
      return;
    }

    const sendSaveMessage = async () => {
      try {
        const isLoaded = contentScriptLoaded.get(tabId);
        
        if (!isLoaded) {
          const injected = await injectContentScript(tabId);
          if (!injected) {
            return;
          }
        }
        
        await safelySendMessageToContent(tabId, { action: 'saveSelection' });
      } catch (error) {
        try {
          await injectContentScript(tabId);
          setTimeout(async () => {
            try {
              await safelySendMessageToContent(tabId, { action: 'saveSelection' });
            } catch (retryError) {
              // Silent failure
            }
          }, 1000);
        } catch (injectionError) {
          // Silent failure
        }
      }
    };
    
    sendSaveMessage();
  }
});

// Keep service worker alive for periodic tasks
const keepAlive = () => {
  setTimeout(keepAlive, 20000);
};

keepAlive(); 