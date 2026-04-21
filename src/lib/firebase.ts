import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp,
  getDocFromServer,
  deleteDoc,
  orderBy
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

// Validation connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration. The client is offline.");
    }
  }
}
testConnection();

export interface UserProfile {
  name: string;
  xp: number;
  level: number;
  badges: string[];
  createdAt: any;
  updatedAt: any;
}

export const syncUser = async (user: FirebaseUser) => {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    const newUser: UserProfile = {
      name: user.displayName || "Anonymous Scholar",
      xp: 0,
      level: 1,
      badges: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(userRef, newUser);
    return newUser;
  }
  return userSnap.data() as UserProfile;
};

export const saveQuizResult = async (userId: string, result: { score: number; topic: string }) => {
  await addDoc(collection(db, "quizResults"), {
    ...result,
    userId,
    date: serverTimestamp(),
  });
};

export const saveDocument = async (userId: string, document: { name: string; content: string }) => {
  await addDoc(collection(db, "documents"), {
    ...document,
    userId,
    createdAt: serverTimestamp(),
  });
};

// Chat Helpers
export const createChatSession = async (userId: string, title: string) => {
  const sessionRef = await addDoc(collection(db, "chatSessions"), {
    title,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return sessionRef.id;
};

export const getChatSessions = async (userId: string) => {
  const q = query(collection(db, "chatSessions"), where("userId", "==", userId), orderBy("updatedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const deleteChatSession = async (sessionId: string) => {
  await deleteDoc(doc(db, "chatSessions", sessionId));
};

export const saveChatMessage = async (sessionId: string, text: string, sender: 'user' | 'ai') => {
  await addDoc(collection(db, "chatSessions", sessionId, "messages"), {
    text,
    sender,
    sessionId,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "chatSessions", sessionId), {
    updatedAt: serverTimestamp()
  });
};

export const getChatMessages = async (sessionId: string) => {
  const q = query(collection(db, "chatSessions", sessionId, "messages"), orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Study Group Helpers
export const getStudyGroups = async () => {
  const snap = await getDocs(collection(db, "studyGroups"));
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export { signInWithPopup, onAuthStateChanged };
