import { API_BASE_URL } from '../config';

// Interfaces
interface Flashcard {
  id?: string;
  question?: string;
  content: string;
  source: string;
  dateCreated: Date;
  lastReviewed?: Date;
  reviewCount: number;
  difficulty: 'easy' | 'hard' | 'unknown';
}

// DOM Elements
let flashcardListEl: HTMLDivElement;
let cardCountEl: HTMLSpanElement;

// State
let flashcards: Flashcard[] = [];

// Helper function to safely send a message to the background script
const safelySendMessage = (message: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.sendMessage === 'function') {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        });
      } else {
        reject(new Error("Chrome runtime API not available"));
      }
    } catch (error) {
      reject(error);
    }
  });
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements
  flashcardListEl = document.getElementById('flashcard-list') as HTMLDivElement;
  cardCountEl = document.getElementById('card-count') as HTMLSpanElement;
  
  // Set up tab switching
  const browseTabs = document.getElementById('browse-tab') as HTMLButtonElement;
  const reviewTabs = document.getElementById('review-tab') as HTMLButtonElement;
  const browseSection = document.getElementById('browse-section') as HTMLElement;
  const reviewSection = document.getElementById('review-section') as HTMLElement;
  
  browseTabs.addEventListener('click', () => {
    browseTabs.classList.add('active');
    reviewTabs.classList.remove('active');
    browseSection.classList.add('active');
    reviewSection.classList.remove('active');
    
    // Refresh flashcards when switching back to browse tab
    loadFlashcards();
  });
  
  reviewTabs.addEventListener('click', () => {
    // Open the options page for review
    chrome.runtime.openOptionsPage();
  });
  
  // Set up review buttons in card items
  document.querySelectorAll('.review-action-button.start').forEach(button => {
    button.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  });
  
  // Set up rating buttons
  const easyButton = document.getElementById('easy-button') as HTMLButtonElement;
  const forgotButton = document.getElementById('forgot-button') as HTMLButtonElement;
  const hardButton = document.getElementById('hard-button') as HTMLButtonElement;
  
  if (easyButton) {
    easyButton.addEventListener('click', () => rateCurrentCard('easy'));
  }
  
  if (forgotButton) {
    forgotButton.addEventListener('click', () => rateCurrentCard('forgot'));
  }
  
  if (hardButton) {
    hardButton.addEventListener('click', () => rateCurrentCard('hard'));
  }
  
  // Set up sync button
  const syncButton = document.getElementById('sync-button') as HTMLButtonElement;
  syncButton.addEventListener('click', syncWithServer);
  
  // Set up clear button
  const clearButton = document.getElementById('clear-button') as HTMLButtonElement;
  clearButton.addEventListener('click', clearAllFlashcards);
  
  // Load flashcards
  loadFlashcards();
  
  // Add visibility change listener to refresh cards when popup regains focus
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      loadFlashcards();
    }
  });
});

// Add focus event listener to window to refresh when popup is reopened
window.addEventListener('focus', () => {
  loadFlashcards();
});

