import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==========================================
// 1. FIREBASE ОНЛАЙН БАЗАНЫН ЖӨНДӨӨЛӨРҮ
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyC7OUycEerDSAuVNd6lIml_OO4F5NqzXNE",
  authDomain: "mektep-b05c1.firebaseapp.com",
  projectId: "mektep-b05c1",
  storageBucket: "mektep-b05c1.firebasestorage.app",
  messagingSenderId: "667867016234",
  appId: "1:667867016234:web:7172f471f375af2fa6a753",
  measurementId: "G-2PGTH0MN8R"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==========================================
// 2. ПРЕДМЕТТЕР ЖАНА МУГАЛИМДЕР
// ==========================================
const SUBJECTS = [
  "География",
  "Информатика",
  "Математика",
  "Физика",
  "Тарых",
  "Англис тили",
  "Кыргыз тили",
  "Орус тили",
  "Биология",
  "Химия"
];

const TEACHERS = [
  { login: "admin", pass: "admin48", name: "Администратор (Завуч)", subject: "ALL" },
  { login: "geografia", pass: "geo2026", name: "География мугалими", subject: "География" },
  { login: "informatika", pass: "info2026", name: "Информатика мугалими", subject: "Информатика" },
  { login: "matematika", pass: "math2026", name: "Математика мугалими", subject: "Математика" },
  { login: "physics", pass: "phys2026", name: "Физика мугалими", subject: "Физика" },
  { login: "taryh", pass: "taryh2026", name: "Тарых мугалими", subject: "Тарых" },
  { login: "english", pass: "eng2026", name: "Англис тили мугалими", subject: "Англис тили" },
  { login: "kyrgyz_tili", pass: "kyrgyz2026", name: "Кыргыз тили мугалими", subject: "Кыргыз тили" },
  { login: "russian", pass: "rus2026", name: "Орус тили мугалими", subject: "Орус тили" },
  { login: "biology", pass: "bio2026", name: "Биология мугалими", subject: "Биология" },
  { login: "chemistry", pass: "chem2026", name: "Химия мугалими", subject: "Химия" }
];

let allQuestions = [];
let allResults = [];
let currentQuiz = { studentName: "", studentClass: "", subject: "", questions: [] };
let currentTeacher = null;

function typesetMath() {
  if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
    window.MathJax.typesetPromise().catch(() => {});
  }
}

// ==========================================
// БАЗАДАН МААЛЫМАТТАРДЫ ЖҮКТӨӨ
// ==========================================
async function loadData() {
  try {
    const qSnap = await getDocs(collection(db, "questions"));
    allQuestions = qSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const rSnap = await getDocs(query(collection(db, "results"), orderBy("timestamp", "desc")));
    allResults = rSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error("Firebase катасы:", e);
  }

  populateSubjectSelects();
}

function populateSubjectSelects() {
  const studentSelect = document.getElementById("student-subject");
  studentSelect.innerHTML = '<option value="">Предметти тандаңыз...</option>';
  SUBJECTS.forEach(sub => {
    studentSelect.innerHTML += `<option value="${sub}">${sub}</option>`;
  });

  const filterSelect = document.getElementById("filter-subject");
  filterSelect.innerHTML = '<option value="all">Бардык предметтер</option>';
  SUBJECTS.forEach(sub => {
    filterSelect.innerHTML += `<option value="${sub}">${sub}</option>`;
  });

  const qSubSelect = document.getElementById("q-subject");
  const bulkSubSelect = document.getElementById("bulk-subject");
  qSubSelect.innerHTML = "";
  bulkSubSelect.innerHTML = "";
  SUBJECTS.forEach(sub => {
    qSubSelect.innerHTML += `<option value="${sub}">${sub}</option>`;
    bulkSubSelect.innerHTML += `<option value="${sub}">${sub}</option>`;
  });
}

// ==========================================
// БЕТТЕРДИ АЛМАШТЫРУУ
// ==========================================
window.showView = function(viewId) {
  document.querySelectorAll("main > section").forEach(sec => sec.classList.add("hidden"));
  document.getElementById(`view-${viewId}`).classList.remove("hidden");
  typesetMath();
};

window.openTeacherArea = function() {
  if (currentTeacher) {
    showView("teacher-dashboard");
    renderTeacherDashboard();
  } else {
    showView("teacher-login");
  }
};

