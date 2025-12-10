// ===============================================
// GLOBAL KEYS & CONSTANTS
// ===============================================
const API_BASE = "https://fittrack-backend-845g.onrender.com"; // ← use your Render URL

const USERS_KEY = "fittrack_users_list";
const CURRENT_USER_KEY = "fittrack_current_user";
const EVAL_PAYLOAD_KEY = "fittrack_eval_payload";
const LAST_EVAL_KEY = "fittrack_last_evaluation";
const OWNER_PASSWORD = "JIMMYJAMAI01";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const EVAL_TEXT_KEY = "fittrack_eval_text";
const SELECTED_ISSUES_KEY = "fittrack_selected_issues";

let currentUser = null;

// ===============================================
// STORAGE HELPERS
// ===============================================
function getStoredArray(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setStoredArray(key, arr) {
  try {
    localStorage.setItem(key, JSON.stringify(arr));
  } catch {}
}

function loadCurrentUser() {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) {
      currentUser = null;
      return;
    }
    currentUser = JSON.parse(raw);
  } catch {
    currentUser = null;
  }
}

function saveCurrentUser(user) {
  try {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    currentUser = user;
  } catch {}
}

function cleanOldUsers() {
  const now = Date.now();
  const users = getStoredArray(USERS_KEY);
  const recent = users.filter(
    (u) => typeof u.createdAt === "number" && now - u.createdAt <= WEEK_MS
  );
  setStoredArray(USERS_KEY, recent);
  return recent;
}

function saveUser(userBase) {
  const now = Date.now();
  const users = cleanOldUsers();
  const newUser = { ...userBase, createdAt: now };
  users.push(newUser);
  setStoredArray(USERS_KEY, users);
}

// ===============================================
// BACKEND REGISTER HELPER
// ===============================================
async function backendRegister(userData) {
  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.warn("Backend register error:", data);
      return { ok: false, message: data.message || data.error || "Registration failed" };
    }

    console.log("Backend register success:", data);
    return { ok: true, data };
  } catch (err) {
    console.error("Backend register network error:", err);
    return { ok: false, message: "Network error" };
  }
}

// ===============================================
// BACKEND LOGIN HELPER
// ===============================================
async function backendLogin(credentials) {
  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.warn("Backend login error:", data);
      return { ok: false, message: data.message || "Login failed" };
    }

    return { ok: true, data };
  } catch (err) {
    console.error("Backend login network error:", err);
    return { ok: false, message: "Network error" };
  }
}


// ===============================================
// BACKEND OWNER USERS HELPER (NEW)
// ===============================================
async function backendGetOwnerUsers(adminPassword) {
  try {
    const res = await fetch(`${API_BASE}/admin/users`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": adminPassword,
      },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.warn("Owner users fetch error:", data);
      return {
        ok: false,
        message: data.message || "Failed to load users",
      };
    }

    return { ok: true, users: data.users || [] };
  } catch (err) {
    console.error("Owner users network error:", err);
    return { ok: false, message: "Network error" };
  }
}

// ===============================================
// REGISTRATION PAGE
// ===============================================
function initRegistration() {
  const form = document.getElementById("registration-form");
  if (!form) return;

  const statusEl = document.getElementById("register-status");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const age = document.getElementById("age").value.trim();
    const height = Number(document.getElementById("height").value);
    const weight = Number(document.getElementById("weight").value);
    const gender = document.getElementById("gender").value;
    const mobile = document.getElementById("mobile").value.trim();

    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const email = emailInput ? emailInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value : "";

    if (!name || !age || !height || !weight || !gender || !mobile) {
      if (statusEl) statusEl.innerText = "Please fill all details.";
      return;
    }

    if (passwordInput && !password) {
      if (statusEl) statusEl.innerText = "Please create a password.";
      return;
    }

    const users = cleanOldUsers();
    const existing = users.find((u) => (u.mobile || "").trim() === mobile);

    // If user already exists in this browser, keep old behaviour
    if (existing) {
      saveCurrentUser(existing);
      if (statusEl) statusEl.innerText = "User already existed.";
      window.location.href = "evaluation.html";
      return;
    }

    // Local user object (used by evaluation, plans, owner view)
    const user = { name, age, height, weight, gender, mobile, email };
    saveUser(user);
    saveCurrentUser(user);

    if (statusEl) statusEl.innerText = "";

    // Send to backend and WAIT before redirect
    if (passwordInput) {
      const backendPayload = {
        name,
        email: email || undefined,
        mobile,
        password,
        age: Number(age),
        height,
        weight,
        gender,
      };

      const resInfo = await backendRegister(backendPayload);

      if (!resInfo.ok && statusEl) {
        statusEl.innerText =
          resInfo.message ||
          "Backend error (but local data saved). You can still continue.";
      }
    }

    // Now go to evaluation page AFTER backend call
    window.location.href = "evaluation.html";
  });
}

// ===============================================
// SIMPLE REPORT READING (NO pdf.js)
// ===============================================
function readReportFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result || "";
      resolve(String(result));
    };
    reader.onerror = () => {
      reject(new Error("Error reading file"));
    };
    reader.readAsText(file);
  });
}

