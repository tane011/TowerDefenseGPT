# Cloud Saves Setup (Firebase)

This project uses Firebase Auth + Firestore for cloud saves.

## 1) Create a Firebase project
1. Go to Firebase console and create a project.
2. Add a **Web App** to the project.
3. Copy the Firebase config object.

## 2) Enable Authentication providers
Enable this provider:
- **Email/Password**

Also add these authorized domains:
- `tane011.github.io`
- `localhost`
- `127.0.0.1`

## 3) Create a Firestore database
Create Firestore in **production mode**.

Use these security rules:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/saves/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 4) Paste the Firebase config into the site
Open `/Users/dylantanenbaum/Documents/TowerDefenseGPT/index.html` and replace the placeholder:
```
window.__tdFirebaseConfig = window.__tdFirebaseConfig || null;
```
with:
```
window.__tdFirebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

## 5) Deploy
Push to `main` to update GitHub Pages.
