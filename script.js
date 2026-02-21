// Supabase Configuration
const SUPABASE_URL = 'https://nrijccpjldwvrixtvuxb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yaWpjY3BqbGR3dnJpeHR2dXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1OTczMzAsImV4cCI6MjA4NzE3MzMzMH0.oecvi01DhNvKtugXiDVRdhWAyJS3MP9UevS2Hm-9vBc';

// Initialize Supabase client
let db = null;
try {
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('Supabase connected');
} catch (e) {
    console.log('Supabase error:', e.message);
}

// Global State
let currentUser = null;
let complaints = JSON.parse(localStorage.getItem('complaints')) || [];
let users = JSON.parse(localStorage.getItem('users')) || [];
let admins = [
    { email: 'admin@cs.edu', password: 'admin123', department: 'Computer Science' },
    { email: 'admin@it.edu', password: 'admin123', department: 'IT' },
    { email: 'admin@ee.edu', password: 'admin123', department: 'Electronics' },
    { email: 'admin@me.edu', password: 'admin123', department: 'Mechanical' },
    { email: 'admin@ce.edu', password: 'admin123', department: 'Civil' },
    { email: 'admin@bcom.edu', password: 'admin123', department: 'BCOM' },
    { email: 'admin@bms.edu', password: 'admin123', department: 'BMS' }
];

const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime', 'application/pdf'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'mov', 'pdf'];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const MAX_FILES = 10;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('App initializing...');
    // Normalize any existing localStorage complaints (snake_case -> camelCase)
    const local = JSON.parse(localStorage.getItem('complaints')) || [];
    if (local.length > 0) {
        complaints = local.map(normalizeComplaint);
        localStorage.setItem('complaints', JSON.stringify(complaints));
    }
    initializeApp();
    checkAutoEscalation();
    setInterval(checkAutoEscalation, 60000);
});

async function initializeApp() {
    console.log('Initializing app...');
    localStorage.setItem('admins', JSON.stringify(admins));
    
    // Load data from Supabase
    await loadDataFromSupabase();
    
    // Attach form handlers with null checks
    const loginForm = document.getElementById('studentLoginForm');
    const registerForm = document.getElementById('studentRegisterForm');
    const adminForm = document.getElementById('adminLoginForm');
    const chatbotInput = document.getElementById('chatbotInput');
    
    if (loginForm) loginForm.addEventListener('submit', handleStudentLogin);
    if (registerForm) registerForm.addEventListener('submit', handleStudentRegister);
    if (adminForm) adminForm.addEventListener('submit', handleAdminLogin);
    if (chatbotInput) {
        chatbotInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }
    
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        if (currentUser.type === 'student') showStudentDashboard();
        else if (currentUser.type === 'admin') showAdminDashboard();
    }
    
    setupDragAndDrop();
    console.log('App initialized');
}

async function loadDataFromSupabase() {
    if (!db) return;
    try {
        // Load users
        const { data: usersData } = await db.from('users').select('*');
        if (usersData && usersData.length > 0) users = usersData;
        
        // Load complaints and normalize to camelCase
        const { data: complaintsData } = await db.from('complaints').select('*');
        if (complaintsData && complaintsData.length > 0) {
            complaints = complaintsData.map(normalizeComplaint);
            localStorage.setItem('complaints', JSON.stringify(complaints));
        }
    } catch (error) {
        console.log('Using local data (Supabase error):', error.message);
    }
}

function setupDragAndDrop() {
    setTimeout(() => {
        const uploadArea = document.getElementById('fileUploadArea');
        if (!uploadArea) return;
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const input = document.getElementById('complaintFiles');
                if (input) {
                    const dt = new DataTransfer();
                    Array.from(files).forEach(f => dt.items.add(f));
                    input.files = dt.files;
                    handleFileUpload(input);
                }
            }
        });
    }, 100);
}

// Normalize complaint from Supabase (snake_case) to app format (camelCase)
function normalizeComplaint(c) {
    return {
        ...c,
        studentId: c.studentId ?? c.student_id,
        submittedAt: c.submittedAt ?? c.submitted_at,
        adminResponse: c.adminResponse ?? c.admin_response
    };
}

// Section Navigation
function showSection(sectionId, event) {
    document.querySelectorAll('.main').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    
    const section = document.getElementById(sectionId);
    if (section) section.classList.remove('hidden');
    
    // Set active nav link - use event.target or find by href
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        const activeLink = document.querySelector(`.nav-link[onclick*="'${sectionId}'"]`);
        if (activeLink) activeLink.classList.add('active');
    }
    
    // Close mobile nav
    const nav = document.getElementById('mainNav');
    if (nav) nav.classList.remove('active');
}

function toggleMobileNav() {
    document.getElementById('mainNav').classList.toggle('active');
}

function toggleTheme() {
    document.body.classList.toggle('dark');
}

// Modal Functions
function openModal(type) {
    const modal = document.getElementById(type + 'Modal');
    if (modal) modal.classList.add('active');
}

function closeModal(type) {
    const modal = document.getElementById(type + 'Modal');
    if (modal) modal.classList.remove('active');
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('active');
        }
    });
});

// Auth Handlers
async function handleStudentLogin(e) {
    e.preventDefault();
    const email = document.getElementById('studentEmail').value;
    const password = document.getElementById('studentPassword').value;
    const departmentToComplain = document.getElementById('studentDepartment').value;
    
    // Try Supabase first
    if (db) {
        try {
            const { data, error } = await db
                .from('users')
                .select('*')
                .eq('email', email)
                .eq('password', password)
                .single();
            
            if (data) {
                currentUser = { ...data, type: 'student', departmentToComplain };
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                closeModal('studentLogin');
                showNotification('Login successful!', 'success');
                showStudentDashboard();
                return;
            }
        } catch (err) {
            console.log('Trying local storage');
        }
    }
    
    // Fallback to local
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        currentUser = { ...user, type: 'student', departmentToComplain };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        closeModal('studentLogin');
        showNotification('Login successful!', 'success');
        showStudentDashboard();
    } else {
        showNotification('Invalid credentials!', 'error');
    }
}