// ===============================================
// EVALUATION UPLOAD PAGE
// ===============================================
function initEvaluationUpload() {
  const reportInput = document.getElementById("health-report");
  const evaluateBtn = document.getElementById("evaluate-btn");
  const reportStatus = document.getElementById("report-status");
  const confirmGender = document.getElementById("confirm-gender");
  const citySelect = document.getElementById("city-select");
  const backBtn = document.getElementById("back-to-register");
  const userSummary = document.getElementById("user-summary-content");
  const reportNameInput = document.getElementById("report-name");

  if (!reportInput || !evaluateBtn) return;

  loadCurrentUser();

  if (currentUser && userSummary) {
    const hM = currentUser.height / 100;
    const bmiVal =
      currentUser.height && currentUser.weight
        ? currentUser.weight / (hM * hM)
        : null;
    const bmiText =
      bmiVal && isFinite(bmiVal)
        ? `${bmiVal.toFixed(1)} (${
            bmiVal < 18.5
              ? "Underweight"
              : bmiVal < 25
              ? "Normal"
              : bmiVal < 30
              ? "Overweight"
              : "Obese"
          })`
        : "Not available";

    userSummary.innerHTML = `
      <b>Name:</b> ${currentUser.name}<br>
      <b>Age:</b> ${currentUser.age}<br>
      <b>Height:</b> ${currentUser.height} cm<br>
      <b>Weight:</b> ${currentUser.weight} kg<br>
      <b>Gender:</b> ${currentUser.gender}<br>
      <b>BMI:</b> ${bmiText}
    `;
  } else if (userSummary) {
    userSummary.innerHTML =
      "<span class='status-text'>No user in this browser. Please register first.</span>";
  }

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      window.location.href = "register.html";
    });
  }

  evaluateBtn.addEventListener("click", async () => {
    if (!currentUser) {
      alert("No registered user found in this device. Please register first.");
      window.location.href = "register.html";
      return;
    }

    const genderVal = confirmGender.value;
    let cityVal = citySelect.value;
    const nameOnReport = reportNameInput.value.trim().toLowerCase();
    const registeredName = currentUser.name.trim().toLowerCase();

    if (!genderVal) {
      alert("Please confirm gender.");
      return;
    }

    if (genderVal !== currentUser.gender) {
      alert(
        "Selected gender does not match the registered gender. Evaluation cannot proceed."
      );
      return;
    }

    if (!nameOnReport) {
      if (reportStatus)
        reportStatus.innerText = "Please enter the name printed on the report.";
      return;
    }

    if (nameOnReport !== registeredName) {
      if (reportStatus)
        reportStatus.innerText = "Please upload the registered user's report.";
      return;
    }

    if (!cityVal) {
      cityVal = "hyderabad";
      citySelect.value = "hyderabad";
    }

    const file = reportInput.files[0];
    if (!file) {
      if (reportStatus) reportStatus.innerText = "Please upload a report file.";
      return;
    }

    if (reportStatus) reportStatus.innerText = "Reading report...";

    let text = "";
    try {
      text = await readReportFile(file);
    } catch (err) {
      console.error("Error reading file:", err);
      text =
        "The report content could not be read correctly. AI will generate a general summary based on your BMI and basic health details. Please show the original report to your doctor.";
    }

    if (!text || !text.trim()) {
      text =
        "Report text is not available, but user details will still be used for a general health guidance summary. Please consult your doctor with the original report.";
    }

    const payload = {
      text,
      genderVal,
      cityVal,
    };

    try {
      localStorage.setItem(EVAL_PAYLOAD_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error(e);
      if (reportStatus)
        reportStatus.innerText = "Unable to store evaluation data.";
      return;
    }

    if (reportStatus)
      reportStatus.innerText =
        "Report uploaded. Redirecting to evaluation page...";

    window.location.href = "eval_result.html";
  });
}

// ===============================================
// DISEASE DETECTION & HOSPITAL DATA
// ===============================================
const diseaseKeywords = {
  liver: ["sgot", "sgpt", "bilirubin", "liver", "hepatic"],
  lungs: ["lung", "pulmonary", "spirometry", "chest x-ray"],
  kidney: ["creatinine", "urea", "kidney", "gfr", "renal"],
  thyroid: ["tsh", "t3", "t4", "thyroid", "hypothyroid", "hyperthyroid"],
  pcos: ["pcod", "pcos", "polycystic", "ovarian cyst", "irregular period"],
  sinus: ["sinus", "sinusitis", "nasal congestion"],
  migraine: ["migraine", "chronic headache", "neurology"],
  cholesterol: ["cholesterol", "hdl", "ldl", "triglyceride"],
  diabetes: ["diabetes", "sugar", "high glucose", "hba1c", "insulin"],
  bp: ["blood pressure", "hypertension", "bp", "systolic", "diastolic"],
  anemia: ["hemoglobin", "haemoglobin", "hb", "anemia", "rbc low"],
};

const nextDiagnosis = {
  liver: "LFT repeat in 3–6 months; ultrasound abdomen; avoid alcohol & fatty food.",
  lungs: "Pulmonary function test, chest X-ray or HRCT if advised by pulmonologist.",
  kidney: "Renal function test, urine routine, ultrasound KUB if symptoms persist.",
  thyroid:
    "Thyroid profile (TSH, T3, T4) every 3–6 months; dose review with endocrinologist.",
  pcos: "Pelvic scan + hormonal profile; regular follow-up for weight and cycle control.",
  sinus: "ENT check, CT PNS for recurrent sinus problems, allergy testing if needed.",
  migraine:
    "Neurology consult; MRI brain if advised; vitamin D/B12 levels; headache diary.",
  cholesterol:
    "Lipid profile every 6 months; ECG or stress test if cardiac risk factors present.",
  diabetes:
    "HbA1c every 3 months; urine microalbumin; eye screening; foot examination.",
  bp: "Regular BP monitoring; ECG yearly; echocardiogram if suggested by cardiologist.",
  anemia:
    "Iron profile, B12/folate levels; repeat CBC after treatment to monitor response.",
};

