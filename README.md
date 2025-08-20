# DropSto

> **Store. Share. Simplify.**

DropSto is a lightweight, serverless, temporary file storage web app designed for quick and easy sharing without repeated logins. Perfect for students, teams, and anyone who needs fast, no-hassle file sharing between locations like labs, classrooms, and home.

## What is DropSto?

DropSto revolutionizes file sharing by eliminating the friction of traditional cloud storage services. Users create a storage bucket once, receive a unique PIN code, and can then upload and download files from anywhere no account login needed after bucket creation. Files are stored securely and automatically deleted after 7 days, making it ideal for temporary file sharing scenarios.

## Perfect For

- **Students** sharing projects between campus labs and home computers
- **Teams** collaborating on temporary files without complex account setups
- **Professionals** transferring files between different work locations
- **Anyone** who needs quick, temporary file storage without the overhead

## Key Features

### One-Time Setup
- Create your bucket once with a simple name
- Receive a unique PIN code for access
- No repeated logins or password management

### Effortless File Management
- Drag and drop files directly into your bucket
- Upload from any device without logging in
- Download or delete files using just your PIN

### Secure & Temporary
- Bank-level encryption keeps your files safe
- Files automatically delete after 7 days
- No permanent storage means enhanced privacy

### Universal Access
- Access your files from any device, anywhere
- Works on desktop, tablet, and mobile
- No app installation required

### Lightning Fast
- Serverless architecture for instant responsiveness
- No complicated interfaces or confusing navigation
- Upload and download at maximum speeds

## How It Works

### 1. Create Your Bucket
Sign up once, name your bucket, and get your unique PIN code.

### 2. Upload Your Files
Drop files directly into your bucket anytime — no login needed.

### 3. Access or Share Anywhere
Use your PIN to download or manage files from any device.
*(Files auto-delete after 7 days to keep things fresh.)*

## Tech Stack

- **Frontend**: React 19 + Vite
- **Styling**: Tailwind CSS 4
- **Animations**: Framer Motion
- **Backend**: Firebase (Firestore, Storage, Auth, Functions)
- **Authentication**: Google OAuth
- **Routing**: React Router DOM
- **Build Tool**: Vite with optimized code splitting
- **Architecture**: Serverless design for maximum efficiency

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Firebase CLI
- A Google account for Firebase setup

### 1. Clone the Repository

```bash
git clone https://github.com/p4ntomath/dropsto.git
cd dropsto
```

### 2. Install Dependencies

```bash
# Install main app dependencies
npm install

# Install Firebase Functions dependencies
cd functions
npm install
cd ..
```

### 3. Firebase Setup

#### 3.1 Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter project name (e.g., "dropsto-yourname")
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

#### 3.2 Enable Required Services

In your Firebase project console:

1. **Authentication**:
   - Go to Authentication > Sign-in method
   - Enable "Google" provider
   - Add your domain to authorized domains

2. **Firestore Database**:
   - Go to Firestore Database
   - Click "Create database"
   - Start in test mode (or production mode with the provided rules)
   - Choose a location close to your users

3. **Storage**:
   - Go to Storage
   - Click "Get started"
   - Start in test mode (or production mode with the provided rules)
   - Choose the same location as Firestore

4. **Functions**:
   - Functions will be enabled automatically when you deploy

#### 3.3 Get Firebase Configuration

1. Go to Project Settings (gear icon)
2. Scroll down to "Your apps"
3. Click "Add app" > Web app (</>) 
4. Register your app with a nickname
5. Copy the configuration object

#### 3.4 Configure Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env.local
```

2. Update `.env.local` with your Firebase configuration:
```env
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### 4. Firebase CLI Setup

```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project (if not already done)
firebase init

# Select your project
firebase use your-project-id
```

### 5. Deploy Firebase Security Rules

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Storage rules
firebase deploy --only storage
```

### 6. Deploy Firebase Functions

```bash
# Deploy the cleanup function
firebase deploy --only functions
```

### 7. Start Development Server

```bash
npm run dev
```

Open your browser and navigate to `http://localhost:5173`

## Firebase Functions

This project includes an automated cleanup function that runs daily to delete expired buckets and files.

### Cleanup Function Features
- **Scheduled Execution**: Runs daily at midnight UTC
- **Automatic Cleanup**: Removes buckets older than 7 days
- **File Management**: Deletes associated files from Firebase Storage
- **Database Cleanup**: Removes bucket documents from Firestore

### Function Deployment
```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:cleanupExpiredBuckets
```

### Function Logs
```bash
# View function logs
firebase functions:log

# View logs for specific function
firebase functions:log --only cleanupExpiredBuckets
```

## Building for Production

### Build the Application
```bash
npm run build
```

