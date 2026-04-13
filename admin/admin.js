import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signOut,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc, arrayUnion
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- 1. CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyCMQT1xDsm4fOANia81URaarcUKb4UCkh0",
    authDomain: "mh-halaqat-leaderboard.firebaseapp.com",
    projectId: "mh-halaqat-leaderboard",
    storageBucket: "mh-halaqat-leaderboard.firebasestorage.app",
    messagingSenderId: "831219534673",
    appId: "1:831219534673:web:513af63f79fd7880d8e170"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- 2. DOM ELEMENTS ---
const emailInput = document.getElementById('email');
const passInput = document.getElementById('password');
const loginBtn = document.getElementById('email-login');
const logoutBtn = document.getElementById('logout');
const saveBtn = document.getElementById('save-student');
const studentList = document.getElementById('student-list');
const userNameDisplay = document.getElementById('user-name');

const studentNameInput = document.getElementById('student-name');
const studentPointsInput = document.getElementById('student-points');

// --- 3. AUTHENTICATION ---

loginBtn.onclick = async () => {
    const email = emailInput.value;
    const pass = passInput.value;

    try {
        // Set persistence to local (Remember Me) by default
        await setPersistence(auth, browserLocalPersistence);
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
        alert("خطأ في تسجيل الدخول: " + error.message);
    }
};

logoutBtn.onclick = () => signOut(auth);

onAuthStateChanged(auth, (user) => {
    const loginSection = document.getElementById('login-section');
    const userSection = document.getElementById('user-section');

    if (user) {
        loginSection.classList.add('hidden');
        userSection.classList.remove('hidden');
        userNameDisplay.textContent = user.email;
        fetchLeaderboard(user);
    } else {
        loginSection.classList.remove('hidden');
        userSection.classList.add('hidden');
        studentList.innerHTML = "";
    }
});

// --- 4. DATA OPERATIONS ---

async function fetchLeaderboard(user) {
    if (!user) return;

    try {
        const emailPrefix = user.email.split('@');
        // Path construction: masjidhussien -> halaqat -> {prefix} -> leaderboard
        const docRef = doc(db, "masjidhussien", "halaqat", emailPrefix[0], "leaderboard");
        const docSnap = await getDoc(docRef);

        studentList.innerHTML = "";

        if (docSnap.exists()) {
            const data = docSnap.data();
            const students = data.students || [];

            students.forEach((student) => {
                const div = document.createElement('div');
                div.className = "admin-row"; // Use the class we just styled
                div.innerHTML = `
        <div class="student-data">
            <span class="admin-name">${student.name}</span>
            <span class="admin-points">${student.points} نقطة</span>
        </div>
        <button class="edit-btn" onclick="editPoints('${student.name}', ${student.points})">تعديل</button>
    `;
                studentList.appendChild(div);
            });
        } else {
            studentList.innerHTML = `<p>No leaderboard found for collection: ${emailPrefix}</p>`;
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        studentList.innerHTML = "<p>مُنع الوصول أو مسار خاطئ!</p>";
    }
}

saveBtn.onclick = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const name = studentNameInput.value.trim();
    const points = parseInt(studentPointsInput.value);

    if (!name || isNaN(points)) {
        alert("يُرجى ادخال اسم وعدد نقاط صحيحين!");
        return;
    }

    const emailPrefix = user.email.split('@');
    const docRef = doc(db, "masjidhussien", "halaqat", emailPrefix[0], "leaderboard");
    try {
        // Fetch current data to update the array
        const docSnap = await getDoc(docRef);
        let students = [];
        if (docSnap.exists()) {
            students = docSnap.data().students || [];
        }

        // Find if student exists to update, else add new
        const index = students.findIndex(s => s.name.toLowerCase() === name.toLowerCase());
        if (index > -1) {
            students[index].points = points;
        } else {
            students.push({ name, points });
        }

        // Save back to Firestore
        await setDoc(docRef, { students }, { merge: true });

        // Reset inputs and refresh
        studentNameInput.value = "";
        studentPointsInput.value = "";
        alert("تم تعبئة المعلومات بنجاح!");
        fetchLeaderboard(user);
    } catch (error) {
        console.error("Save Error:", error);
        alert("خطأ في الصلاحيات!");
    }
};

// --- 5. GLOBAL UTILS ---
// Expose to window so inline 'onclick' in generated HTML can find it
window.editPoints = (name, points) => {
    studentNameInput.value = name;
    studentPointsInput.value = points;
    studentNameInput.focus();
};
// --- UPDATED SIGNUP LOGIC ---

const signupBtn = document.getElementById('email-signup');
const setupSection = document.getElementById('setup-section');
const completeSetupBtn = document.getElementById('complete-setup');

signupBtn.onclick = async () => {
    const email = emailInput.value;
    const pass = passInput.value;

    if (!email.endsWith('@halaqat.masjidhussien.org')) {
        alert("عذراً، يجب استخدام بريد المؤسسة فقط.");
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        // After signup, onAuthStateChanged will trigger and handle the redirect to setup
    } catch (error) {
        alert("خطأ في إنشاء الحساب: " + error.message);
    }
};

// Check if group is initialized
async function checkInitialization(user) {
    const emailPrefix = user.email.split('@');
    const docRef = doc(db, "masjidhussien", "halaqat", emailPrefix[0], "leaderboard");
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        // Show setup screen if data doesn't exist
        setupSection.classList.remove('hidden');
    } else {
        fetchLeaderboard(user);
    }
}

// Complete the setup and create the collection/document
completeSetupBtn.onclick = async () => {
    const user = auth.currentUser;
    const groupDisplayName = document.getElementById('setup-group-name').value.trim();
    if (!groupDisplayName) return alert("يرجى إدخال اسم الحلقة");

    const emailPrefix = user.email.split('@');
    
    // 1. Reference to the specific leaderboard
    const leaderDocRef = doc(db, "masjidhussien", "halaqat", emailPrefix[0], "leaderboard");
    
    // 2. Reference to the parent metadata doc
    const parentDocRef = doc(db, "masjidhussien", "halaqat");

    try {
        // Create the individual leaderboard
        await setDoc(leaderDocRef, {
            name: groupDisplayName,
            adminEmail: user.email,
            students: []
        });

        // Update the central registry array
        await updateDoc(parentDocRef, {
            entries: arrayUnion(emailPrefix[0])
        }, {merge: true});

        setupSection.classList.add('hidden');
        fetchLeaderboard(user);
        alert("تم إعداد الحلقة بنجاح!");
    } catch (error) {
        console.error(error);
        alert("حدث خطأ أثناء الإعداد.");
    }
};
// Update your existing Auth listener to include the check
onAuthStateChanged(auth, (user) => {
    const loginSection = document.getElementById('login-section');
    const userSection = document.getElementById('user-section');

    if (user) {
        loginSection.classList.add('hidden');
        userSection.classList.remove('hidden');
        document.getElementById('user-name').textContent = user.email;
        checkInitialization(user); // Added this call
    } else {
        loginSection.classList.remove('hidden');
        userSection.classList.add('hidden');
        setupSection.classList.add('hidden');
    }
});