const conditionExplain = {
  liver:
    "Liver-related changes are usually reflected in SGOT, SGPT, alkaline phosphatase and bilirubin values. Mild elevation can be due to fatty liver, medicines, infections or alcohol. Very high values or persistent elevation should always be reviewed by a hepatologist.",
  lungs:
    "Lung-related issues are hinted by lung function tests (spirometry), X-ray or CT chest findings, and repeated respiratory complaints. Breathlessness, chronic cough or low oxygen levels should be evaluated by a pulmonologist.",
  kidney:
    "Kidney concerns are usually seen in creatinine, urea, electrolytes and estimated GFR. Rising creatinine or falling GFR indicates reduced filtration and needs nephrology review.",
  thyroid:
    "Thyroid imbalance appears in TSH, T3 and T4 reports. High TSH usually suggests hypothyroidism, and low TSH with high T3/T4 suggests hyperthyroidism. Symptoms include weight changes, hair fall, tiredness, mood changes and menstrual irregularity.",
  pcos:
    "PCOD/PCOS is often associated with irregular periods, acne, weight gain and ultrasound findings of multiple ovarian follicles. Hormone tests (LH, FSH, testosterone, prolactin) and scan reports help in confirming.",
  sinus:
    "Sinus issues appear as sinusitis or blockage in CT PNS or X-ray. Symptoms include frequent cold, nose block, headache around eyes or forehead.",
  migraine:
    "Migraine is a type of headache, usually one-sided, throbbing and associated with nausea, light or sound sensitivity. Reports may rule out other neurological causes.",
  cholesterol:
    "Lipid profile shows total cholesterol, LDL, HDL and triglycerides. High LDL or triglycerides, and low HDL increase long-term risk of heart disease and stroke.",
  diabetes:
    "Diabetes control is checked by fasting and post-meal sugar and HbA1c. Higher values indicate poor control and higher risk for eyes, kidneys, nerves and heart.",
  bp:
    "Blood pressure issues usually appear as 'hypertension' in reports or repeated high BP readings. Uncontrolled BP puts strain on heart, brain, kidneys and eyes.",
  anemia:
    "Anemia is reflected by low hemoglobin, RBC count or low iron stores. It can cause fatigue, breathlessness, palpitations and poor concentration.",
};

// Hospitals
const hospitals = {
  hyderabad: {
    liver: ["AIG Hospitals – Hepatology", "Yashoda – Liver & Gastro Clinic"],
    lungs: ["KIMS – Pulmonology", "Apollo Hospitals – Pulmonology"],
    kidney: ["Yashoda – Nephrology", "Apollo – Nephrology", "KIMS – Nephrology"],
    thyroid: ["Yashoda – Endocrinology", "Apollo – Endocrine Clinic"],
    pcos: ["Fernandez – Women's Care", "Apollo – Gynecology"],
    sinus: ["Apollo – ENT", "CARE – ENT"],
    migraine: ["AIG – Neurology", "Apollo – Neurology"],
    cholesterol: ["KIMS – Cardiology", "CARE – Cardiology"],
    diabetes: ["Yashoda – Diabetes Clinic", "Apollo – Diabetology"],
    bp: ["KIMS – Cardiology", "CARE – Cardiology"],
    anemia: ["CARE – Hematology", "Apollo – Hematology"],
  },
  mumbai: {
    liver: ["Global Hospitals – Liver Care", "KEM Hospital – Gastroenterology"],
    lungs: ["Tata Memorial – Pulmonology", "Kokilaben – Pulmonology"],
    kidney: ["Global – Nephrology", "Kokilaben – Nephrology"],
    thyroid: ["Lilavati – Endocrinology", "Jaslok – Endocrinology"],
    pcos: ["Cloudnine – Gynecology", "Fortis Mulund – Gynecology"],
    sinus: ["Bombay Hospital – ENT", "Kokilaben – ENT"],
    migraine: ["Jaslok – Neurology", "KEM – Neurology"],
    cholesterol: ["Kokilaben – Cardiology", "H.N. Reliance – Heart Institute"],
    diabetes: ["Lilavati – Diabetology", "Fortis – Endocrinology"],
    bp: ["Asian Heart Institute – Cardiology", "Kokilaben – Cardiology"],
    anemia: ["Tata Memorial – Hematology", "Jaslok – Hematology"],
  },
  chennai: {
    liver: ["Apollo – Gastroenterology", "Fortis Malar – Liver Clinic"],
    lungs: ["MIOT – Pulmonology", "SIMS Hospital – Pulmonology"],
    kidney: ["Apollo – Nephrology", "MIOT – Nephrology"],
    thyroid: ["Apollo – Endocrinology", "Fortis Malar – Endocrine Dept"],
    pcos: ["Apollo – Gynecology", "MIOT – Women's Health"],
    sinus: ["Apollo – ENT", "Fortis Malar – ENT"],
    migraine: ["Apollo – Neurology", "MIOT – Neurology"],
    cholesterol: ["SIMS – Cardiology", "Apollo – Heart Centre"],
    diabetes: ["Apollo – Diabetology", "Fortis – Endocrinology"],
    bp: ["MIOT – Cardiology", "Apollo – Cardiology"],
    anemia: ["Apollo – Hematology", "Fortis – General Medicine"],
  },
  delhi: {
    liver: ["ILBS – Liver & Biliary Sciences", "Apollo – Hepatology"],
    lungs: ["AIIMS – Pulmonology", "Max – Pulmonology"],
    kidney: ["AIIMS – Nephrology", "Apollo – Nephrology", "Fortis – Nephrology"],
    thyroid: ["AIIMS – Endocrinology", "Max – Endocrinology"],
    pcos: ["Fortis La Femme – Gynecology", "Apollo Cradle – Women's Hospital"],
    sinus: ["Sir Ganga Ram – ENT", "Apollo – ENT"],
    migraine: ["AIIMS – Neurology", "Max – Neurology"],
    cholesterol: ["Max – Cardiology", "Fortis Escorts – Heart Institute"],
    diabetes: ["AIIMS – Endocrinology", "Max – Diabetes Clinic"],
    bp: ["AIIMS – Cardiology", "Fortis – Cardiology"],
    anemia: ["AIIMS – Hematology", "Apollo – Hematology"],
  },
  bangalore: {
    liver: ["BGS Global – Liver Clinic", "Manipal – Gastroenterology"],
    lungs: ["Narayana Health – Pulmonology", "Manipal – Pulmonology"],
    kidney: ["Manipal – Nephrology", "Narayana Health – Nephrology"],
    thyroid: ["Manipal – Endocrinology", "Fortis – Endocrine Clinic"],
    pcos: ["Cloudnine – Women's Center", "Manipal – OB/GYN"],
    sinus: ["Manipal – ENT", "Fortis – ENT"],
    migraine: ["NIMHANS – Neurology", "Manipal – Neurology"],
    cholesterol: ["Jayadeva Institute – Cardiology", "Apollo – Cardiology"],
    diabetes: ["Manipal – Diabetology", "Fortis – Diabetes Clinic"],
    bp: ["Narayana – Cardiology", "Apollo – Cardiology"],
    anemia: ["St. John’s – Hematology", "Manipal – Hematology"],
  },
  west_bengal: {
    liver: ["AMRI – Gastroenterology", "Apollo Gleneagles – Liver Clinic"],
    lungs: ["Peerless Hospital – Pulmonology", "AMRI – Pulmonology"],
    kidney: ["Apollo Gleneagles – Nephrology", "CMRI – Nephrology"],
    thyroid: ["Apollo – Endocrinology", "Belle Vue – Endocrinology"],
    pcos: ["Bhagirathi Neotia – Women's Clinic", "Apollo – Gynecology"],
    sinus: ["CMRI – ENT", "AMRI – ENT"],
    migraine: ["Apollo – Neurology", "Institute of Neurosciences – Kolkata"],
    cholesterol: ["BM Birla Heart Research Centre", "Apollo – Cardiology"],
    diabetes: ["Apollo – Diabetes Clinic", "AMRI – Diabetology"],
    bp: ["BM Birla – Cardiology", "Apollo – Cardiology"],
    anemia: ["NRS Medical College – Hematology", "Apollo – Hematology"],
  },
};