### Deploy to Firebase Hosting (Optional)
```bash
# Initialize hosting
firebase init hosting

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

### Deploy to Other Platforms

The project includes configuration files for popular hosting platforms:

#### Vercel
- `vercel.json` is already configured
- Connect your GitHub repo to Vercel
- Add environment variables in Vercel dashboard
- Deploy automatically

#### Netlify
- `public/_redirects` is configured for SPA routing
- Drag the `dist` folder to Netlify or connect via GitHub
- Add environment variables in Netlify dashboard

## Environment Variables

Required environment variables for deployment:

```env
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

## Firebase Security Rules

### Firestore Rules (`firestore.rules`)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Buckets can be read by anyone with the PIN, but only created/updated by authenticated users
    match /buckets/{bucketId} {
      allow read: if true; // Allow reading for PIN verification
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        (resource.data.userId == request.auth.uid || 
         request.auth.token.admin == true);
    }
  }
}
```

### Storage Rules (`storage.rules`)
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /buckets/{bucketId}/{allPaths=**} {
      allow read, write: if true; // Allow access for PIN-based operations
      allow delete: if request.auth != null; // Only authenticated users can delete
    }
  }
}
```

## Project Structure

```
dropsto/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── BucketFilesModal.jsx
│   │   ├── FeaturesSection.jsx
│   │   ├── HeroSection.jsx
│   │   ├── Navbar.jsx
│   │   └── ProtectedRoute.jsx
│   ├── contexts/          # React contexts
│   │   └── AuthContext.jsx
│   ├── firebase/          # Firebase configuration
│   │   └── config.js
│   ├── hooks/            # Custom React hooks
│   │   └── useBuckets.js
│   ├── models/           # Data models
│   │   ├── bucket.model.js
│   │   ├── file.model.js
│   │   └── user.model.js
│   ├── pages/            # Main page components
│   │   ├── AuthPage.jsx
│   │   ├── BucketView.jsx
│   │   ├── Homepage.jsx
│   │   └── LandingPage.jsx
│   ├── services/         # Business logic services
│   │   ├── auth.service.js
│   │   ├── bucket.service.js
│   │   └── file.service.js
│   └── utils/            # Utility functions
│       ├── constants.js
│       └── helpers.js
├── functions/            # Firebase Functions
│   ├── index.js         # Cleanup function
│   └── package.json
├── public/              # Static assets
├── firebase.json        # Firebase configuration
├── firestore.rules      # Firestore security rules
├── storage.rules        # Storage security rules
├── vercel.json         # Vercel deployment config
└── vite.config.js      # Vite configuration with optimization
```

## Use Cases

### For Students
- **Lab to Home**: Upload files in the computer lab, download at home
- **Group Projects**: Share files with teammates without email attachments
- **Quick Transfers**: Move files between different campus computers

### For Teams
- **Temporary Collaboration**: Share work files without setting up shared drives
- **Client Deliverables**: Provide temporary access to files for clients
- **Cross-Platform Sharing**: Transfer files between different operating systems

### For Professionals
- **Remote Work**: Access files from home, office, and travel locations
- **Client Presentations**: Share presentation files temporarily
- **Quick Backups**: Store important files temporarily while traveling

## Security & Privacy

- **End-to-end Encryption**: All files are encrypted during transfer and storage
- **Temporary Storage**: 7-day auto-deletion ensures no permanent data retention
- **PIN-based Access**: Unique PIN codes provide secure, shareable access
- **Firebase Security**: Enterprise-grade security with Google's infrastructure
- **No Tracking**: Minimal data collection focuses only on essential functionality

## Performance Optimization

- **Code Splitting**: Optimized bundle splitting for faster loading
- **Lazy Loading**: Components and routes loaded on demand
- **Compressed Assets**: Gzip compression for faster transfers
- **CDN Delivery**: Firebase hosting with global CDN
- **Optimized Images**: Compressed and properly sized images

## Troubleshooting

### Common Issues

1. **Environment Variables Not Loading**
   - Ensure `.env.local` exists and variables start with `VITE_`
   - Restart the development server after adding variables

2. **Firebase Authentication Errors**
   - Check that Google Auth is enabled in Firebase Console
   - Verify your domain is in the authorized domains list

3. **Functions Deployment Fails**
   - Run `npm install` in the `functions` directory
   - Ensure you have the correct Firebase project selected

4. **Build Errors**
   - Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
   - Clear Vite cache: `npx vite --force`

### Getting Help

- Check the [Issues](https://github.com/p4ntomath/dropsto/issues) page
- Review Firebase documentation for specific Firebase-related issues
- Ensure all prerequisites are installed and up to date

## Contributing

We welcome contributions! Please feel free to submit issues and pull requests.

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Cross-Platform Compatibility

DropSto works seamlessly across all platforms:
- **Desktop**: Windows, macOS, Linux
- **Mobile**: iOS Safari, Android Chrome
- **Tablets**: iPad, Android tablets
- **Browsers**: Chrome, Firefox, Safari, Edge
