import * as tf from '@tensorflow/tfjs';
import * as handpose from '@tensorflow-models/handpose';
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

enum GestureType {
  THUMBS_UP = 'easy',
  THUMBS_DOWN = 'hard',
  OPEN_PALM = 'unknown'
}

// DOM Elements
const backButton = document.getElementById('back-to-popup') as HTMLButtonElement;
const startReviewButton = document.getElementById('start-review') as HTMLButtonElement;
const stopReviewButton = document.getElementById('stop-review') as HTMLButtonElement;
const manualEasyButton = document.getElementById('manual-easy') as HTMLButtonElement;
const manualForgotButton = document.getElementById('manual-forgot') as HTMLButtonElement;
const manualHardButton = document.getElementById('manual-hard') as HTMLButtonElement;
const cardFront = document.getElementById('card-front') as HTMLDivElement;
const cardBack = document.getElementById('card-back') as HTMLDivElement;
const flashcardReview = document.getElementById('flashcard-review') as HTMLDivElement;
const statsBadge = document.getElementById('stats-badge') as HTMLSpanElement;
const webcamEl = document.getElementById('webcam') as HTMLVideoElement;
const canvasEl = document.getElementById('output-canvas') as HTMLCanvasElement;

// State variables
let isReviewing = false;
let flashcards: Flashcard[] = [];
let currentCardIndex = 0;
let isShowingAnswer = false;
let handposeModel: handpose.HandPose;
let webcamStream: MediaStream | null = null;
let lastDetectedGesture: GestureType | null = null;
let isHandposeModelLoaded = false;
let isDetectingGestures = false;
let gestureCooldown = false; // Cooldown to prevent rapid gesture triggers
let isTransitioning = false; // Flag to track card transitions
let reviewingUnreviewedOnly = false; // Flag to review only unreviewed cards
let filteredFlashcards: Flashcard[] = []; // Filtered list of flashcards
let previousLandmarks: number[][] | null = null;
let stableFrameCount = 0;
const STABILITY_THRESHOLD = 10; // Pixel threshold for considering the hand stable
const MIN_STABLE_FRAMES = 3;    // Number of stable frames required before detecting a gesture
let isDebugMode = false;

// Initialize
async function init() {
  await loadFlashcards();
  setupEventListeners();
  
  // Show empty state if no flashcards available
  if (flashcards.length === 0) {
    showEmptyState();
  }
  
  // Add status indicator to webcam container
  addStatusIndicator();
  
  // Preload TensorFlow.js and handpose model
  showModelStatus('Loading TensorFlow.js...');
  await tf.ready();
  
  try {
    showModelStatus('Loading handpose model...');
    handposeModel = await handpose.load();
    isHandposeModelLoaded = true;
    showModelStatus('Handpose model ready! Show your hand to the camera.');
  } catch (error) {
    showModelStatus('Error loading handpose model. Using manual controls.', true);
  }
}

// Add model status indicator
function addStatusIndicator() {
  const webcamContainer = document.getElementById('webcam-container');
  if (!webcamContainer) return;
  
  // Check if status indicator already exists
  if (!document.getElementById('model-status')) {
    const statusIndicator = document.createElement('div');
    statusIndicator.id = 'model-status';
    statusIndicator.className = 'model-status';
    statusIndicator.style.position = 'absolute';
    statusIndicator.style.bottom = '10px';
    statusIndicator.style.left = '10px';
    statusIndicator.style.right = '10px';
    statusIndicator.style.padding = '8px 12px';
    statusIndicator.style.backgroundColor = 'rgba(0,0,0,0.7)';
    statusIndicator.style.color = 'white';
    statusIndicator.style.borderRadius = '4px';
    statusIndicator.style.fontSize = '14px';
    statusIndicator.style.zIndex = '10';
    statusIndicator.style.textAlign = 'center';
    statusIndicator.textContent = 'Initializing...';
    
    webcamContainer.appendChild(statusIndicator);
  }
  
  // Add debug overlay for hand tracking
  if (!document.getElementById('hand-debug-info')) {
    const debugInfo = document.createElement('div');
    debugInfo.id = 'hand-debug-info';
    debugInfo.style.position = 'absolute';
    debugInfo.style.top = '10px';
    debugInfo.style.right = '10px';
    debugInfo.style.padding = '5px 10px';
    debugInfo.style.backgroundColor = 'rgba(0,0,0,0.5)';
    debugInfo.style.color = 'white';
    debugInfo.style.borderRadius = '4px';
    debugInfo.style.fontSize = '12px';
    debugInfo.style.zIndex = '10';
    debugInfo.style.display = 'none';
    
    webcamContainer.appendChild(debugInfo);
  }
  
  // Add debug mode toggle button
  if (!document.getElementById('debug-toggle')) {
    const debugToggle = document.createElement('button');
    debugToggle.id = 'debug-toggle';
    debugToggle.textContent = '🐞 Debug Off';
    debugToggle.style.position = 'absolute';
    debugToggle.style.top = '10px';
    debugToggle.style.left = '10px';
    debugToggle.style.padding = '5px 10px';
    debugToggle.style.backgroundColor = 'rgba(0,0,0,0.5)';
    debugToggle.style.color = 'white';
    debugToggle.style.border = 'none';
    debugToggle.style.borderRadius = '4px';
    debugToggle.style.fontSize = '12px';
    debugToggle.style.zIndex = '10';
    debugToggle.style.cursor = 'pointer';
    
    debugToggle.addEventListener('click', toggleDebugMode);
    
    webcamContainer.appendChild(debugToggle);
  }
}

// Show model status
function showModelStatus(message: string, isError = false) {
  const statusEl = document.getElementById('model-status');
  if (!statusEl) return;
  
  statusEl.textContent = message;
  statusEl.style.backgroundColor = isError ? 'rgba(220,38,38,0.8)' : 'rgba(0,0,0,0.7)';
  
  // Make it fade out after a delay if it's not an error
  if (!isError && message.includes('ready')) {
    setTimeout(() => {
      statusEl.style.opacity = '0.6';
    }, 3000);
  } else {
    statusEl.style.opacity = '1';
  }
}