// ===============================================
// CORE EVALUATION FUNCTION
// ===============================================
function runEvaluation(text, genderVal, cityVal, outputDiv, evalTextarea) {
  if (!outputDiv) return;

  const textLower = (text || "").toLowerCase();

  const detected = [];
  for (const key in diseaseKeywords) {
    if (diseaseKeywords[key].some((kw) => textLower.includes(kw))) {
      detected.push(key);
    }
  }

  let bmiLine = "";
  if (currentUser && currentUser.height && currentUser.weight) {
    const h = currentUser.height / 100;
    const bmiVal = currentUser.weight / (h * h);
    const cat =
      bmiVal < 18.5
        ? "Underweight"
        : bmiVal < 25
        ? "Normal"
        : bmiVal < 30
        ? "Overweight"
        : "Obese";
    bmiLine = `BMI ≈ ${bmiVal.toFixed(1)} (${cat})`;
  } else {
    bmiLine = "BMI: Not available";
  }

  // NOTHING DETECTED
  if (!detected.length) {
    outputDiv.innerHTML = `
      <h3>Evaluation Result</h3>
      <p>No strong pattern was detected from the report text for major issues like liver, lungs, kidneys, thyroid, PCOD/PCOS, sinus, migraine, cholesterol, diabetes, blood pressure or anemia.</p>
      <p><strong>${bmiLine}</strong></p>
      <p>This does NOT mean everything is normal. Please share this report with your doctor for proper interpretation.</p>
    `;

    if (evalTextarea) {
      const txt = `FITTRACK – AI HEALTH REPORT EVALUATION
======================================

Name: ${currentUser ? currentUser.name : "N/A"}
Gender: ${genderVal || "N/A"}
${bmiLine}

AI Summary:
No clear pattern for specific organ-based issues was strongly detected from the uploaded report text.
However, AI evaluation is limited and cannot replace doctor consultation.

Kindly consult your treating doctor for final interpretation and treatment decisions.
`;
      evalTextarea.value = txt;
      localStorage.setItem(EVAL_TEXT_KEY, txt);
    }

    localStorage.setItem(LAST_EVAL_KEY, "general");
    return;
  }

  const detectedUpper = detected.map((d) => d.toUpperCase()).join(", ");
  const overviewText = `Based on your report, the AI suspects possible involvement of: ${detectedUpper}.`;

  let conditionDetailHtml = "";
  detected.forEach((d) => {
    const expl = conditionExplain[d] || "";
    const diag = nextDiagnosis[d] || "";
    conditionDetailHtml += `
      <h4>${d.toUpperCase()}</h4>
      <p>${expl}</p>
      <p><b>Recommended further tests / follow-up:</b> ${diag}</p>
      <br>
    `;
  });

  let hospitalHtml = "";
  detected.forEach((d) => {
    const list = hospitals[cityVal]?.[d] || [];
    const lines =
      list.length > 0
        ? list.map((h) => `<li>${h}</li>`).join("")
        : "<li>Consult a specialist or multi-speciality hospital near you.</li>";
    hospitalHtml += `
      <h4>${d.toUpperCase()}</h4>
      <ul>${lines}</ul>
      <br>
    `;
  });

  let diagnosisHtml = "";
  detected.forEach((d) => {
    const diag =
      nextDiagnosis[d] ||
      "Regular follow-up tests and doctor consultation advised.";
    diagnosisHtml += `<p><b>${d.toUpperCase()}:</b> ${diag}</p>`;
  });

  outputDiv.innerHTML = `
    <div class="options-nav">
      <button class="secondary-btn option-btn" data-target="overview-section">Overview of the Reports</button>
      <button class="secondary-btn option-btn" data-target="hospital-section">Hospital View</button>
      <button class="secondary-btn option-btn" data-target="diagnosis-section">Medical Diagnosis</button>
    </div>

    <div id="overview-section" class="option-section">
      <h3>Overview of the Reports</h3>
      <p><strong>${overviewText}</strong></p>
      <p><strong>${bmiLine}</strong></p>
      <p><b>Detailed organ-wise explanation:</b></p>
      ${conditionDetailHtml}
    </div>

    <div id="hospital-section" class="option-section hidden">
      <h3>Hospital View</h3>
      <p>Based on your selected city and the health areas, here are some suggested hospitals and specialists:</p>
      ${hospitalHtml}
    </div>

    <div id="diagnosis-section" class="option-section hidden">
      <h3>Medical Diagnosis – Further Tests</h3>
      ${diagnosisHtml}
    </div>
  `;

  const btns = outputDiv.querySelectorAll(".option-btn");
  const sections = outputDiv.querySelectorAll(".option-section");
  btns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      sections.forEach((sec) => {
        if (sec.id === targetId) sec.classList.remove("hidden");
        else sec.classList.add("hidden");
      });
    });
  });

  if (evalTextarea) {
    let textHospitals = "";
    detected.forEach((d) => {
      const list = hospitals[cityVal]?.[d] || [];
      textHospitals += `\n${d.toUpperCase()}:\n${
        list.length ? list.join("\n") : "  - Consult nearby specialist."
      }\n`;
    });

    let textDiag = "";
    detected.forEach((d) => {
      const diag =
        nextDiagnosis[d] ||
        "Regular follow-up tests and doctor consultation advised.";
      textDiag += `\n${d.toUpperCase()}:\n${diag}\n`;
    });

    let textExplain = "";
    detected.forEach((d) => {
      const expl = conditionExplain[d] || "";
      textExplain += `\n${d.toUpperCase()} – Explanation:\n${expl}\n`;
    });

    const txt = `FITTRACK – AI HEALTH REPORT EVALUATION
======================================

Name: ${currentUser ? currentUser.name : "N/A"}
Gender: ${genderVal || "N/A"}
${bmiLine}

SUMMARY
-------
${overviewText}

DETAILED EXPLANATION
--------------------
${textExplain}

SUGGESTED HOSPITALS (based on city):
------------------------------------
${textHospitals}

RECOMMENDED FOLLOW-UP TESTS:
----------------------------
${textDiag}

NOTE:
This is an AI-generated supportive summary only.
It cannot replace physical examination and advice from a qualified doctor.
Please discuss this evaluation with your treating physician.
`;
    evalTextarea.value = txt;
    localStorage.setItem(EVAL_TEXT_KEY, txt);
  }

  const primary = detected[0] || "general";
  localStorage.setItem(LAST_EVAL_KEY, primary);
}