// ==========================================
// ОКУУЧУ: ТЕСТТИ БАШТОО ЖАНА ТАПШЫРУУ
// ==========================================
document.getElementById("start-test-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("student-name").value.trim();
  const sClass = document.getElementById("student-class").value;
  const subject = document.getElementById("student-subject").value;

  const subjectClassQuestions = allQuestions.filter(q =>
    q.subject === subject && (q.class === sClass || q.class === "Бардык класс")
  );

  if (subjectClassQuestions.length === 0) {
    alert(`${sClass} үчүн "${subject}" предметинен азырынча суроолор жок!`);
    return;
  }

  currentQuiz = {
    studentName: name,
    studentClass: sClass,
    subject: subject,
    questions: subjectClassQuestions
  };

  renderQuiz();
  showView("quiz");
});

function renderQuiz() {
  document.getElementById("quiz-subject-badge").textContent = currentQuiz.subject;
  document.getElementById("quiz-class-badge").textContent = currentQuiz.studentClass;
  document.getElementById("quiz-student-info").textContent = `${currentQuiz.studentName} | ${currentQuiz.studentClass}`;
  document.getElementById("quiz-progress").textContent = `Жалпы суроо: ${currentQuiz.questions.length}`;

  const container = document.getElementById("quiz-questions-container");
  container.innerHTML = "";

  currentQuiz.questions.forEach((q, idx) => {
    const letters = ["А", "Б", "В", "Г"];
    const qImgHtml = q.questionImage
      ? `<img src="${q.questionImage}" alt="Суроонун сүрөтү" class="q-image">`
      : "";

    const optionsHtml = q.options.map((opt, oIdx) => {
      const optImg = (q.optionImages && q.optionImages[oIdx])
        ? `<img src="${q.optionImages[oIdx]}" alt="Вариант сүрөтү" class="opt-image">`
        : "";
      return `
        <label class="option-label">
          <input type="radio" name="q_${idx}" value="${oIdx}" required>
          <div class="opt-content">
            <span><strong>${letters[oIdx]})</strong> ${opt}</span>
            ${optImg}
          </div>
        </label>
      `;
    }).join("");

    container.innerHTML += `
      <div class="question-block">
        <div class="question-title">${idx + 1}. ${q.question}</div>
        ${qImgHtml}
        ${optionsHtml}
      </div>
    `;
  });

  typesetMath();
}

window.submitQuiz = async function() {
  const total = currentQuiz.questions.length;
  let score = 0;
  let reviewHtml = "";

  for (let i = 0; i < total; i++) {
    const selected = document.querySelector(`input[name="q_${i}"]:checked`);
    if (!selected) {
      alert(`${i + 1}-суроого жооп белгилеңиз!`);
      return;
    }
    const ansIdx = parseInt(selected.value);
    const q = currentQuiz.questions[i];
    const isCorrect = ansIdx === q.correct;
    if (isCorrect) score++;

    reviewHtml += `
      <div class="review-item ${isCorrect ? 'review-correct' : 'review-wrong'}">
        <strong>${i + 1}. ${q.question}</strong><br>
        Сиздин жооп: ${q.options[ansIdx]} ${isCorrect ? '✅' : `❌ (Туурасы: ${q.options[q.correct]})`}
      </div>
    `;
  }

  const percent = Math.round((score / total) * 100);
  const now = new Date();
  const dateStr = now.toLocaleDateString("ky-KG") + " " + now.toLocaleTimeString("ky-KG", { hour: '2-digit', minute: '2-digit' });

  const resultRecord = {
    name: currentQuiz.studentName,
    class: currentQuiz.studentClass,
    subject: currentQuiz.subject,
    score: `${score}/${total}`,
    percent: percent,
    date: dateStr,
    timestamp: Date.now()
  };

  await addDoc(collection(db, "results"), resultRecord);
  await loadData();

  document.getElementById("result-percent").textContent = `${percent}%`;
  document.getElementById("result-details").textContent = `${currentQuiz.studentName} (${currentQuiz.studentClass}) — ${total} суроодон ${score} туура жооп.`;
  document.getElementById("result-review").innerHTML = reviewHtml;
  showView("result");
  typesetMath();
};

