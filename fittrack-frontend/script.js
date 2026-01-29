// ===============================================
// GLOBAL KEYS & CONSTANTS
// ===============================================
const API_BASE = "https://fittrack-backend-845g.onrender.com"; // ← use your Render URL


// ===============================================
// STEP 1: WEEKLY PLAN TABLE HELPERS (GLOBAL)
// ===============================================

// 🔹 Helper to bold ONLY the main food item
function boldMainFood(text) {
  if (!text) return "-";

  let cleaned = text;

  // ❌ Remove leading time formats like:
  // "7:00 AM –", "07:00 AM -", "7 AM -", etc.
  cleaned = cleaned.replace(
    /^\s*\d{1,2}(:\d{2})?\s*(AM|PM)?\s*[-–]\s*/i,
    ""
  );

  // Clean double spaces left after removal
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();

  // Split food and reason
  const parts = cleaned.split(" because ");
  if (parts.length === 1) {
    return `<strong>${cleaned}</strong>`;
  }

  return `<strong>${parts[0]}</strong> because ${parts[1]}`;
}



// ===============================================
// 🍽️ WEEKLY DIET PLAN TABLE
// ===============================================
function removeTimeFromText(text) {
  if (!text) return "-";

  return text
    // remove "at 8:00 AM", "at 10:30 PM", etc
    .replace(/\s+at\s+\d{1,2}(:\d{2})?\s*(AM|PM)\b/gi, "")
    // remove standalone times like "8:00 AM"
    .replace(/\b\d{1,2}(:\d{2})?\s*(AM|PM)\b/gi, "")
    // cleanup extra spaces
    .replace(/\s{2,}/g, " ")
    .trim();
}


function renderWeeklyDietTable(plan) {
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

  return `
    <table class="plan-table">
      <thead>
        <tr>
          <th>Day</th>
          <th>Breakfast <br><small>07:00 AM</small></th>
          <th>Juice <br><small>10:00 AM</small></th>
          <th>Lunch <br><small>01:00 PM</small></th>
          <th>Evening Snack <br><small>04:00 PM</small></th>
          <th>Dinner <br><small>08:00 PM</small></th>
        </tr>
      </thead>
      <tbody>
        ${days.map(day => {
          const d = plan[day] || {};
          return `
            <tr>
              <td>${day}</td>
              <td><strong>${removeTimeFromText(d.breakfast)}</strong></td>
              <td>${removeTimeFromText(d.juice)}</td>
              <td><strong>${removeTimeFromText(d.lunch)}</strong></td>
              <td>${removeTimeFromText(d.snack)}</td>
              <td><strong>${removeTimeFromText(d.dinner)}</strong></td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

// ===============================================
// 🏋️ WEEKLY WORKOUT PLAN TABLE
// ===============================================
function renderWeeklyWorkoutTable(plan) {
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

  return `
    <table class="plan-table">
      <thead>
        <tr>
          <th>Day</th>
          <th>Workout</th>
          <th>Duration</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        ${days.map(day => {
          const w = plan[day] || {};
          return `
            <tr>
              <td>${day}</td>
              <td><strong>${w.activity || "-"}</strong></td>
              <td>${w.duration || "-"}</td>
              <td>${w.notes || "-"}</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}



function renderAny(value) {
  if (value === null || value === undefined) return "";

  // String / number
  if (typeof value === "string" || typeof value === "number") {
    return `<p>${value}</p>`;
  }

  // Array
  if (Array.isArray(value)) {
    return `
      <ul>
        ${value.map(v => `<li>${renderAny(v)}</li>`).join("")}
      </ul>
    `;
  }

  // Object
  if (typeof value === "object") {
    return `
      <ul>
        ${Object.entries(value)
          .map(([k, v]) => `<li><b>${k}:</b> ${renderAny(v)}</li>`)
          .join("")}
      </ul>
    `;
  }

  return "";
}


// ===============================================
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 DOM fully loaded");

  // ✅ REGISTER PAGE
  if (window.location.pathname.includes("register")) {
    console.log("🧪 Initializing registration page");
    initRegistration();
  }

  // ✅ EVALUATION PAGE
  if (window.location.pathname.includes("evaluation")) {
    initEvaluationUpload();
  }

  // ✅ PLANS PAGE
  if (window.location.pathname.includes("plans")) {
    initPlansPage();
  }

  // ✅ RESULT PAGE
  if (window.location.pathname.includes("eval_result")) {
    initEvaluationResultPage();
  }
});