// ===============================================
// TEXT HELPERS
// ===============================================
function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

// ===============================================
// EVAL RESULT PAGE
// ===============================================
function initEvaluationResultPage() {
  const anyEvalElement =
    document.getElementById("detailed-report") ||
    document.getElementById("eval-text") ||
    document.getElementById("go-to-health-issues") ||
    document.getElementById("back-to-upload");

  if (!anyEvalElement) return;

  let detailedReportDiv = document.getElementById("detailed-report");
  if (!detailedReportDiv) {
    detailedReportDiv = document.createElement("div");
    detailedReportDiv.id = "detailed-report";
    detailedReportDiv.className = "card evaluation-card";
    detailedReportDiv.style.margin = "16px";
    document.body.appendChild(detailedReportDiv);
  }

  let evalTextarea = document.getElementById("eval-text");
  if (!evalTextarea) {
    evalTextarea = document.createElement("textarea");
    evalTextarea.id = "eval-text";
    evalTextarea.className = "eval-textarea hidden";
    evalTextarea.readOnly = true;
    document.body.appendChild(evalTextarea);
  }

  const backBtn = document.getElementById("back-to-upload");
  const goHealthIssuesBtn = document.getElementById("go-to-health-issues");
  const resultUserSummary = document.getElementById(
    "result-user-summary-content"
  );

  loadCurrentUser();

  if (currentUser && resultUserSummary) {
    const hM = currentUser.height / 100;
    const bmiVal =
      currentUser.height && currentUser.weight
        ? currentUser.weight / (hM * hM)
        : null;
    const bmiText =
      bmiVal && isFinite(bmiVal)
        ? `${bmiVal.toFixed(1)} (${
            bmiVal < 18.5
              ? "Underweight"
              : bmiVal < 25
              ? "Normal"
              : bmiVal < 30
              ? "Overweight"
              : "Obese"
          })`
        : "Not available";

    resultUserSummary.innerHTML = `
      <b>Name:</b> ${currentUser.name}<br>
      <b>Age:</b> ${currentUser.age}<br>
      <b>Height:</b> ${currentUser.height} cm<br>
      <b>Weight:</b> ${currentUser.weight} kg<br>
      <b>Gender:</b> ${currentUser.gender}<br>
      <b>BMI:</b> ${bmiText}
    `;
  } else if (resultUserSummary) {
    resultUserSummary.innerHTML =
      "<span class='status-text'>No user registered. Please register first.</span>";
  }

  const raw = localStorage.getItem(EVAL_PAYLOAD_KEY);
  if (!raw) {
    detailedReportDiv.innerHTML =
      "<p class='status-text'>No report found. Please upload your report first.</p>";
    return;
  }

  const payload = JSON.parse(raw);
  const { text, genderVal, cityVal } = payload;

  if (!currentUser || genderVal !== currentUser.gender) {
    detailedReportDiv.innerHTML =
      "<p class='status-text'>Gender mismatch detected. Evaluation is not allowed.</p>";
    return;
  }

  runEvaluation(text, genderVal, cityVal, detailedReportDiv, evalTextarea);

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      window.location.href = "evaluation.html";
    });
  }

  if (goHealthIssuesBtn) {
    goHealthIssuesBtn.addEventListener("click", () => {
      showHealthIssuesPage(document.body, detailedReportDiv);
    });
  }
}

