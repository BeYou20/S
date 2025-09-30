// Offer.js - الإصدار النهائي الموحد والأكثر موثوقية

// **ملاحظة: يجب تعريف GOOGLE_SCRIPT_URL و INSTITUTION_WHATSAPP_NUMBER 
// إما في ملف مستقل يتم تحميله قبل هذا الملف، أو تعريفهما هنا مباشرة.**
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbweX983lj4xsTDLo6C64usEcnbFmLST2aQ4v79zjKgIv2v5zGAJERurt_eLXf58dZhtIw/exec'; 
const INSTITUTION_WHATSAPP_NUMBER = '966500000000'; // مثال: رقم الواتساب الخاص بك

document.addEventListener('DOMContentLoaded', () => {
    // 1. تحديد العناصر (Selectors)
    const form = document.getElementById('registrationForm');
    const coursesListContainer = document.getElementById('coursesList');
    const statusDisplay = document.getElementById('selectionStatus');
    const submissionMessage = document.getElementById('submissionMessage');
    const submitButton = document.getElementById('submitButton');
    const countrySelect = document.getElementById('country');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const serverDebugLog = document.getElementById('serverDebugLog'); 

    const MIN_SELECTION = 2; // الحد الأدنى لاختيار الدورات
    let courseCheckboxes; // لتخزين جميع Checkboxes بعد التوليد

    // 2. دوال مساعدة وإدارية
    
    /**
     * 🛑 الدالة الجديدة: لتسجيل رسائل التتبع والأخطاء في عنصر HTML مخصص.
     */
    const logDebugMessage = (message, isError = false) => {
        if (!serverDebugLog) return;
        const timestamp = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        const p = document.createElement('p');
        p.style.margin = '5px 0';
        p.style.color = isError ? '#a00' : '#005a00';
        p.style.borderBottom = isError ? '1px dashed #fcc' : 'none';

        let logMessage = `[${timestamp}] ${message}`;
        
        p.textContent = logMessage;
        serverDebugLog.appendChild(p);

        serverDebugLog.scrollTop = serverDebugLog.scrollHeight;
    };
    

    /**
     * يبني رسالة الواتساب النهائية بعد نجاح الإرسال.
     */
    const buildWhatsappURL = (dataObj, coursesString, coursesCount) => {
        let messageBody = `مرحباً، أرجو تأكيد اشتراكي في عرض VIP. هذه بيانات التسجيل المرسلة عبر النموذج:`;

        for (const [key, value] of Object.entries(dataObj)) {
            messageBody += `\n* ${key}: ${value}`;
        }
        
        messageBody += `\n* الدورات المختارة (${coursesCount}): ${coursesString}`;
        
        const encodedMessage = encodeURIComponent(messageBody);
        
        return `https://wa.me/${INSTITUTION_WHATSAPP_NUMBER}?text=${encodedMessage}`;
    };

    /**
     * يملأ القائمة المنسدلة للبلدان (يفترض وجود مصفوفة arabCountries).
     */
    const populateCountries = () => {
        // يجب أن تكون مصفوفة البلدان العربية (arabCountries) معرفة مسبقاً في ملف آخر أو هنا
        const arabCountries = ["السعودية", "الإمارات", "الكويت", "قطر", "البحرين", "عمان", "الأردن", "لبنان", "مصر", "المغرب", "تونس", "الجزائر", "العراق", "اليمن", "ليبيا", "فلسطين", "سوريا", "السودان", "جيبوتي", "موريتانيا", "الصومال", "جزر القمر"];
        if (typeof arabCountries !== 'undefined' && Array.isArray(arabCountries)) {
            arabCountries.forEach(country => {
                const option = document.createElement('option');
                option.value = country;
                option.textContent = country;
                countrySelect.appendChild(option);
            });
        }
    };

    /**
     * يجلب قائمة الدورات من Google Sheet ويولد عناصر HTML.
     */
    const generateCoursesList = async () => {
        
        // 1. تعريف المتغيرات باستخدام رابط النشر
        const PUBLISHED_SHEET_ID = '2PACX-1vR0xJG_95MQb1Dwqzg0Ath0_5RIyqdEoHJIW35rBnW8qy17roXq7-xqyCPZmGx2n3e1aj4jY1zkbRa-';
        const GID = '1511305260'; 

        const COURSES_API_URL = 
            `https://docs.google.com/spreadsheets/d/e/${PUBLISHED_SHEET_ID}/pub?gid=${GID}&single=true&output=csv`;

        coursesListContainer.innerHTML = '<div class="loading-courses">جاري تحميل الدورات... <i class="fa-solid fa-spinner fa-spin"></i></div>';
        submitButton.disabled = true;
        logDebugMessage('بدء جلب قائمة الدورات VIP...');


        try {
            // 2. الجلب من رابط CSV
            const response = await fetch(COURSES_API_URL); 
            const text = await response.text();
            logDebugMessage(`نجاح جلب البيانات (Status: ${response.status}). عدد الأسطر: ${text.split('\n').length}`);

            // 3. معالجة بيانات CSV
            const rows = text.split('\n');
            if (rows.length < 2) {
                 coursesListContainer.innerHTML = '<p class="error-message status-error">⚠️ لم يتم العثور على بيانات في ورقة "بيانات_الدورات".</p>';
                 logDebugMessage('خطأ: لم يتم العثور على أسطر بيانات كافية.', true);
                 return;
            }

            const headers = rows[0].split(',').map(header => header.trim().replace(/"/g, ''));
            const requiredColumns = ['id', 'title', 'heroDescription', 'is_vip']; 
            
            const missingColumns = requiredColumns.filter(col => !headers.includes(col));
            if (missingColumns.length > 0) {
                 coursesListContainer.innerHTML = `<p class="error-message status-error">❌ خطأ: لم يتم العثور على الأعمدة المطلوبة: <b>${missingColumns.join(', ')}</b>.</p>`;
                 logDebugMessage(`خطأ في الأعمدة: الأعمدة المفقودة: ${missingColumns.join(', ')}`, true);
                 return;
            }

            const coursesMatrix = [];
            for (let i = 1; i < rows.length; i++) {
                const rowValues = rows[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); 
                const course = {};
                let is_vip_match = false;
                
                for (let j = 0; j < headers.length; j++) {
                    const colName = headers[j];
                    let value = rowValues[j] ? rowValues[j].trim().replace(/"/g, '') : '';
                    
                    course[colName] = value;
                    
                    if (colName === 'is_vip' && value === 'Y') {
                        is_vip_match = true;
                    }
                }
                
                if (is_vip_match && course.id && course.title) {
                    coursesMatrix.push(course);
                }
            }
            
            // 6. توليد عناصر الـ Checkboxes
            coursesListContainer.innerHTML = '';
            if (coursesMatrix.length > 0) {
                coursesMatrix.forEach(course => {
                    const label = document.createElement('label');
                    label.classList.add('course-item');
                    label.innerHTML = `
                        <input type="checkbox" name="courses_selected" value="${course.title}" aria-label="${course.title}">
                        <span class="custom-checkbox"></span>
                        <span class="course-title"><i class="fa-solid fa-circle-check"></i> ${course.title}</span>
                        <span class="course-description">${course.heroDescription || ''}</span>
                    `;
                    coursesListContainer.appendChild(label);
                });
                
                // 7. ربط الأحداث وتحديث الحالة
                courseCheckboxes = coursesListContainer.querySelectorAll('input[type="checkbox"]');
                courseCheckboxes.forEach(checkbox => {
                    checkbox.addEventListener('change', handleCourseChange);
                });
                updateSelectionStatus();
                logDebugMessage(`تم تحميل وتوليد ${coursesMatrix.length} دورة VIP بنجاح.`);

            } else {
                 coursesListContainer.innerHTML = '<p class="error-message status-error">⚠️ لم يتم العثور على دورات VIP. (تأكد من وجود قيمة **Y**).</p>';
                 logDebugMessage('تحذير: لم يتم العثور على دورات VIP بعد الفلترة.', true);
            }

        } catch (error) {
            console.error('فشل جلب قائمة الدورات من Google Sheet:', error);
            coursesListContainer.innerHTML = '<p class="error-message status-error">❌ فشل غير متوقع. (حدث خطأ أثناء معالجة البيانات).</p>';
            logDebugMessage(`فشل جلب قائمة الدورات: ${error.message}`, true);
        }
    };
    
    // 3. دوال التحقق المتقدم (Validation) 
    
    const displayFieldError = (inputElement, message) => {
        const errorElement = document.getElementById(inputElement.id + 'Error');
        if (!errorElement) return;
        if (message) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            inputElement.classList.add('input-error');
        } else {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
            inputElement.classList.remove('input-error');
        }
    };
    const validateField = (input) => {
        const value = input.value.trim();
        let message = '';
        if (input.hasAttribute('required') && (value === '' || (input.tagName.toLowerCase() === 'select' && input.value === ''))) {
            message = 'هذا الحقل مطلوب ولا يمكن تركه فارغاً.';
        } else {
            switch (input.id) {
                case 'email':
                    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) message = 'يرجى إدخال بريد إلكتروني صحيح.';
                    break;
                case 'phone':
                    const phoneSanitized = value.replace(/[\s\-\(\)]/g, '');
                    if (phoneSanitized.length > 0 && phoneSanitized.length < 8) message = 'يرجى إدخال رقم هاتف لا يقل عن 8 أرقام.';
                    break;
                case 'age':
                    const age = parseInt(value);
                    if (value && (isNaN(age) || age < 18 || age > 99)) message = 'يجب أن يكون العمر بين 18 و 99.';
                    break;
            }
        }
        displayFieldError(input, message);
        return !message;
    };
    
    const validateForm = () => {
        let isFormValid = true;
        
        form.querySelectorAll('[required]').forEach(input => {
            if (!validateField(input)) isFormValid = false;
        });
        
        if (!updateSelectionStatus(false)) isFormValid = false; 
        
        if (isFormValid) {
            submitButton.classList.add('ready-to-submit');
            submitButton.disabled = false;
        } else {
            submitButton.classList.remove('ready-to-submit');
            submitButton.disabled = true;
        }
        
        return isFormValid;
    };
    
    // 4. دوال التفاعل مع الدورات والحالة
    const handleCourseChange = (e) => {
        e.target.closest('.course-item').classList.toggle('is-selected', e.target.checked);
        updateSelectionStatus();
    };
    
    const updateSelectionStatus = (updateValidation = true) => {
        if (!courseCheckboxes) return false;
        const checkedCount = Array.from(courseCheckboxes).filter(cb => cb.checked).length;
        const coursesErrorElement = document.getElementById('coursesError');
        coursesErrorElement.style.display = 'none';

        if (checkedCount < MIN_SELECTION) {
            statusDisplay.classList.add('status-error');
            statusDisplay.classList.remove('status-success');
            let message = (checkedCount === 0) 
                ? 'يجب اختيار دورتين على الأقل. لم يتم اختيار أي دورة حتى الآن.'
                : `يجب اختيار دورتين على الأقل. اختر ${MIN_SELECTION - checkedCount} دورة إضافية.`;
            statusDisplay.textContent = message;
            coursesErrorElement.textContent = (checkedCount === 0) ? 'الرجاء اختيار دورتين على الأقل.' : `تحتاج لاختيار ${MIN_SELECTION - checkedCount} دورة إضافية.`;
            coursesErrorElement.style.display = 'block';
            
            if (updateValidation) validateForm();
            return false;
        } else {
            statusDisplay.classList.remove('status-error');
            statusDisplay.classList.add('status-success');
            statusDisplay.textContent = `اختيار موفق! تم اختيار ${checkedCount} دورة. أكمل بيانات التسجيل وأرسلها.`;
            
            if (updateValidation) validateForm();
            return true;
        }
    };
    
    // 5. منطق الإرسال الرئيسي (Submission)
    form.addEventListener('submit', async function(e) {
        e.preventDefault(); 
        if (!validateForm()) return; 

        submitButton.textContent = 'جاري إرسال البيانات...';
        submitButton.disabled = true;
        loadingIndicator.style.display = 'flex'; 
        submissionMessage.style.display = 'none';
        
        logDebugMessage('بدء عملية إرسال البيانات إلى Google Script...');

        const formData = new FormData(this);
        const urlParams = new URLSearchParams(formData); 
        const selectedCourseElements = Array.from(courseCheckboxes).filter(cb => cb.checked);
        const coursesString = [];
        
        const allFields = {
            'الاسم الكامل': formData.get('الاسم الكامل'),
            'البريد الإلكتروني': formData.get('البريد الإلكتروني'),
            'رقم الهاتف': formData.get('رقم الهاتف'),
            'العمر': formData.get('العمر'),
            'الجنس': formData.get('الجنس'),
            'البلد': formData.get('البلد'), 
            'ملاحظات إضافية': formData.get('ملاحظات إضافية') || 'لا توجد',
        };
        selectedCourseElements.forEach(checkbox => coursesString.push(checkbox.value));
        const coursesStringJoined = coursesString.join('، '); 

        try {
            // الإرسال لجدول Google Sheet (عبر GOOGLE_SCRIPT_URL)
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                body: urlParams
            });
            
            logDebugMessage(`تم استلام الرد من السيرفر. (Status: ${response.status})`);

            // 1. استخلاص الرد النصي الكامل للتتبع
            const resultText = await response.text();
            console.log("🔎 رد السيرفر:", resultText);
            logDebugMessage(`الرد النصي الكامل: ${resultText}`);

            // 2. محاولة تحليل الـ JSON بأمان
            let result;
            try {
                if (resultText && resultText.trim().startsWith('{')) {
                    result = JSON.parse(resultText);
                } else {
                    logDebugMessage("تحذير: الرد النصي فارغ أو غير بصيغة JSON. نفترض نجاح العملية إذا كان الـ Status 200.", true);
                    if (response.status >= 200 && response.status < 300) {
                        result = { success: true, message: "تم افتراض النجاح بناءً على Status 200." };
                    } else {
                        throw new Error("فشل الإرسال: الرد غير صالح وحالة السيرفر غير ناجحة.");
                    }
                }
            } catch(e) {
                logDebugMessage(`❌ فشل تحليل الرد إلى JSON. الخطأ: ${e.message}. الرد: ${resultText}`, true);
                throw new Error("فشل تحليل الرد من السيرفر. (الرجاء التحقق من نشر Google Script)");
            }
            
            // 3. التحقق من خاصية النجاح (success)
            if (!result.success) {
                logDebugMessage(`❌ فشل إرسال البيانات (Result: false). الرسالة: ${result.message || 'لا توجد رسالة خطأ محددة.'}`, true);
                throw new Error(result.message || "خطأ أثناء إرسال البيانات: عملية Script فشلت");
            }
            
            // ✅ النجاح
            logDebugMessage('✅ نجاح تسجيل البيانات في Google Sheet. جارٍ التوجيه...', false);
            const whatsappURL = buildWhatsappURL(allFields, coursesStringJoined, coursesString.length);

            let countdown = 3;
            const timer = setInterval(() => {
                submissionMessage.textContent = `✅ تم تسجيل بياناتك بنجاح! جارٍ توجيهك خلال ${countdown}...`;
                submissionMessage.style.display = 'block';
                countdown--;
                if (countdown < 0) {
                    clearInterval(timer);
                    window.location.href = whatsappURL;
                }
            }, 1000);

        } catch (error) {
            // 🛑 معالجة الأخطاء النهائية وإظهارها للمستخدم
            submissionMessage.classList.remove('status-success');
            submissionMessage.classList.add('status-error');
            submissionMessage.textContent = '❌ حدث خطأ أثناء إرسال البيانات. الرجاء المحاولة مرة أخرى.';
            submissionMessage.style.display = 'block';
            
            logDebugMessage(`🛑 الخطأ النهائي في الإرسال: ${error.message}`, true);
        } **finally** {
            // 🛑 هذه الكتلة تنفذ دائماً لضمان إخفاء المؤشر واستعادة الزر 🛑
            submitButton.textContent = 'إرسال التسجيل الآن';
            submitButton.disabled = false;
            submitButton.classList.remove('ready-to-submit');
            loadingIndicator.style.display = 'none'; 
        }
    });
    
    
    
    
    
    // 6. تهيئة الصفحة
    form.querySelectorAll('[required]').forEach(input => {
        input.addEventListener('input', validateForm); 
        if (input.tagName.toLowerCase() === 'select') {
            input.addEventListener('change', validateForm);
        }
    });

    populateCountries();
    generateCoursesList(); 
});