// Toggle debug mode
function toggleDebugMode() {
  isDebugMode = !isDebugMode;
  
  const debugToggle = document.getElementById('debug-toggle');
  if (debugToggle) {
    debugToggle.textContent = isDebugMode ? '🐞 Debug On' : '🐞 Debug Off';
    debugToggle.style.backgroundColor = isDebugMode ? 'rgba(0,128,0,0.7)' : 'rgba(0,0,0,0.5)';
  }
  
  const debugInfo = document.getElementById('hand-debug-info');
  if (debugInfo) {
    debugInfo.style.display = isDebugMode ? 'block' : 'none';
  }
  
  // If debug mode is turned on, update the canvas style to show hand landmarks more clearly
  if (canvasEl) {
    canvasEl.style.opacity = isDebugMode ? '1' : '0.5';
  }
  
  showModelStatus(isDebugMode ? 'Debug mode enabled' : 'Debug mode disabled', false);
}

// Show hand detection info
function updateHandDebugInfo(landmarks: number[][] | null, gesture: GestureType | null) {
  if (!isDebugMode) return; // Skip updating if debug mode is off
  
  const debugEl = document.getElementById('hand-debug-info');
  if (!debugEl) return;
  
  if (!landmarks) {
    debugEl.style.display = 'none';
    return;
  }
  
  debugEl.style.display = 'block';
  
  // Calculate hand size
  const wrist = landmarks[0];
  const index = landmarks[8];
  const handSize = Math.sqrt(
    Math.pow(index[0] - wrist[0], 2) + 
    Math.pow(index[1] - wrist[1], 2)
  );
  
  // Calculate confidence metrics
  let confidence = 'Low';
  
  // Distance between thumb and index as a confidence proxy
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const dist = Math.sqrt(
    Math.pow(thumbTip[0] - indexTip[0], 2) + 
    Math.pow(thumbTip[1] - indexTip[1], 2)
  );
  
  // Check finger position validity
  const allFingersVisible = 
    landmarks[4][2] > 0 &&  // Thumb
    landmarks[8][2] > 0 &&  // Index
    landmarks[12][2] > 0 && // Middle
    landmarks[16][2] > 0 && // Ring
    landmarks[20][2] > 0;   // Pinky
  
  // Determine confidence level
  if (handSize > 100 && allFingersVisible) {
    confidence = 'High';
  } else if (handSize > 70 || dist > 30) {
    confidence = 'Medium';
  }
  
  // Format stability info
  const stabilityInfo = `Stability: ${stableFrameCount}/${MIN_STABLE_FRAMES} frames<br>`;
  
  // Show information about why a gesture wasn't detected
  let detectionInfo = '';
  if (stableFrameCount < MIN_STABLE_FRAMES) {
    detectionInfo = `<span style="color: orange">Hand not stable enough</span><br>`;
  } else if (handSize < 50) {
    detectionInfo = `<span style="color: orange">Hand too small (${Math.round(handSize)}px)</span><br>`;
  } else if (!allFingersVisible) {
    detectionInfo = `<span style="color: orange">Not all fingers visible</span><br>`;
  }
  
  // Show information about gestures
  const gestureEmoji = gesture ? getGestureEmoji(gesture) : '❓';
  
  debugEl.innerHTML = `
    Hand size: ${Math.round(handSize)}px<br>
    Confidence: ${confidence}<br>
    ${stabilityInfo}
    ${detectionInfo}
    Gesture: ${gestureEmoji} ${gesture || 'None'}<br>
    Cooldown: ${gestureCooldown ? 'Yes' : 'No'}
  `;
  
  // Show the debug info element for better visibility
  debugEl.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  debugEl.style.color = 'white';
  debugEl.style.padding = '8px 12px';
  debugEl.style.borderRadius = '4px';
  debugEl.style.fontSize = '12px';
  debugEl.style.maxWidth = '200px';
}

// Load flashcards from server
const loadFlashcards = async (): Promise<void> => {
  try {
    console.log("Loading flashcards");
    console.log("Server URL:", `${API_BASE_URL}/flashcards`);

    const response = await fetch(`${API_BASE_URL}/flashcards`);
    console.log("Flashcards fetch status:", response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log("Received flashcards from server:", data);
      flashcards = data;
      updateStatsBadge();
      
      if (flashcards.length === 0) {
        showEmptyState();
      } else {
        loadCard(currentCardIndex);
      }
    } else {
      const errorText = await response.text();
      console.error(`Failed to load flashcards from server: ${response.status} ${errorText}`);
      flashcards = [];
      updateStatsBadge();
      showEmptyState();
    }
  } catch (error) {
    console.error('Error loading flashcards from server:', error);
    flashcards = [];
    updateStatsBadge();
    showEmptyState();
  }
};

// Event listeners
function setupEventListeners() {
  backButton.addEventListener('click', goBackToPopup);
  startReviewButton.addEventListener('click', startReview);
  stopReviewButton.addEventListener('click', stopReview);
  manualEasyButton.addEventListener('click', () => rateCard('easy'));
  manualForgotButton.addEventListener('click', () => rateCard('forgot'));
  manualHardButton.addEventListener('click', () => rateCard('hard'));
  flashcardReview.addEventListener('click', flipCard);
  
  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyPress);
}

// Handle keyboard shortcuts
function handleKeyPress(e: KeyboardEvent) {
  if (!isReviewing) return;
  
  switch(e.key.toLowerCase()) {
    case 'e':
      rateCard('easy');
      break;
    case 'f':
      rateCard('forgot');
      break;
    case 'h':
      rateCard('hard');
      break;
    case ' ':
      flipCard();
      break;
  }
}

// Go back to popup
function goBackToPopup() {
  window.close();
}

