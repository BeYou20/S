// Offer.js - اختبار جذري أخير

document.addEventListener('DOMContentLoaded', () => {
    // تحديد العناصر الأساسية
    const coursesListContainer = document.getElementById('coursesList');
    const submitButton = document.getElementById('submitButton');
    const serverDebugLog = document.getElementById('serverDebugLog'); 

    // دالة المساعدة للتسجيل (مُبسطة)
    const appendToDebugLog = (message, isError = false) => {
        if (!serverDebugLog) return;
        const timestamp = new Date().toLocaleTimeString('ar-EG', { hour12: false });
        const color = isError ? 'red' : (message.includes('نجاح') ? 'green' : 'blue');
        serverDebugLog.innerHTML += `<span style="color: grey;">[${timestamp}]</span> <span style="color: ${color};">${message}</span>\n`;
        serverDebugLog.scrollTop = serverDebugLog.scrollHeight;
    };

    // 1. تعريف المتغيرات باستخدام رابط النشر (المُحتمل أن يكون فيه مشكلة)
    const PUBLISHED_SHEET_ID = '2PACX-1vR0xJG_95MQb1Dwqzg0Ath0_5RIyqdEoHJIW35rBnW8qy17roXq7-xqyCPZmGx2n3e1aj4jY1zkbRa-';
    const GID = '1511305260'; 
    const COURSES_API_URL = 
        `https://docs.google.com/spreadsheets/d/e/${PUBLISHED_SHEET_ID}/pub?gid=${GID}&single=true&output=csv`;

    const simpleConnectionTest = async () => {
        if (!coursesListContainer) return;
        coursesListContainer.innerHTML = '<div class="loading-courses">بدء اختبار الاتصال...</div>';
        
        appendToDebugLog("✅ بدء اختبار الاتصال.");
        
        try {
            // 2. محاولة جلب بسيطة (نأمل أن يتم تسجيل الرسالة الأولى)
            appendToDebugLog(`1. محاولة جلب URL: ${COURSES_API_URL.substring(0, 70)}...`);
            
            const response = await fetch(COURSES_API_URL, { mode: 'cors' }); // إضافة mode: 'cors' كإجراء احترازي
            
            if (!response.ok) {
                const errorMessage = `2. فشل الجلب: حالة السيرفر ${response.status}. (URL غير متاح).`;
                appendToDebugLog(errorMessage, true);
                coursesListContainer.innerHTML = `<p style="color: red; font-weight: bold;">❌ خطأ الاتصال: ${response.status}. راجع السجل.</p>`;
                return;
            }
            
            const text = await response.text();
            appendToDebugLog(`3. نجاح الجلب. تم استلام ${text.length} حرف. (يجب أن تظهر الدورات الآن).`);
            
            // إذا نجح الاتصال، سنطبع رسالة نجاح واضحة
            coursesListContainer.innerHTML = '<p style="color: green; font-weight: bold;">✅ نجح اختبار الاتصال الأساسي! المشكلة قد تكون في كود التحليل الآن.</p>';
            
        } catch (error) {
            // هذا الخطأ عادة ما يشير إلى فشل في DNS أو إعدادات CORS/SSL
            const errorMessage = `❌ خطأ فادح في الشبكة/المتصفح. رسالة الخطأ: ${error.message}. (المشكلة غالباً CORS/SSL أو رابط النشر).`;
            appendToDebugLog(errorMessage, true);
            coursesListContainer.innerHTML = `<p style="color: red; font-weight: bold;">❌ فشل الاتصال: راجع السجل (المشكلة غالباً في إعدادات النشر على الويب).</p>`;
        } finally {
            if (submitButton) submitButton.disabled = true;
        }
    };
    
    // تشغيل الاختبار
    simpleConnectionTest();
    
    // دوال النموذج الأخرى (populateCountries, validateForm, etc.) تحتاج إلى تعريف أو إزالتها مؤقتاً
    // بما أننا نستخدم اختباراً جذرياً، لا نحتاج لتعريفها الآن.
});
