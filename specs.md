# PLS-Flashcards: Project Specifications

## Project Overview

PLS-Flashcards is a browser extension that transforms web browsing into an active learning experience. The extension allows users to save important text from any webpage as flashcards and review them using intuitive hand gestures captured through a webcam.

## Core Functionality

### 1. Flashcard Creation

- **Content Selection**: Users can highlight text on any webpage and save it as a flashcard
- **Context Menu Integration**: Right-click menu includes a "Save as Flashcard" option
- **Metadata Capture**: Flashcards include source URL and date of creation
- **Question/Answer Format**: System attempts to parse highlighted text into question/answer pairs

### 2. Gesture-Based Review

- **Hand Detection**: Uses TensorFlow.js and Handpose model to track hand positions
- **Gesture Recognition**: Identifies three key gestures:
  - 👍 Thumbs Up: Rate card as "Easy"
  - 👎 Thumbs Down: Rate card as "Hard"
  - ✋ Open Palm: Rate card as "Forgot"
- **Fallback Controls**: Manual buttons available when camera access is not available

### 3. Data Management

- **Backend Storage**: MongoDB database stores all flashcards
- **Synchronization**: Flashcards sync across multiple devices
- **Export/Import**: Users can export their flashcards collection

## Technical Architecture

### Extension Components

1. **Background Service Worker**
   - Maintains extension state
   - Handles context menu creation
   - Manages communication between components

2. **Content Scripts**
   - Execute on web pages to capture highlighted text
   - Communicate with background script

3. **Popup Interface**
   - Shows flashcard collection
   - Provides quick actions and statistics
   - Entry point to review mode

4. **Review Interface (Options Page)**
   - Full-screen review experience
   - Webcam integration for gesture detection
   - Visual feedback on gesture recognition

### Server Components

1. **Express.js API**
   - RESTful endpoints for flashcard operations
   - User authentication and data management

2. **MongoDB Database**
   - Stores flashcard collections
   - Tracks user review history and performance

3. **Logging System**
   - Captures errors and usage patterns
   - Helps troubleshoot issues

## Technical Specifications

### Frontend

- **Language**: TypeScript
- **Framework**: Vanilla JS with Chrome Extensions API
- **ML**: TensorFlow.js, Handpose model
- **Build Tool**: Webpack

### Backend

- **Language**: TypeScript/Node.js
- **Framework**: Express.js
- **Database**: MongoDB
- **Logging**: Winston

## Performance Requirements

- **Load Time**: Popup interface loads in under 500ms
- **Gesture Recognition**: Hand gestures recognized within 300ms
- **Storage Limits**: Up to 10,000 flashcards per user
- **Memory Usage**: Extension consumes less than 100MB memory
- **Battery Impact**: Minimal impact during gesture recognition

## Security Considerations

- **Data Privacy**: All webcam processing happens locally, no video data sent to servers
- **Data Storage**: Only flashcard content and user preferences stored in database
- **Authentication**: Basic authentication for accessing flashcard data

## Browser Compatibility

- Chrome/Chromium (primary support)
- Microsoft Edge
- Brave
- Opera

## Future Enhancements

1. **Offline Mode**: Full functionality without internet connection
2. **Advanced Analytics**: Insights into learning patterns
3. **Spaced Repetition Algorithm**: Optimize review intervals based on performance
4. **Custom Gestures**: Allow users to define their own gestures
5. **Mobile Support**: Develop companion mobile app

## Development Timeline

| Phase | Focus | Duration |
|-------|-------|----------|
| 1 | Core infrastructure & basic flashcard creation | 4 weeks |
| 2 | Hand gesture recognition & review interface | 6 weeks |
| 3 | Testing, optimization & documentation | 2 weeks |
| 4 | Initial release & feedback collection | Ongoing | 