// Start review session
async function startReview() {
  if (flashcards.length === 0) {
    alert('No flashcards to review. Create some flashcards first!');
    showEmptyState();
    return;
  }
  
  // If reviewing only unreviewed cards, filter the list
  if (reviewingUnreviewedOnly) {
    filteredFlashcards = flashcards.filter(card => !card.lastReviewed);
    
    if (filteredFlashcards.length === 0) {
      // No unreviewed cards, show a message
      showNoUnreviewedCardsMessage();
      return;
    }
  } else {
    // Use all flashcards
    filteredFlashcards = [...flashcards];
  }

  isReviewing = true;
  startReviewButton.disabled = true;
  stopReviewButton.disabled = false;
  
  try {
    // Request camera access
    console.log('Requesting camera access...');
    webcamStream = await requestCameraAccess();
    
    if (!webcamStream) {
      console.log('No camera access. Using manual review mode.');
      showModelStatus('Camera access denied. Using manual controls.', true);
    } else {
      // Setup webcam
      webcamEl.srcObject = webcamStream;
      
      // Set canvas dimensions to match video dimensions once metadata is loaded
      webcamEl.onloadedmetadata = () => {
        canvasEl.width = webcamEl.videoWidth;
        canvasEl.height = webcamEl.videoHeight;
      };
      
      // Start hand detection
      if (isHandposeModelLoaded && handposeModel) {
        console.log('Starting gesture detection...');
        showModelStatus('Hand detection active. Make a gesture...');
        isDetectingGestures = true;
        detectGestures();
      } else {
        console.log('Handpose model not loaded. Using manual review mode.');
        showModelStatus('Hand detection not available. Using manual controls.', true);
      }
    }
    
    // Reset to first card and show it
    currentCardIndex = 0;
    isShowingAnswer = false;
    loadCard(currentCardIndex);
  } catch (error) {
    console.error('Error starting review:', error);
    showModelStatus('Error starting review. Using manual controls.', true);
  }
}

// Request camera access
async function requestCameraAccess(): Promise<MediaStream | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: 640,
        height: 480,
        facingMode: 'user'
      }
    });
    return stream;
  } catch (error) {
    console.error('Error accessing camera:', error);
    return null;
  }
}

// Stop review session
function stopReview() {
  isReviewing = false;
  isDetectingGestures = false;
  startReviewButton.disabled = false;
  stopReviewButton.disabled = true;
  
  // Stop webcam if active
  if (webcamStream) {
    webcamStream.getTracks().forEach(track => track.stop());
    webcamStream = null;
    if (webcamEl.srcObject) {
      webcamEl.srcObject = null;
    }
  }
  
  // Hide debug info
  updateHandDebugInfo(null, null);
  
  // Reset status
  showModelStatus('Handpose model ready! Show your hand to the camera.');
  
  // Notify popup to refresh its list
  notifyPopupAboutUpdate();
}

// Load a flashcard
function loadCard(index: number) {
  if (flashcards.length === 0) {
    // Show empty state message
    showEmptyState();
    return;
  }
  
  // Check if we're using filtered cards
  const currentDeck = reviewingUnreviewedOnly ? filteredFlashcards : flashcards;

  if (index >= currentDeck.length) {
    // End of deck - show completion message in UI instead of alert
    showCompletionMessage();
    return;
  }

  isTransitioning = true;
  
  // Add transition effect to card
  const cardPanel = document.querySelector('.card-panel');
  if (cardPanel) {
    cardPanel.classList.add('card-transitioning');
  }

  setTimeout(() => {
    const card = currentDeck[index];
    
    // Update question
    const questionText = document.getElementById('question-text');
    if (questionText) questionText.textContent = card.question || card.content;
    
    // Update answer
    const answerText = document.getElementById('answer-text');
    if (answerText) answerText.textContent = card.content;
    
    // Update source
    const sourceLink = document.getElementById('source-link');
    if (sourceLink) sourceLink.textContent = `Source: ${card.source}`;
    
    // Reset card state
    isShowingAnswer = false;
    cardFront.classList.add('active');
    cardBack.classList.remove('active');
    
    updateStatsBadge();
    
    // Show visual indicator for current card progress
    showProgressIndicator(index);
    
    // Remove transition class
    if (cardPanel) {
      cardPanel.classList.remove('card-transitioning');
    }
    
    isTransitioning = false;
  }, 300);
}

