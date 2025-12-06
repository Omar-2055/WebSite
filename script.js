// script.js - نظام العميل والموظف

// ==============================================
// 1. البيانات والتخزين
// ==============================================
const mockServices = [
    { id: 1, name: "مركز الأمل للصيانة", type: "ميكانيكا", phone: "01012345678", specialties: ["engine-fault", "dead-battery"], rating: 4.5 },
    { id: 2, name: "ونش النجمة الساطعة", type: "ونش/سحب", phone: "01198765432", specialties: ["engine-fault", "other"], rating: 4.8 },
]; // بيانات الخدمات (لشاشة العميل)

let userLatitude = null;
let userLongitude = null;
let currentUser = null; 
let currentUserRole = null; // لتخزين دور المستخدم (client أو employee)

// ==============================================
// 2. وظائف إدارة المستخدمين (تحقق/تسجيل/دخول)
// ==============================================

function saveUser(username, password, role) {
    // تخزين المستخدمين مع دورهم (Client أو Employee)
    const users = JSON.parse(localStorage.getItem('users')) || {};
    if (users[username]) {
        return false;
    }
    users[username] = { password: password, role: role };
    localStorage.setItem('users', JSON.stringify(users));
    return true;
}

function checkLogin(username, password, role) {
    const users = JSON.parse(localStorage.getItem('users')) || {};
    const user = users[username];
    return user && user.password === password && user.role === role;
}

function handleLoginSuccess(username, role) {
    currentUser = username;
    currentUserRole = role;
    localStorage.setItem('currentUser', username); 
    localStorage.setItem('currentUserRole', role); 

    if (role === 'employee') {
        document.getElementById('employee-user-name-display').innerText = username;
        showScreen('employee-main-screen');
        loadIncomingRequests(); // تحميل الطلبات للموظف
    } else { // client أو guest
        document.getElementById('client-user-name-display').innerText = username;
        showScreen('client-main-screen');
        getLocation(); // تحديد الموقع للعميل
    }
}

function handleLogout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentUserRole');
    window.location.reload(); 
}

// ==============================================
// 3. التبديل بين الشاشات
// ==============================================

function showScreen(screenId) {
    document.querySelectorAll('.app-screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    document.getElementById(screenId).classList.remove('hidden');
}

// ==============================================
// 4. وظائف الموقع وتطبيق الحركة (للعميل)
// ==============================================

function getLocation() {
    const locationTextElement = document.getElementById("location-text");
    locationTextElement.innerHTML = `جاري تحديد الموقع... <span class="loading-icon">⚙️</span>`; 
    document.querySelector('.location-status').classList.add('location-loading');

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition, showError);
    } else {
        document.querySelector('.location-status').classList.remove('location-loading');
        locationTextElement.innerText = "❌ خطأ: متصفحك لا يدعم تحديد الموقع الجغرافي.";
    }
}

function showPosition(position) {
    document.querySelector('.location-status').classList.remove('location-loading');
    
    userLatitude = position.coords.latitude;
    userLongitude = position.coords.longitude;
    
    const latText = userLatitude.toFixed(4);
    const lonText = userLongitude.toFixed(4);
    
    document.getElementById("location-text").innerHTML = 
        `✅ تم تحديد الموقع بنجاح!<br>خط العرض: **${latText}**، خط الطول: **${lonText}**`;

    const mapLink = `https://www.google.com/maps/search/?api=1&query=${userLatitude},${userLongitude}`;
    
    document.getElementById("map-container").innerHTML = `
        <a href="${mapLink}" target="_blank" class="btn btn-primary w-100">
            اضغط هنا لفتح موقعك على الخريطة
        </a>
    `;
}

function showError(error) {
    document.querySelector('.location-status').classList.remove('location-loading');
    // ... (نفس منطق عرض الخطأ القديم)
    const locationTextElement = document.getElementById("location-text");
    locationTextElement.innerText = "❌ فشل تحديد الموقع، يرجى تفعيل الموقع.";
}

// ==============================================
// 5. منطق طلبات المساعدة (للعميل)
// ==============================================