function showLoader() {
  const loader = document.getElementById("loader");
  if (loader) loader.classList.remove("hidden");
}

function hideLoader() {
  const loader = document.getElementById("ai-loader");
  if (loader) loader.classList.add("hidden");
}

const USERS_KEY = "fittrack_users_list";
const CURRENT_USER_KEY = "fittrack_current_user";
const EVAL_PAYLOAD_KEY = "fittrack_eval_payload";
const LAST_EVAL_KEY = "fittrack_last_evaluation";
const OWNER_PASSWORD = "JIMMYJAMAI01";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const EVAL_TEXT_KEY = "fittrack_eval_text";
const SELECTED_ISSUES_KEY = "fittrack_selected_issues";

let currentUser = null;

// ================================
// GLOBAL LOADER (SAFE)
// ================================
let loader = null;

function initLoader() {
  loader = document.getElementById("ai-loader");
}

function showLoader() {
  if (loader) loader.classList.remove("hidden");
}

function hideLoader() {
  if (loader) loader.classList.add("hidden");
}


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
      return null;
    }
    currentUser = JSON.parse(raw);
    return currentUser;
  } catch {
    currentUser = null;
    return null;
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
// REGISTRATION PAGE (FIXED & STABLE)
// ===============================================
function initRegistration() {
  const form = document.getElementById("registration-form");
  if (!form) return;

  const statusEl = document.getElementById("register-status");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // ✅ CORRECT IDs (MATCH HTML)
    const name = document.getElementById("fullName")?.value.trim();
    const age = Number(document.getElementById("age")?.value);
    const height = Number(document.getElementById("height")?.value);
    const weight = Number(document.getElementById("weight")?.value);
    const gender = document.getElementById("gender").value.toLowerCase();
    const mobile = document.getElementById("mobile")?.value.trim();

    const email = document.getElementById("email").value.trim();
    if (!email) {
      alert("Email is required");
      return;
    }

    const password = document.getElementById("password")?.value;

    console.log("REGISTER DATA →", {
      name, age, height, weight, gender, mobile, email
    });

    // ✅ VALIDATION
    if (!name || !age || !height || !weight || !gender || !mobile || !password) {
      statusEl.innerText = "Please fill all required fields.";
      return;
    }

    statusEl.innerText = "Registering...";

    // ✅ BACKEND REGISTER
    const result = await backendRegister({
      name,
      age,
      height,
      weight,
      gender,
      mobile,
      email,
      password,
    });

    if (!result.ok) {
      statusEl.innerText = result.message || "Registration failed.";
      return;
    }

    // ✅ SAVE USER LOCALLY (SESSION)
    const user = { name, age, height, weight, gender, mobile, email };
    saveCurrentUser(user);

    statusEl.innerText = "Registration successful! Redirecting...";

    // ✅ REDIRECT (THIS WAS NEVER REACHED BEFORE)
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
// EVALUATION UPLOAD PAGE (FIXED)
// ===============================================
function initEvaluationUpload() {
  const evaluateBtn = document.getElementById("evaluateBtn");
  const reportInput = document.getElementById("health-report");
  const reportNameInput = document.getElementById("report-name");
  const citySelect = document.getElementById("city-select");

  if (!evaluateBtn) return;

  let cooldown = false;

  evaluateBtn.addEventListener("click", async () => {
    if (cooldown) {
      alert("Please wait 1 minute before trying again.");
      return;
    }

    const currentUser = JSON.parse(
      localStorage.getItem("fittrack_current_user")
    );

    if (!currentUser) {
      alert("Session expired. Please register again.");
      window.location.href = "register.html";
      return;
    }

    const file = reportInput?.files?.[0];
    if (!file) {
      alert("Please upload a report file.");
      return;
    }

    const nameOnReport = reportNameInput?.value?.trim().toLowerCase();
    if (!nameOnReport) {
      alert("Please enter the name printed on the report.");
      return;
    }

    if (nameOnReport !== currentUser.name.toLowerCase()) {
      alert("Please upload the registered user's report only.");
      return;
    }

    const userMeta = {
      name: currentUser.name,
      age: currentUser.age,
      height: currentUser.height,
      weight: currentUser.weight,
      gender: currentUser.gender,
      bmi: currentUser.bmi,
      city: citySelect?.value || "",
    };

    const formData = new FormData();
    formData.append("report", file);
    formData.append("userMeta", JSON.stringify(userMeta));

    try {
      cooldown = true;
      evaluateBtn.disabled = true;
      evaluateBtn.innerText = "Evaluating… Please wait";

      const response = await fetch(`${API_BASE}/ai-evaluate-pdf`, {
        method: "POST",
        body: formData,
      });

      if (response.status === 429) {
        throw new Error(
          "AI is busy right now. Please wait 1 minute and try again."
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "AI evaluation failed");
      }

      localStorage.setItem(
        "fittrack_ai_result",
        JSON.stringify({
          user: currentUser,
          evaluation: data.evaluation,
        })
      );

      window.location.href = "eval_result.html";
    } catch (err) {
      alert(err.message);
    } finally {
      setTimeout(() => {
        cooldown = false;
        evaluateBtn.disabled = false;
        evaluateBtn.innerText = "Upload & Evaluate with AI";
      }, 60000); // 🔒 1 minute hard lock
    }
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
// CORE EVALUATION FUNCTION (FIXED & STABLE)
// ===============================================
function runEvaluation(text, genderVal, cityVal, outputDiv, evalTextarea) {
  if (!outputDiv) return;

  const textLower = (text || "").toLowerCase();

  // -----------------------------------------------
  // DETECT CONDITIONS
  // -----------------------------------------------
  const detected = [];
  for (const key in diseaseKeywords) {
    if (diseaseKeywords[key].some((kw) => textLower.includes(kw))) {
      detected.push(key);
    }
  }

  // -----------------------------------------------
  // BMI CALCULATION
  // -----------------------------------------------
  let bmiLine = "BMI: Not available";
  let bmiVal = null;

  if (currentUser?.height && currentUser?.weight) {
    const h = currentUser.height / 100;
    bmiVal = currentUser.weight / (h * h);

    const cat =
      bmiVal < 18.5
        ? "Underweight"
        : bmiVal < 25
        ? "Normal"
        : bmiVal < 30
        ? "Overweight"
        : "Obese";

    bmiLine = `BMI: ${bmiVal.toFixed(1)} (${cat})`;
  }

  // ===============================================
  // CASE 1: NOTHING DETECTED
  // ===============================================
  if (detected.length === 0) {
    outputDiv.innerHTML = `
      <h3>AI Overview of Medical Report</h3>
      <p>
        No strong organ-specific abnormalities were clearly detected from the
        uploaded report based on keyword analysis.
      </p>

      <p><b>${bmiLine}</b></p>

      <p>
        This does NOT mean the report is normal. Some conditions require
        clinical context, numerical values, or physical examination.
      </p>

      <p>
        <b>Recommendation:</b> Please consult your treating doctor for a
        complete and accurate interpretation of your report.
      </p>
    `;

    if (evalTextarea) {
      const txt = `FITTRACK – AI HEALTH REPORT EVALUATION
======================================

Name: ${currentUser?.name || "N/A"}
Gender: ${genderVal || "N/A"}
${bmiLine}

AI SUMMARY:
No strong organ-specific issues were clearly detected from the uploaded report text.

IMPORTANT NOTE:
This AI evaluation is supportive only and cannot replace a qualified doctor's opinion.
Please consult your physician for final diagnosis and treatment decisions.
`;
      evalTextarea.value = txt;
      localStorage.setItem(EVAL_TEXT_KEY, txt);
    }

    localStorage.setItem(LAST_EVAL_KEY, "general");
    return;
  }

  // ===============================================
  // CASE 2: CONDITIONS DETECTED
  // ===============================================
  const detectedUpper = detected.map((d) => d.toUpperCase()).join(", ");
  const overviewText = `Based on your report, the AI suspects possible involvement of: ${detectedUpper}.`;

  // -----------------------------------------------
  // CONDITION DETAILS
  // -----------------------------------------------
  let conditionDetailHtml = "";
  detected.forEach((d) => {
    const expl = conditionExplain[d] || "Details not available.";
    const diag = nextDiagnosis[d] || "Doctor consultation advised.";
    conditionDetailHtml += `
      <h4>${d.toUpperCase()}</h4>
      <p>${expl}</p>
      <p><b>Recommended follow-up:</b> ${diag}</p>
    `;
  });

  // -----------------------------------------------
  // HOSPITAL SUGGESTIONS
  // -----------------------------------------------
  let hospitalHtml = "";
  detected.forEach((d) => {
    const list = hospitals[cityVal]?.[d] || [];
    const lines =
      list.length > 0
        ? list.map((h) => `<li>${h}</li>`).join("")
        : "<li>Consult a nearby specialist or multi-speciality hospital.</li>";

    hospitalHtml += `
      <h4>${d.toUpperCase()}</h4>
      <ul>${lines}</ul>
    `;
  });

  // -----------------------------------------------
  // DIAGNOSIS / TESTS
  // -----------------------------------------------
  let diagnosisHtml = "";
  detected.forEach((d) => {
    const diag =
      nextDiagnosis[d] ||
      "Regular follow-up tests and doctor consultation advised.";
    diagnosisHtml += `<p><b>${d.toUpperCase()}:</b> ${diag}</p>`;
  });

  // -----------------------------------------------
  // MAIN HTML OUTPUT
  // -----------------------------------------------
  outputDiv.innerHTML = `
    <div class="options-nav">
      <button class="secondary-btn option-btn" data-target="overview-section">Overview</button>
      <button class="secondary-btn option-btn" data-target="hospital-section">Hospital View</button>
      <button class="secondary-btn option-btn" data-target="diagnosis-section">Further Tests</button>
    </div>

    <div id="overview-section" class="option-section">
      <h3>AI Overview of Medical Report</h3>
      <p><strong>${overviewText}</strong></p>
      <p><b>${bmiLine}</b></p>
      ${conditionDetailHtml}
    </div>

    <div id="hospital-section" class="option-section hidden">
      <h3>Hospital View</h3>
      ${hospitalHtml}
    </div>

    <div id="diagnosis-section" class="option-section hidden">
      <h3>Medical Diagnosis – Further Tests</h3>
      ${diagnosisHtml}
    </div>
  `;

  // -----------------------------------------------
  // TAB SWITCHING
  // -----------------------------------------------
  const btns = outputDiv.querySelectorAll(".option-btn");
  const sections = outputDiv.querySelectorAll(".option-section");

  btns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      sections.forEach((sec) =>
        sec.id === targetId
          ? sec.classList.remove("hidden")
          : sec.classList.add("hidden")
      );
    });
  });

  // -----------------------------------------------
  // TEXT VERSION FOR DOWNLOAD
  // -----------------------------------------------
  if (evalTextarea) {
    let textExplain = "";
    let textHospitals = "";
    let textDiag = "";

    detected.forEach((d) => {
      textExplain += `\n${d.toUpperCase()}:\n${conditionExplain[d] || ""}\n`;
      textDiag += `\n${d.toUpperCase()}:\n${nextDiagnosis[d] || ""}\n`;

      const list = hospitals[cityVal]?.[d] || [];
      textHospitals += `\n${d.toUpperCase()}:\n${
        list.length ? list.join("\n") : "Consult nearby specialist."
      }\n`;
    });

    const txt = `FITTRACK – AI HEALTH REPORT EVALUATION
======================================

Name: ${currentUser?.name || "N/A"}
Gender: ${genderVal || "N/A"}
${bmiLine}

SUMMARY
-------
${overviewText}

DETAILED EXPLANATION
--------------------
${textExplain}

SUGGESTED HOSPITALS
------------------
${textHospitals}

RECOMMENDED TESTS
-----------------
${textDiag}

NOTE:
This is an AI-generated supportive summary only.
It does NOT replace consultation with a qualified doctor.
`;
    evalTextarea.value = txt;
    localStorage.setItem(EVAL_TEXT_KEY, txt);
  }

  localStorage.setItem(LAST_EVAL_KEY, detected[0]);
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

  let rawAI = localStorage.getItem("fittrack_ai_result");

  if (!rawAI) {
    alert("AI evaluation not found. Please upload and evaluate your report first.");
    window.location.href = "evaluation.html";
    return;
  }

  const anyEvalElement =
    document.getElementById("detailed-report") ||
    document.getElementById("eval-text") ||
    document.getElementById("go-to-health-issues") ||
    document.getElementById("back-to-upload");

  if (!anyEvalElement) {
    console.warn("Evaluation result page elements not fully loaded yet.");
  }
    
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
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      window.location.href = "evaluation.html";
    });
  }

  const goHealthIssuesBtn = document.getElementById("go-to-health-issues");
  const resultUserSummary = document.getElementById(
    "result-user-summary-content"
  );

  loadCurrentUser();

  const backBtnSafe = document.getElementById("back-to-upload");
  if (backBtnSafe) {
    backBtnSafe.onclick = () => {
      window.location.href = "evaluation.html";
    };
  }

  if (loader) loader.classList.add("hidden");


  /* ================= USER SUMMARY ================= */
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

  /* ================= AI RESULT ================= */

  if (!rawAI) {
    detailedReportDiv.innerHTML = `
      <p class="status-text">
        AI evaluation data not found.<br>
        Please upload and evaluate your medical report again.
      </p>
    `;
    return;
  }

  let aiPayload;
  try {
    aiPayload = JSON.parse(rawAI);
  } catch (e) {
    detailedReportDiv.innerHTML = `
      <p class="status-text">
        AI result is corrupted.<br>
        Please re-upload your medical report.
      </p>
    `;
    return;
  }

  const { user, evaluation } = aiPayload || {};

  if (!evaluation || typeof evaluation !== "object") {
    detailedReportDiv.innerHTML = `
      <p class="status-text">
        No AI evaluation found.<br>
        Please upload and evaluate your medical report first.
      </p>
    `;
    return;
  }

  /* ================= RENDER AI CONTENT ================= */
  detailedReportDiv.innerHTML = `
    <h3>AI Overview of Medical Report</h3>
    <p>${evaluation.overview || "Overview not available."}</p>

    <h3>Medical Evaluation</h3>
    <p>${evaluation.evaluation || "Evaluation not available."}</p>

    <h3>Diet & Nutrition Suggestions</h3>
    <p>${evaluation.diet || "Diet suggestions not available."}</p>

    <h3>Suggested Doctors</h3>
    <ul>
      ${
        Array.isArray(evaluation.doctors) && evaluation.doctors.length
          ? evaluation.doctors
              .map(
                (d) => `
                <li>
                  <b>${d.name || "Doctor"}</b><br>
                  ${d.specialization || ""}<br>
                  ${d.hospital || ""}, ${d.location || ""}<br>
                  <i>(${d.type || "hospital"})</i>
                </li>
              `
              )
              .join("")
          : "<li>No doctor suggestions provided by AI.</li>"
      }
    </ul>

    <h3>Further Diagnosis / Tests</h3>
    <ul>
      ${
        Array.isArray(evaluation.furtherDiagnosis) &&
        evaluation.furtherDiagnosis.length
          ? evaluation.furtherDiagnosis.map((x) => `<li>${x}</li>`).join("")
          : "<li>No further tests suggested.</li>"
      }
    </ul>

    ${
      evaluation.limitations
        ? `<p class="small-text"><i>AI Limitation:</i> ${evaluation.limitations}</p>`
        : ""
    }
  `;

  /* ================= BUTTONS ================= */
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
function generateDietWorkoutPlan({ bmi, gender, preference }) {
  let diet = [];
  let workout = [];

  // BMI category
  let bmiType =
    bmi < 18.5 ? "underweight" :
    bmi < 25 ? "normal" :
    bmi < 30 ? "overweight" : "obese";

  // ===== DIET =====
  if (preference === "Vegetarian") {
    diet.push(
      "Breakfast: Vegetable upma / oats with nuts",
      "Lunch: Rice + dal + leafy vegetables",
      "Dinner: Chapati + paneer/tofu curry",
      "Snacks: Fruits, sprouts, nuts"
    );
  }

  if (preference === "Non-vegetarian") {
    diet.push(
      "Breakfast: Eggs / oats",
      "Lunch: Rice + chicken/fish curry",
      "Dinner: Chapati + lean meat",
      "Snacks: Fruits, boiled eggs"
    );
  }

  if (preference === "Vegan") {
    diet.push(
      "Breakfast: Oats with seeds & fruits",
      "Lunch: Rice + lentils + vegetables",
      "Dinner: Chapati + tofu/beans",
      "Snacks: Fruits, nuts, roasted chana"
    );
  }

  // BMI adjustment
  if (bmiType === "underweight") {
    diet.push("Increase calories using healthy fats and proteins.");
  }
  if (bmiType === "overweight" || bmiType === "obese") {
    diet.push("Reduce sugar, fried food, and refined carbs.");
  }

  // ===== WORKOUT =====
  if (gender === "female") {
    workout.push(
      "Brisk walking – 30 minutes",
      "Yoga & stretching – 15 minutes",
      "Lower body strengthening – squats, leg raises"
    );
  } else {
    workout.push(
      "Jogging or cycling – 30 minutes",
      "Strength training – push-ups, planks",
      "Core exercises – 10 minutes"
    );
  }

  if (bmiType === "underweight") {
    workout.push("Focus on strength, avoid excessive cardio.");
  }
  if (bmiType === "obese") {
    workout.push("Low-impact cardio, avoid joint strain.");
  }

  return {
    diet,
    workout,
    bmiType
  };
}