// Show empty state when no flashcards available
function showEmptyState() {
  // Update question area to show empty message
  const questionText = document.getElementById('question-text');
  if (questionText) {
    questionText.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <h3>No flashcards available</h3>
        <p>Create some flashcards first before starting review.</p>
      </div>
    `;
  }
  
  // Hide source and answer
  const sourceLink = document.getElementById('source-link');
  if (sourceLink) sourceLink.textContent = '';
  
  const answerText = document.getElementById('answer-text');
  if (answerText) answerText.textContent = '';
  
  // Make sure the front is visible
  cardFront.classList.add('active');
  cardBack.classList.remove('active');
  
  // Disable review controls
  startReviewButton.disabled = true;
}

// Show a progress indicator for the current review session
function showProgressIndicator(currentIndex: number) {
  const progressContainer = document.getElementById('progress-indicator');
  
  // Use the appropriate deck length
  const deckLength = reviewingUnreviewedOnly ? filteredFlashcards.length : flashcards.length;
  
  if (!progressContainer) {
    // Create progress indicator if it doesn't exist
    const newProgressContainer = document.createElement('div');
    newProgressContainer.id = 'progress-indicator';
    newProgressContainer.className = 'progress-indicator';
    newProgressContainer.style.display = 'flex';
    newProgressContainer.style.justifyContent = 'center';
    newProgressContainer.style.marginBottom = '10px';
    newProgressContainer.style.gap = '8px';
    
    for (let i = 0; i < deckLength; i++) {
      const dot = document.createElement('div');
      dot.className = 'progress-dot';
      dot.style.width = '8px';
      dot.style.height = '8px';
      dot.style.borderRadius = '50%';
      dot.style.backgroundColor = i === currentIndex ? 'var(--primary-color)' : 'var(--gray-color)';
      dot.style.transition = 'all 0.3s ease';
      
      // Add a "completed" class for reviewed cards
      if (i < currentIndex) {
        dot.classList.add('completed');
        dot.style.backgroundColor = 'var(--secondary-color)';
      }
      
      newProgressContainer.appendChild(dot);
    }
    
    // Add to the beginning of the card panel
    const cardPanel = document.querySelector('.card-panel');
    if (cardPanel && cardPanel.firstChild) {
      cardPanel.insertBefore(newProgressContainer, cardPanel.firstChild);
    }
  } else {
    // Update existing progress indicator
    // First, make sure we have the right number of dots
    while (progressContainer.children.length > deckLength) {
      // Remove extra dots if needed
      progressContainer.removeChild(progressContainer.lastChild as Node);
    }
    
    while (progressContainer.children.length < deckLength) {
      // Add more dots if needed
      const dot = document.createElement('div');
      dot.className = 'progress-dot';
      dot.style.width = '8px';
      dot.style.height = '8px';
      dot.style.borderRadius = '50%';
      dot.style.backgroundColor = 'var(--gray-color)';
      dot.style.transition = 'all 0.3s ease';
      progressContainer.appendChild(dot);
    }
    
    // Now update the dots
    const dots = progressContainer.querySelectorAll('.progress-dot');
    dots.forEach((dot, index) => {
      if (index === currentIndex) {
        (dot as HTMLElement).style.backgroundColor = 'var(--primary-color)';
        dot.classList.remove('completed');
      } else if (index < currentIndex) {
        (dot as HTMLElement).style.backgroundColor = 'var(--secondary-color)';
        dot.classList.add('completed');
      } else {
        (dot as HTMLElement).style.backgroundColor = 'var(--gray-color)';
        dot.classList.remove('completed');
      }
    });
  }
}

// Show completion message in UI instead of alert
function showCompletionMessage() {
  // Stop the review
  stopReview();
  
  // Display completion message in the card area
  const flashcardReview = document.querySelector('.flashcard-review');
  if (flashcardReview) {
    // Create completion UI
    flashcardReview.innerHTML = `
      <div class="completion-message" style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        text-align: center;
        padding: 20px;
      ">
        <div style="font-size: 64px; margin-bottom: 20px;">🎉</div>
        <h2 style="margin-bottom: 16px; color: var(--dark-color);">Great job!</h2>
        <p style="margin-bottom: 24px; color: var(--text-color);">You've completed all flashcards!</p>
        <div style="display: flex; gap: 12px; flex-direction: column; width: 240px;">
          <button id="add-more-cards" class="button primary">Add More Flashcards</button>
          <button id="view-stats" class="button secondary">View Stats</button>
          <button id="restart-review" class="button secondary">Review Again</button>
        </div>
      </div>
    `;
    
    // Add event listener to add more cards button
    const addMoreButton = document.getElementById('add-more-cards');
    if (addMoreButton) {
      addMoreButton.addEventListener('click', () => {
        // Close options page and go back to popup
        window.close();
      });
    }
    
    // Add event listener to view stats button
    const viewStatsButton = document.getElementById('view-stats');
    if (viewStatsButton) {
      viewStatsButton.addEventListener('click', () => {
        showStatsPage();
      });
    }
    
    // Add event listener to restart button
    const restartButton = document.getElementById('restart-review');
    if (restartButton) {
      restartButton.addEventListener('click', () => {
        currentCardIndex = 0;
        startReview();
      });
    }
  }
  
  // Reset index for next time
  currentCardIndex = 0;
  updateStatsBadge();
}

// Show stats page with all flashcards and their ratings
function showStatsPage() {
  // Get the flashcard review container
  const flashcardReview = document.querySelector('.flashcard-review');
  if (!flashcardReview) return;
  
  // Create stats page content
  let statsHtml = `
    <div class="stats-page" style="
      height: 100%;
      overflow-y: auto;
      padding: 20px;
    ">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="color: var(--dark-color);">Flashcard Stats</h2>
        <button id="back-to-completion" class="button secondary" style="padding: 8px 16px; font-size: 14px;">Back</button>
      </div>
      
      <div class="stats-summary" style="
        display: flex;
        gap: 16px;
        margin-bottom: 24px;
        justify-content: space-between;
      ">
        <div class="stat-box" style="
          background-color: #f0fdf4;
          border: 1px solid #dcfce7;
          padding: 12px;
          border-radius: 8px;
          flex: 1;
          text-align: center;
        ">
          <div style="font-size: 24px; font-weight: bold; color: var(--secondary-color);">
            ${flashcards.filter(card => card.difficulty === 'easy').length}
          </div>
          <div style="font-size: 14px; color: var(--text-color);">Easy</div>
        </div>
        
        <div class="stat-box" style="
          background-color: #eff6ff;
          border: 1px solid #dbeafe;
          padding: 12px;
          border-radius: 8px;
          flex: 1;
          text-align: center;
        ">
          <div style="font-size: 24px; font-weight: bold; color: var(--primary-color);">
            ${flashcards.filter(card => card.difficulty === 'unknown').length}
          </div>
          <div style="font-size: 14px; color: var(--text-color);">Forgot</div>
        </div>
        
        <div class="stat-box" style="
          background-color: #fef2f2;
          border: 1px solid #fee2e2;
          padding: 12px;
          border-radius: 8px;
          flex: 1;
          text-align: center;
        ">
          <div style="font-size: 24px; font-weight: bold; color: var(--danger-color);">
            ${flashcards.filter(card => card.difficulty === 'hard').length}
          </div>
          <div style="font-size: 14px; color: var(--text-color);">Hard</div>
        </div>
        
        <div class="stat-box" style="
          background-color: #f9fafb;
          border: 1px solid #f3f4f6;
          padding: 12px;
          border-radius: 8px;
          flex: 1;
          text-align: center;
        ">
          <div style="font-size: 24px; font-weight: bold; color: #6b7280;">
            ${flashcards.filter(card => !card.lastReviewed).length}
          </div>
          <div style="font-size: 14px; color: var(--text-color);">Not Reviewed</div>
        </div>
      </div>
      
      <div class="filter-controls" style="
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
      ">
        <button id="filter-all" class="filter-button active" style="
          padding: 6px 12px;
          background: var(--light-color);
          border: 1px solid var(--gray-color);
          border-radius: 20px;
          font-size: 13px;
          cursor: pointer;
        ">All</button>
        
        <button id="filter-easy" class="filter-button" style="
          padding: 6px 12px;
          background: var(--light-color);
          border: 1px solid var(--gray-color);
          border-radius: 20px;
          font-size: 13px;
          cursor: pointer;
        ">Easy</button>
        
        <button id="filter-forgot" class="filter-button" style="
          padding: 6px 12px;
          background: var(--light-color);
          border: 1px solid var(--gray-color);
          border-radius: 20px;
          font-size: 13px;
          cursor: pointer;
        ">Forgot</button>
        
        <button id="filter-hard" class="filter-button" style="
          padding: 6px 12px;
          background: var(--light-color);
          border: 1px solid var(--gray-color);
          border-radius: 20px;
          font-size: 13px;
          cursor: pointer;
        ">Hard</button>
        
        <button id="filter-not-reviewed" class="filter-button" style="
          padding: 6px 12px;
          background: var(--light-color);
          border: 1px solid var(--gray-color);
          border-radius: 20px;
          font-size: 13px;
          cursor: pointer;
        ">Not Reviewed</button>
      </div>
      
      <div class="stats-list">
  `;
  
  // Check if there are any flashcards
  if (flashcards.length === 0) {
    statsHtml += `
      <div style="text-align: center; padding: 40px 0; color: #6b7280;">
        No flashcards available
      </div>
    `;
  } else {
    // Add each flashcard to the stats list
    flashcards.forEach((card, index) => {
      const difficulty = card.difficulty || 'not-reviewed';
      let difficultyEmoji = '';
      let difficultyClass = '';
      
      // Set emoji and class based on difficulty
      switch (difficulty) {
        case 'easy':
          difficultyEmoji = '👍';
          difficultyClass = 'easy';
          break;
        case 'hard':
          difficultyEmoji = '👎';
          difficultyClass = 'hard';
          break;
        case 'unknown':
          difficultyEmoji = '✋';
          difficultyClass = 'forgot';
          break;
        default:
          difficultyEmoji = '❓';
          difficultyClass = 'not-reviewed';
      }
      
      // Get source hostname
      let hostname = '';
      try {
        hostname = new URL(card.source).hostname;
      } catch (e) {
        hostname = card.source;
      }
      
      // Format review date if available
      let reviewDate = card.lastReviewed 
        ? new Date(card.lastReviewed).toLocaleDateString() 
        : 'Never';
      
      statsHtml += `
        <div class="flashcard-stat-item ${difficultyClass}" style="
          padding: 16px;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          margin-bottom: 12px;
          position: relative;
        " data-difficulty="${difficulty}">
          <div style="position: absolute; top: 16px; right: 16px; font-size: 24px;">
            ${difficultyEmoji}
          </div>
          <div style="font-weight: 600; margin-bottom: 8px; padding-right: 40px;">
            ${card.question || card.content}
          </div>
          <div style="color: #6b7280; font-size: 13px; display: flex; justify-content: space-between;">
            <span>Source: ${hostname}</span>
            <span>Reviewed: ${reviewDate}</span>
          </div>
        </div>
      `;
    });
  }
  
  // Close the HTML
  statsHtml += `
      </div>
    </div>
  `;
  
  // Set the HTML
  flashcardReview.innerHTML = statsHtml;
  
  // Add event listener to back button
  const backButton = document.getElementById('back-to-completion');
  if (backButton) {
    backButton.addEventListener('click', () => {
      showCompletionMessage();
    });
  }
  
  // Add event listeners to filter buttons
  const filterButtons = document.querySelectorAll('.filter-button');
  filterButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      // Remove active class from all buttons
      filterButtons.forEach(btn => btn.classList.remove('active'));
      
      // Add active class to clicked button
      button.classList.add('active');
      
      // Get filter value from button id
      const filterId = button.id;
      let filterValue = '';
      
      if (filterId === 'filter-easy') filterValue = 'easy';
      else if (filterId === 'filter-forgot') filterValue = 'unknown';
      else if (filterId === 'filter-hard') filterValue = 'hard';
      else if (filterId === 'filter-not-reviewed') filterValue = 'not-reviewed';
      
      // Filter flashcards
      const flashcardItems = document.querySelectorAll('.flashcard-stat-item');
      flashcardItems.forEach(item => {
        if (filterId === 'filter-all') {
          (item as HTMLElement).style.display = 'block';
        } else if (filterId === 'filter-not-reviewed') {
          if ((item as HTMLElement).dataset.difficulty === 'not-reviewed') {
            (item as HTMLElement).style.display = 'block';
          } else {
            (item as HTMLElement).style.display = 'none';
          }
        } else {
          if ((item as HTMLElement).dataset.difficulty === filterValue) {
            (item as HTMLElement).style.display = 'block';
          } else {
            (item as HTMLElement).style.display = 'none';
          }
        }
      });
    });
  });
}

// Flip the card
function flipCard() {
  if (!isReviewing) return;
  
  isShowingAnswer = !isShowingAnswer;
  
  if (isShowingAnswer) {
    cardFront.classList.remove('active');
    cardBack.classList.add('active');
  } else {
    cardFront.classList.add('active');
    cardBack.classList.remove('active');
  }
}

// Rate the current card and move to the next
function rateCard(rating: 'easy' | 'forgot' | 'hard') {
  if (!isReviewing || !isShowingAnswer || isTransitioning) return;
  
  // Get the current card from the appropriate deck
  const currentDeck = reviewingUnreviewedOnly ? filteredFlashcards : flashcards;
  const card = currentDeck[currentCardIndex];
  
  // Update card data
  card.lastReviewed = new Date();
  card.reviewCount = (card.reviewCount || 0) + 1;
  
  switch (rating) {
    case 'easy':
      card.difficulty = 'easy';
      break;
    case 'hard':
      card.difficulty = 'hard';
      break;
    case 'forgot':
      card.difficulty = 'unknown';
      break;
  }
  
  // Save card update to server
  updateCardOnServer(card);
  
  // Notify popup about the change to refresh the list
  notifyPopupAboutUpdate();
  
  // Show rating feedback
  showRatingFeedback(rating);
  
  // Move to next card after a short delay
  setTimeout(() => {
    currentCardIndex++;
    loadCard(currentCardIndex);
  }, 500);
}

// Notify popup about flashcard updates
function notifyPopupAboutUpdate() {
  try {
    chrome.runtime.sendMessage({
      action: 'flashcardUpdated'
    });
  } catch (error) {
    console.log('Could not notify popup about update, popup might be closed');
  }
}

// Show visual feedback for rating
function showRatingFeedback(rating: string) {
  // Create a feedback element
  const feedbackEl = document.createElement('div');
  feedbackEl.className = 'rating-feedback';
  feedbackEl.style.position = 'absolute';
  feedbackEl.style.top = '50%';
  feedbackEl.style.left = '50%';
  feedbackEl.style.transform = 'translate(-50%, -50%)';
  feedbackEl.style.fontSize = '80px';
  feedbackEl.style.zIndex = '1000';
  feedbackEl.style.opacity = '0';
  feedbackEl.style.transition = 'opacity 0.3s ease-in-out';
  
  // Set appropriate emoji based on rating
  if (rating === 'easy') {
    feedbackEl.textContent = '👍';
  } else if (rating === 'hard') {
    feedbackEl.textContent = '👎';
  } else {
    feedbackEl.textContent = '✋';
  }
  
  // Add to the card panel
  const cardPanel = document.querySelector('.card-panel');
  if (cardPanel) {
    cardPanel.appendChild(feedbackEl);
    
    // Animate
    setTimeout(() => {
      feedbackEl.style.opacity = '1';
    }, 10);
    
    // Remove after animation
    setTimeout(() => {
      feedbackEl.style.opacity = '0';
      setTimeout(() => feedbackEl.remove(), 300);
    }, 1000);
  }
}

// Update the stats badge
function updateStatsBadge() {
  const currentDeck = reviewingUnreviewedOnly ? filteredFlashcards : flashcards;
  
  if (currentDeck.length === 0) {
    statsBadge.textContent = '0/0 cards reviewed';
  } else {
    statsBadge.textContent = `${currentCardIndex}/${currentDeck.length} cards reviewed`;
  }
}

// Gesture detection loop
async function detectGestures(): Promise<void> {
  if (!isReviewing || !isDetectingGestures || !handposeModel) return;
  
  try {
    // Check if webcam element has a valid size
    if (!webcamEl || webcamEl.videoWidth === 0 || webcamEl.videoHeight === 0) {
      // Wait for valid video dimensions before proceeding
      requestAnimationFrame(detectGestures);
      return;
    }
    
    const predictions = await handposeModel.estimateHands(webcamEl);
    
    if (predictions.length > 0) {
      const landmarks = predictions[0].landmarks;
      
      // Check hand stability by comparing with previous frame
      let isStable = true;
      
      if (previousLandmarks) {
        const wristMovement = Math.sqrt(
          Math.pow(landmarks[0][0] - previousLandmarks[0][0], 2) +
          Math.pow(landmarks[0][1] - previousLandmarks[0][1], 2)
        );
        
        // If the wrist moved too much, reset stability counter
        if (wristMovement > STABILITY_THRESHOLD) {
          isStable = false;
          stableFrameCount = 0;
        } else {
          stableFrameCount++;
        }
      }
      
      // Store current landmarks for next frame comparison
      previousLandmarks = [...landmarks];
      
      // Only attempt to detect gestures if hand has been stable for enough frames
      let gesture = null;
      if (isStable && stableFrameCount >= MIN_STABLE_FRAMES) {
        gesture = determineGesture(landmarks);
      }
      
      // Update debug info
      updateHandDebugInfo(landmarks, gesture);
      
      // Draw hand landmarks with active highlight if a gesture is detected
      drawHandLandmarks(landmarks, gesture !== null);
      
      // Only process gesture if not in cooldown and not transitioning between cards
      if (gesture && !gestureCooldown && !isTransitioning) {
        // Set cooldown to prevent rapid triggers
        gestureCooldown = true;
        
        // Process the gesture
        lastDetectedGesture = gesture;
        showModelStatus(`Detected: ${getGestureEmoji(gesture)} (${gesture})`, false);
        
        // Show visual feedback for detected gesture
        showGestureDetectedOverlay(gesture);
        
        // Process the gesture for card review
        handleGestureReview(gesture);
        
        // Clear the skeleton after processing a gesture
        setTimeout(() => {
          const ctx = canvasEl.getContext('2d');
          if (ctx) ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
          
          // Reset stability tracking
          previousLandmarks = null;
          stableFrameCount = 0;
          
          // Reset cooldown after a delay
          setTimeout(() => {
            gestureCooldown = false;
            lastDetectedGesture = null;
          }, 1000);
        }, 1000);
      }
    } else {
      // No hand detected
      updateHandDebugInfo(null, null);
      
      // Reset stability tracking
      previousLandmarks = null;
      stableFrameCount = 0;
      
      // Clear canvas when no hand detected
      const ctx = canvasEl.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    }
    
    // Continue detection loop
    if (isReviewing && isDetectingGestures) {
      requestAnimationFrame(detectGestures);
    }
  } catch (error) {
    console.error('Error detecting gestures:', error);
    if (isReviewing && isDetectingGestures) {
      requestAnimationFrame(detectGestures);
    }
  }
}

// Get emoji for gesture
function getGestureEmoji(gesture: GestureType): string {
  switch (gesture) {
    case GestureType.THUMBS_UP:
      return '👍';
    case GestureType.THUMBS_DOWN:
      return '👎';
    case GestureType.OPEN_PALM:
      return '✋';
    default:
      return '❓';
  }
}

// Determine gesture type from hand landmarks
function determineGesture(landmarks: number[][]): GestureType | null {
  // Extract key points for thumb, index, and pinky
  const thumb = landmarks[4];    // Thumb tip
  const thumbCmc = landmarks[1]; // Thumb CMC joint
  const thumbMp = landmarks[2];  // Thumb MP joint
  const index = landmarks[8];    // Index fingertip
  const indexPip = landmarks[6]; // Index PIP joint
  const middle = landmarks[12];  // Middle fingertip
  const middlePip = landmarks[10]; // Middle PIP joint
  const ring = landmarks[16];    // Ring fingertip
  const ringPip = landmarks[14]; // Ring PIP joint
  const pinky = landmarks[20];   // Pinky fingertip
  const pinkyPip = landmarks[18]; // Pinky PIP joint
  const wrist = landmarks[0];    // Wrist
  
  // Highlight active detection in status
  showModelStatus('Detecting gestures...', false);
  
  // Calculate hand size to normalize measurements
  const handSize = Math.sqrt(
    Math.pow(index[0] - wrist[0], 2) + 
    Math.pow(index[1] - wrist[1], 2)
  );
  
  // Minimum hand size threshold to prevent detection when hand is too far or unclear
  if (handSize < 50) {
    return null;
  }
  
  // Calculate confidence based on the visibility of key points
  const fingerPositionsValid = 
    thumb[2] > 0 && // Z coordinate should be visible (not occluded)
    index[2] > 0 && 
    middle[2] > 0 && 
    ring[2] > 0 && 
    pinky[2] > 0;
    
  if (!fingerPositionsValid) {
    return null; // Hand not clearly visible
  }
  
  // Check if thumb is pointing up (thumbs up)
  // More precise criteria: thumb must be above wrist by significant amount,
  // thumb must be to the side of the palm, and other fingers must be curled
  const thumbUp = 
    thumb[1] < wrist[1] - handSize/2 && // Thumb significantly above wrist
    thumb[0] > thumbCmc[0] &&           // Thumb to the side (not across palm)
    index[1] > indexPip[1] &&           // Index finger curled
    middle[1] > middlePip[1] &&         // Middle finger curled
    ring[1] > ringPip[1] &&             // Ring finger curled
    pinky[1] > pinkyPip[1];             // Pinky finger curled
    
  if (thumbUp) {
    return GestureType.THUMBS_UP;
  }
  
  // Check if thumb is pointing down (thumbs down)
  // More precise criteria: thumb must be below wrist by significant amount,
  // thumb must be to the side of the palm, and other fingers must be curled
  const thumbDown = 
    thumb[1] > wrist[1] + handSize/2 && // Thumb significantly below wrist
    thumb[0] > thumbCmc[0] &&           // Thumb to the side (not across palm)
    index[1] > indexPip[1] &&           // Index finger curled
    middle[1] > middlePip[1] &&         // Middle finger curled
    ring[1] > ringPip[1] &&             // Ring finger curled
    pinky[1] > pinkyPip[1];             // Pinky finger curled
    
  if (thumbDown) {
    return GestureType.THUMBS_DOWN;
  }
  
  // Check for open palm (all fingers extended at similar height)
  // More precise criteria: all fingertips must be extended and at similar heights
  const fingersExtended = 
    index[1] < indexPip[1] - handSize/6 &&  // Index finger extended
    middle[1] < middlePip[1] - handSize/6 && // Middle finger extended
    ring[1] < ringPip[1] - handSize/6 &&     // Ring finger extended
    pinky[1] < pinkyPip[1] - handSize/6;     // Pinky finger extended
    
  const fingersAligned = 
    Math.abs(index[1] - middle[1]) < handSize/8 && // Fingers at similar heights
    Math.abs(middle[1] - ring[1]) < handSize/8 &&
    Math.abs(ring[1] - pinky[1]) < handSize/8;
    
  const fingersAboveWrist = 
    index[1] < wrist[1] - handSize/5 && // Fingers clearly above wrist
    middle[1] < wrist[1] - handSize/5 &&
    ring[1] < wrist[1] - handSize/5 &&
    pinky[1] < wrist[1] - handSize/5;
    
  if (fingersExtended && fingersAligned && fingersAboveWrist) {
    return GestureType.OPEN_PALM;
  }
  
  return null;
}

// Draw hand landmarks on canvas with optional highlight
function drawHandLandmarks(landmarks: number[][], highlight: boolean = false): void {
  const ctx = canvasEl.getContext('2d');
  if (!ctx) return;
  
  // Clear canvas
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  
  // Set drawing styles - highlight in brighter green if a gesture is detected
  const alpha = highlight ? 0.6 : 0.2;
  const strokeAlpha = highlight ? 1.0 : 0.8;
  
  ctx.fillStyle = `rgba(0, 255, 0, ${alpha})`;
  ctx.strokeStyle = `rgba(0, 255, 0, ${strokeAlpha})`;
  ctx.lineWidth = highlight ? 3 : 2;
  
  // Draw each landmark
  landmarks.forEach(point => {
    const [x, y] = point;
    
    // Draw circle at landmark position
    ctx.beginPath();
    ctx.arc(x, y, highlight ? 7 : 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  });
  
  // Connect landmarks with lines
  const fingerConnections = [
    // Thumb
    [0, 1], [1, 2], [2, 3], [3, 4],
    // Index finger
    [0, 5], [5, 6], [6, 7], [7, 8],
    // Middle finger
    [0, 9], [9, 10], [10, 11], [11, 12],
    // Ring finger
    [0, 13], [13, 14], [14, 15], [15, 16],
    // Pinky
    [0, 17], [17, 18], [18, 19], [19, 20],
    // Palm
    [0, 5], [5, 9], [9, 13], [13, 17]
  ];
  
  fingerConnections.forEach(([i, j]) => {
    ctx.beginPath();
    ctx.moveTo(landmarks[i][0], landmarks[i][1]);
    ctx.lineTo(landmarks[j][0], landmarks[j][1]);
    ctx.stroke();
  });
}

// Handle gesture review
function handleGestureReview(gesture: GestureType): void {
  if (!isShowingAnswer) {
    // Flip card to show answer if currently showing question
    flipCard();
    return;
  }
  
  // Rate card based on gesture
  switch (gesture) {
    case GestureType.THUMBS_UP:
      rateCard('easy');
      break;
    case GestureType.THUMBS_DOWN:
      rateCard('hard');
      break;
    case GestureType.OPEN_PALM:
      rateCard('forgot');
      break;
  }
}

// Show visual feedback when a gesture is detected
function showGestureDetectedOverlay(gesture: GestureType) {
  const container = document.getElementById('webcam-container');
  if (!container) return;
  
  // Create overlay if it doesn't exist or get existing one
  let overlay = document.getElementById('gesture-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'gesture-overlay';
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
    overlay.style.zIndex = '15';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.3s ease';
    container.appendChild(overlay);
  }
  
  // Update content and show
  let emoji = '❓';
  let label = 'Unknown';
  let color = 'white';
  
  switch (gesture) {
    case GestureType.THUMBS_UP:
      emoji = '👍';
      label = 'Easy';
      color = '#10b981'; // green
      break;
    case GestureType.THUMBS_DOWN:
      emoji = '👎';
      label = 'Hard';
      color = '#ef4444'; // red
      break;
    case GestureType.OPEN_PALM:
      emoji = '✋';
      label = 'Forgot';
      color = '#6366f1'; // purple
      break;
  }
  
  overlay.innerHTML = `
    <div style="text-align: center; color: white;">
      <div style="font-size: 64px; margin-bottom: 10px;">${emoji}</div>
      <div style="font-size: 24px; font-weight: bold; color: ${color};">${label}</div>
    </div>
  `;
  
  // Show with animation
  overlay.style.opacity = '1';
  
  // Hide after delay
  setTimeout(() => {
    if (overlay) overlay.style.opacity = '0';
  }, 1000);
}

// Update card on server
async function updateCardOnServer(card: Flashcard): Promise<void> {
  if (!card.id) return;
  
  try {
    const response = await fetch(`${API_BASE_URL}/flashcards/${card.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(card)
    });
    
    if (!response.ok) {
      console.error('Failed to update card on server:', response.status);
    }
  } catch (error) {
    console.error('Error updating card on server:', error);
  }
}

