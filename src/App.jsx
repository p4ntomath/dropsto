import './App.css';
import { useState, useEffect } from "react";
import { auth, googleProvider, microsoftProvider, signInWithPopup, signOut } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase"; 

function App() {
  const [user, setUser] = useState(null);
  const [buckets, setBuckets] = useState([]);
  const [bucketName, setBucketName] = useState("");

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchBuckets(currentUser.uid);
      } else {
        setBuckets([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch user's buckets
  const fetchBuckets = async (uid) => {
    const q = query(
      collection(db, "buckets"),
      where("owner", "==", uid)
    );
    
    const querySnapshot = await getDocs(q);
    const userBuckets = [];
    querySnapshot.forEach((doc) => {
      userBuckets.push({ id: doc.id, ...doc.data() });
    });
    setBuckets(userBuckets);
  };

  // Create new bucket
  const createBucket = async () => {
    if (!bucketName.trim() || !user) return;
    
    try {
      const bucket = {
        name: bucketName,
        owner: user.uid,
        createdAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, "buckets"), bucket);
      setBucketName("");
      fetchBuckets(user.uid);
    } catch (err) {
      console.error("Error creating bucket:", err);
    }
  };

  // Auth methods
  const loginGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error(err);
    }
  };

  const loginMicrosoft = async () => {
    try {
      await signInWithPopup(auth, microsoftProvider);
    } catch (err) {
      console.error(err);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <div className="app-container">
      {user ? (
        <div className="dashboard">
          <div className="header">
            <h2>Welcome {user.displayName || user.email}</h2>
            <button onClick={logout} className="logout-btn">Logout</button>
          </div>
          
          <div className="bucket-section">
            <h3>Your Buckets</h3>
            <div className="bucket-form">
              <input
                type="text"
                value={bucketName}
                onChange={(e) => setBucketName(e.target.value)}
                placeholder="New bucket name"
              />
              <button onClick={createBucket}>Create Bucket</button>
            </div>
            
            <ul className="bucket-list">
              {buckets.map(bucket => (
                <li key={bucket.id} className="bucket-item">
                  <span>{bucket.name}</span>
                  <small>Created: {new Date(bucket.createdAt).toLocaleDateString()}</small>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="auth-container">
          <h1>Welcome to Dropsto</h1>
          <div className="auth-buttons">
            <button onClick={loginGoogle} className="google-btn">
              Login with Google
            </button>
            <button onClick={loginMicrosoft} className="microsoft-btn">
              Login with Microsoft
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;