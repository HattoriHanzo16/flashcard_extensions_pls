import { API_BASE_URL } from '../config';

interface SavedFlashcard {
  question: string;
  content: string;
  source: string;
  dateCreated: string;
}

let isInitialized = false;
let isSavingFlashcard = false;

const saveFlashcardToServer = async (flashcard: SavedFlashcard): Promise<void> => {
  try {
    if (isSavingFlashcard) {
      return;
    }
    
    isSavingFlashcard = true;

    const requestBody = JSON.stringify(flashcard);
    
    const response = await fetch(`${API_BASE_URL}/flashcards`, {
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'omit',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: requestBody,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server returned ${response.status}: ${errorText}`);
    }
    
    await response.json();
  } catch (error) {
    throw error;
  } finally {
    setTimeout(() => {
      isSavingFlashcard = false;
    }, 1000);
  }
};

const safelySendMessage = (message: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
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

const promptForQuestion = (selectedText: string): Promise<string> => {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '10000';

    const content = document.createElement('div');
    content.style.backgroundColor = 'white';
    content.style.padding = '20px';
    content.style.borderRadius = '5px';
    content.style.maxWidth = '500px';
    content.style.width = '90%';

    const title = document.createElement('h3');
    title.textContent = 'Create Flashcard';
    title.style.marginTop = '0';
    content.appendChild(title);

    const selectedTextDiv = document.createElement('div');
    selectedTextDiv.style.marginBottom = '15px';
    selectedTextDiv.style.padding = '10px';
    selectedTextDiv.style.backgroundColor = '#f5f5f5';
    selectedTextDiv.style.borderRadius = '4px';
    selectedTextDiv.style.maxHeight = '100px';
    selectedTextDiv.style.overflow = 'auto';
    selectedTextDiv.textContent = `Answer: ${selectedText}`;
    content.appendChild(selectedTextDiv);

    const label = document.createElement('label');
    label.textContent = 'Enter a question for this flashcard:';
    label.style.display = 'block';
    label.style.marginBottom = '5px';
    content.appendChild(label);

    const input = document.createElement('input');
    input.type = 'text';
    input.style.width = '100%';
    input.style.padding = '8px';
    input.style.boxSizing = 'border-box';
    input.style.marginBottom = '15px';
    input.placeholder = 'e.g., What is the definition of...?';
    content.appendChild(input);

    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'flex-end';
    
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.style.marginRight = '10px';
    cancelButton.style.padding = '8px 16px';
    cancelButton.style.border = '1px solid #ccc';
    cancelButton.style.borderRadius = '4px';
    cancelButton.style.cursor = 'pointer';
    
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save Flashcard';
    saveButton.style.padding = '8px 16px';
    saveButton.style.backgroundColor = '#4285f4';
    saveButton.style.color = 'white';
    saveButton.style.border = 'none';
    saveButton.style.borderRadius = '4px';
    saveButton.style.cursor = 'pointer';
    
    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(saveButton);
    content.appendChild(buttonContainer);

    modal.appendChild(content);
    document.body.appendChild(modal);

    setTimeout(() => input.focus(), 0);

    cancelButton.addEventListener('click', () => {
      document.body.removeChild(modal);
      resolve('');
    });

    saveButton.addEventListener('click', () => {
      saveButton.disabled = true;
      saveButton.style.opacity = '0.5';
      saveButton.textContent = 'Saving...';
      
      const question = input.value.trim();
      document.body.removeChild(modal);
      resolve(question || '');
    });

    input.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') {
        saveButton.click();
      }
    });
  });
};

const handleSaveSelection = async (): Promise<void> => {
  const selection = window.getSelection();
  if (!selection || selection.toString().trim() === '') {
    return;
  }
  
  const content = selection.toString().trim();
  const source = window.location.href;
  
  const question = await promptForQuestion(content);
  
  if (question === '') {
    return;
  }
  
  const flashcard: SavedFlashcard = {
    question,
    content,
    source,
    dateCreated: new Date().toISOString()
  };
  
  try {
    await saveFlashcardToServer(flashcard);
    
    try {
      await safelySendMessage({
        action: 'showNotification',
        data: {
          title: 'Flashcard Saved',
          message: 'Your question and answer have been saved as a flashcard'
        }
      });
    } catch (error) {
      // Notification error handling is silent
    }
  } catch (error) {
    try {
      await safelySendMessage({
        action: 'showNotification',
        data: {
          title: 'Error Saving Flashcard',
          message: 'Could not save to server. Please try again later.'
        }
      });
    } catch (notifError) {
      // Notification error handling is silent
    }
  }
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'ping') {
    sendResponse({ status: 'pong' });
  } else if (message.action === 'saveSelection') {
    try {
      handleSaveSelection();
      sendResponse({ status: 'success' });
    } catch (error: any) {
      sendResponse({ status: 'error', error: error.message || 'Unknown error' });
    }
  } else {
    sendResponse({ status: 'unknown_action' });
  }
  
  return true;
});

const init = async (): Promise<void> => {
  try {
    await safelySendMessage({ action: 'contentScriptReady' });
    
    const button = document.createElement('button');
    button.innerHTML = '💾';
    button.title = 'Save selection as flashcard';
    button.style.position = 'fixed';
    button.style.bottom = '20px';
    button.style.right = '20px';
    button.style.zIndex = '9999';
    button.style.padding = '10px';
    button.style.borderRadius = '50%';
    button.style.backgroundColor = '#4285f4';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.cursor = 'pointer';
    button.style.fontSize = '16px';
    button.style.display = 'none';
    
    button.addEventListener('click', handleSaveSelection);
    
    document.body.appendChild(button);
    
    document.addEventListener('selectionchange', () => {
      const selection = window.getSelection();
      button.style.display = (selection && selection.toString().trim() !== '') ? 'block' : 'none';
    });
    
    isInitialized = true;
  } catch (error) {
    // Initialization error handling is silent
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

if (!isInitialized) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'ping') {
      sendResponse({ status: 'pong' });
      return true;
    }
  });
}