async function handleStudentRegister(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const studentId = document.getElementById('regStudentId').value;
    const department = document.getElementById('regDepartment').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    
    if (password !== confirmPassword) {
        showNotification('Passwords do not match!', 'error');
        return;
    }
    
    if (users.find(u => u.email === email)) {
        showNotification('Email already exists!', 'error');
        return;
    }
    
    const newUser = {
        name, email, student_id: studentId, department, password,
        created_at: new Date().toISOString()
    };
    
    // Save to Supabase
    if (db) {
        try {
            const { error } = await db.from('users').insert([newUser]);
            if (!error) {
                showNotification('Registration successful! Please login.', 'success');
                closeModal('studentRegister');
                return;
            }
        } catch (err) {
            console.log('Saving locally instead');
        }
    }
    
    // Fallback to local
    newUser.id = Date.now();
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    closeModal('studentRegister');
    showNotification('Registration successful! Please login.', 'success');
}

function handleAdminLogin(e) {
    e.preventDefault();
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    const department = document.getElementById('adminDepartment').value;
    
    const freshAdmins = JSON.parse(localStorage.getItem('admins')) || admins;
    const admin = freshAdmins.find(a => a.email === email && a.password === password && a.department === department);
    
    if (admin) {
        currentUser = { ...admin, type: 'admin' };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        closeModal('adminLogin');
        showNotification('Admin login successful!', 'success');
        showAdminDashboard();
    } else {
        showNotification('Invalid admin credentials!', 'error');
    }
}