// ===============================================
// INIT PLANS PAGE
// ===============================================

// 🔁 Normalize current user data
let user =
  JSON.parse(localStorage.getItem("fittrack_current_user")) ||
  JSON.parse(localStorage.getItem("fittrack_user")) ||
  null;

// If user exists but BMI missing, calculate it
if (user && user.height && user.weight && !user.bmi) {
  const h = Number(user.height) / 100;
  user.bmi = Number((user.weight / (h * h)).toFixed(1));
  localStorage.setItem("fittrack_current_user", JSON.stringify(user));
}

// Final safety
if (user) {
  localStorage.setItem("fittrack_current_user", JSON.stringify(user));
}

function renderDietTable(dietPlan) {
  const days = [
    "Sunday","Monday","Tuesday",
    "Wednesday","Thursday","Friday","Saturday"
  ];

  return `
    <h3>🥗 AI-Generated Weekly Diet Plan</h3>
    <table class="plan-table">
      <thead>
        <tr>
          <th>Day</th>
          <th>Breakfast</th>
          <th>Juice</th>
          <th>Lunch</th>
          <th>Snack</th>
          <th>Dinner</th>
        </tr>
      </thead>
      <tbody>
        ${days.map(day => `
          <tr>
            <td><b>${day}</b></td>
            <td>${dietPlan[day]?.breakfast || "-"}</td>
            <td>${dietPlan[day]?.juice || "-"}</td>
            <td>${dietPlan[day]?.lunch || "-"}</td>
            <td>${dietPlan[day]?.snack || "-"}</td>
            <td>${dietPlan[day]?.dinner || "-"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}



function renderWeeklyDietTable(dietPlan) {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  return `
    <h3>🥗 AI-Generated Weekly Diet Plan</h3>
    <table class="plan-table">
      <thead>
        <tr>
          <th>Day</th>
          <th>Breakfast<br><small>07:00 AM</small></th>
          <th>Juice<br><small>10:00 AM</small></th>
          <th>Lunch<br><small>01:00 PM</small></th>
          <th>Evening Snack<br><small>04:00 PM</small></th>
          <th>Dinner<br><small>08:00 PM</small></th>
        </tr>
      </thead>
      <tbody>
        ${days
          .map(
            (day) => `
          <tr>
            <td><b>${day}</b></td>
            <td>${dietPlan[day]?.breakfast || "-"}</td>
            <td>${dietPlan[day]?.juice || "-"}</td>
            <td>${dietPlan[day]?.lunch || "-"}</td>
            <td>${dietPlan[day]?.snack || "-"}</td>
            <td>${dietPlan[day]?.dinner || "-"}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderWorkoutTable(workoutPlan) {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
  ];

  return `
    <h3>🏋️ AI-Generated Weekly Workout Plan</h3>
    <table class="plan-table">
      <thead>
        <tr>
          <th>Day</th>
          <th>Warm-up</th>
          <th>Main Workout</th>
          <th>Cool Down</th>
        </tr>
      </thead>
      <tbody>
        ${days.map(day => `
          <tr>
            <td><b>${day}</b></td>
            <td>${workoutPlan[day]?.warmup || "-"}</td>
            <td>${workoutPlan[day]?.mainWorkout || "-"}</td>
            <td>${workoutPlan[day]?.cooldown || "-"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}




function initPlansPage() {
  const page = document.getElementById("plans-page");
  if (!page) return;

  const genderSel = document.getElementById("plans-gender");
  const foodSel = document.getElementById("food-preference");
  const generateBtn = document.getElementById("generate-diet-btn");
  const outputDiv = document.getElementById("diet-plan-output");
  const warning = document.getElementById("plans-warning");

  let isRequestRunning = false;

  // ❌ DO NOT CALL API HERE

  generateBtn.onclick = async () => {
    if (isRequestRunning) return;
    isRequestRunning = true;

    warning.innerText = "";
    outputDiv.innerHTML = "";

    const user = JSON.parse(localStorage.getItem("fittrack_current_user"));

    if (
      !user ||
      user.age == null ||
      user.height == null ||
      user.weight == null ||
      user.bmi == null
    ) {
      warning.innerText =
        "User details missing. Please re-register or complete evaluation.";
      isRequestRunning = false;
      return;
    }

    const payload = {
      age: Number(user.age),
      gender: genderSel.value,
      height: Number(user.height),
      weight: Number(user.weight),
      bmi: Number(user.bmi),
      preference: foodSel.value,
    };

    console.log("📤 Sending payload:", payload);

    try {
      const res = await fetch(`${API_BASE}/ai-diet-workout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      console.log("AI FULL RESPONSE:", data);

      // 🚨 IMPORTANT CHECK
      if (!data.success) {
        document.getElementById("plans-warning").innerText =
          data.message || "AI failed to generate plan. Try again later.";
        return; // ⛔ STOP HERE
      }

      // ✅ ONLY render if AI SUCCESS
      document.getElementById("plans-warning").innerText = "";

      document.getElementById("diet-plan-output").innerHTML =
        renderDietTable(data.dietPlan);

      document.getElementById("workout-plan-output").innerHTML =
        renderWorkoutTable(data.workoutPlan);



      if (!res.ok) {
        warning.innerText = data.message || "AI failed.";
        isRequestRunning = false;
        return;
      }

      // ----------------------------
      // 🔴 REPLACE where you currently do innerText / paragraph rendering
      // ----------------------------
      if (!data.success) {
        warning.innerText = data.message || "AI failed";
        isRequestRunning = false;
        return;
      }

      outputDiv.innerHTML =
        renderWeeklyDietTable(data.dietPlan) +
        "<br><br>" +
        renderWorkoutTable(data.workoutPlan);

    } catch (err) {
      console.error(err);
      warning.innerText = "Server error. Try again later.";
    }

    isRequestRunning = false;
  };
}




// ================================
// STEP 3B: LOAD DIET & WORKOUT PLAN
// ================================
async function loadDietWorkoutPlan() {
  // ✅ USE CORRECT SESSION KEY
  const user = JSON.parse(localStorage.getItem("fittrack_current_user"));

  // ✅ SAFETY CHECK
  if (!user) {
    alert("Session expired. Please login again.");
    window.location.href = "login.html";
    return;
  }

  // ✅ CALCULATE BMI SAFELY
  let bmi = null;
  if (user.height && user.weight) {
    const hM = user.height / 100;
    bmi = +(user.weight / (hM * hM)).toFixed(1);
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

    if (response.ok) {
      // ✅ SAVE LOGIN SESSION (OPTION A)
      localStorage.setItem("fittrack_token", data.token);
      localStorage.setItem("fittrack_current_user", JSON.stringify(data.user));

      // optional: redirect
      window.location.href = "plans.html";
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
  console.log("script.js loaded");

  initLoader(); // ✅ THIS LINE IS IMPORTANT

  if (document.getElementById("health-report")) {
    console.log("evaluation.html detected");
    initEvaluationUpload();
  }

  if (document.getElementById("detailed-report")) {
    console.log("eval_result.html detected");
    initEvaluationResultPage();
  }
});

/* ===========================
   REGISTER PAGE LOGIC
=========================== */
const registerBtn = document.getElementById("registerBtn");
if (registerBtn) {
  registerBtn.addEventListener("click", async (e) => {
    e.preventDefault(); // 
    console.log("Register button clicked");

    // ✅ READ VALUES INSIDE CLICK
    const name = document.getElementById("fullName")?.value.trim();
    const age = document.getElementById("age")?.value;
    const height = document.getElementById("height")?.value;
    const weight = document.getElementById("weight")?.value;
    const gender = document.getElementById("gender")?.value;
    const mobile = document.getElementById("mobile")?.value.trim();
    const email = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value;

    console.log({ name, age, height, weight, gender, mobile, email });

    // ✅ VALIDATION
    if (!name || !age || !height || !weight || !gender || !mobile || !password) {
      alert("Please fill all required fields");
      return;
    }

    try {
      // ✅ SEND TO BACKEND
      const resp = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,        // ✅ FIXED
          age,
          height,
          weight,
          gender,
          mobile,
          email,
          password,
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        alert(data.message || "Registration failed");
        return;
      }

      // ✅ SAVE USER LOCALLY
      const newUser = {
        name,        // ✅ FIXED
        age,
        height,
        weight,
        gender,
        mobile,
        email,
      };

      const users = getStoredArray(USERS_KEY);

      const existingUser = users.find((u) => u.mobile === mobile);

      if (existingUser) {
        localStorage.setItem(
          CURRENT_USER_KEY,
          JSON.stringify(existingUser)
        );
        window.location.href = "evaluation.html";
        return;
      }

      users.push(newUser);
      setStoredArray(USERS_KEY, users);

      localStorage.setItem(
        CURRENT_USER_KEY,
        JSON.stringify(newUser)
      );

      console.log("User registered successfully", newUser);

      // ✅ REDIRECT
      window.location.href = "evaluation.html";

    } catch (err) {
      console.error("Registration error:", err);
      alert("Network error during registration");
    }
  });
}

// keep this as-is
if (window.location.pathname.includes("plans")) {
  loadDietWorkoutPlan();
}

document.addEventListener("DOMContentLoaded", () => {
  initPlansPage();
});