function saveNewRequest(issueType, phoneNumber, carMake, carModel, lat, lon) {
    const allRequests = JSON.parse(localStorage.getItem('allRequests')) || [];
    
    const newRequest = {
        id: allRequests.length + 1,
        timestamp: new Date().getTime(),
        issueType: issueType,
        phoneNumber: phoneNumber,
        carMake: carMake,
        carModel: carModel,
        client: currentUser || "زائر",
        latitude: lat,
        longitude: lon,
        status: 'Pending' // حالة الطلب
    };

    allRequests.push(newRequest);
    localStorage.setItem('allRequests', JSON.stringify(allRequests));
    return newRequest;
}

function displayResults(issueType, carMake) { 
    const resultsDiv = document.getElementById("results");
    
    document.getElementById("car-image-display").classList.remove('hidden');
    document.getElementById("displayed-car-make").innerText = carMake;
    
    const filteredServices = mockServices
        .filter(service => service.specialties.includes(issueType))
        .sort((a, b) => b.rating - a.rating); 

    resultsDiv.classList.remove("hidden");
    
    // ... (بقية منطق عرض الخدمات كما كان)
    let htmlContent = '';
    filteredServices.forEach(service => {
        htmlContent += `
            <div class="service-item card p-3 shadow-sm">
                <p class="mb-1"><strong>${service.name}</strong> (${service.type})</p>
                <p class="text-muted mb-2">المسافة التقريبية: 3 كم | التقييم: 4.5</p>
                <a href="tel:${service.phone}" class="btn btn-success btn-sm w-auto">اتصل الآن: ${service.phone}</a>
            </div>
        `;
    });
    
    resultsDiv.innerHTML = `<h2>📞 مقدمو الخدمات القريبون (الموصى بهم):</h2>${htmlContent}`;
}

// ==============================================
// 6. منطق لوحة تحكم الموظف (Employee Dashboard)
// ==============================================

function loadIncomingRequests() {
    const container = document.getElementById("incoming-requests-container");
    const allRequests = JSON.parse(localStorage.getItem('allRequests')) || [];

    const pendingRequests = allRequests.filter(req => req.status === 'Pending').reverse();
    
    if (pendingRequests.length === 0) {
        container.innerHTML = `<div class="alert alert-success">✅ لا توجد طلبات جديدة في الوقت الحالي.</div>`;
        return;
    }

    let htmlContent = '';
    pendingRequests.forEach(req => {
        const date = new Date(req.timestamp).toLocaleString('ar-EG');
        const mapLink = `https://www.google.com/maps/search/?api=1&query=${req.latitude},${req.longitude}`;

        htmlContent += `
            <div class="request-card card p-3 mb-3 shadow-sm">
                <p class="mb-1"><strong>العميل: ${req.client}</strong> - <span class="badge bg-danger">${req.issueType}</span></p>
                <p class="mb-1">التاريخ: ${date}</p>
                <p class="mb-1">السيارة: ${req.carMake} ${req.carModel}</p>
                <p class="mb-2"><strong>للتواصل: ${req.phoneNumber}</strong></p>
                
                <a href="${mapLink}" target="_blank" class="btn btn-success btn-sm w-100 mb-2">
                    عرض موقع العميل على الخريطة (اللوكيشن)
                </a>
                <button class="btn btn-secondary btn-sm w-100" onclick="markRequestAsCompleted(${req.id})">
                    تم الانتهاء من الطلب
                </button>
            </div>
        `;
    });
    container.innerHTML = htmlContent;
}

function markRequestAsCompleted(requestId) {
    let allRequests = JSON.parse(localStorage.getItem('allRequests')) || [];
    const requestIndex = allRequests.findIndex(req => req.id === requestId);
    
    if (requestIndex !== -1) {
        allRequests[requestIndex].status = 'Completed';
        localStorage.setItem('allRequests', JSON.stringify(allRequests));
        alert(`تم تحديث حالة الطلب #${requestId} إلى (مكتمل).`);
        loadIncomingRequests(); // تحديث القائمة
    }
}

// ==============================================
// 7. التعامل مع الأحداث (Event Listeners)
// ==============================================

