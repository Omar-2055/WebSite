// script.js - نظام العميل والموظف

// ==============================================
// 1. البيانات والتخزين
// ==============================================
// تم حذف بيانات الخدمات الوهمية mockServices
let userLatitude = null;
let userLongitude = null;
let currentUser = null; 
let currentUserRole = null; 

// ==============================================
// 2. وظائف إدارة المستخدمين (تحقق/تسجيل/دخول)
// ==============================================

function saveUser(username, password, role, phone = null, specialty = null) {
    // تخزين المستخدمين مع دورهم (Client أو Employee) ورقم الهاتف والتخصص للموظف
    const users = JSON.parse(localStorage.getItem('users')) || {};
    if (users[username]) {
        return false;
    }
    
    users[username] = { 
        password: password, 
        role: role,
        phone: phone, 
        specialty: specialty
    };
    
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

    // تصحيح رابط الخريطة
    const mapLink = `http://google.com/maps/search/?api=1&query=${userLatitude},${userLongitude}`;
    
    document.getElementById("map-container").innerHTML = `
        <a href="${mapLink}" target="_blank" class="btn btn-primary w-100">
            اضغط هنا لفتح موقعك على الخريطة
        </a>
    `;
}

function showError(error) {
    document.querySelector('.location-status').classList.remove('location-loading');
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

function displayResults(issueType) { 
    const resultsDiv = document.getElementById("results");
    
    // جلب كل الموظفين (مزودي الخدمة) الذين يتطابق تخصصهم
    const users = JSON.parse(localStorage.getItem('users')) || {};
    const employees = Object.keys(users)
        .map(username => ({ username, ...users[username] }))
        .filter(user => user.role === 'employee' && user.specialty === issueType);

    resultsDiv.classList.remove("hidden");
    
    let htmlContent = '';
    
    if (employees.length === 0) {
        // دالة مساعدة لتحويل قيمة العطل إلى نص عربي مفهوم (مكررة للاستخدام هنا)
        const issueMap = {
            'flat-tire': 'إطار مثقوب (بنشر)',
            'dead-battery': 'بطارية فارغة (شحن)',
            'fuel-out': 'نفاد الوقود',
            'engine-fault': 'عطل ميكانيكي (ونش)',
            'other': 'أخرى / غير محدد'
        };
        const issueText = issueMap[issueType] || issueType;

        htmlContent = `<div class="alert alert-warning">⚠️ لا يوجد موظفين متاحين حالياً يختصون بـ **${issueText}**</div>`;
    } else {
        employees.forEach(employee => {
            htmlContent += `
                <div class="service-item card p-3 shadow-sm mb-3">
                    <p class="mb-1"><strong>الموظف المتاح: ${employee.username}</strong></p>
                    <p class="text-muted mb-2">رقم الهاتف:</p>
                    <a href="tel:${employee.phone}" class="btn btn-success btn-sm w-auto">اتصل الآن: ${employee.phone}</a>
                </div>
            `;
        });
    }
    
    resultsDiv.innerHTML = `<h2>📞 الموظفون المتاحون:</h2>${htmlContent}`;
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

    // دالة مساعدة لتحويل قيمة العطل إلى نص عربي مفهوم
    const issueMap = {
        'flat-tire': 'إطار مثقوب (بنشر)',
        'dead-battery': 'بطارية فارغة (شحن)',
        'fuel-out': 'نفاد الوقود',
        'engine-fault': 'عطل ميكانيكي (ونش)',
        'other': 'أخرى / غير محدد'
    };

    let htmlContent = '';
    pendingRequests.forEach(req => {
        const date = new Date(req.timestamp).toLocaleString('ar-EG');
        const mapLink = `http://google.com/maps/search/?api=1&query=${req.latitude},${req.longitude}`;
        const issueText = issueMap[req.issueType] || req.issueType;

        htmlContent += `
            <div class="request-card card p-3 mb-3 shadow-sm">
                <p class="mb-1"><strong>العميل: ${req.client}</strong> - <span class="badge bg-danger">${issueText}</span></p>
                <p class="mb-1">التاريخ: ${date}</p>
                <p class="mb-1">السيارة: ${req.carMake} ${req.carModel}</p>
                <p class="mb-2"><strong>رقم هاتف العميل: ${req.phoneNumber}</strong></p>
                
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

// **منطق إنشاء حساب (مع إظهار حقول الموظف)**
let currentSignupRole = '';
const signupContainer = document.getElementById('signup-container');
const signupPhoneGroup = document.getElementById('signup-phone-group');
const signupSpecialtyGroup = document.getElementById('signup-specialty-group');
const signupPhone = document.getElementById('signup-phone');
const signupSpecialty = document.getElementById('signup-specialty');

function showSignupScreen() {
    document.querySelector('.login-container').classList.add('hidden');
    document.getElementById('signup-container').classList.remove('hidden');
}

function updateSignupFormForRole(role) {
    currentSignupRole = role;
    const isEmployee = role === 'employee';
    document.getElementById('signup-submit-btn').innerText = isEmployee ? 'تسجيل كـ موظف' : 'تسجيل كـ عميل';
    signupContainer.querySelector('h2').innerText = `إنشاء حساب كـ ${isEmployee ? 'موظف' : 'عميل'}`;
    
    if (isEmployee) {
        signupPhoneGroup.classList.remove('hidden');
        signupSpecialtyGroup.classList.remove('hidden');
        signupPhone.required = true;
        signupSpecialty.required = true;
    } else {
        signupPhoneGroup.classList.add('hidden');
        signupSpecialtyGroup.classList.add('hidden');
        signupPhone.required = false;
        signupSpecialty.required = false;
    }
    showSignupScreen();
}

document.getElementById('show-client-signup-btn').addEventListener('click', () => updateSignupFormForRole('client'));
document.getElementById('show-employee-signup-btn').addEventListener('click', () => updateSignupFormForRole('employee'));


document.getElementById('signup-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('signup-username').value;
    const password = document.getElementById('signup-password').value;
    
    let phone = null;
    let specialty = null;

    if (currentSignupRole === 'employee') {
        phone = signupPhone.value;
        specialty = signupSpecialty.value;

        // تحقق من رقم الهاتف للموظف (11 رقماً)
        if (!/^\d{11}$/.test(phone)) {
            alert('❌ الرجاء إدخال رقم هاتف صحيح مكون من 11 رقماً للموظف.');
            return;
        }
    }
    
    if (saveUser(username, password, currentSignupRole, phone, specialty)) {
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
    
    // تحقق من رقم هاتف العميل (11 رقماً)
    if (!/^\d{11}$/.test(phoneNumber)) {
        alert('❌ الرجاء إدخال رقم هاتف صحيح مكون من 11 رقماً للتواصل.');
        document.getElementById("phone").focus();
        return;
    }
    
    // حفظ الطلب الجديد
    saveNewRequest(issueType, phoneNumber, carMake, carModel, userLatitude, userLongitude);
    alert("✅ تم تسجيل طلبك بنجاح! سيتم عرض بيانات الموظفين المتاحين.");
    displayResults(issueType);
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