// ===============================================
// HEALTH ISSUES PAGE (ONLY ONCE)
// ===============================================
function showHealthIssuesPage(rootCard, evalContentDiv) {
  if (evalContentDiv) evalContentDiv.classList.add("hidden");

  const btnRow = rootCard.querySelector(".button-row");
  if (btnRow) btnRow.classList.add("hidden");
  const goBtn = document.getElementById("go-to-health-issues");
  if (goBtn) goBtn.classList.add("hidden");
  const backEvalBtn = document.getElementById("back-to-upload");
  if (backEvalBtn) backEvalBtn.classList.add("hidden");

  let healthDiv = document.getElementById("health-issues-page");
  if (!healthDiv) {
    healthDiv = document.createElement("div");
    healthDiv.id = "health-issues-page";

    healthDiv.innerHTML = `
      <div class="health-issues-section">
        <div class="after-hero-section">
          <h3>Select Health Issues</h3>
          <p class="small-text">
            Choose the health issues that apply to this report. This will be used in your final plan.
          </p>

          <div class="health-issues-list">
            <label><input type="checkbox" class="health-issue-checkbox" value="Liver"> Liver</label>
            <label><input type="checkbox" class="health-issue-checkbox" value="Lungs"> Lungs</label>
            <label><input type="checkbox" class="health-issue-checkbox" value="Kidneys"> Kidneys</label>
            <label><input type="checkbox" class="health-issue-checkbox" value="Thyroid"> Thyroid</label>
            <label><input type="checkbox" class="health-issue-checkbox" value="PCOD/PCOS"> PCOD / PCOS</label>
            <label><input type="checkbox" class="health-issue-checkbox" value="Sinus"> Sinus</label>
            <label><input type="checkbox" class="health-issue-checkbox" value="Migraine"> Migraine</label>
            <label><input type="checkbox" class="health-issue-checkbox" value="Cholesterol"> Cholesterol</label>
            <label><input type="checkbox" class="health-issue-checkbox" value="Diabetes"> Diabetes</label>
            <label><input type="checkbox" class="health-issue-checkbox" value="Blood Pressure"> Blood Pressure</label>
            <label><input type="checkbox" class="health-issue-checkbox" value="Anemia"> Anemia</label>
          </div>

          <br>
          <div class="button-row">
            <button id="save-health-issues-btn" class="primary-btn">
              Save & Go to Diet & Workout Plans
            </button>
            <button id="back-to-eval-btn" class="secondary-btn">
              Back to Evaluation
            </button>
          </div>
        </div>
      </div>
    `;

    rootCard.appendChild(healthDiv);

    const saveBtn = document.getElementById("save-health-issues-btn");
    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        const checkboxes = healthDiv.querySelectorAll(".health-issue-checkbox");
        const selected = [];
        checkboxes.forEach((cb) => {
          if (cb.checked) selected.push(cb.value);
        });

        try {
          localStorage.setItem(SELECTED_ISSUES_KEY, JSON.stringify(selected));
        } catch (e) {
          console.error("Error saving health issues", e);
        }

        window.location.href = "plans.html";
      });
    }

    const backBtn = document.getElementById("back-to-eval-btn");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        healthDiv.classList.add("hidden");
        if (evalContentDiv) evalContentDiv.classList.remove("hidden");
        const row = rootCard.querySelector(".button-row");
        if (row) row.classList.remove("hidden");
        const gh = document.getElementById("go-to-health-issues");
        if (gh) gh.classList.remove("hidden");
        const bEval = document.getElementById("back-to-upload");
        if (bEval) bEval.classList.remove("hidden");
      });
    }
  }

  healthDiv.classList.remove("hidden");
}