// **الأهم: منطق تسجيل الدخول الموحد**
document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const role = document.getElementById('login-role').value;

    if (checkLogin(username, password, role)) {
        handleLoginSuccess(username, role);
    } else {
        alert('❌ فشل تسجيل الدخول. يرجى التحقق من بياناتك واختيار الدور الصحيح.');
    }
});

// **منطق إنشاء حساب**
let currentSignupRole = '';
document.getElementById('show-client-signup-btn').addEventListener('click', function() {
    currentSignupRole = 'client';
    document.getElementById('signup-submit-btn').innerText = 'تسجيل كـ عميل';
    document.getElementById('signup-container').querySelector('h2').innerText = 'إنشاء حساب كـ عميل';
    showSignupScreen();
});

document.getElementById('show-employee-signup-btn').addEventListener('click', function() {
    currentSignupRole = 'employee';
    document.getElementById('signup-submit-btn').innerText = 'تسجيل كـ موظف';
    document.getElementById('signup-container').querySelector('h2').innerText = 'إنشاء حساب كـ موظف';
    showSignupScreen();
});

function showSignupScreen() {
    document.querySelector('.login-container').classList.add('hidden');
    document.getElementById('signup-container').classList.remove('hidden');
}

document.getElementById('signup-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('signup-username').value;
    const password = document.getElementById('signup-password').value;

    if (saveUser(username, password, currentSignupRole)) {
        alert(`✅ تم إنشاء الحساب كـ ${currentSignupRole === 'client' ? 'عميل' : 'موظف'} بنجاح! يمكنك الآن تسجيل الدخول.`);
        document.getElementById('signup-container').classList.add('hidden');
        document.querySelector('.login-container').classList.remove('hidden');
    } else {
        alert('❌ اسم المستخدم هذا موجود بالفعل. اختر اسماً آخر.');
    }
});

document.getElementById('show-login-btn').addEventListener('click', function() {
    document.getElementById('signup-container').classList.add('hidden');
    document.querySelector('.login-container').classList.remove('hidden');
});

document.getElementById("guest-btn").addEventListener("click", function() {
    handleLoginSuccess("زائر", "client"); // الزائر يعامل كعميل
});


// **أزرار تسجيل الخروج**
document.getElementById('client-logout-btn').addEventListener('click', handleLogout);
document.getElementById('employee-logout-btn').addEventListener('click', handleLogout);

// **إرسال نموذج المساعدة (العميل)**
document.getElementById("assistance-form").addEventListener("submit", function(e) {
    e.preventDefault(); 
    
    const phoneNumber = document.getElementById("phone").value;
    const issueType = document.getElementById("issue").value;
    const carMake = document.getElementById("car-make").value;
    const carModel = document.getElementById("car-model").value;

    if (!userLatitude || !userLongitude) {
        alert("⚠️ لم يتم تحديد الموقع بعد. يرجى الانتظار قليلاً والسماح للمتصفح بذلك.");
        return;
    }
    
    // حفظ الطلب الجديد
    saveNewRequest(issueType, phoneNumber, carMake, carModel, userLatitude, userLongitude);
    alert("✅ تم تسجيل طلبك بنجاح! سيتم إرسال موظف إليك قريباً.");
    displayResults(issueType, carMake);
});


// **أزرار التنقل (العميل)**
document.getElementById("show-client-history-btn").addEventListener("click", function() {
    // loadHistory(); // (يمكن إضافة وظيفة loadHistory لاحقاً)
    showScreen('client-history-screen');
});

document.getElementById("back-to-client-main-btn").addEventListener("click", function() {
    showScreen('client-main-screen');
});

// **زر تحديث الطلبات (الموظف)**
document.getElementById("refresh-requests-btn").addEventListener("click", loadIncomingRequests);

// **التحقق عند تحميل الصفحة**
window.onload = function() {
    const storedUser = localStorage.getItem('currentUser');
    const storedRole = localStorage.getItem('currentUserRole');

    if (storedUser && storedRole) {
        handleLoginSuccess(storedUser, storedRole);
    } else {
        showScreen('auth-screen');
    }
};