// Show message when there are no unreviewed cards
function showNoUnreviewedCardsMessage() {
  // Get the flashcard review container
  const flashcardReview = document.querySelector('.flashcard-review');
  if (!flashcardReview) return;
  
  // Create message content
  flashcardReview.innerHTML = `
    <div class="no-unreviewed-cards" style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      padding: 20px;
    ">
      <div style="font-size: 64px; margin-bottom: 20px;">🎉</div>
      <h2 style="margin-bottom: 16px; color: var(--dark-color);">All cards reviewed!</h2>
      <p style="margin-bottom: 24px; color: var(--text-color);">You've already reviewed all your flashcards.</p>
      <div style="display: flex; gap: 12px; flex-direction: column; width: 240px;">
        <button id="review-all-cards" class="button primary">Review All Cards</button>
        <button id="go-back-to-popup" class="button secondary">Go Back</button>
      </div>
    </div>
  `;
  
  // Add event listener to review all cards button
  const reviewAllButton = document.getElementById('review-all-cards');
  if (reviewAllButton) {
    reviewAllButton.addEventListener('click', () => {
      reviewingUnreviewedOnly = false;
      startReview();
    });
  }
  
  // Add event listener to go back button
  const goBackButton = document.getElementById('go-back-to-popup');
  if (goBackButton) {
    goBackButton.addEventListener('click', () => {
      window.close();
    });
  }
}