// Load flashcards from server
const loadFlashcards = async (): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/flashcards`);
    
    if (response.ok) {
      const data = await response.json();
      flashcards = data;
      updateCardCount();
      renderFlashcardList();
    } else {
      flashcards = [];
      updateCardCount();
      renderFlashcardList();
    }
  } catch (error) {
    flashcards = [];
    updateCardCount();
    renderFlashcardList();
  }
};

// Update card count display
const updateCardCount = (): void => {
  cardCountEl.textContent = `${flashcards.length} card${flashcards.length !== 1 ? 's' : ''}`;
};

// Render flashcard list in the browse section
const renderFlashcardList = (): void => {
  // Clear the existing content first
  flashcardListEl.innerHTML = '';
  
  if (flashcards.length === 0) {
    flashcardListEl.innerHTML = `
      <div class="empty-state">
        <p>No flashcards yet. Highlight text on any webpage and right-click to save.</p>
      </div>
    `;
    return;
  }
  
  // Calculate unreviewed cards
  const unreviewedCards = flashcards.filter(card => !card.lastReviewed);
  
  // Add filter controls at the top if there are both reviewed and unreviewed cards
  if (unreviewedCards.length > 0 && unreviewedCards.length < flashcards.length) {
    const filterControls = document.createElement('div');
    filterControls.className = 'filter-controls';
    filterControls.style.display = 'flex';
    filterControls.style.justifyContent = 'space-between';
    filterControls.style.marginBottom = '16px';
    filterControls.style.padding = '8px 12px';
    filterControls.style.backgroundColor = '#f9fafb';
    filterControls.style.borderRadius = '8px';
    
    filterControls.innerHTML = `
      <div>
        <span style="font-size: 14px; color: #6b7280;">${unreviewedCards.length} cards need review</span>
      </div>
      <button id="review-unreviewed" class="review-action-button start" style="padding: 6px 12px; font-size: 13px;">
        Review Unreviewed
      </button>
    `;
    
    flashcardListEl.appendChild(filterControls);
    
    // Add event listener for the review unreviewed button
    const reviewUnreviewedButton = document.getElementById('review-unreviewed');
    reviewUnreviewedButton?.addEventListener('click', () => {
      // Open options page and pass a flag to review only unreviewed cards
      chrome.runtime.openOptionsPage(() => {
        chrome.runtime.sendMessage({
          action: 'startReviewUnreviewed',
          unreviewed: true
        });
      });
    });
  }
  
  // Create a container for flashcards
  const cardsContainer = document.createElement('div');
  cardsContainer.className = 'flashcards-container';
  flashcardListEl.appendChild(cardsContainer);
  
  flashcards.forEach((card, index) => {
    // Determine review status
    let reviewStatus = '';
    let reviewClass = '';
    let reviewEmoji = '';
    let borderColor = 'var(--primary-light)';
    
    if (card.lastReviewed) {
      // Get difficulty and set icon
      switch (card.difficulty) {
        case 'easy':
          reviewStatus = 'Rated Easy';
          reviewClass = 'easy';
          reviewEmoji = '👍';
          borderColor = '#10b981'; // Green
          break;
        case 'hard':
          reviewStatus = 'Rated Hard';
          reviewClass = 'hard';
          reviewEmoji = '👎';
          borderColor = '#ef4444'; // Red
          break;
        case 'unknown':
          reviewStatus = 'Rated Forgot';
          reviewClass = 'forgot';
          reviewEmoji = '✋';
          borderColor = '#6366f1'; // Purple
          break;
        default:
          reviewStatus = 'Reviewed';
          reviewClass = '';
          reviewEmoji = '';
      }
    } else {
      reviewStatus = 'Not Reviewed';
      reviewClass = 'not-reviewed';
      reviewEmoji = '⏰';
    }
    
    // Get hostname from source
    let hostname = '';
    try {
      hostname = new URL(card.source).hostname;
    } catch (e) {
      hostname = card.source;
    }
    
    const cardEl = document.createElement('div');
    cardEl.className = `flashcard-item ${reviewClass}`;
    cardEl.style.borderLeftColor = borderColor;
    
    // Format review date if available
    let reviewDateStr = '';
    if (card.lastReviewed) {
      const reviewDate = new Date(card.lastReviewed);
      reviewDateStr = `<span style="color: #94a3b8; font-size: 11px; margin-left: 6px;">(${reviewDate.toLocaleDateString()})</span>`;
    }
    
    // MongoDB returns _id instead of id - handle both cases
    const cardId = card.id || (card as any)._id;
    
    cardEl.innerHTML = `
      <div class="flashcard-header">
        <div class="review-status ${reviewClass}">${reviewEmoji} ${reviewStatus}</div>
        <div class="date-created">${card.dateCreated ? new Date(card.dateCreated).toLocaleDateString() : 'No date'}</div>
      </div>
      <div class="flashcard-content">
        ${card.question ? `<div class="question">${card.question}</div>` : ''}
        <div class="answer">${card.content}</div>
      </div>
      <div class="flashcard-footer">
        <a href="${card.source}" target="_blank" class="source-link" title="${card.source}">${hostname}</a>
        <div class="actions">
          <button class="delete-button" data-id="${cardId}">🗑️</button>
        </div>
      </div>
    `;
    
    // Add event listener to review button
    const reviewButton = cardEl.querySelector('.review-action-button.start');
    reviewButton?.addEventListener('click', () => {
      // Open options page and pass current card index
      chrome.runtime.openOptionsPage(() => {
        // Send message to options page to start review with this card
        chrome.runtime.sendMessage({
          action: 'startReviewWithCard',
          cardIndex: index
        });
      });
    });
    
    cardsContainer.appendChild(cardEl);
    
    const deleteButton = cardEl.querySelector('.delete-button') as HTMLButtonElement;
    if (deleteButton) {
      deleteButton.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        const id = deleteButton.getAttribute('data-id');
        if (id) {
          try {
            console.log(`Deleting flashcard with ID: ${id}`);
            const response = await fetch(`${API_BASE_URL}/flashcards/${id}`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json'
              }
            });
            
            if (response.ok) {
              console.log(`Successfully deleted flashcard with ID: ${id}`);
              // Remove the card from the DOM directly for immediate feedback
              const cardElement = deleteButton.closest('.flashcard-item');
              if (cardElement && cardElement.parentNode) {
                cardElement.parentNode.removeChild(cardElement);
              }
              // Then refresh the list
              loadFlashcards();
            } else {
              console.error(`Failed to delete flashcard with ID: ${id}`, await response.text());
            }
          } catch (error) {
            console.error(`Error deleting flashcard with ID: ${id}`, error);
          }
        }
      });
    }
  });
};

// Sync with server
const syncWithServer = async (): Promise<void> => {
  try {
    const spinnerElement = document.getElementById('sync-spinner');
    if (spinnerElement) {
      spinnerElement.style.display = 'inline-block';
    }
    
    await loadFlashcards();
    
    if (spinnerElement) {
      spinnerElement.style.display = 'none';
    }
  } catch (error) {
    const spinnerElement = document.getElementById('sync-spinner');
    if (spinnerElement) {
      spinnerElement.style.display = 'none';
    }
  }
};

// Clear all flashcards
const clearAllFlashcards = async (): Promise<void> => {
  try {
    const confirmElement = document.getElementById('confirm-clear-modal') as HTMLDivElement;
    confirmElement.style.display = 'flex';
    
    const confirmButton = document.getElementById('confirm-clear-yes') as HTMLButtonElement;
    const cancelButton = document.getElementById('confirm-clear-no') as HTMLButtonElement;
    
    const handleClear = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/flashcards`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          confirmElement.style.display = 'none';
          loadFlashcards();
        }
      } catch (error) {
        confirmElement.style.display = 'none';
      }
      
      confirmButton.removeEventListener('click', handleClear);
      cancelButton.removeEventListener('click', handleCancel);
    };
    
    const handleCancel = () => {
      confirmElement.style.display = 'none';
      confirmButton.removeEventListener('click', handleClear);
      cancelButton.removeEventListener('click', handleCancel);
    };
    
    confirmButton.addEventListener('click', handleClear);
    cancelButton.addEventListener('click', handleCancel);
  } catch (error) {
    // Silently fail
  }
};