// Dashboard Functions
function showStudentDashboard() {
    // Redirect: hide landing page, show dashboard
    const landingPage = document.getElementById('landingPage');
    const dashboardContainer = document.getElementById('dashboardContainer');
    if (landingPage) landingPage.style.display = 'none';
    if (dashboardContainer) dashboardContainer.style.display = 'block';

    const container = document.getElementById('dashboardContainer');
    const studentId = currentUser.id ?? currentUser.student_id;
    const studentComplaints = complaints.filter(c => (c.studentId ?? c.student_id) === studentId);
    const pending = studentComplaints.filter(c => c.status === 'pending').length;
    const resolved = studentComplaints.filter(c => c.status === 'resolved').length;
    
    container.innerHTML = `
        <div class="dashboard">
            <div class="dashboard-header">
                <div class="dashboard-title">
                    <div class="logo-icon" style="width: 40px; height: 40px; font-size: 1rem;">
                        <i class="fas fa-user-graduate"></i>
                    </div>
                    <h1>Student Dashboard</h1>
                </div>
                <div class="dashboard-user">
                    <span>Welcome, ${currentUser.name}</span>
                    <button class="btn-logout" onclick="logout()">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </button>
                </div>
            </div>
            
            <div class="dashboard-content">
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-card-icon primary"><i class="fas fa-list"></i></div>
                        <div class="stat-value">${studentComplaints.length}</div>
                        <div class="stat-label">Total Complaints</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-icon warning"><i class="fas fa-clock"></i></div>
                        <div class="stat-value">${pending}</div>
                        <div class="stat-label">Pending</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-icon success"><i class="fas fa-check-circle"></i></div>
                        <div class="stat-value">${resolved}</div>
                        <div class="stat-label">Resolved</div>
                    </div>
                </div>
                
                <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
                    <button class="btn btn-primary" onclick="openComplaintModal()">
                        <i class="fas fa-plus"></i> New Complaint
                    </button>
                    <button class="btn btn-white" onclick="refreshComplaints()">
                        <i class="fas fa-refresh"></i> Refresh
                    </button>
                </div>
                
                <div class="complaints-list" id="complaintsList">
                    ${renderStudentComplaints()}
                </div>
            </div>
        </div>
        
        <!-- Complaint Modal -->
        <div class="modal-overlay" id="complaintModal">
            <div class="modal">
                <div class="modal-header">
                    <h2><i class="fas fa-plus-circle"></i> New Complaint</h2>
                    <button class="modal-close" onclick="closeComplaintModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="complaintForm">
                        <div class="form-group">
                            <label class="form-label">Title</label>
                            <input type="text" class="form-input" id="complaintTitle" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Category</label>
                            <select class="form-select" id="complaintCategory" required>
                                <option value="">Select Category</option>
                                <option value="Academic">Academic</option>
                                <option value="Infrastructure">Infrastructure</option>
                                <option value="Faculty">Faculty</option>
                                <option value="Administrative">Administrative</option>
                                <option value="Hostel">Hostel</option>
                                <option value="Library">Library</option>
                                <option value="Canteen">Canteen</option>
                                <option value="Transport">Transport</option>
                                <option value="Fees">Fees</option>
                                <option value="Examination">Examination</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Description</label>
                            <textarea class="form-input" id="complaintDescription" rows="4" required></textarea>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Attach Files (Optional) - Images, Videos, PDF (Max 15MB, 10 files)</label>
                            <div class="file-upload-area" id="fileUploadArea" onclick="document.getElementById('complaintFiles').click()">
                                <i class="fas fa-cloud-upload-alt"></i>
                                <p>Click to upload or drag and drop files here</p>
                                <small>Max 15MB each, 10 files total</small>
                                <input type="file" id="complaintFiles" multiple style="display:none" onchange="handleFileUpload(this)" accept="image/*,video/*,.pdf">
                            </div>
                            <div class="uploaded-files" id="uploadedFiles"></div>
                        </div>
                        <button type="submit" class="btn btn-primary" style="width: 100%;">
                            <i class="fas fa-paper-plane"></i> Submit Complaint
                        </button>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('complaintForm').addEventListener('submit', handleNewComplaint);
}

function showAdminDashboard() {
    // Redirect: hide landing page, show dashboard
    const landingPage = document.getElementById('landingPage');
    const dashboardContainer = document.getElementById('dashboardContainer');
    if (landingPage) landingPage.style.display = 'none';
    if (dashboardContainer) dashboardContainer.style.display = 'block';

    const container = document.getElementById('dashboardContainer');
    const deptComplaints = complaints.filter(c => {
        const sid = c.studentId ?? c.student_id;
        const student = users.find(u => u.id === sid || u.student_id === sid);
        return student && student.department === currentUser.department;
    });
    
    const pending = deptComplaints.filter(c => c.status === 'pending').length;
    const processing = deptComplaints.filter(c => c.status === 'processing').length;
    const escalated = deptComplaints.filter(c => c.status === 'escalated').length;
    
    container.innerHTML = `
        <div class="dashboard">
            <div class="dashboard-header">
                <div class="dashboard-title">
                    <div class="logo-icon" style="width: 40px; height: 40px; font-size: 1rem;">
                        <i class="fas fa-user-shield"></i>
                    </div>
                    <h1>Admin - ${currentUser.department}</h1>
                </div>
                <div class="dashboard-user">
                    <span>Welcome, Admin</span>
                    <button class="btn-logout" onclick="logout()">
                        <i class="fas fa-sign-out-alt"></i> <span class="logout-text">Logout</span>
                    </button>
                </div>
            </div>
            
            <div class="dashboard-content">
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-card-icon primary"><i class="fas fa-list"></i></div>
                        <div class="stat-value">${deptComplaints.length}</div>
                        <div class="stat-label">Total</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-icon warning"><i class="fas fa-clock"></i></div>
                        <div class="stat-value">${pending}</div>
                        <div class="stat-label">Pending</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-icon primary"><i class="fas fa-spinner"></i></div>
                        <div class="stat-value">${processing}</div>
                        <div class="stat-label">Processing</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-icon danger"><i class="fas fa-exclamation-triangle"></i></div>
                        <div class="stat-value">${escalated}</div>
                        <div class="stat-label">Escalated</div>
                    </div>
                </div>
                
                <div class="dashboard-grid">
                    <div class="dashboard-sidebar">
                        <h4 class="sidebar-title">Filters</h4>
                        <div class="form-group">
                            <label class="form-label">Status</label>
                            <select class="form-select" id="statusFilter" onchange="filterComplaints()">
                                <option value="">All</option>
                                <option value="pending">Pending</option>
                                <option value="processing">Processing</option>
                                <option value="resolved">Resolved</option>
                                <option value="escalated">Escalated</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Category</label>
                            <select class="form-select" id="categoryFilter" onchange="filterComplaints()">
                                <option value="">All</option>
                                <option value="Academic">Academic</option>
                                <option value="Infrastructure">Infrastructure</option>
                                <option value="Faculty">Faculty</option>
                                <option value="Administrative">Administrative</option>
                                <option value="Hostel">Hostel</option>
                                <option value="Library">Library</option>
                                <option value="Canteen">Canteen</option>
                                <option value="Transport">Transport</option>
                                <option value="Fees">Fees</option>
                                <option value="Examination">Examination</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <button class="btn btn-white" onclick="refreshAdminComplaints()" style="width: 100%; margin-bottom: 0.5rem;">
                            <i class="fas fa-refresh"></i> Refresh
                        </button>
                        <button class="btn btn-primary" onclick="showReportSection()" style="width: 100%;">
                            <i class="fas fa-chart-bar"></i> Reports
                        </button>
                    </div>
                    
                    <div class="dashboard-main">
                        <h4 class="sidebar-title">Complaints</h4>
                        <div class="complaints-list" id="adminComplaintsList">
                            ${renderAdminComplaints(deptComplaints)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderStudentComplaints() {
    const studentId = currentUser?.id ?? currentUser?.student_id;
    const studentComplaints = complaints.filter(c => (c.studentId ?? c.student_id) === studentId);
    
    if (studentComplaints.length === 0) {
        return '<p style="text-align: center; color: var(--gray); padding: 2rem;">No complaints submitted yet.</p>';
    }
    
    return studentComplaints.map(c => {
        let filesHtml = '';
        if (c.files && c.files.length) {
            filesHtml = '<div class="file-preview-container" style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.75rem;">';
            c.files.forEach(f => {
                const isVideo = f.type && f.type.startsWith('video/');
                const isImage = f.type && f.type.startsWith('image/');
                const isPdf = f.type === 'application/pdf';
                
                if (isImage) {
                    filesHtml += `<div class="file-preview-item" style="width: 80px; height: 80px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border); cursor: pointer;" onclick="viewFile('${f.data}', '${f.type}', '${f.name}')"><img src="${f.data}" alt="${f.name}" style="width: 100%; height: 100%; object-fit: cover;"></div>`;
                } else if (isVideo) {
                    filesHtml += `<div class="file-preview-item" style="width: 80px; height: 80px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border); cursor: pointer;" onclick="viewFile('${f.data}', '${f.type}', '${f.name}')"><video src="${f.data}" style="width: 100%; height: 100%; object-fit: cover;"></div>`;
                } else if (isPdf) {
                    filesHtml += `<div class="file-preview-item" style="width: 80px; height: 80px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; background: #fee2e2; cursor: pointer;" onclick="viewFile('${f.data}', '${f.type}', '${f.name}')"><i class="fas fa-file-pdf" style="font-size: 32px; color: #ef4444;"></i></div>`;
                } else {
                    filesHtml += `<div class="file-preview-item" style="width: 80px; height: 80px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; background: #e0e7ff; cursor: pointer;" onclick="viewFile('${f.data}', '${f.type}', '${f.name}')"><i class="fas fa-file" style="font-size: 32px; color: #6366f1;"></i></div>`;
                }
            });
            filesHtml += '</div>';
        }
        
        return `
            <div class="complaint-item ${c.status}">
                <div class="complaint-header">
                    <span class="complaint-id">#${c.id}</span>
                    <span class="status-badge status-${c.status}">${c.status}</span>
                </div>
                <h4 class="complaint-title">${c.title}</h4>
                <div class="complaint-meta">
                    <span><i class="fas fa-tag"></i> ${c.category}</span>
                    <span><i class="fas fa-calendar"></i> ${new Date(c.submittedAt ?? c.submitted_at).toLocaleDateString()}</span>
                </div>
                <p style="margin-bottom: 0.5rem;">${c.description}</p>
                ${filesHtml}
                ${c.adminResponse ? `
                    <div style="margin-top: 1rem; padding: 1rem; background: white; border-radius: 8px;">
                        <strong>Response:</strong> ${c.adminResponse}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function renderAdminComplaints(complaintsList) {
    if (complaintsList.length === 0) {
        return '<p style="text-align: center; color: var(--gray); padding: 2rem;">No complaints found.</p>';
    }
    
    return complaintsList.map(c => {
        const sid = c.studentId ?? c.student_id;
        const student = users.find(u => u.id === sid || u.student_id === sid);
        let filesHtml = '';
        if (c.files && c.files.length) {
            filesHtml = '<div class="file-preview-container" style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.75rem;">';
            c.files.forEach(f => {
                const isVideo = f.type && f.type.startsWith('video/');
                const isImage = f.type && f.type.startsWith('image/');
                const isPdf = f.type === 'application/pdf';
                
                if (isImage) {
                    filesHtml += `<div class="file-preview-item" style="width: 80px; height: 80px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border); cursor: pointer;" onclick="viewFile('${f.data}', '${f.type}', '${f.name}')"><img src="${f.data}" alt="${f.name}" style="width: 100%; height: 100%; object-fit: cover;" title="${f.name}"></div>`;
                } else if (isVideo) {
                    filesHtml += `<div class="file-preview-item" style="width: 80px; height: 80px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border); cursor: pointer;" onclick="viewFile('${f.data}', '${f.type}', '${f.name}')"><video src="${f.data}" style="width: 100%; height: 100%; object-fit: cover;" title="${f.name}"></video></div>`;
                } else if (isPdf) {
                    filesHtml += `<div class="file-preview-item" style="width: 80px; height: 80px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; background: #fee2e2; cursor: pointer;" onclick="viewFile('${f.data}', '${f.type}', '${f.name}')" title="${f.name}"><i class="fas fa-file-pdf" style="font-size: 32px; color: #ef4444;"></i></div>`;
                } else {
                    filesHtml += `<div class="file-preview-item" style="width: 80px; height: 80px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; background: #e0e7ff; cursor: pointer;" onclick="viewFile('${f.data}', '${f.type}', '${f.name}')" title="${f.name}"><i class="fas fa-file" style="font-size: 32px; color: #6366f1;"></i></div>`;
                }
            });
            filesHtml += '</div>';
        }
        
        return `
            <div class="complaint-item ${c.status}">
                <div class="complaint-header">
                    <span class="complaint-id">#${c.id}</span>
                    <span class="status-badge status-${c.status}">${c.status}</span>
                </div>
                <h4 class="complaint-title">${c.title}</h4>
                <div class="complaint-meta">
                    <span><i class="fas fa-user"></i> ${student?.name || 'Unknown'} (${student?.student_id || student?.studentId || 'N/A'})</span>
                    <span><i class="fas fa-tag"></i> ${c.category}</span>
                    <span><i class="fas fa-calendar"></i> ${new Date(c.submittedAt ?? c.submitted_at).toLocaleDateString()}</span>
                </div>
                <p style="margin-bottom: 0.5rem;">${c.description}</p>
                ${filesHtml}
                <div class="complaint-actions">
                    <select onchange="updateStatus(${c.id}, this.value)">
                        <option value="pending" ${c.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="processing" ${c.status === 'processing' ? 'selected' : ''}>Processing</option>
                        <option value="resolved" ${c.status === 'resolved' ? 'selected' : ''}>Resolved</option>
                        <option value="escalated" ${c.status === 'escalated' ? 'selected' : ''}>Escalated</option>
                    </select>
                    <textarea placeholder="Enter response..." onblur="updateResponse(${c.id}, this.value)">${c.adminResponse || ''}</textarea>
                </div>
            </div>
        `;
    }).join('');
}

// Complaint Actions
function openComplaintModal() {
    document.getElementById('complaintModal').classList.add('active');
    window.uploadedFiles = [];
    document.getElementById('uploadedFiles').innerHTML = '';
    setupDragAndDrop();
}

function closeComplaintModal() {
    const modal = document.getElementById('complaintModal');
    if (modal) modal.classList.remove('active');
    
    const form = document.getElementById('complaintForm');
    if (form) form.reset();
    
    window.uploadedFiles = [];
    const container = document.getElementById('uploadedFiles');
    if (container) container.innerHTML = '';
    
    const uploadArea = document.getElementById('fileUploadArea');
    if (uploadArea) uploadArea.classList.remove('has-files');
}

async function handleNewComplaint(e) {
    e.preventDefault();
    
    const studentId = currentUser?.id ?? currentUser?.student_id;
    if (!studentId) {
        showNotification('Session expired. Please login again.', 'error');
        return;
    }
    
    const newComplaint = {
        studentId,
        title: document.getElementById('complaintTitle').value.trim(),
        category: document.getElementById('complaintCategory').value,
        description: document.getElementById('complaintDescription').value.trim(),
        files: window.uploadedFiles || [],
        status: 'pending',
        submittedAt: new Date().toISOString()
    };
    
    // Save to Supabase (map to snake_case for DB)
    if (db) {
        try {
            const dbRow = {
                student_id: newComplaint.studentId,
                title: newComplaint.title,
                category: newComplaint.category,
                description: newComplaint.description,
                files: newComplaint.files,
                status: newComplaint.status,
                submitted_at: newComplaint.submittedAt
            };
            const { data, error } = await db.from('complaints').insert([dbRow]).select().single();
            if (!error && data) {
                complaints.push(normalizeComplaint(data));
                localStorage.setItem('complaints', JSON.stringify(complaints));
                closeComplaintModal();
                showNotification('Complaint submitted successfully!', 'success');
                showStudentDashboard();
                return;
            }
            if (error) console.warn('Supabase insert error:', error.message);
        } catch (err) {
            console.log('Supabase failed, saving locally:', err.message);
        }
    }
    
    // Fallback to local
    newComplaint.id = Date.now();
    complaints.push(newComplaint);
    localStorage.setItem('complaints', JSON.stringify(complaints));
    
    closeComplaintModal();
    showNotification('Complaint submitted successfully!', 'success');
    showStudentDashboard();
}

function handleFileUpload(input) {
    const files = Array.from(input.files);
    if (files.length === 0) return;
    
    window.uploadedFiles = window.uploadedFiles || [];
    const container = document.getElementById('uploadedFiles');
    const uploadArea = document.getElementById('fileUploadArea');
    
    if (!container) {
        console.error('Upload container not found');
        return;
    }

    if (window.uploadedFiles.length >= MAX_FILES) {
        showNotification(`Maximum ${MAX_FILES} files allowed`, 'error');
        input.value = '';
        return;
    }

    const remainingSlots = MAX_FILES - window.uploadedFiles.length;
    const filesToProcess = files.slice(0, remainingSlots);
    
    if (files.length > remainingSlots) {
        showNotification(`Only ${remainingSlots} more file(s) allowed`, 'error');
    }

    filesToProcess.forEach(file => {
        const ext = file.name.split('.').pop().toLowerCase();
        
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            showNotification(`Invalid file type: ${file.name}`, 'error');
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            showNotification(`File too large: ${file.name}. Max 15MB`, 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const isVideo = file.type.startsWith('video/');
            const isImage = file.type.startsWith('image/');
            const isPdf = file.type === 'application/pdf';
            
            const fileData = {
                name: file.name,
                data: e.target.result,
                type: file.type,
                size: file.size,
                uploadedAt: new Date().toISOString()
            };
            
            window.uploadedFiles.push(fileData);
            
            let previewHtml;
            if (isImage) {
                previewHtml = `<img src="${e.target.result}" alt="${file.name}">`;
            } else if (isVideo) {
                previewHtml = `<video src="${e.target.result}"></video>`;
            } else if (isPdf) {
                previewHtml = `<i class="fas fa-file-pdf" style="font-size: 24px; color: #ef4444;"></i>`;
            } else {
                previewHtml = `<i class="fas fa-file" style="font-size: 24px; color: #6366f1;"></i>`;
            }
            
            const fileName = file.name.length > 20 ? file.name.substring(0, 17) + '...' : file.name;
            const badgeType = isPdf ? 'PDF' : isVideo ? 'VIDEO' : isImage ? 'IMG' : 'FILE';
            
            const fileDiv = document.createElement('div');
            fileDiv.className = 'uploaded-file';
            fileDiv.dataset.file = file.name;
            fileDiv.innerHTML = `
                ${previewHtml}
                <span>${fileName}</span>
                <span class="file-type-badge">${badgeType}</span>
                <span class="remove" data-filename="${file.name}">&times;</span>
            `;
            container.appendChild(fileDiv);
            
            fileDiv.querySelector('.remove').addEventListener('click', function() {
                removeUploadedFile(this, file.name);
            });
            
            if (uploadArea) uploadArea.classList.add('has-files');
            
            showNotification('File uploaded!', 'success');
        };
        
        reader.onerror = () => {
            showNotification(`Error reading: ${file.name}`, 'error');
        };
        
        reader.readAsDataURL(file);
    });
    
    input.value = '';
}

function removeUploadedFile(el, name) {
    window.uploadedFiles = window.uploadedFiles.filter(f => f.name !== name);
    el.parentElement.remove();
}

function updateStatus(id, status) {
    const c = complaints.find(x => x.id === id);
    if (c) {
        c.status = status;
        c.lastUpdated = new Date().toISOString();
        localStorage.setItem('complaints', JSON.stringify(complaints));
        showNotification('Status updated!', 'success');
    }
}

function updateResponse(id, response) {
    const c = complaints.find(x => x.id === id);
    if (c) {
        c.adminResponse = response;
        c.lastUpdated = new Date().toISOString();
        localStorage.setItem('complaints', JSON.stringify(complaints));
    }
}

async function refreshComplaints() {
    if (db) {
        try {
            const { data } = await db.from('complaints').select('*');
            if (data) {
                complaints = data.map(normalizeComplaint);
                localStorage.setItem('complaints', JSON.stringify(complaints));
            }
        } catch (err) {
            complaints = JSON.parse(localStorage.getItem('complaints')) || [];
        }
    } else {
        complaints = JSON.parse(localStorage.getItem('complaints')) || [];
    }
    const list = document.getElementById('complaintsList');
    if (list) list.innerHTML = renderStudentComplaints();
    showNotification('Refreshed!', 'success');
}

async function refreshAdminComplaints() {
    if (db) {
        try {
            const { data } = await db.from('complaints').select('*');
            if (data) {
                complaints = data.map(normalizeComplaint);
                localStorage.setItem('complaints', JSON.stringify(complaints));
            }
        } catch (err) {
            complaints = JSON.parse(localStorage.getItem('complaints')) || [];
        }
    } else {
        complaints = JSON.parse(localStorage.getItem('complaints')) || [];
    }
    filterComplaints();
    showNotification('Refreshed!', 'success');
}

function filterComplaints() {
    const status = document.getElementById('statusFilter')?.value || '';
    const category = document.getElementById('categoryFilter')?.value || '';
    
    let filtered = complaints.filter(c => {
        const sid = c.studentId ?? c.student_id;
        const student = users.find(u => u.id === sid || u.student_id === sid);
        return student && student.department === currentUser.department;
    });
    
    if (status) filtered = filtered.filter(c => c.status === status);
    if (category) filtered = filtered.filter(c => c.category === category);
    
    document.getElementById('adminComplaintsList').innerHTML = renderAdminComplaints(filtered);
}

// Chatbot
function toggleChatbot() {
    document.getElementById('chatbotModal').classList.toggle('active');
}

function sendMessage() {
    const input = document.getElementById('chatbotInput');
    const msg = input.value.trim();
    if (!msg) return;
    
    addChatMessage(msg, 'user');
    input.value = '';
    
    setTimeout(() => {
        addChatMessage(getAIResponse(msg), 'bot');
    }, 800);
}

function addChatMessage(text, sender) {
    const container = document.getElementById('chatbotMessages');
    container.innerHTML += `<div class="chat-msg ${sender}">${text}</div>`;
    container.scrollTop = container.scrollHeight;
}

function getAIResponse(msg) {
    const m = msg.toLowerCase();
    if (m.includes('hello') || m.includes('hi')) return 'Hello! How can I help you?';
    if (m.includes('complaint') || m.includes('submit')) return 'To submit a complaint, login as a student and click "New Complaint" button.';
    if (m.includes('status')) return 'Check your dashboard to see complaint status. Statuses: Pending, Processing, Resolved, Escalated.';
    if (m.includes('thank')) return 'You\'re welcome!';
    return 'I\'m here to help! Ask me about submitting complaints, checking status, or any portal-related questions.';
}

// Auto-escalation
function checkAutoEscalation() {
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    const submittedAt = (c) => c.submittedAt ?? c.submitted_at;
    complaints.forEach(c => {
        const subDate = new Date(submittedAt(c)).getTime();
        if (c.status === 'pending' && !isNaN(subDate) && Date.now() - subDate > threeDays) {
            c.status = 'escalated';
            c.escalatedAt = new Date().toISOString();
        }
    });
    localStorage.setItem('complaints', JSON.stringify(complaints));
}

// Notification
function showNotification(message, type) {
    const el = document.createElement('div');
    el.className = `notification ${type}`;
    el.innerHTML = `<i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info'}-circle"></i> ${message}`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

// View File
function viewFile(dataUrl, type, filename) {
    if (type === 'application/pdf') {
        const win = window.open('', '_blank');
        win.document.write(`<iframe src="${dataUrl}" style="width:100%;height:100%;border:none;"></iframe>`);
    } else if (type.startsWith('image/') || type.startsWith('video/')) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.style.zIndex = '9999';
        modal.onclick = () => modal.remove();
        
        let content;
        if (type.startsWith('image/')) {
            content = `<img src="${dataUrl}" style="max-width: 90%; max-height: 90%; border-radius: 8px;">`;
        } else {
            content = `<video src="${dataUrl}" controls style="max-width: 90%; max-height: 90%; border-radius: 8px;"></video>`;
        }
        
        modal.innerHTML = `<div class="modal" style="max-width: 90%; max-height: 90%; display: flex; align-items: center; justify-content: center;" onclick="event.stopPropagation()">${content}<button class="modal-close" onclick="this.closest('.modal-overlay').remove()" style="position: absolute; top: 10px; right: 10px;">&times;</button></div>`;
        document.body.appendChild(modal);
    } else {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        a.click();
    }
}

// Logout
function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    location.reload();
}

// Global exports
window.showSection = showSection;
window.toggleMobileNav = toggleMobileNav;
window.toggleTheme = toggleTheme;
window.openModal = openModal;
window.closeModal = closeModal;
window.logout = logout;
window.openComplaintModal = openComplaintModal;
window.closeComplaintModal = closeComplaintModal;
window.handleFileUpload = handleFileUpload;
window.removeUploadedFile = removeUploadedFile;
window.updateStatus = updateStatus;
window.updateResponse = updateResponse;
window.refreshComplaints = refreshComplaints;
window.refreshAdminComplaints = refreshAdminComplaints;
window.filterComplaints = filterComplaints;
window.toggleChatbot = toggleChatbot;
window.sendMessage = sendMessage;
window.viewFile = viewFile;

// Report Generation Functions
window.showReportSection = showReportSection;
window.generateReport = generateReport;
window.exportReportCSV = exportReportCSV;
window.exportReportPDF = exportReportPDF;
window.closeReportSection = closeReportSection;

function showReportSection() {
    const container = document.getElementById('dashboardContainer');
    const deptComplaints = complaints.filter(c => {
        const sid = c.studentId ?? c.student_id;
        const student = users.find(u => u.id === sid || u.student_id === sid);
        return student && student.department === currentUser.department;
    });

    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    container.innerHTML = `
        <div class="dashboard">
            <div class="dashboard-header">
                <div class="dashboard-title">
                    <div class="logo-icon" style="width: 40px; height: 40px; font-size: 1rem;">
                        <i class="fas fa-chart-bar"></i>
                    </div>
                    <h1>Reports - ${currentUser.department}</h1>
                </div>
                <div class="dashboard-user">
                    <button class="btn btn-white" onclick="showAdminDashboard()">
                        <i class="fas fa-arrow-left"></i> Back
                    </button>
                    <button class="btn-logout" onclick="logout()">
                        <i class="fas fa-sign-out-alt"></i> <span class="logout-text">Logout</span>
                    </button>
                </div>
            </div>
            
            <div class="dashboard-content">
                <div class="report-section">
                    <h3 style="margin-bottom: 1.5rem;"><i class="fas fa-filter"></i> Report Filters</h3>
                    <div class="report-filters">
                        <div class="form-group">
                            <label class="form-label">Start Date</label>
                            <input type="date" class="form-input" id="reportStartDate" value="${thirtyDaysAgo}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">End Date</label>
                            <input type="date" class="form-input" id="reportEndDate" value="${today}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Status</label>
                            <select class="form-select" id="reportStatus">
                                <option value="">All Statuses</option>
                                <option value="pending">Pending</option>
                                <option value="processing">Processing</option>
                                <option value="resolved">Resolved</option>
                                <option value="escalated">Escalated</option>
                            </select>
                        </div>
                        <div class="form-group" style="display: flex; align-items: flex-end;">
                            <button class="btn btn-primary" onclick="generateReport()" style="width: 100%;">
                                <i class="fas fa-sync-alt"></i> Generate Report
                            </button>
                        </div>
                    </div>
                    
                    <div id="reportResults">
                        <div class="report-summary">
                            <div class="report-stat">
                                <div class="report-stat-value" id="reportTotal">0</div>
                                <div class="report-stat-label">Total Complaints</div>
                            </div>
                            <div class="report-stat">
                                <div class="report-stat-value" id="reportPending" style="color: var(--warning);">0</div>
                                <div class="report-stat-label">Pending</div>
                            </div>
                            <div class="report-stat">
                                <div class="report-stat-value" id="reportProcessing" style="color: var(--primary);">0</div>
                                <div class="report-stat-label">Processing</div>
                            </div>
                            <div class="report-stat">
                                <div class="report-stat-value" id="reportResolved" style="color: var(--success);">0</div>
                                <div class="report-stat-label">Resolved</div>
                            </div>
                            <div class="report-stat">
                                <div class="report-stat-value" id="reportEscalated" style="color: var(--danger);">0</div>
                                <div class="report-stat-label">Escalated</div>
                            </div>
                        </div>
                        
                        <div class="chart-container">
                            <h4 style="margin-bottom: 1rem;">Status Distribution</h4>
                            <div class="chart-bars" id="chartBars">
                                <div class="chart-bar">
                                    <div class="chart-bar-value">0</div>
                                    <div class="chart-bar-fill" style="height: 0%; background: var(--warning);"></div>
                                    <div class="chart-bar-label">Pending</div>
                                </div>
                                <div class="chart-bar">
                                    <div class="chart-bar-value">0</div>
                                    <div class="chart-bar-fill" style="height: 0%; background: var(--primary);"></div>
                                    <div class="chart-bar-label">Processing</div>
                                </div>
                                <div class="chart-bar">
                                    <div class="chart-bar-value">0</div>
                                    <div class="chart-bar-fill" style="height: 0%; background: var(--success);"></div>
                                    <div class="chart-bar-label">Resolved</div>
                                </div>
                                <div class="chart-bar">
                                    <div class="chart-bar-value">0</div>
                                    <div class="chart-bar-fill" style="height: 0%; background: var(--danger);"></div>
                                    <div class="chart-bar-label">Escalated</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="report-actions">
                            <button class="btn btn-primary" onclick="exportReportCSV()">
                                <i class="fas fa-file-csv"></i> Export CSV
                            </button>
                            <button class="btn btn-outline" onclick="exportReportPDF()">
                                <i class="fas fa-file-pdf"></i> Export PDF
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    generateReport();
}

function generateReport() {
    const startDate = new Date(document.getElementById('reportStartDate').value);
    const endDate = new Date(document.getElementById('reportEndDate').value);
    endDate.setHours(23, 59, 59, 999);
    
    const statusFilter = document.getElementById('reportStatus').value;
    
    let filtered = complaints.filter(c => {
        const sid = c.studentId ?? c.student_id;
        const student = users.find(u => u.id === sid || u.student_id === sid);
        if (!student || student.department !== currentUser.department) return false;
        
        const submittedDate = new Date(c.submittedAt ?? c.submitted_at);
        if (submittedDate < startDate || submittedDate > endDate) return false;
        
        if (statusFilter && c.status !== statusFilter) return false;
        
        return true;
    });
    
    const total = filtered.length;
    const pending = filtered.filter(c => c.status === 'pending').length;
    const processing = filtered.filter(c => c.status === 'processing').length;
    const resolved = filtered.filter(c => c.status === 'resolved').length;
    const escalated = filtered.filter(c => c.status === 'escalated').length;
    
    document.getElementById('reportTotal').textContent = total;
    document.getElementById('reportPending').textContent = pending;
    document.getElementById('reportProcessing').textContent = processing;
    document.getElementById('reportResolved').textContent = resolved;
    document.getElementById('reportEscalated').textContent = escalated;
    
    const maxValue = Math.max(total, 1);
    const pendingHeight = (pending / maxValue) * 100;
    const processingHeight = (processing / maxValue) * 100;
    const resolvedHeight = (resolved / maxValue) * 100;
    const escalatedHeight = (escalated / maxValue) * 100;
    
    document.getElementById('chartBars').innerHTML = `
        <div class="chart-bar">
            <div class="chart-bar-value">${pending}</div>
            <div class="chart-bar-fill" style="height: ${pendingHeight}%; background: var(--warning);"></div>
            <div class="chart-bar-label">Pending</div>
        </div>
        <div class="chart-bar">
            <div class="chart-bar-value">${processing}</div>
            <div class="chart-bar-fill" style="height: ${processingHeight}%; background: var(--primary);"></div>
            <div class="chart-bar-label">Processing</div>
        </div>
        <div class="chart-bar">
            <div class="chart-bar-value">${resolved}</div>
            <div class="chart-bar-fill" style="height: ${resolvedHeight}%; background: var(--success);"></div>
            <div class="chart-bar-label">Resolved</div>
        </div>
        <div class="chart-bar">
            <div class="chart-bar-value">${escalated}</div>
            <div class="chart-bar-fill" style="height: ${escalatedHeight}%; background: var(--danger);"></div>
            <div class="chart-bar-label">Escalated</div>
        </div>
    `;
    
    window.currentReportData = {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        statusFilter,
        complaints: filtered,
        totals: { total, pending, processing, resolved, escalated }
    };
}

function exportReportCSV() {
    if (!window.currentReportData) {
        showNotification('Please generate a report first', 'error');
        return;
    }
    
    const { startDate, endDate, totals, complaints } = window.currentReportData;
    
    let csv = 'ID,Title,Category,Status,Student Name,Student ID,Submitted Date,Admin Response\n';
    
    complaints.forEach(c => {
        const student = users.find(u => u.id === c.studentId);
        csv += `${c.id},"${c.title}",${c.category},${c.status},"${student?.name || 'N/A'}","${student?.studentId || 'N/A'}","${new Date(c.submittedAt ?? c.submitted_at).toLocaleDateString()}","${c.adminResponse || 'N/A'}"\n`;
    });
    
    csv += `\nSummary\n`;
    csv += `Total,${totals.total}\n`;
    csv += `Pending,${totals.pending}\n`;
    csv += `Processing,${totals.processing}\n`;
    csv += `Resolved,${totals.resolved}\n`;
    csv += `Escalated,${totals.escalated}\n`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `complaint_report_${startDate}_to_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('CSV exported successfully!', 'success');
}

function exportReportPDF() {
    if (!window.currentReportData) {
        showNotification('Please generate a report first', 'error');
        return;
    }
    
    const { startDate, endDate, totals } = window.currentReportData;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Complaint Report - ${currentUser.department}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #6366f1; }
                h2 { color: #333; margin-top: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background: #6366f1; color: white; }
                .summary { display: flex; gap: 20px; margin: 20px 0; }
                .summary-item { padding: 15px; border-radius: 8px; text-align: center; }
                .summary-item.total { background: #e0e7ff; }
                .summary-item.pending { background: #fef3c7; }
                .summary-item.processing { background: #e0e7ff; }
                .summary-item.resolved { background: #d1fae5; }
                .summary-item.escalated { background: #fee2e2; }
                .summary-value { font-size: 24px; font-weight: bold; }
                .summary-label { font-size: 12px; }
                @media print { body { -webkit-print-color-adjust: exact; } }
            </style>
        </head>
        <body>
            <h1>Complaint Report</h1>
            <p><strong>Department:</strong> ${currentUser.department}</p>
            <p><strong>Period:</strong> ${startDate} to ${endDate}</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            
            <h2>Summary</h2>
            <div class="summary">
                <div class="summary-item total">
                    <div class="summary-value">${totals.total}</div>
                    <div class="summary-label">Total</div>
                </div>
                <div class="summary-item pending">
                    <div class="summary-value">${totals.pending}</div>
                    <div class="summary-label">Pending</div>
                </div>
                <div class="summary-item processing">
                    <div class="summary-value">${totals.processing}</div>
                    <div class="summary-label">Processing</div>
                </div>
                <div class="summary-item resolved">
                    <div class="summary-value">${totals.resolved}</div>
                    <div class="summary-label">Resolved</div>
                </div>
                <div class="summary-item escalated">
                    <div class="summary-value">${totals.escalated}</div>
                    <div class="summary-label">Escalated</div>
                </div>
            </div>
            
            <h2>Complaint Details</h2>
            <table>
                <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Student</th>
                    <th>Date</th>
                </tr>
                ${window.currentReportData.complaints.map(c => {
                    const sid = c.studentId ?? c.student_id;
                    const student = users.find(u => u.id === sid || u.student_id === sid);
                    return `<tr>
                        <td>#${c.id}</td>
                        <td>${c.title}</td>
                        <td>${c.category}</td>
                        <td>${c.status}</td>
                        <td>${student?.name || 'N/A'}</td>
                        <td>${new Date(c.submittedAt ?? c.submitted_at).toLocaleDateString()}</td>
                    </tr>`;
                }).join('')}
            </table>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
    
    showNotification('PDF generated!', 'success');
}

function closeReportSection() {
    showAdminDashboard();
}