// ==========================================
// МУГАЛИМ: КИРҮҮ ЖАНА БАШКАРУУ
// ==========================================
document.getElementById("teacher-login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const login = document.getElementById("teacher-login").value.trim();
  const pass = document.getElementById("teacher-password").value.trim();

  const found = TEACHERS.find(t => t.login === login && t.pass === pass);
  if (found) {
    currentTeacher = found;
    document.getElementById("login-error").classList.add("hidden");
    document.getElementById("teacher-login-form").reset();
    showView("teacher-dashboard");
    renderTeacherDashboard();
  } else {
    document.getElementById("login-error").classList.remove("hidden");
  }
});

window.logoutTeacher = function() {
  currentTeacher = null;
  showView("student-home");
};

window.switchTab = function(tabName, btn) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));
  document.getElementById(`tab-${tabName}`).classList.remove("hidden");
  typesetMath();
};

window.switchQuestionMode = function(mode) {
  const singleForm = document.getElementById("add-question-form");
  const bulkForm = document.getElementById("bulk-question-form");
  const singleBtn = document.getElementById("mode-single-btn");
  const bulkBtn = document.getElementById("mode-bulk-btn");

  if (mode === "single") {
    singleForm.classList.remove("hidden");
    bulkForm.classList.add("hidden");
    singleBtn.className = "btn btn-primary";
    bulkBtn.className = "btn btn-outline";
  } else {
    singleForm.classList.add("hidden");
    bulkForm.classList.remove("hidden");
    bulkBtn.className = "btn btn-primary";
    singleBtn.className = "btn btn-outline";
  }
  typesetMath();
};

function renderTeacherDashboard() {
  document.getElementById("teacher-welcome").textContent = `Саламатсызбы, ${currentTeacher.name}!`;
  document.getElementById("teacher-subject-label").textContent =
    currentTeacher.subject === "ALL" ? "Укугу: Бардык предметтер" : `Предметиңиз: ${currentTeacher.subject}`;

  const qSub = document.getElementById("q-subject");
  const bulkSub = document.getElementById("bulk-subject");
  const filterSub = document.getElementById("filter-subject");

  if (currentTeacher.subject !== "ALL") {
    qSub.value = currentTeacher.subject;
    qSub.disabled = true;
    bulkSub.value = currentTeacher.subject;
    bulkSub.disabled = true;
    filterSub.value = currentTeacher.subject;
    filterSub.disabled = true;
  } else {
    qSub.disabled = false;
    bulkSub.disabled = false;
    filterSub.disabled = false;
  }

  renderResultsTable();
  renderAdminQuestions();
}