// ===============================================
// DIET & WORKOUT PAGE
// ===============================================
function initPlansPage() {
  const page = document.getElementById("plans-page");
  if (!page) return;

  const genderSel = document.getElementById("plans-gender");
  const foodSel = document.getElementById("food-preference");
  const generateBtn = document.getElementById("generate-diet-btn");
  const outputDiv = document.getElementById("diet-plan-output");
  const downloadBtn = document.getElementById("download-diet-btn");
  const warning = document.getElementById("plans-warning");
  const userBox = document.getElementById("plans-user-content");
  const backBtn = document.getElementById("back-to-options");

  loadCurrentUser();

  if (currentUser && userBox) {
    const h = currentUser.height / 100;
    const bmiVal = currentUser.weight / (h * h);
    const bmiText = isFinite(bmiVal)
      ? `${bmiVal.toFixed(1)} (${
          bmiVal < 18.5
            ? "Underweight"
            : bmiVal < 25
            ? "Normal"
            : bmiVal < 30
            ? "Overweight"
            : "Obese"
        })`
      : "Not available";

    userBox.innerHTML = `
      <b>Name:</b> ${currentUser.name}<br>
      <b>Age:</b> ${currentUser.age}<br>
      <b>Gender:</b> ${currentUser.gender}<br>
      <b>BMI:</b> ${bmiText}
    `;
  } else if (userBox) {
    userBox.innerHTML =
      "<span class='status-text'>No user registered. Please register and evaluate first.</span>";
  }

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      window.location.href = "eval_result.html";
    });
  }

  if (generateBtn) {
    generateBtn.addEventListener("click", () => {
      if (!currentUser) {
        if (warning)
          warning.innerText = "No registered user. Please register first.";
        return;
      }

      const g = genderSel.value;
      const f = foodSel.value;

      if (!g || !f) {
        if (warning)
          warning.innerText = "Please select gender and food preference.";
        return;
      }

      if (g !== currentUser.gender) {
        if (warning)
          warning.innerText =
            "Selected gender does not match registered gender. Plan cannot be generated.";
        return;
      }

      if (warning) warning.innerText = "";

      const dietHtml = buildDietPlan(f, g);
      const workoutHtml = buildWorkoutPlan(g);

      if (outputDiv) {
        outputDiv.innerHTML = `
          <h3>Your Diet Plan</h3>
          <p>${dietHtml}</p>
          <h3 style="margin-top:16px;">Your Workout Plan</h3>
          <p>${workoutHtml}</p>
        `;
      }

      const evalText = localStorage.getItem(EVAL_TEXT_KEY) || "";
      let selectedIssues = [];
      try {
        selectedIssues = JSON.parse(
          localStorage.getItem(SELECTED_ISSUES_KEY) || "[]"
        );
      } catch {
        selectedIssues = [];
      }

      const issuesText =
        selectedIssues.length > 0
          ? "Selected Health Issues:\n- " + selectedIssues.join("\n- ")
          : "Selected Health Issues: None selected.";

      const dietPlain = stripHtml(dietHtml);
      const workoutPlain = stripHtml(workoutHtml);

      const finalText = `
${evalText}

${issuesText}

DIET PLAN
---------
${dietPlain}

WORKOUT PLAN
------------
${workoutPlain}
`;

      if (downloadBtn) {
        downloadBtn.textContent =
          "Download Full Plan (Evaluation + Issues + Diet + Workout)";
        downloadBtn.classList.remove("hidden");
        downloadBtn.onclick = () => {
          const blob = new Blob([finalText], { type: "text/plain" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "Full_Health_Plan.txt";
          a.click();
          URL.revokeObjectURL(url);
        };
      }
    });
  }
}

// ===============================================
// GENDER-AWARE DIET & WORKOUT
// ===============================================
function buildDietPlan(foodPref, gender) {
  const isMale = gender === "male";
  const isFemale = gender === "female";

  let base = "";

  if (isMale) {
    base = `
▪ Early morning: 1–2 glasses warm water; optional black coffee/green tea (no sugar).<br>
▪ Breakfast: High-protein (eg. oats + water/plant-based options, 2 boiled eggs or paneer/tofu depending on your preference) + 1 fruit.<br>
▪ Mid-morning: Handful of nuts (almonds/walnuts) or sprouts salad.<br>
▪ Lunch: 2–3 phulkas or 1.5 cups rice + dal/rajma/chole + 1 bowl sabji + salad.<br>
▪ Evening snack: Roasted chana / sprouts; avoid biscuits, fries and sugary drinks.<br>
▪ Dinner (lighter than lunch): 2 phulkas or 1 cup khichdi + sabji + salad; finish 2–3 hrs before sleep.<br>
▪ Hydration: 3–3.5 L water (as per doctor’s advice, reduce if kidney/heart issues).<br><br>
`;
  } else if (isFemale) {
    base = `
▪ Early morning: Warm water with lemon or soaked methi/jeera seeds for bloating control (if tolerated).<br>
▪ Breakfast: Balanced plate – complex carbs (oats/millets) + protein (sprouts/tofu/paneer/eggs as per preference) + 1 fruit.<br>
▪ Mid-morning: Fruit bowl or sprouts/vegetable salad; avoid packaged juices.<br>
▪ Lunch: 2 small phulkas or 1 cup rice + dal/sambar + 1–2 vegetable dishes + salad.<br>
▪ Evening snack: Nuts / seeds mix / roasted chana or makhana; herbal/green tea if needed.<br>
▪ Dinner: Light – soup + salad + 1–2 phulkas OR millet khichdi; avoid heavy/oily food at night.<br>
▪ Hydration: 2.5–3 L water; include coconut water or buttermilk only if allowed in your condition and preference.<br><br>
`;
  } else {
    base = `
▪ Early morning: Warm water or herbal tea.<br>
▪ Breakfast: Complex carbs + good protein + 1 fruit.<br>
▪ Lunch: 2 small phulkas or 1 cup rice + dal + sabji + salad.<br>
▪ Evening snack: Nuts / roasted chana / sprouts.<br>
▪ Dinner: Light – soup + salad + 1–2 phulkas / khichdi.<br>
▪ Hydration: 2.5–3.5 L water (as advised by your doctor).<br><br>
`;
  }

  if (foodPref === "veg") {
    base +=
      "Veg focus: Use dals, paneer, tofu, curd substitutes, sprouts, lentils and leafy greens as main protein sources. Limit deep-fried items and sweets.";
  } else if (foodPref === "non-veg" || foodPref === "nonveg") {
    base +=
      "Non-veg focus: Prefer grilled/boiled chicken or fish 2–3 times a week; avoid deep-fried chicken, processed meats and organ meat unless advised by doctor.";
  } else if (foodPref === "vegan") {
    base +=
      "Vegan focus (no milk / curd / paneer / butter / ghee / cheese / eggs / meat, and avoiding underground vegetables like potato, sweet potato, beetroot, carrot, radish, onion, garlic, yam): " +
      "Use plant proteins such as tofu, tempeh, soya chunks, chickpeas, rajma (kidney beans), chana, lentils and green moong sprouts; " +
      "choose above-ground vegetables like cabbage, cauliflower, capsicum, beans, bottle gourd, ridge gourd, ivy gourd, brinjal, cucumber, tomato, okra and broccoli; " +
      "take carbohydrates mainly from brown rice, millets (ragi, jowar, bajra, foxtail etc.), whole-wheat or multigrain rotis and quinoa; " +
      "add healthy fats from almonds, walnuts, peanuts and seeds (chia, flax, pumpkin, sunflower); " +
      "and include fruits such as apple, papaya, guava, berries, pomegranate, kiwi and orange, as allowed by your doctor.";
  }

  return base;
}

function buildWorkoutPlan(gender) {
  const isMale = gender === "male";
  const isFemale = gender === "female";

  if (isMale) {
    return `
▪ Weekly goal: At least 150–200 minutes of moderate activity (as cleared by your doctor).<br>
▪ Cardio (4–5 days/week): 30–40 minutes brisk walking, cycling or elliptical. Start slow and build up gradually.<br>
▪ Strength training (3 days/week, non-consecutive):<br>
&nbsp;&nbsp;– Day A: Squats to chair, lunges, wall push-ups, dumbbell rows.<br>
&nbsp;&nbsp;– Day B: Glute bridges, step-ups, shoulder presses, biceps/triceps with light weights.<br>
&nbsp;&nbsp;– 2–3 sets of 10–15 reps each, without breath holding.<br>
▪ Core & posture: Planks (on knees if needed), bird-dog, gentle back-strengthening exercises.<br>
▪ Stretching: 5–10 minutes before and after workout – hamstring, calf, hip, shoulder and neck stretches.<br>
▪ Rest: At least 1–2 rest days per week; listen to your body, don’t train heavy if you are unwell or sleep-deprived.<br>
▪ Safety: Stop immediately and seek medical help if you experience chest pain, severe breathlessness, giddiness or palpitations.<br>
<br>
(Plan intensity must always be matched with your doctor’s advice and your medical reports.)
`;
  }

  if (isFemale) {
    return `
▪ Weekly goal: 120–180 minutes of light to moderate activity (doctor-approved).<br>
▪ Cardio (4 days/week): 25–35 minutes brisk walking, indoor walking, cycling or low-impact aerobics.<br>
▪ Strength training (2–3 days/week): Focus on joint-friendly movements –<br>
&nbsp;&nbsp;– Lower body: Squats to chair, side leg raises, step-ups on low step.<br>
&nbsp;&nbsp;– Upper body: Wall push-ups, light dumbbell/ water-bottle rows, shoulder raises.<br>
&nbsp;&nbsp;– Core: Pelvic tilts, bird-dog, gentle abdominal bracing (avoid heavy core strain if you have pelvic issues or recent surgery).<br>
▪ PCOD/thyroid/weight gain focus (if present): More walking + light strength training to support metabolism, as tolerated.<br>
▪ Stretching & relaxation: 10 minutes of stretches + deep breathing or yoga-based relaxation on most days to reduce stress and improve sleep.<br>
▪ Rest: At least 1–2 full rest days; avoid intense exercise during very painful periods or when medically advised to rest.<br>
▪ Safety: Stop and talk to a doctor if you feel unusual chest pain, heavy bleeding, severe breathlessness, dizziness or palpitations during workouts.<br>
<br>
(Always match workout level with your gynecologist/endocrinologist/physician’s advice.)
`;
  }

  return `
▪ Frequency: 4–5 days per week of light-to-moderate activity (as your doctor allows).<br>
▪ Cardio (30–40 mins): Brisk walking, slow cycling, or light treadmill (start slowly).<br>
▪ Strength (2–3 days/week): Simple exercises – squats to chair, wall push-ups, light dumbbells, step-ups.<br>
▪ Stretching: 5–10 minutes of neck, shoulder, back and leg stretches before and after exercise.<br>
▪ Rest: At least 1–2 complete rest days per week for recovery.<br>
▪ Safety: Stop immediately if you feel chest pain, severe breathlessness, dizziness, or palpitations and contact a doctor.<br>
<br>
(Always follow your doctor's advice before starting or changing your workout.)
`;
}

// ===============================================
// OWNER PAGE
// ===============================================
function initOwnerPage() {
  const page = document.getElementById("owner-page");
  if (!page) return;

  const pwdInput = document.getElementById("owner-password");
  const loginBtn = document.getElementById("owner-login-btn");
  const status = document.getElementById("owner-status");
  const container = document.getElementById("owner-users-container");
  const listDiv = document.getElementById("owner-users-list");
  const searchInput = document.getElementById("owner-search-input");
  const searchBtn = document.getElementById("owner-search-btn");
  const downloadCsvBtn = document.getElementById("owner-download-csv-btn");

  function renderUsers(users) {
    if (!users.length) {
      listDiv.innerHTML = "<p>No users found.</p>";
      return;
    }

    listDiv.innerHTML = users
      .map((u, idx) => {
        const dt = u.createdAt
          ? new Date(u.createdAt).toLocaleString()
          : "Unknown";
        return `
        <div class="owner-user-card">
          <b>#${idx + 1} ${u.name}</b><br>
          Age: ${u.age}, Gender: ${u.gender}<br>
          Height: ${u.height} cm, Weight: ${u.weight} kg<br>
          Mobile: ${u.mobile}<br>
          Registered at: ${dt}
        </div>
      `;
      })
      .join("");
  }

  let cachedUsers = [];

  if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
      const pwd = (pwdInput.value || "").trim();

      if (!pwd) {
        if (status) status.innerText = "Please enter password.";
        return;
      }

      // Load ALL users from backend (MongoDB)
      const resInfo = await backendGetOwnerUsers(pwd);

      if (!resInfo.ok) {
        if (status) status.innerText = resInfo.message || "Login failed.";
        if (container) container.classList.add("hidden");
        return;
      }

      if (status) status.innerText = "Login successful.";
      if (container) container.classList.remove("hidden");

      cachedUsers = resInfo.users || [];
      renderUsers(cachedUsers);
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener("click", () => {
      const q = (searchInput.value || "").toLowerCase().trim();
      if (!q) {
        renderUsers(cachedUsers);
        return;
      }

      const filtered = cachedUsers.filter((u) => {
        const name = (u.name || "").toLowerCase();
        const mob = (u.mobile || "").toLowerCase();
        return name.includes(q) || mob.includes(q);
      });

      renderUsers(filtered);
    });
  }
}  





