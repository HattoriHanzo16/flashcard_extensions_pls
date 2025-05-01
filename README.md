# PLS-Flashcards ✨

<div align="center">
  
  ![PLS-Flashcards Logo](images/logo.png)

  <h3>Turn web content into flashcards with gesture-based review</h3>

  [![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
  [![TensorFlow](https://img.shields.io/badge/TensorFlow-%23FF6F00.svg?style=flat&logo=tensorflow&logoColor=white)](https://www.tensorflow.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-%23007ACC.svg?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Express.js](https://img.shields.io/badge/Express.js-%23404d59.svg?style=flat&logo=express&logoColor=%2361DAFB)](https://expressjs.com/)
  [![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=flat&logo=mongodb&logoColor=white)](https://www.mongodb.com/)

  [Demo Video](https://youtu.be/CVVvWFj0nzg) | [Installation](#installation) | [Usage](#usage) | [Features](#key-features)
</div>

## 🚀 Overview

PLS-Flashcards is a revolutionary browser extension that transforms your web browsing into an active learning experience. Highlight important text on any webpage, save it as a flashcard with a single click, and later review your flashcards using intuitive hand gestures captured by your webcam.

Perfect for students, language learners, and knowledge workers who want to retain information effectively while browsing the web.


## ✨ Key Features

- **Gesture-Based Flashcard Review** - Use hand gestures (👍, 👎, ✋) to review flashcards
- **Web Content Capture** - Save highlighted text from any webpage as flashcards
- **Context Menu Integration** - Right-click to save selected text instantly
- **Spaced Repetition** - Track difficulty levels and review progress
- **TensorFlow AI** - State-of-the-art hand gesture recognition using TensorFlow.js
- **Data Persistence** - All flashcards are stored securely in MongoDB
- **Modern UI** - Clean, responsive interface with visual feedback

## 🛠️ Technologies

<div align="center">
  
| Frontend | Backend | AI/ML | DevOps |
|----------|---------|-------|--------|
| TypeScript | Node.js | TensorFlow.js | Webpack |
| Chrome Extensions API | Express.js | Handpose Model | Jest |
| HTML/CSS | MongoDB | | TypeScript |

</div>

## 📋 Prerequisites

- Node.js (v14+)
- MongoDB instance
- Chrome/Chromium-based browser

## 🔧 Installation

### Step 1: Clone the repository

```bash
git clone https://github.com/HattoriHanzo16/pls-flashcards.git
cd pls-flashcards
```

### Step 2: Install dependencies

```bash
npm install
```

### Step 3: Configure environment

Create a `.env` file in the server directory:

```bash
cd server
touch .env
```

Add the following configuration to the `.env` file:

```
PORT=3001
MONGODB_URI=mongodb://localhost:27017/pls-flashcards
```

### Step 4: Build the project

```bash
npm run build
```

### Step 5: Install the extension

1. Open Chrome/Edge and navigate to `chrome://extensions`
2. Enable Developer mode
3. Click "Load unpacked" and select the `extension/dist` directory

## 🚀 Usage

### Saving Flashcards

1. Browse to any webpage
2. Highlight important text
3. Right-click and select "Save as Flashcard" from the context menu
4. The flashcard will be saved to your collection

### Reviewing Flashcards

1. Click on the PLS-Flashcards extension icon
2. Click "Start Review" to begin reviewing your flashcards
3. Grant camera permissions when prompted
4. Use the following hand gestures to review:
   - 👍 **Thumbs Up** - Mark as "Easy" (remembered well)
   - 👎 **Thumbs Down** - Mark as "Hard" (difficult to remember)
   - ✋ **Open Palm** - Mark as "Forgot" (couldn't recall)

## 📁 Project Structure

```
pls-flashcards/
├── extension/                 # Browser extension
│   ├── assets/                # Extension icons and images
│   │   ├── background/        # Background scripts
│   │   ├── content/           # Content scripts
│   │   ├── options/           # Options page
│   │   └── popup/             # Popup UI
│   └── manifest.json          # Extension manifest
│
├── server/                    # Backend server
│   └── src/                   # Server source code
│       ├── config/            # Server configuration
│       ├── controllers/       # Request handlers
│       ├── models/            # Data models
│       ├── routes/            # API routes
│       └── index.ts           # Server entry point
│
└── tests/                     # Test suite
```

## 🌟 How It Works

1. **Content Selection**: Text selected on webpages is captured by content scripts
2. **Storage**: Flashcards are stored in MongoDB through our Express.js backend
3. **Review Interface**: Custom UI for flashcard review with webcam integration
4. **Gesture Recognition**: TensorFlow.js and Handpose model analyze hand positions
5. **Learning Algorithm**: Difficulty ratings update based on your review performance

## 🧠 The Science Behind It

PLS-Flashcards implements advanced spaced repetition techniques proven to boost long-term retention. By categorizing content based on difficulty and optimizing review intervals, the extension helps you focus on challenging content and remember information more effectively.

The gesture recognition system uses a TensorFlow.js implementation of the MediaPipe Handpose model, analyzing hand landmark positions in real-time to interpret user gestures accurately while preserving privacy.

## 💻 Development

### Running the development environment

```bash
# Start both server and extension in development mode
npm run dev

# Start only the server
npm run dev:server

# Start only the extension
npm run dev:extension
```

### Running tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

<div align="center">
  
  Made with ❤️ by PLS
  
</div>