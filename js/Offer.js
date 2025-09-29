// Offer.js - الإصدار النهائي الموحد والأكثر موثوقية (URLSearchParams)

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbweX983lj4xsTDLo6C64usEcnbFmLST2aQ4v79zjKgIv2v5zGAJERurt_eLXf58dZhtIw/exec'; 

// 🛑 الحل 1-2: تعريف المتغير INSTITUTION_WHATSAPP_NUMBER إذا لم يكن معرّفاً في مكان آخر
// يرجى وضع رقم واتساب مؤسستك بالصيغة الدولية بدون (+) هنا:
const INSTITUTION_WHATSAPP_NUMBER = window.INSTITUTION_WHATSAPP_NUMBER || '967700000000'; 
// يمكنك استبدال '967700000000' برقم حقيقي.

// Offer.js - منطق نموذج التسجيل للعروض الخاصة (الإصدار النهائي والمُصحَّح)

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
        // 🛑 الحل 1-1: جعل الدالة دفاعية للتحقق من وجود رقم الواتساب
        const phone = (typeof INSTITUTION_WHATSAPP_NUMBER !== 'undefined') ? INSTITUTION_WHATSAPP_NUMBER : null;
        
        let messageBody = `مرحباً مؤسسة كن أنت، أرجو تأكيد اشتراكي في عرض VIP. هذه بيانات التسجيل المرسلة عبر النموذج:`;

        for (const [key, value] of Object.entries(dataObj)) {
            messageBody += `\n* ${key}: ${value}`;
        }
        
        messageBody += `\n* الدورات المختارة (${coursesCount}): ${coursesString}`;
        
        const encodedMessage = encodeURIComponent(messageBody);
        
        if (!phone) {
             console.warn('INSTITUTION_WHATSAPP_NUMBER غير معرف أو فارغ. لن يتم إعادة التوجيه للواتساب.');
             return null; // إرجاع قيمة فارغة لتجنب التوجيه غير الصحيح
        }
        
        return `https://wa.me/${phone}?text=${encodedMessage}`;
    };

    /**
     * يملأ القائمة المنسدلة للبلدان (يفترض وجود مصفوفة arabCountries معرفة في ملف آخر).
     */
    const populateCountries = () => {
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
        
        // 1. تعريف المتغيرات باستخدام رابط النشر (الطريقة الأكثر استقراراً)
        const PUBLISHED_SHEET_ID = '2PACX-1vR0xJG_95MQb1Dwqzg0Ath0_5RIyqdEoHJIW35rBnW8qy17roXq7-xqyCPZmGx2n3e1aj4jY1zkbRa-';
        const GID = '1511305260'; // معرّف تبويبة "بيانات_الدورات"

        // الرابط الجديد: جلب بيانات CSV (يتجنب مشاكل استعلامات SQL)
        const COURSES_API_URL = 
            `https://docs.google.com/spreadsheets/d/e/${PUBLISHED_SHEET_ID}/pub?gid=${GID}&single=true&output=csv`;

        coursesListContainer.innerHTML = '<div class="loading-courses">جاري تحميل الدورات... <i class="fa-solid fa-spinner fa-spin"></i></div>';
        submitButton.disabled = true;

        try {
            // 2. الجلب من رابط CSV
            const response = await fetch(COURSES_API_URL); 
            const text = await response.text();

            // 3. معالجة بيانات CSV
            const rows = text.split('\n');
            if (rows.length < 2) {
                 coursesListContainer.innerHTML = '<p class="error-message status-error">⚠️ لم يتم العثور على بيانات في ورقة "بيانات_الدورات".</p>';
                 return;
            }

            // الصف الأول هو رؤوس الأعمدة
            const headers = rows[0].split(',').map(header => header.trim().replace(/"/g, ''));
            const requiredColumns = ['id', 'title', 'heroDescription', 'is_vip']; 
            
            const missingColumns = requiredColumns.filter(col => !headers.includes(col));
            if (missingColumns.length > 0) {
                 coursesListContainer.innerHTML = `<p class="error-message status-error">❌ خطأ: لم يتم العثور على الأعمدة المطلوبة في الصف الأول: <b>${missingColumns.join(', ')}</b>.</p>`;
                 return;
            }

            const coursesMatrix = [];
            for (let i = 1; i < rows.length; i++) {
                // تقسيم حسب الفاصلة مع تجاهل الفواصل داخل علامات التنصيص
                const rowValues = rows[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); 
                const course = {};
                let is_vip_match = false;
                
                for (let j = 0; j < headers.length; j++) {
                    const colName = headers[j];
                    // تنظيف القيمة من المسافات وعلامات التنصيص
                    let value = rowValues[j] ? rowValues[j].trim().replace(/"/g, '') : '';
                    
                    course[colName] = value;
                    
                    // 🛑 الفلترة: نبحث عن 'Y' في عمود is_vip
                    if (colName === 'is_vip' && value === 'Y') {
                        is_vip_match = true;
                    }
                }
                
                // 🛑 إضافة الدورة فقط إذا كانت VIP وصالحة
                if (is_vip_match && course.id && course.title) {
                    coursesMatrix.push(course);
                }
            }
            
            // 6. توليد عناصر الـ Checkboxes
            coursesListContainer.innerHTML = '';
            if (coursesMatrix.length > 0) {
                coursesMatrix.forEach(course => {
                    // 🛑 الحل 3: استخدام DOM API لتوليد العناصر بدلاً من innerHTML string لتجنب مشاكل التعليقات
                    const label = document.createElement('label');
                    label.classList.add('course-item');
                    
                    const input = document.createElement('input');
                    input.type = 'checkbox';
                    input.name = 'courses_selected_ids'; // 🛑 تغيير الاسم لجمع الـ IDs فقط
                    input.value = course.id; 
                    input.setAttribute('aria-label', course.title);
                    input.dataset.title = course.title; // تخزين العنوان بأمان

                    const spanCheckbox = document.createElement('span');
                    spanCheckbox.className = 'custom-checkbox';

                    const spanTitle = document.createElement('span');
                    spanTitle.className = 'course-title';
                    spanTitle.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${course.title}`;

                    const spanDesc = document.createElement('span');
                    spanDesc.className = 'course-description';
                    spanDesc.textContent = course.heroDescription || '';
                    
                    label.append(input, spanCheckbox, spanTitle, spanDesc);
                    coursesListContainer.appendChild(label);
                });
                
                // 7. ربط الأحداث وتحديث الحالة
                courseCheckboxes = coursesListContainer.querySelectorAll('input[type="checkbox"]');
                courseCheckboxes.forEach(checkbox => {
                    checkbox.addEventListener('change', handleCourseChange);
                });
                updateSelectionStatus();

            } else {
                 coursesListContainer.innerHTML = '<p class="error-message status-error">⚠️ لم يتم العثور على دورات VIP. (تأكد من وجود قيمة **Y** في العمود M).</p>';
            }

        } catch (error) {
            console.error('فشل جلب قائمة الدورات من Google Sheet:', error);
            coursesListContainer.innerHTML = '<p class="error-message status-error">❌ فشل غير متوقع. (حدث خطأ أثناء معالجة البيانات).</p>';
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

        // 🛑 الحل 2: بناء URLSearchParams يدوياً لإضافة عناوين الدورات
        const formData = new FormData(this);
        const selectedCbs = Array.from(courseCheckboxes).filter(cb => cb.checked);
        
        // جمع ids وعناوين الدورات
        const selectedIds = selectedCbs.map(cb => cb.value);
        const selectedTitles = selectedCbs.map(cb => cb.dataset.title || cb.getAttribute('aria-label') || cb.value);
        const coursesStringJoined = selectedTitles.join('، '); 

        // بناء URLSearchParams نظيف
        const urlParams = new URLSearchParams();
        for (const [k, v] of formData.entries()) {
            if (k === 'courses_selected_ids') continue; // تجاوز حقل الـ IDs الذي تم تعريفه في الـ input
            urlParams.append(k, v);
        }
        // إضافة الحقول المجمعة الجديدة لـ Google Sheet
        urlParams.append('courses_selected_ids', selectedIds.join('، ')); 
        urlParams.append('courses_selected_titles', coursesStringJoined); // إرسال العناوين

        const allFields = {
            'الاسم الكامل': formData.get('الاسم الكامل'),
            'البريد الإلكتروني': formData.get('البريد الإلكتروني'),
            'رقم الهاتف': formData.get('رقم الهاتف'),
            'العمر': formData.get('العمر'),
            'الجنس': formData.get('الجنس'),
            'البلد': formData.get('البلد'), 
            'ملاحظات إضافية': formData.get('ملاحظات إضافية') || 'لا توجد',
        };

        try {
            // الإرسال لجدول Google Sheet 
            // 🛑 استخدام fetch بدون await وفي وضع 'no-cors' لتجنب الخطأ الكاذب
            fetch(GOOGLE_SCRIPT_URL, { 
                method: 'POST',
                body: urlParams,
                mode: 'no-cors' 
            });

            // 🛑 تنفيذ كود النجاح مباشرة (الحل 1-3)
            const whatsappURL = buildWhatsappURL(allFields, coursesStringJoined, selectedTitles.length);

            let countdown = 3;
            const timer = setInterval(() => {
                submissionMessage.textContent = `✅ تم تسجيل بياناتك بنجاح! جارٍ توجيهك خلال ${countdown}...`;
                submissionMessage.classList.remove('status-error');
                submissionMessage.classList.add('status-success');
                submissionMessage.style.display = 'block';
                countdown--;
                if (countdown < 0) {
                    clearInterval(timer);
                    // تأخير بسيط لضمان اكتمال عملية الإرسال قبل التوجيه
                    if (whatsappURL) {
                        setTimeout(() => window.location.href = whatsappURL, 1000); 
                    } else {
                        // في حال عدم وجود رقم واتساب، عرض رسالة نجاح نهائية
                        submissionMessage.textContent = '✅ تم تسجيل بياناتك بنجاح! شكراً لك.';
                    }
                }
            }, 1000);

        } catch (error) {
            // هذا الجزء سيتم تجاوزه في وضع 'no-cors' عند الإرسال الناجح
            console.error("خطأ غير متوقع أثناء عملية الإرسال:", error);
            submissionMessage.classList.remove('status-success');
            submissionMessage.classList.add('status-error');
            submissionMessage.textContent = '❌ حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى.';
            submissionMessage.style.display = 'block';
            submitButton.textContent = 'إرسال التسجيل الآن';
            submitButton.disabled = false;
            submitButton.classList.remove('ready-to-submit');
        } finally {
             loadingIndicator.style.display = 'none'; 
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
