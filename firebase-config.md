# Firebase Setup Guide for College Grievance Portal

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project** (or select an existing project)
3. Enter a project name (e.g., `college-grievance-portal`) and follow the setup wizard

## 2. Register a Web App

1. In your Firebase project, click the **Web** icon (</>) to add a web app
2. Give your app a nickname (e.g., `College Grievance Portal`)
3. Copy the `firebaseConfig` object from the console

## 3. Enable Firestore Database

1. In the Firebase Console, go to **Build** → **Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** (for development) or **Production mode** (set security rules)
4. Select a location and click **Enable**

## 4. Update Your Config in script.js

Open `script.js` and replace the placeholder values in `FIREBASE_CONFIG`:

```javascript
const FIREBASE_CONFIG = {
    apiKey: "YOUR_ACTUAL_API_KEY",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};
```

## 5. Firestore Collections

The app uses two collections:

- **users** – Student registration data (name, email, student_id, department, password)
- **complaints** – Student complaints (studentId, title, category, description, files, status, submittedAt)

## 6. Firestore Security Rules (Optional)

For production, set Firestore rules in the Firebase Console under **Firestore Database** → **Rules**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if true;  // Consider adding auth for production
    }
    match /complaints/{complaintId} {
      allow read, write: if true;  // Consider adding auth for production
    }
  }
}
```

For production, use proper authentication and restrict access based on user roles.
