// Offer.js - الإصدار النهائي الموحد والأكثر موثوقية (مع نظام التشخيص المدمج)

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbweX983lj4xsTDLo6C64usEcnbFmLST2aQ4v79zjKgIv2v5zGAJERurt_eLXf58dZhtIw/exec'; 
const INSTITUTION_WHATSAPP_NUMBER = '967778185189';

document.addEventListener('DOMContentLoaded', () => {
    // 1. تحديد العناصر (Selectors)
    const form = document.getElementById('registrationForm');
    const coursesListContainer = document.getElementById('coursesList');
    const statusDisplay = document.getElementById('selectionStatus');
    const submissionMessage = document.getElementById('submissionMessage');
    const submitButton = document.getElementById('submitButton');
    const countrySelect = document.getElementById('country');
    const loadingIndicator = document.getElementById('loadingIndicator');

    const MIN_SELECTION = 2; // الحد الأدنى لاختيار الدورات
    let courseCheckboxes; // لتخزين جميع Checkboxes بعد التوليد

    // 2. دوال مساعدة وإدارية
    
    /**
     * يبني رسالة الواتساب النهائية بعد نجاح الإرسال.
     */
    const buildWhatsappURL = (dataObj, coursesString, coursesCount) => {
        let messageBody = `مرحباً مؤسسة كن أنت، أرجو تأكيد اشتراكي في عرض VIP. هذه بيانات التسجيل المرسلة عبر النموذج:`;

        for (const [key, value] of Object.entries(dataObj)) {
            messageBody += `\n* ${key}: ${value}`;
        }
        
        messageBody += `\n* الدورات المختارة (${coursesCount}): ${coursesString}`;
        
        const encodedMessage = encodeURIComponent(messageBody);
        
        return `https://wa.me/${INSTITUTION_WHATSAPP_NUMBER}?text=${encodedMessage}`;
    };

    /**
     * يملأ القائمة المنسدلة للبلدان (يفترض وجود مصفوفة arabCountries معرفة في ملف آخر).
     */
    const populateCountries = () => {
        // تم افتراض تعريف مصفوفة البلدان هنا لضمان عمل الكود بشكل مستقل
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
     * يجلب قائمة الدورات من Google Sheet ويولد عناصر HTML، مع طباعة التشخيصات المتقدمة في Console.
     */
    const generateCoursesList = async () => {
        
        // 1. تعريف المتغيرات باستخدام رابط النشر (الطريقة الأكثر استقراراً)
        const PUBLISHED_SHEET_ID = '2PACX-1vR0xJG_95MQb1Dwqzg0Ath0_5RIyqdEoHJIW35rBnW8qy17roXq7-xqyCPZmGx2n3e1aj4jY1zkbRa-';
        const GID = '1511305260'; // معرّف تبويبة "بيانات_الدورات"

        // الرابط النهائي لجلب بيانات CSV (تم التأكد منه)
        const COURSES_API_URL = 
            `https://docs.google.com/spreadsheets/d/e/${PUBLISHED_SHEET_ID}/pub?gid=${GID}&single=true&output=csv`;

        coursesListContainer.innerHTML = '<div class="loading-courses">جاري تحميل الدورات... <i class="fa-solid fa-spinner fa-spin"></i></div>';
        submitButton.disabled = true;

        try {
            console.groupCollapsed("⚙️ بدء تشخيص الدورات (generateCoursesList)");
            console.log(`1. محاولة الجلب من: ${COURSES_API_URL}`);

            // 2. الجلب من رابط CSV
            const response = await fetch(COURSES_API_URL); 
            
            if (!response.ok) {
                console.error(`❌ فشل التشخيص (الخطوة 2): حالة السيرفر هي ${response.status}. هذا يعني أن الرابط غير متاح للقراءة العامة أو أن الـ ID غير صحيح.`);
                 throw new Error(`حالة الاتصال: ${response.status} (تحقق من إعدادات النشر على الويب)`);
            }
            
            const text = await response.text();
            console.log(`2. نجاح الجلب. عدد الأحرف المستلمة: ${text.length}`);
            
            // 3. معالجة بيانات CSV
            const rows = text.split('\n');
            
            if (rows.length < 2) {
                console.error("❌ فشل التشخيص (الخطوة 3): لم يتم العثور على أسطر بيانات بعد الرؤوس.");
                 coursesListContainer.innerHTML = '<p class="error-message status-error">⚠️ لم يتم العثور على بيانات في ورقة "بيانات_الدورات".</p>';
                 return;
            }

            // الصف الأول هو رؤوس الأعمدة
            const headers = rows[0].split(',').map(header => header.trim().replace(/"/g, ''));
            const requiredColumns = ['id', 'title', 'heroDescription', 'is_vip']; 
            
            console.log("3. الرؤوس المُستخلصة:", headers);
            
            const missingColumns = requiredColumns.filter(col => !headers.includes(col));
            if (missingColumns.length > 0) {
                console.error(`❌ فشل التشخيص (الخطوة 3): الأعمدة المفقودة هي: ${missingColumns.join(', ')}.`);
                 coursesListContainer.innerHTML = `<p class="error-message status-error">❌ خطأ: لم يتم العثور على الأعمدة المطلوبة: <b>${missingColumns.join(', ')}</b>.</p>`;
                 return;
            }
            
            console.log("4. جميع الأعمدة المطلوبة موجودة. بدء فلترة دورات VIP...");

            const coursesMatrix = [];
            let totalCoursesProcessed = 0;
            let vipCoursesFound = 0;

            for (let i = 1; i < rows.length; i++) {
                const rowValues = rows[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); 
                const course = {};
                let is_vip_match = false;
                
                if (rowValues.every(val => !val.trim())) continue; // تجاهل الأسطر الفارغة
                totalCoursesProcessed++;
                
                for (let j = 0; j < headers.length; j++) {
                    const colName = headers[j];
                    let value = rowValues[j] ? rowValues[j].trim().replace(/"/g, '') : '';
                    
                    course[colName] = value;
                    
                    // 🛑 الفلترة المُحسَّنة: نبحث عن 'Y' أو 'y' في عمود is_vip
                    if (colName === 'is_vip' && value.toUpperCase() === 'Y') {
                        is_vip_match = true;
                    }
                }
                
                // 🛑 إضافة الدورة فقط إذا كانت VIP وصالحة
                if (is_vip_match && course.id && course.title) {
                    coursesMatrix.push(course);
                    vipCoursesFound++;
                }
            }
            
            console.log(`5. إنهاء الفلترة. إجمالي الدورات التي تم فحصها: ${totalCoursesProcessed}. دورات VIP المقبولة: ${vipCoursesFound}.`);

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
                console.log("✅ 6. تم عرض الدورات بنجاح.");

            } else {
                console.warn("❌ فشل التشخيص (الخطوة 6): لم يتم العثور على دورات VIP مطابقة لشرط 'Y'.");
                coursesListContainer.innerHTML = '<p class="error-message status-error">⚠️ لم يتم العثور على دورات VIP. (تأكد من وجود قيمة **Y** في عمود is_vip).</p>';
            }

        } catch (error) {
            console.error('❌ خطأ فادح غير متوقع:', error.message);
            coursesListContainer.innerHTML = `<p class="error-message status-error">❌ فشل غير متوقع. (${error.message || 'حدث خطأ أثناء معالجة البيانات.'})</p>`;
        } finally {
            console.groupEnd(); // إنهاء مجموعة التشخيص في Console
            // للتأكد من حالة الزر بعد محاولة جلب الدورات
            if (!courseCheckboxes || courseCheckboxes.length === 0) {
                 submitButton.disabled = true;
            }
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
    
    // 🛑 تحديث: تم تبسيط عملية التحقق وتفعيل الزر
    const validateForm = () => {
        let isFormValid = true;
        // 1. التحقق من الحقول الفردية
        form.querySelectorAll('[required]').forEach(input => {
            if (!validateField(input)) isFormValid = false;
        });
        // 2. التحقق من الدورات
        if (!updateSelectionStatus(false)) isFormValid = false; 
        
        // تفعيل أو تعطيل الزر بناءً على صحة النموذج بالكامل
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
    
    // 🛑 تحديث: تم تبسيط عملية التحقق من حالة الاختيار
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
            
            // نطلب إعادة التحقق من الفورم بعد تغيير الاختيار
            if (updateValidation) validateForm();
            return false;
        } else {
            statusDisplay.classList.remove('status-error');
            statusDisplay.classList.add('status-success');
            statusDisplay.textContent = `اختيار موفق! تم اختيار ${checkedCount} دورة. أكمل بيانات التسجيل وأرسلها.`;
            
            // نطلب إعادة التحقق من الفورم بعد تغيير الاختيار
            if (updateValidation) validateForm();
            return true;
        }
    };
    
    // 5. منطق الإرسال الرئيسي (Submission)
    form.addEventListener('submit', async function(e) {
        e.preventDefault(); 
        // 🛑 نستخدم validateForm للتأكد من حالة الزر قبل الإرسال
        if (!validateForm()) return; 

        submitButton.textContent = 'جاري إرسال البيانات...';
        submitButton.disabled = true;
        loadingIndicator.style.display = 'flex'; // تفعيل المؤشر
        submissionMessage.style.display = 'none';

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
            // 🛑 الإرسال لجدول Google Sheet (عبر GOOGLE_SCRIPT_URL)
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                body: urlParams
            });

            // 🛑 طباعة الرد النصي أولًا
            const resultText = await response.text();
            console.log("🔎 رد السيرفر:", resultText);

            // 🛑 محاولة تحليل الـ JSON بأمان
            let result;
            try {
                // نتحقق من أن الرد يحتوي على JSON فعلاً قبل محاولة التحليل
                if (resultText && resultText.trim().startsWith('{')) {
                    result = JSON.parse(resultText);
                } else {
                    // إذا لم يكن الرد JSON، ولكن حالة السيرفر ناجحة، نفترض النجاح
                    if (response.status >= 200 && response.status < 300) {
                        result = { success: true, message: "تم افتراض النجاح بناءً على Status 200." };
                    } else {
                         throw new Error(`فشل الإرسال: الرد غير صالح وحالة السيرفر هي: ${response.status}`);
                    }
                }
            } catch(e) {
                 throw new Error("فشل تحليل الرد من السيرفر. (الرجاء التحقق من نشر Google Script)");
            }

            // 🛑 التحقق من خاصية النجاح (success) في الرد
            if (!result.success) {
                throw new Error(result.message || "خطأ أثناء إرسال البيانات: عملية Script فشلت");
            }
            
            // ✅ النجاح
            const whatsappURL = buildWhatsappURL(allFields, coursesStringJoined, coursesString.length);

            let countdown = 3;
            const timer = setInterval(() => {
                submissionMessage.textContent = `✅ تم تسجيل بياناتك بنجاح! جارٍ توجيهك خلال ${countdown}...`;
                submissionMessage.classList.add('status-success');
                submissionMessage.classList.remove('status-error');
                submissionMessage.style.display = 'block';
                countdown--;
                if (countdown < 0) {
                    clearInterval(timer);
                    window.location.href = whatsappURL;
                }
            }, 1000);

        } catch (error) {
            // 🛑 معالجة الأخطاء النهائية: إظهار رسالة الفشل فقط
            submissionMessage.classList.remove('status-success');
            submissionMessage.classList.add('status-error');
            submissionMessage.textContent = '❌ حدث خطأ أثناء إرسال البيانات. الرجاء المحاولة مرة أخرى.';
            submissionMessage.style.display = 'block';
            
            // لا نضع هنا أي كود لاستعادة الزر! نعتمد على finally
            console.error('خطأ في الإرسال:', error.message);
        } **finally** {
            // 🛑 🛑 الحل الجذري: كتلة finally مسؤولة عن كل أعمال التنظيف 🛑 🛑
            submitButton.textContent = 'إرسال التسجيل الآن'; // استعادة نص الزر
            submitButton.disabled = false; // تفعيل الزر
            submitButton.classList.remove('ready-to-submit'); 
            loadingIndicator.style.display = 'none'; // إخفاء المؤشر (الأهم)
        }
    });
    
    
    
    
    
    // 6. تهيئة الصفحة
    form.querySelectorAll('[required]').forEach(input => {
        input.addEventListener('input', validateForm); // ربط التغيير في الحقول بالتحقق
        if (input.tagName.toLowerCase() === 'select') {
            input.addEventListener('change', validateForm); // ربط التغيير في القائمة المنسدلة بالتحقق
        }
    });

    populateCountries();
    generateCoursesList(); 
});
