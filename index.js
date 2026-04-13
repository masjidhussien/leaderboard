import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, collectionGroup, query, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCMQT1xDsm4fOANia81URaarcUKb4UCkh0",
    authDomain: "mh-halaqat-leaderboard.firebaseapp.com",
    projectId: "mh-halaqat-leaderboard",
    storageBucket: "mh-halaqat-leaderboard.firebasestorage.app",
    messagingSenderId: "831219534673",
    appId: "1:831219534673:web:513af63f79fd7880d8e170"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const groupTitle = document.getElementById('group-title');
const studentList = document.getElementById('student-list');
const loadingSkeleton = document.getElementById('loading-skeleton');
const modalOverlay = document.getElementById('modal-overlay');
const infoToggle = document.getElementById('info-toggle');
const closeModal = document.getElementById('close-modal');

// Modal Logic
infoToggle.onclick = () => modalOverlay.classList.remove('hidden');
closeModal.onclick = () => modalOverlay.classList.add('hidden');
modalOverlay.onclick = (e) => { if (e.target === modalOverlay) modalOverlay.classList.add('hidden'); }

async function loadLeaderboard() {
    const urlParams = new URLSearchParams(window.location.search);
    const groupName = urlParams.get('halaqa');

    // --- CASE 1: No Halaqa specified (Show selection menu) ---
    if (!groupName) {
        groupTitle.textContent = "اختر الحلقة";
        try {
            const parentDocSnap = await getDoc(doc(db, "masjidhussien", "halaqat"));
                        
            studentList.innerHTML = "";
            loadingSkeleton.classList.add('hidden');
            studentList.classList.remove('hidden');

            if (parentDocSnap.exists() && parentDocSnap.data().entries) {
                const entries = parentDocSnap.data().entries;

                // Create a card for each entry
                for (const id of entries) {
                    // Fetch the name from the sub-doc
                    const subDoc = await getDoc(doc(db, "masjidhussien", "halaqat", id, "leaderboard"));
                    const displayName = subDoc.exists() ? subDoc.data().name : id;

                    const card = document.createElement('a');
                    card.className = "halaqa-card";
                    card.href = `?halaqa=${id}`;
                    card.innerHTML = `
                        <div class="halaqa-info">
                            <h4>حلقة ${displayName}</h4>
                            <p>اضغط لعرض المتفوقين</p>
                        </div>
                        <div class="arrow-icon">←</div>
                    `;
                    studentList.appendChild(card);
                }
            } else {
                studentList.innerHTML = "<p>لا يوجد حلقات مسجلة حالياً.</p>";
            }
        } catch (error) {
            console.error(error);
            studentList.innerHTML = "<p>حدث خطأ أثناء تحميل القائمة.</p>";
        }
        return;
    }

    // --- CASE 2: Halaqa specified (Show Leaderboard) ---
    try {
        const docRef = doc(db, "masjidhussien", "halaqat", groupName, "leaderboard");
        const docSnap = await getDoc(docRef);

        studentList.innerHTML = "";
        loadingSkeleton.classList.add('hidden');
        studentList.classList.remove('hidden');

        if (docSnap.exists()) {
            let students = docSnap.data().students || [];
            const formattedGroupName = docSnap.data().name || groupName;
            groupTitle.textContent = `متفوّقي حلقة ${formattedGroupName}`;

            students.sort((a, b) => b.points - a.points);

            if (students.length === 0) {
                studentList.innerHTML = "<p style='text-align:center; padding: 20px; color: #7f8c8d;'>لا يوجد بيانات حالياً.</p>";
                return;
            }

            students.forEach((student, index) => {
                const row = document.createElement('div');
                row.className = "student-row";
                row.innerHTML = `
                    <div class="student-meta">
                        <span class="rank">#${index + 1}</span>
                        <span class="name">${student.name}</span>
                    </div>
                    <span class="points">${student.points} ${student.points != 1 && student.points <= 10 ? "نقاط" : "نقطة"}</span>
                `;
                studentList.appendChild(row);
            });
        } else {
            studentList.innerHTML = `<p style='text-align:center;'>هذه الحلقة غير موجودة.</p>`;
        }
    } catch (error) {
        console.error(error);
        studentList.innerHTML = "<p style='text-align:center;'>خطأ في الاتصال.</p>";
    }

}
loadLeaderboard();