// Communication with the extension popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startReviewWithCard' && typeof message.cardIndex === 'number') {
    // Set the current card index
    currentCardIndex = message.cardIndex;
    
    // Reset unreviewed only flag
    reviewingUnreviewedOnly = false;
    
    // Only start review if we have flashcards loaded
    if (flashcards.length > 0) {
      startReview();
      sendResponse({ success: true });
    } else {
      // Show empty state if we don't have flashcards
      showEmptyState();
      sendResponse({ success: false, reason: 'No flashcards available' });
    }
  } else if (message.action === 'startReviewUnreviewed' && message.unreviewed === true) {
    // Set flag to review only unreviewed cards
    reviewingUnreviewedOnly = true;
    
    // Start review with unreviewed cards
    if (flashcards.length > 0) {
      startReview();
      sendResponse({ success: true });
    } else {
      showEmptyState();
      sendResponse({ success: false, reason: 'No flashcards available' });
    }
  }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);

// Add custom styles for card transitions
document.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.textContent = `
    .card-transitioning {
      opacity: 0.5;
      transform: scale(0.98);
      transition: opacity 0.3s ease, transform 0.3s ease;
    }
    
    .flashcard-review {
      transition: opacity 0.3s ease, transform 0.3s ease;
    }
    
    .progress-dot.completed {
      transform: scale(0.8);
    }
    
    #gesture-overlay {
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
}); 