// ===============================================
// LOGIN PAGE
// ===============================================
function initLoginPage() {
  const form = document.getElementById("login-form");
  if (!form) return;

  const statusEl = document.getElementById("login-status");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const mobile = document.getElementById("login-mobile").value.trim();
    const password = document.getElementById("login-password").value;

    if (!mobile || !password) {
      if (statusEl) statusEl.innerText = "Please enter mobile and password.";
      return;
    }

    if (statusEl) statusEl.innerText = "Logging in...";

    const resInfo = await backendLogin({ mobile, password });

    if (!resInfo.ok) {
      if (statusEl) statusEl.innerText = resInfo.message || "Login failed.";
      return;
    }

    const { user, token } = resInfo.data || {};

    if (user) {
      saveCurrentUser({
        name: user.name,
        age: user.age,
        height: user.height,
        weight: user.weight,
        gender: user.gender,
        mobile: user.mobile,
        email: user.email,
      });
    }

    try {
      localStorage.setItem("fittrack_auth_token", token || "");
    } catch {}

    if (statusEl) statusEl.innerText = "Login successful. Redirecting...";
    window.location.href = "evaluation.html";
  });
}

// ===============================================
// PAGE CONTROLLER
// ===============================================
document.addEventListener("DOMContentLoaded", () => {
  cleanOldUsers();
  loadCurrentUser();

  initRegistration();
  initLoginPage();          // ← NEW
  initEvaluationUpload();
  initEvaluationResultPage();
  initPlansPage();
  initOwnerPage();
});