window.renderResultsTable = function() {
  const fClass = document.getElementById("filter-class").value;
  const fSub = document.getElementById("filter-subject").value;

  const filtered = allResults.filter(r => {
    const matchClass = fClass === "all" || r.class === fClass;
    const matchSub = fSub === "all" || r.subject === fSub;
    return matchClass && matchSub;
  });

  const tbody = document.getElementById("results-table-body");
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7">Жыйынтыктар табылган жок.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${r.name}</strong></td>
      <td>${r.class}</td>
      <td>${r.subject}</td>
      <td>${r.score}</td>
      <td><strong>${r.percent}%</strong></td>
      <td>${r.date}</td>
    </tr>
  `).join("");
};

// Сүрөт файлды окуу (компрессия менен Firestore лимитине батуу үчүн)
window.handleFileInput = function(inputEl, targetInputId) {
  const file = inputEl.files && inputEl.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(ev) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement("canvas");
      const maxDim = 700;
      let width = img.width;
      let height = img.height;

      if (width > height && width > maxDim) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else if (height > maxDim) {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.75);

      const targetEl = document.getElementById(targetInputId);
      if (targetEl) {
        targetEl.value = dataUrl;
      }

      if (targetInputId === "q-img-data") {
        const preview = document.getElementById("q-img-preview");
        preview.src = dataUrl;
        preview.classList.remove("hidden");
      }
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
};

// Бир суроону кошуу
document.getElementById("add-question-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const subject = currentTeacher.subject !== "ALL"
    ? currentTeacher.subject
    : document.getElementById("q-subject").value;
  const sClass = document.getElementById("q-class").value;
  const qImgUploaded = document.getElementById("q-img-data").value.trim();
  const qImgUrl = document.getElementById("q-img-url").value.trim();
  const questionImage = qImgUploaded || qImgUrl || "";

  const optionImages = [0, 1, 2, 3].map(idx => document.getElementById(`q-opt-img${idx}`).value.trim());

  const newQ = {
    subject,
    class: sClass,
    question: document.getElementById("q-text").value.trim(),
    questionImage,
    options: [
      document.getElementById("q-opt0").value.trim(),
      document.getElementById("q-opt1").value.trim(),
      document.getElementById("q-opt2").value.trim(),
      document.getElementById("q-opt3").value.trim()
    ],
    optionImages,
    correct: parseInt(document.getElementById("q-correct").value)
  };

  await addDoc(collection(db, "questions"), newQ);

  document.getElementById("q-text").value = "";
  document.getElementById("q-img-file").value = "";
  document.getElementById("q-img-url").value = "";
  document.getElementById("q-img-data").value = "";
  document.getElementById("q-img-preview").classList.add("hidden");

  for (let i = 0; i < 4; i++) {
    document.getElementById(`q-opt${i}`).value = "";
    document.getElementById(`q-opt-img${i}`).value = "";
  }

  await loadData();
  renderAdminQuestions();
  alert("Суроо онлайн базага ийгиликтүү кошулду!");
});

// Баарын бир киргизүү (Топтом)
document.getElementById("bulk-question-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const subject = currentTeacher.subject !== "ALL"
    ? currentTeacher.subject
    : document.getElementById("bulk-subject").value;
  const sClass = document.getElementById("bulk-class").value;
  const rawText = document.getElementById("bulk-text").value.trim();

  const blocks = rawText.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  const letterMap = { "А": 0, "A": 0, "Б": 1, "B": 1, "В": 2, "C": 2, "V": 2, "Г": 3, "D": 3, "G": 3 };
  let addedCount = 0;

  for (const block of blocks) {
    const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length < 6) continue;

    const qText = lines[0].replace(/^\d+[\.)]\s*/, "").trim();
    const opts = [1, 2, 3, 4].map(i => lines[i].replace(/^[АБВГABCDабвгabcd][\.)]\s*/, "").trim());
    const ansLine = lines[5].replace(/^жообу?\s*[:\-]?\s*/i, "").trim().toUpperCase();
    const correctIdx = letterMap[ansLine] !== undefined ? letterMap[ansLine] : 0;

    await addDoc(collection(db, "questions"), {
      subject,
      class: sClass,
      question: qText,
      questionImage: "",
      options: opts,
      optionImages: ["", "", "", ""],
      correct: correctIdx
    });
    addedCount++;
  }

  if (addedCount === 0) {
    alert("Формат туура келбей калды. Ар бир суроо: суроо, А, Б, В, Г варианттары жана 'Жообу: А' саптарынан турсун.");
    return;
  }

  document.getElementById("bulk-text").value = "";
  await loadData();
  renderAdminQuestions();
  alert(`${addedCount} суроо бир убакта онлайн базага кошулду!`);
});

window.renderAdminQuestions = function() {
  const list = document.getElementById("admin-questions-list");
  const classFilter = document.getElementById("admin-filter-class").value;

  const visibleQuestions = allQuestions.filter(q => {
    const subOk = currentTeacher.subject === "ALL" || q.subject === currentTeacher.subject;
    const clsOk = classFilter === "all" || q.class === classFilter;
    return subOk && clsOk;
  });

  document.getElementById("total-q-count").textContent = visibleQuestions.length;

  list.innerHTML = visibleQuestions.map(q => `
    <div class="q-admin-item">
      <div>
        <span class="badge">${q.subject}</span>
        <span class="badge badge-blue">${q.class || "Бардык класс"}</span>
        <p style="margin-top:6px;"><strong>${q.question}</strong></p>
        <small style="color:green;">Туура жооп: ${q.options[q.correct]}</small>
      </div>
      <button class="btn btn-danger" onclick="deleteQuestion('${q.id}')">Өчүрүү</button>
    </div>
  `).join("");

  typesetMath();
};

window.deleteQuestion = async function(id) {
  if (!confirm("Бул суроону өчүрөсүзбү?")) return;
  await deleteDoc(doc(db, "questions", id));
  await loadData();
  renderAdminQuestions();
};

// Excel (CSV) жүктөө
window.exportToCSV = function() {
  let csv = "\uFEFF№,Аты-жөнү,Классы,Предмет,Упай,Пайыз,Убактысы\n";
  allResults.forEach((r, i) => {
    csv += `${i + 1},"${r.name}","${r.class}","${r.subject}","${r.score}",${r.percent}%,"${r.date}"\n`;
  });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "N48_Nurbayev_Test_Jiyintyk.csv";
  link.click();
};

// Старт
loadData();