// Add listener for messages from options page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'flashcardUpdated') {
    // Refresh the flashcards list when a card is updated
    loadFlashcards();
    sendResponse({ success: true });
  }
  return true; // Return true to indicate that the response will be sent asynchronously
});

// Function to rate the current flashcard
function rateCurrentCard(rating: 'easy' | 'forgot' | 'hard'): void {
  const activeCard = document.querySelector('.review-card.active') as HTMLElement;
  if (!activeCard) return;
  
  const cardId = activeCard.getAttribute('data-id');
  if (!cardId) return;
  
  const card = flashcards.find(c => c.id === cardId);
  if (!card) return;
  
  const difficultyMap: { [key: string]: 'easy' | 'hard' | 'unknown' } = {
    'easy': 'easy',
    'hard': 'hard',
    'forgot': 'unknown'
  };
  
  card.difficulty = difficultyMap[rating];
  card.lastReviewed = new Date();
  card.reviewCount = (card.reviewCount || 0) + 1;
  
  updateCardOnServer(card);
  
  showRatingFeedback(rating);
}

// Update card on server
async function updateCardOnServer(card: Flashcard): Promise<void> {
  if (!card.id) return;
  
  try {
    await fetch(`${API_BASE_URL}/flashcards/${card.id}/review`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        difficulty: card.difficulty,
        lastReviewed: card.lastReviewed?.toISOString(),
        reviewCount: card.reviewCount
      })
    });
  } catch (error) {
    // Silently fail
  }
}

// Show visual feedback for rating
function showRatingFeedback(rating: string): void {
  const feedbackElement = document.getElementById('rating-feedback') as HTMLDivElement;
  if (!feedbackElement) return;
  
  feedbackElement.className = 'rating-feedback';
  feedbackElement.classList.add(rating);
  
  let message = '';
  switch (rating) {
    case 'easy':
      message = '👍 Marked as Easy';
      break;
    case 'hard':
      message = '👎 Marked as Hard';
      break;
    case 'forgot':
      message = '✋ Marked as Forgot';
      break;
  }
  
  feedbackElement.textContent = message;
  feedbackElement.style.display = 'block';
  
  setTimeout(() => {
    feedbackElement.style.display = 'none';
  }, 1500);
} 