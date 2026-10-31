// Browser entry: no build step or extra runtime dependencies required.
function makeFactory() {
  return require => {
    const React = require('react')
    const { useState, useEffect, useRef } = React
    const h = React.createElement
    const ROUTE = '/dsh-capyreporter'
    const STRINGS = {
      en: {
        details: 'Details', collapse: 'Collapse', goToChat: 'Go to chat', dismiss: 'Dismiss', dismissResult: 'Dismiss result',
        muteFor: 'Mute {n} min', minutes: '{n} min', muteDuration: 'Mute duration', unmute: 'Unmute', muteNow: 'Mute now',
        runEnded: 'Run ended', stillRunning: '{n} still running', runningHead: '⏳ {n} running — {title}',
        runningHeadSubs: '⏳ {n} running · {subs} — {title}', subagentOne: '1 subagent', subagents: '{n} subagents', subagentActiveOne: '🤖 1 subagent running', subagentActive: '🤖 {n} subagents running',
        subagentFinished: '✅ Subagent finished',
        subagentFailed: '⚠️ Subagent failed',
        subagentCancelled: '⏹ Subagent cancelled',
        disconnected: '⚠️ Reporter disconnected — retrying', close: 'Close', connecting: 'Connecting…',
        restoreBubble: 'Restore bubble', hidePet: 'Hide pet', showPet: 'Show pet', openSite: 'Open DeepSeek Harness', usePagePet: 'Use page pet instead',
        activityAria: 'CapyReporter activity', logAria: 'Session activity details', controlsAria: 'CapyReporter controls; drag to move', menuAria: 'CapyReporter controls', bubbleSizeAria: 'Resize bubble (pixels)', resetSize: 'Reset bubble size',
        connected: 'Connected · desktop {status}', desktop_off: 'off', desktop_starting: 'starting', desktop_ready: 'ready', desktop_unavailable: 'unavailable',
        floatingRow: 'Floating reporter', floatingHint: 'Tracks live sessions; reports success, cancellation, blocked runs and errors separately.',
        statusBubbleRow: 'Status bubble', statusBubbleHint: 'Assistant milestones only — tool chatter stays in Details. Mute hides the bubble for a while; hiding the pet also unmutes. Drag any bubble edge or corner (or Ctrl + wheel over it) to resize; the corner handle also takes arrow keys.',
        thinkingRow: 'Report thinking', thinkingHint: 'Opt in to show the model’s current thinking (💭) as the live milestone; otherwise only assistant text is shown.',
        showThinking: 'Show thinking', hideThinking: 'Hide thinking',
        desktopRow: 'Always-on-top pet',
        desktopHintOff: '',
        desktopHintReady: 'The always-on-top pet is running. Switch back to the page pet any time.',
        desktopHintStarting: 'Starting the always-on-top pet. Retry if it does not appear.',
        enableDesktop: 'Enable always-on-top pet', usePageOnly: 'Use page pet', retryDesktop: 'Retry always-on-top pet',
        petSizeRow: 'Pet size', petSizeHint: '50–250%. Ctrl + wheel over the page pet also resizes.', petSizeAria: 'Pet size percent',
        petArtRow: 'Pet appearance', petArtHint: 'Transparent PNG · at most 4 MiB · up to 4096 × 4096.', petArtCurrent: 'Current pet appearance',
        replaceImage: 'Replace image…', resetArtwork: 'Reset artwork',
        notifyRow: 'Away notifications', notifyHint: 'Opt in here and grant browser permission. Only alerts when this page is not focused.',
        enableNotifications: 'Enable notifications', disableNotifications: 'Disable notifications',
        keyboardHint: 'Keyboard: Tab to pet controls or Details; Enter/Space activates; Escape closes controls. Hiding is not uninstalling the plugin.',
        choosePng: 'Choose a PNG no larger than 4 MiB (up to 4096 × 4096).', readFailed: 'Could not read image',
        notificationsUnavailable: 'Notifications are unavailable', permissionResult: 'Notification permission: {result}',
        goToChatFailed: 'Could not open that chat',
        languageRow: 'Language', languageHint: 'Language for the bubble, menus and settings; Auto follows the browser.'
      },
      zh: {
        details: '详情', collapse: '收起', goToChat: '前往会话', dismiss: '忽略', dismissResult: '忽略结果',
        muteFor: '静音 {n} 分钟', minutes: '{n} 分钟', muteDuration: '静音时长', unmute: '取消静音', muteNow: '立即静音',
        runEnded: '运行结束', stillRunning: '还有 {n} 个运行中', runningHead: '⏳ {n} 个运行中 — {title}',
        runningHeadSubs: '⏳ {n} 个运行中 · {subs} — {title}', subagentOne: '1 个子代理', subagents: '{n} 个子代理', subagentActiveOne: '🤖 1 个子代理运行中', subagentActive: '🤖 {n} 个子代理运行中',
        subagentFinished: '✅ 子代理已完成',
        subagentFailed: '⚠️ 子代理失败',
        subagentCancelled: '⏹ 子代理已取消',
        disconnected: '⚠️ 报告器已断开 — 正在重试', close: '关闭', connecting: '连接中…',
        restoreBubble: '恢复气泡', hidePet: '隐藏宠物', showPet: '显示宠物', openSite: '打开 DeepSeek Harness', usePagePet: '改用网页宠物',
        activityAria: 'CapyReporter 动态', logAria: '会话动态详情', controlsAria: 'CapyReporter 控制；可拖动移动', menuAria: 'CapyReporter 控制', bubbleSizeAria: '调整气泡尺寸（像素）', resetSize: '重置气泡大小',
        connected: '已连接 · 桌面窗口 {status}', desktop_off: '关闭', desktop_starting: '启动中', desktop_ready: '就绪', desktop_unavailable: '不可用',
        floatingRow: '悬浮宠物', floatingHint: '跟踪实时会话；分别报告成功、取消、阻塞与错误。',
        statusBubbleRow: '状态气泡', statusBubbleHint: '仅显示助手里程碑——工具细节收在“详情”里。静音会暂时隐藏气泡；隐藏宠物也会解除静音。拖动气泡任一边缘或角落（或在其上按 Ctrl 并滚动滚轮）即可调整尺寸；角落手柄也支持方向键。',
        thinkingRow: '汇报思考过程', thinkingHint: '开启后，模型的当前思考（💭）会作为实时里程碑显示；关闭时仅显示助手文本。',
        showThinking: '显示思考', hideThinking: '隐藏思考',
        desktopRow: '宠物跨窗口置顶',
        desktopHintOff: '',
        desktopHintReady: '宠物跨窗口置顶运行正常；可随时切回网页宠物。',
        desktopHintStarting: '正在启动宠物跨窗口置顶；若未出现请重试。',
        enableDesktop: '启用宠物置顶', usePageOnly: '仅用网页宠物', retryDesktop: '重试宠物置顶',
        petSizeRow: '宠物大小', petSizeHint: '50–250%。在网页宠物上按 Ctrl 并滚动滚轮也可缩放。', petSizeAria: '宠物大小百分比',
        petArtRow: '宠物形象', petArtHint: '透明 PNG · 最大 4 MiB · 尺寸不超过 4096 × 4096。', petArtCurrent: '当前宠物形象',
        replaceImage: '更换图片…', resetArtwork: '恢复默认形象',
        notifyRow: '离开提醒', notifyHint: '在此开启并授予浏览器通知权限；仅当页面未聚焦时提醒。',
        enableNotifications: '开启提醒', disableNotifications: '关闭提醒',
        keyboardHint: '键盘：Tab 聚焦宠物控件或“详情”；Enter/空格 激活；Esc 关闭。隐藏宠物并不卸载插件。',
        choosePng: '请选择不超过 4 MiB 的 PNG（最大 4096 × 4096）。', readFailed: '无法读取图片',
        notificationsUnavailable: '当前环境不支持通知', permissionResult: '通知权限结果：{result}',
        goToChatFailed: '无法打开该会话',
        languageRow: '界面语言', languageHint: '气泡、菜单与设置的显示语言；默认跟随浏览器。'
      },
      es: {
        details: 'Detalles', collapse: 'Contraer', goToChat: 'Ir al chat', dismiss: 'Descartar', dismissResult: 'Descartar resultado',
        muteFor: 'Silenciar {n} min', minutes: '{n} min', muteDuration: 'Duración del silencio', unmute: 'Quitar silencio', muteNow: 'Silenciar ahora',
        runEnded: 'Ejecución finalizada', stillRunning: '{n} aún en ejecución', runningHead: '⏳ {n} en ejecución — {title}',
        runningHeadSubs: '⏳ {n} en ejecución · {subs} — {title}', subagentOne: '1 subagente', subagents: '{n} subagentes', subagentActiveOne: '🤖 1 subagente en ejecución', subagentActive: '🤖 {n} subagentes en ejecución',
        subagentFinished: '✅ Subagente finalizado',
        subagentFailed: '⚠️ Subagente falló',
        subagentCancelled: '⏹ Subagente cancelado',
        disconnected: '⚠️ Reportero desconectado — reintentando', close: 'Cerrar', connecting: 'Conectando…',
        restoreBubble: 'Restaurar burbuja', hidePet: 'Ocultar mascota', showPet: 'Mostrar mascota', openSite: 'Abrir DeepSeek Harness', usePagePet: 'Usar mascota de la página',
        activityAria: 'Actividad de CapyReporter', logAria: 'Detalles de actividad de la sesión', controlsAria: 'Controles de CapyReporter; arrastra para mover', menuAria: 'Controles de CapyReporter', bubbleSizeAria: 'Cambiar tamaño de la burbuja (píxeles)', resetSize: 'Restablecer tamaño',
        connected: 'Conectado · escritorio {status}', desktop_off: 'desactivado', desktop_starting: 'iniciando', desktop_ready: 'listo', desktop_unavailable: 'no disponible',
        floatingRow: 'Reportero flotante', floatingHint: 'Sigue sesiones en vivo; informa éxito, cancelación, bloqueo y errores por separado.',
        statusBubbleRow: 'Burbuja de estado', statusBubbleHint: 'Solo hitos del asistente: los detalles de herramientas quedan en Detalles. Silenciar oculta la burbuja un tiempo; ocultar la mascota también reactiva. Arrastra cualquier borde o esquina (o Ctrl + rueda) para cambiar el tamaño; la esquina también acepta flechas.',
        thinkingRow: 'Informar razonamiento', thinkingHint: 'Actívalo para mostrar el razonamiento actual del modelo (💭) como hito; si no, solo se muestra el texto del asistente.',
        showThinking: 'Mostrar razonamiento', hideThinking: 'Ocultar razonamiento',
        desktopRow: 'Mascota siempre al frente',
        desktopHintOff: '',
        desktopHintReady: 'La mascota siempre al frente está activa. Puedes volver a la mascota de la página cuando quieras.',
        desktopHintStarting: 'Iniciando la mascota siempre al frente. Reintenta si no aparece.',
        enableDesktop: 'Activar mascota siempre al frente', usePageOnly: 'Solo mascota de la página', retryDesktop: 'Reintentar mascota al frente',
        petSizeRow: 'Tamaño de la mascota', petSizeHint: '50–250 %. Ctrl + rueda sobre la mascota también cambia el tamaño.', petSizeAria: 'Porcentaje del tamaño de la mascota',
        petArtRow: 'Aspecto de la mascota', petArtHint: 'PNG transparente · máx. 4 MiB · hasta 4096 × 4096.', petArtCurrent: 'Aspecto actual de la mascota',
        replaceImage: 'Reemplazar imagen…', resetArtwork: 'Restablecer imagen',
        notifyRow: 'Notificaciones de ausencia', notifyHint: 'Actívalas aquí y concede permiso al navegador. Solo avisa cuando esta página no está enfocada.',
        enableNotifications: 'Activar notificaciones', disableNotifications: 'Desactivar notificaciones',
        keyboardHint: 'Teclado: Tab a los controles o Detalles; Enter/Espacio activa; Escape cierra. Ocultar no desinstala el plugin.',
        choosePng: 'Elige un PNG de 4 MiB como máximo (hasta 4096 × 4096).', readFailed: 'No se pudo leer la imagen',
        notificationsUnavailable: 'Las notificaciones no están disponibles', permissionResult: 'Permiso de notificaciones: {result}',
        goToChatFailed: 'No se pudo abrir ese chat',
        languageRow: 'Idioma', languageHint: 'Idioma de la burbuja, los menús y los ajustes; por defecto sigue al navegador.'
      },
      hi: {
        details: 'विवरण', collapse: 'छोटा करें', goToChat: 'चैट खोलें', dismiss: 'छिपाएँ', dismissResult: 'परिणाम छिपाएँ',
        muteFor: '{n} मिनट म्यूट करें', minutes: '{n} मिनट', muteDuration: 'म्यूट अवधि', unmute: 'म्यूट हटाएँ', muteNow: 'अभी म्यूट करें',
        runEnded: 'रन पूरा हुआ', stillRunning: '{n} अभी चल रहे हैं', runningHead: '⏳ {n} चल रहे हैं — {title}',
        runningHeadSubs: '⏳ {n} चल रहे हैं · {subs} — {title}', subagentOne: '1 सबएजेंट', subagents: '{n} सबएजेंट', subagentActiveOne: '🤖 1 सबएजेंट चल रहा है', subagentActive: '🤖 {n} सबएजेंट चल रहे हैं',
        subagentFinished: '✅ सबएजेंट पूर्ण',
        subagentFailed: '⚠️ सबएजेंट विफल',
        subagentCancelled: '⏹ सबएजेंट रद्द',
        disconnected: '⚠️ रिपोर्टर डिस्कनेक्ट — पुनः प्रयास', close: 'बंद करें', connecting: 'कनेक्ट हो रहा है…',
        restoreBubble: 'बबल बहाल करें', hidePet: 'पेट छिपाएँ', showPet: 'पेट दिखाएँ', openSite: 'DeepSeek Harness खोलें', usePagePet: 'पेज पेट इस्तेमाल करें',
        activityAria: 'CapyReporter गतिविधि', logAria: 'सत्र गतिविधि विवरण', controlsAria: 'CapyReporter नियंत्रण; खींचकर ले जाएँ', menuAria: 'CapyReporter नियंत्रण', bubbleSizeAria: 'बबल का आकार बदलें (पिक्सेल)', resetSize: 'आकार रीसेट करें',
        connected: 'कनेक्टेड · डेस्कटॉप {status}', desktop_off: 'बंद', desktop_starting: 'शुरू हो रहा है', desktop_ready: 'तैयार', desktop_unavailable: 'अनुपलब्ध',
        floatingRow: 'फ़्लोटिंग रिपोर्टर', floatingHint: 'लाइव सत्र ट्रैक करता है; सफलता, रद्दीकरण, अवरोध और त्रुटियाँ अलग बताता है।',
        statusBubbleRow: 'स्टेटस बबल', statusBubbleHint: 'केवल असिस्टेंट माइलस्टोन — टूल विवरण विवरण में रहता है। म्यूट बबल कुछ देर छिपाता है; पेट छिपाने से भी अनम्यूट होता है। किनारे या कोना खींचें (या Ctrl + व्हील); कोना तीर कुंजियाँ भी लेता है।',
        thinkingRow: 'सोच रिपोर्ट करें', thinkingHint: 'मॉडल की मौजूदा सोच (💭) को लाइव माइलस्टोन के रूप में दिखाने के लिए चालू करें; बंद होने पर केवल असिस्टेंट टेक्स्ट दिखता है।',
        showThinking: 'सोच दिखाएँ', hideThinking: 'सोच छिपाएँ',
        desktopRow: 'हमेशा शीर्ष पर पेट',
        desktopHintOff: '',
        desktopHintReady: 'हमेशा शीर्ष पर पेट चल रहा है। कभी भी पेज पेट पर लौटें।',
        desktopHintStarting: 'हमेशा शीर्ष पर पेट शुरू हो रहा है। न दिखे तो पुनः प्रयास करें।',
        enableDesktop: 'पेट को शीर्ष पर रखें', usePageOnly: 'केवल पेज पेट', retryDesktop: 'पेट को शीर्ष पर रखना पुनः प्रयास',
        petSizeRow: 'पेट आकार', petSizeHint: '50–250%। पेज पेट पर Ctrl + व्हील से भी आकार बदलता है।', petSizeAria: 'पेट आकार प्रतिशत',
        petArtRow: 'पेट रूप', petArtHint: 'पारदर्शी PNG · अधिकतम 4 MiB · 4096 × 4096 तक।', petArtCurrent: 'मौजूदा पेट रूप',
        replaceImage: 'छवि बदलें…', resetArtwork: 'छवि रीसेट करें',
        notifyRow: 'अनुपस्थिति सूचनाएँ', notifyHint: 'यहाँ चालू करें और ब्राउज़र अनुमति दें। केवल तब सूचित करता है जब यह पेज फ़ोकस में न हो।',
        enableNotifications: 'सूचनाएँ चालू करें', disableNotifications: 'सूचनाएँ बंद करें',
        keyboardHint: 'कीबोर्ड: Tab नियंत्रण या विवरण पर; Enter/स्पेस सक्रिय करता है; Escape बंद करता है। छिपाना अनइंस्टॉल नहीं है।',
        choosePng: '4 MiB से छोटा PNG चुनें (4096 × 4096 तक)।', readFailed: 'छवि पढ़ी नहीं जा सकी',
        notificationsUnavailable: 'सूचनाएँ उपलब्ध नहीं हैं', permissionResult: 'सूचना अनुमति: {result}',
        goToChatFailed: 'वह चैट खोली नहीं जा सकी',
        languageRow: 'भाषा', languageHint: 'बबल, मेन्यू और सेटिंग्स की भाषा; डिफ़ॉल्ट रूप से ब्राउज़र के अनुसार।'
      },
      ar: {
        details: 'التفاصيل', collapse: 'طيّ', goToChat: 'الانتقال إلى المحادثة', dismiss: 'تجاهل', dismissResult: 'تجاهل النتيجة',
        muteFor: 'كتم {n} دقيقة', minutes: '{n} دقيقة', muteDuration: 'مدة الكتم', unmute: 'إلغاء الكتم', muteNow: 'اكتم الآن',
        runEnded: 'انتهى التشغيل', stillRunning: '{n} قيد التشغيل', runningHead: '⏳ {n} قيد التشغيل — {title}',
        runningHeadSubs: '⏳ {n} قيد التشغيل · {subs} — {title}', subagentOne: 'وكيل فرعي واحد', subagents: 'وكلاء فرعيون: {n}', subagentActiveOne: '🤖 وكيل فرعي واحد قيد التشغيل', subagentActive: '🤖 وكلاء فرعيون قيد التشغيل: {n}',
        subagentFinished: '✅ اكتمل الوكيل الفرعي',
        subagentFailed: '⚠️ فشل الوكيل الفرعي',
        subagentCancelled: '⏹ أُلغي الوكيل الفرعي',
        disconnected: '⚠️ انقطع المُبلّغ — إعادة المحاولة', close: 'إغلاق', connecting: 'جارٍ الاتصال…',
        restoreBubble: 'استعادة الفقاعة', hidePet: 'إخفاء الحيوان', showPet: 'إظهار الحيوان', openSite: 'افتح DeepSeek Harness', usePagePet: 'استخدم حيوان الصفحة',
        activityAria: 'نشاط CapyReporter', logAria: 'تفاصيل نشاط الجلسة', controlsAria: 'عناصر تحكم CapyReporter؛ اسحب للتحريك', menuAria: 'عناصر تحكم CapyReporter', bubbleSizeAria: 'تغيير حجم الفقاعة (بكسل)', resetSize: 'إعادة تعيين الحجم',
        connected: 'متصل · سطح المكتب {status}', desktop_off: 'متوقف', desktop_starting: 'جارٍ البدء', desktop_ready: 'جاهز', desktop_unavailable: 'غير متاح',
        floatingRow: 'المُبلّغ العائم', floatingHint: 'يتابع الجلسات المباشرة ويبلّغ عن النجاح والإلغاء والحظر والأخطاء كلًا على حدة.',
        statusBubbleRow: 'فقاعة الحالة', statusBubbleHint: 'إنجازات المساعد فقط — تفاصيل الأدوات تبقى في التفاصيل. الكتم يخفي الفقاعة مؤقتًا؛ وإخفاء الحيوان يلغي الكتم أيضًا. اسحب أي حافة أو زاوية (أو Ctrl + العجلة) لتغيير الحجم؛ والزاوية تقبل الأسهم أيضًا.',
        thinkingRow: 'الإبلاغ عن التفكير', thinkingHint: 'فعّل لعرض تفكير النموذج الحالي (💭) كإنجاز حي؛ وإلا فسيُعرض نص المساعد فقط.',
        showThinking: 'إظهار التفكير', hideThinking: 'إخفاء التفكير',
        desktopRow: 'الحيوان دائمًا فوق النوافذ',
        desktopHintOff: '',
        desktopHintReady: 'الحيوان دائمًا فوق النوافذ يعمل. يمكنك العودة إلى حيوان الصفحة في أي وقت.',
        desktopHintStarting: 'جارٍ بدء الحيوان دائمًا فوق النوافذ. أعد المحاولة إذا لم يظهر.',
        enableDesktop: 'تفعيل بقاء الحيوان فوق النوافذ', usePageOnly: 'حيوان الصفحة فقط', retryDesktop: 'إعادة محاولة الحيوان فوق النوافذ',
        petSizeRow: 'حجم الحيوان', petSizeHint: '50–250%. Ctrl + العجلة على الحيوان يغيّر الحجم أيضًا.', petSizeAria: 'نسبة حجم الحيوان',
        petArtRow: 'مظهر الحيوان', petArtHint: 'PNG شفاف · بحد أقصى 4 MiB · حتى 4096 × 4096.', petArtCurrent: 'مظهر الحيوان الحالي',
        replaceImage: 'استبدال الصورة…', resetArtwork: 'إعادة تعيين الصورة',
        notifyRow: 'إشعارات الغياب', notifyHint: 'فعّلها هنا وامنح إذن المتصفح. تُنبّه فقط عندما لا تكون هذه الصفحة في المقدمة.',
        enableNotifications: 'تفعيل الإشعارات', disableNotifications: 'تعطيل الإشعارات',
        keyboardHint: 'لوحة المفاتيح: Tab إلى عناصر التحكم أو التفاصيل؛ Enter/مسافة يُفعّل؛ Escape يغلق. الإخفاء ليس إلغاء تثبيت.',
        choosePng: 'اختر PNG بحجم 4 MiB كحد أقصى (حتى 4096 × 4096).', readFailed: 'تعذّرت قراءة الصورة',
        notificationsUnavailable: 'الإشعارات غير متاحة', permissionResult: 'إذن الإشعارات: {result}',
        goToChatFailed: 'تعذّر فتح تلك المحادثة',
        languageRow: 'اللغة', languageHint: 'لغة الفقاعة والقوائم والإعدادات؛ افتراضيًا تتبع المتصفح.'
      },
      pt: {
        details: 'Detalhes', collapse: 'Recolher', goToChat: 'Ir para o chat', dismiss: 'Descartar', dismissResult: 'Descartar resultado',
        muteFor: 'Silenciar {n} min', minutes: '{n} min', muteDuration: 'Duração do silêncio', unmute: 'Tirar silêncio', muteNow: 'Silenciar agora',
        runEnded: 'Execução concluída', stillRunning: '{n} ainda em execução', runningHead: '⏳ {n} em execução — {title}',
        runningHeadSubs: '⏳ {n} em execução · {subs} — {title}', subagentOne: '1 subagente', subagents: '{n} subagentes', subagentActiveOne: '🤖 1 subagente em execução', subagentActive: '🤖 {n} subagentes em execução',
        subagentFinished: '✅ Subagente concluído',
        subagentFailed: '⚠️ Subagente falhou',
        subagentCancelled: '⏹ Subagente cancelado',
        disconnected: '⚠️ Relator desconectado — tentando novamente', close: 'Fechar', connecting: 'Conectando…',
        restoreBubble: 'Restaurar balão', hidePet: 'Ocultar mascote', showPet: 'Mostrar mascote', openSite: 'Abrir DeepSeek Harness', usePagePet: 'Usar mascote da página',
        activityAria: 'Atividade do CapyReporter', logAria: 'Detalhes da atividade da sessão', controlsAria: 'Controles do CapyReporter; arraste para mover', menuAria: 'Controles do CapyReporter', bubbleSizeAria: 'Redimensionar balão (pixels)', resetSize: 'Redefinir tamanho',
        connected: 'Conectado · desktop {status}', desktop_off: 'desligado', desktop_starting: 'iniciando', desktop_ready: 'pronto', desktop_unavailable: 'indisponível',
        floatingRow: 'Relator flutuante', floatingHint: 'Acompanha sessões ao vivo; informa sucesso, cancelamento, bloqueio e erros separadamente.',
        statusBubbleRow: 'Balão de status', statusBubbleHint: 'Somente marcos do assistente — detalhes de ferramentas ficam em Detalhes. Silenciar oculta o balão por um tempo; ocultar o mascote também reativa. Arraste qualquer borda ou canto (ou Ctrl + roda) para redimensionar; o canto também aceita setas.',
        thinkingRow: 'Relatar raciocínio', thinkingHint: 'Ative para mostrar o raciocínio atual do modelo (💭) como marco; caso contrário, só o texto do assistente aparece.',
        showThinking: 'Mostrar raciocínio', hideThinking: 'Ocultar raciocínio',
        desktopRow: 'Mascote sempre na frente',
        desktopHintOff: '',
        desktopHintReady: 'O mascote sempre na frente está ativo. Volte ao mascote da página quando quiser.',
        desktopHintStarting: 'Iniciando o mascote sempre na frente. Tente novamente se não aparecer.',
        enableDesktop: 'Ativar mascote sempre na frente', usePageOnly: 'Somente mascote da página', retryDesktop: 'Tentar novamente o mascote na frente',
        petSizeRow: 'Tamanho do mascote', petSizeHint: '50–250%. Ctrl + roda sobre o mascote também redimensiona.', petSizeAria: 'Porcentagem do tamanho do mascote',
        petArtRow: 'Aparência do mascote', petArtHint: 'PNG transparente · no máximo 4 MiB · até 4096 × 4096.', petArtCurrent: 'Aparência atual do mascote',
        replaceImage: 'Substituir imagem…', resetArtwork: 'Redefinir imagem',
        notifyRow: 'Notificações de ausência', notifyHint: 'Ative aqui e conceda permissão ao navegador. Só avisa quando esta página não está em foco.',
        enableNotifications: 'Ativar notificações', disableNotifications: 'Desativar notificações',
        keyboardHint: 'Teclado: Tab até os controles ou Detalhes; Enter/Espaço ativa; Esc fecha. Ocultar não desinstala o plugin.',
        choosePng: 'Escolha um PNG de até 4 MiB (até 4096 × 4096).', readFailed: 'Não foi possível ler a imagem',
        notificationsUnavailable: 'As notificações não estão disponíveis', permissionResult: 'Permissão de notificação: {result}',
        goToChatFailed: 'Não foi possível abrir esse chat',
        languageRow: 'Idioma', languageHint: 'Idioma do balão, menus e ajustes; por padrão segue o navegador.'
      },
      ru: {
        details: 'Подробности', collapse: 'Свернуть', goToChat: 'Перейти в чат', dismiss: 'Скрыть', dismissResult: 'Скрыть результат',
        muteFor: 'Без звука {n} мин', minutes: '{n} мин', muteDuration: 'Длительность паузы', unmute: 'Снять паузу', muteNow: 'Приостановить сейчас',
        runEnded: 'Запуск завершён', stillRunning: 'ещё выполняется: {n}', runningHead: '⏳ выполняется: {n} — {title}',
        runningHeadSubs: '⏳ выполняется: {n} · {subs} — {title}', subagentOne: '1 субагент', subagents: 'субагентов: {n}', subagentActiveOne: '🤖 субагент выполняется: 1', subagentActive: '🤖 субагентов выполняется: {n}',
        subagentFinished: '✅ Субагент завершён',
        subagentFailed: '⚠️ Субагент завершился с ошибкой',
        subagentCancelled: '⏹ Субагент отменён',
        disconnected: '⚠️ Отчёт отключён — повторная попытка', close: 'Закрыть', connecting: 'Подключение…',
        restoreBubble: 'Вернуть пузырь', hidePet: 'Скрыть питомца', showPet: 'Показать питомца', openSite: 'Открыть DeepSeek Harness', usePagePet: 'Питомец на странице',
        activityAria: 'Активность CapyReporter', logAria: 'Подробности активности сессии', controlsAria: 'Управление CapyReporter; перетащите, чтобы переместить', menuAria: 'Управление CapyReporter', bubbleSizeAria: 'Изменить размер пузыря (пиксели)', resetSize: 'Сбросить размер',
        connected: 'Подключено · рабочий стол {status}', desktop_off: 'выкл.', desktop_starting: 'запускается', desktop_ready: 'готов', desktop_unavailable: 'недоступен',
        floatingRow: 'Плавающий отчёт', floatingHint: 'Следит за сессиями; отдельно сообщает об успехе, отмене, блокировке и ошибках.',
        statusBubbleRow: 'Пузырь статуса', statusBubbleHint: 'Только этапы ассистента — подробности инструментов остаются в «Подробностях». Пауза временно скрывает пузырь; скрытие питомца тоже снимает паузу. Тяните любую грань или угол (или Ctrl + колесо); угол также реагирует на стрелки.',
        thinkingRow: 'Показывать размышления', thinkingHint: 'Включите, чтобы текущие размышления модели (💭) показывались как этап; иначе виден только текст ассистента.',
        showThinking: 'Показать размышления', hideThinking: 'Скрыть размышления',
        desktopRow: 'Питомец поверх всех окон',
        desktopHintOff: '',
        desktopHintReady: 'Питомец поверх всех окон работает. Можно вернуться к питомцу на странице в любое время.',
        desktopHintStarting: 'Запуск питомца поверх всех окон. Повторите попытку, если он не появился.',
        enableDesktop: 'Включить питомца поверх окон', usePageOnly: 'Только питомец на странице', retryDesktop: 'Повторить запуск питомца',
        petSizeRow: 'Размер питомца', petSizeHint: '50–250%. Ctrl + колесо на питомце тоже меняет размер.', petSizeAria: 'Размер питомца, %',
        petArtRow: 'Вид питомца', petArtHint: 'Прозрачный PNG · до 4 MiB · до 4096 × 4096.', petArtCurrent: 'Текущий вид питомца',
        replaceImage: 'Заменить изображение…', resetArtwork: 'Сбросить изображение',
        notifyRow: 'Уведомления об отсутствии', notifyHint: 'Включите здесь и разрешите уведомления в браузере. Только когда страница не в фокусе.',
        enableNotifications: 'Включить уведомления', disableNotifications: 'Отключить уведомления',
        keyboardHint: 'Клавиатура: Tab к элементам или «Подробностям»; Enter/пробел активирует; Escape закрывает. Скрытие не удаляет плагин.',
        choosePng: 'Выберите PNG не больше 4 MiB (до 4096 × 4096).', readFailed: 'Не удалось прочитать изображение',
        notificationsUnavailable: 'Уведомления недоступны', permissionResult: 'Разрешение на уведомления: {result}',
        goToChatFailed: 'Не удалось открыть этот чат',
        languageRow: 'Язык', languageHint: 'Язык пузыря, меню и настроек; по умолчанию — как в браузере.'
      },
      ja: {
        details: '詳細', collapse: '折りたたむ', goToChat: 'チャットを開く', dismiss: '非表示', dismissResult: '結果を閉じる',
        muteFor: '{n} 分ミュート', minutes: '{n} 分', muteDuration: 'ミュート時間', unmute: 'ミュート解除', muteNow: '今すぐミュート',
        runEnded: '実行終了', stillRunning: '実行中 {n} 件', runningHead: '⏳ 実行中 {n} 件 — {title}',
        runningHeadSubs: '⏳ 実行中 {n} 件 · {subs} — {title}', subagentOne: 'サブエージェント 1 件', subagents: 'サブエージェント {n} 件', subagentActiveOne: '🤖 サブエージェント 1 件実行中', subagentActive: '🤖 サブエージェント {n} 件実行中',
        subagentFinished: '✅ サブエージェント完了',
        subagentFailed: '⚠️ サブエージェント失敗',
        subagentCancelled: '⏹ サブエージェント中止',
        disconnected: '⚠️ レポーター切断 — 再接続中', close: '閉じる', connecting: '接続中…',
        restoreBubble: 'バブルを戻す', hidePet: 'ペットを隠す', showPet: 'ペットを表示', openSite: 'DeepSeek Harness を開く', usePagePet: 'ページのペットを使う',
        activityAria: 'CapyReporter アクティビティ', logAria: 'セッションの詳細', controlsAria: 'CapyReporter の操作。ドラッグで移動', menuAria: 'CapyReporter の操作', bubbleSizeAria: 'バブルのサイズ変更（ピクセル）', resetSize: 'サイズをリセット',
        connected: '接続済み · デスクトップ {status}', desktop_off: 'オフ', desktop_starting: '起動中', desktop_ready: '準備完了', desktop_unavailable: '利用不可',
        floatingRow: 'フローティングレポーター', floatingHint: 'ライブセッションを追跡し、成功・キャンセル・ブロック・エラーを区別して通知します。',
        statusBubbleRow: 'ステータスバブル', statusBubbleHint: 'アシスタントの節目のみ表示し、ツールの情報は詳細に残します。ミュートは一時的にバブルを隠し、ペットを隠しても解除されます。端や角をドラッグ（または Ctrl + ホイール）でサイズ変更、角は矢印キーにも対応。',
        thinkingRow: '思考を表示', thinkingHint: 'オンにするとモデルの現在の思考（💭）をライブの節目として表示します。オフではアシスタントのテキストのみ。',
        showThinking: '思考を表示', hideThinking: '思考を隠す',
        desktopRow: 'ペットを常に最前面に表示',
        desktopHintOff: '',
        desktopHintReady: 'ペットは常に最前面に表示されています。いつでもページのペットに戻せます。',
        desktopHintStarting: 'ペットの最前面表示を起動中です。表示されない場合は再試行してください。',
        enableDesktop: 'ペットの最前面表示を有効化', usePageOnly: 'ページのペットのみ', retryDesktop: 'ペットの最前面表示を再試行',
        petSizeRow: 'ペットのサイズ', petSizeHint: '50〜250%。ペット上の Ctrl + ホイールでも変更できます。', petSizeAria: 'ペットのサイズ（％）',
        petArtRow: 'ペットの見た目', petArtHint: '透過 PNG · 最大 4 MiB · 4096 × 4096 まで。', petArtCurrent: '現在のペットの見た目',
        replaceImage: '画像を差し替える…', resetArtwork: '画像をリセット',
        notifyRow: '離席時の通知', notifyHint: 'ここでオンにし、ブラウザの許可を与えてください。このページが非フォーカスのときだけ通知します。',
        enableNotifications: '通知を有効化', disableNotifications: '通知を無効化',
        keyboardHint: 'キーボード: Tab で操作や詳細へ、Enter/スペースで実行、Escape で閉じる。隠してもアンインストールされません。',
        choosePng: '4 MiB 以下の PNG を選択（最大 4096 × 4096）。', readFailed: '画像を読み込めません',
        notificationsUnavailable: '通知を利用できません', permissionResult: '通知の許可: {result}',
        goToChatFailed: 'そのチャットを開けませんでした',
        languageRow: '言語', languageHint: 'バブル・メニュー・設定の表示言語。既定ではブラウザに従います。'
      },
      fr: {
        details: 'Détails', collapse: 'Réduire', goToChat: 'Aller au chat', dismiss: 'Masquer', dismissResult: 'Masquer le résultat',
        muteFor: 'Silence {n} min', minutes: '{n} min', muteDuration: 'Durée du silence', unmute: 'Quitter le silence', muteNow: 'Mettre en silence',
        runEnded: 'Exécution terminée', stillRunning: '{n} encore en cours', runningHead: '⏳ {n} en cours — {title}',
        runningHeadSubs: '⏳ {n} en cours · {subs} — {title}', subagentOne: '1 sous-agent', subagents: '{n} sous-agents', subagentActiveOne: '🤖 1 sous-agent en cours', subagentActive: '🤖 {n} sous-agents en cours',
        subagentFinished: '✅ Sous-agent terminé',
        subagentFailed: '⚠️ Échec du sous-agent',
        subagentCancelled: '⏹ Sous-agent annulé',
        disconnected: '⚠️ Rapporteur déconnecté — nouvelle tentative', close: 'Fermer', connecting: 'Connexion…',
        restoreBubble: 'Restaurer la bulle', hidePet: 'Masquer la mascotte', showPet: 'Afficher la mascotte', openSite: 'Ouvrir DeepSeek Harness', usePagePet: 'Utiliser la mascotte de la page',
        activityAria: 'Activité CapyReporter', logAria: 'Détails de l’activité de la session', controlsAria: 'Contrôles CapyReporter ; glissez pour déplacer', menuAria: 'Contrôles CapyReporter', bubbleSizeAria: 'Redimensionner la bulle (pixels)', resetSize: 'Réinitialiser la taille',
        connected: 'Connecté · bureau {status}', desktop_off: 'désactivé', desktop_starting: 'démarrage', desktop_ready: 'prêt', desktop_unavailable: 'indisponible',
        floatingRow: 'Rapporteur flottant', floatingHint: 'Suit les sessions en direct ; signale séparément succès, annulation, blocage et erreurs.',
        statusBubbleRow: 'Bulle d’état', statusBubbleHint: 'Jalons de l’assistant uniquement — les détails d’outils restent dans Détails. Le silence masque la bulle un moment ; masquer la mascotte le lève aussi. Glissez un bord ou un coin (ou Ctrl + molette) pour redimensionner ; le coin accepte aussi les flèches.',
        thinkingRow: 'Rapporter le raisonnement', thinkingHint: 'Activez pour afficher le raisonnement actuel du modèle (💭) comme jalon ; sinon seul le texte de l’assistant apparaît.',
        showThinking: 'Afficher le raisonnement', hideThinking: 'Masquer le raisonnement',
        desktopRow: 'Mascotte toujours au premier plan',
        desktopHintOff: '',
        desktopHintReady: 'La mascotte toujours au premier plan est active. Revenez à la mascotte de la page quand vous voulez.',
        desktopHintStarting: 'Démarrage de la mascotte toujours au premier plan. Réessayez si elle n’apparaît pas.',
        enableDesktop: 'Activer la mascotte au premier plan', usePageOnly: 'Mascotte de la page', retryDesktop: 'Réessayer la mascotte au premier plan',
        petSizeRow: 'Taille de la mascotte', petSizeHint: '50–250 %. Ctrl + molette sur la mascotte redimensionne aussi.', petSizeAria: 'Taille de la mascotte (pourcentage)',
        petArtRow: 'Apparence de la mascotte', petArtHint: 'PNG transparent · 4 Mio max · jusqu’à 4096 × 4096.', petArtCurrent: 'Apparence actuelle de la mascotte',
        replaceImage: 'Remplacer l’image…', resetArtwork: 'Réinitialiser l’image',
        notifyRow: 'Notifications d’absence', notifyHint: 'Activez ici et accordez l’autorisation du navigateur. Alerte seulement quand cette page n’est pas au premier plan.',
        enableNotifications: 'Activer les notifications', disableNotifications: 'Désactiver les notifications',
        keyboardHint: 'Clavier : Tab vers les contrôles ou Détails ; Entrée/Espace active ; Échap ferme. Masquer ne désinstalle pas le plugin.',
        choosePng: 'Choisissez un PNG de 4 Mio max (jusqu’à 4096 × 4096).', readFailed: 'Impossible de lire l’image',
        notificationsUnavailable: 'Les notifications sont indisponibles', permissionResult: 'Autorisation de notification : {result}',
        goToChatFailed: 'Impossible d’ouvrir ce chat',
        languageRow: 'Langue', languageHint: 'Langue de la bulle, des menus et des réglages ; par défaut, celle du navigateur.'
      },
      de: {
        details: 'Details', collapse: 'Einklappen', goToChat: 'Zum Chat', dismiss: 'Ausblenden', dismissResult: 'Ergebnis ausblenden',
        muteFor: '{n} Min. stumm', minutes: '{n} Min.', muteDuration: 'Stummdauer', unmute: 'Stummschaltung aufheben', muteNow: 'Jetzt stummschalten',
        runEnded: 'Lauf beendet', stillRunning: '{n} laufen noch', runningHead: '⏳ {n} laufen — {title}',
        runningHeadSubs: '⏳ {n} laufen · {subs} — {title}', subagentOne: '1 Subagent', subagents: '{n} Subagenten', subagentActiveOne: '🤖 1 Subagent läuft', subagentActive: '🤖 {n} Subagenten laufen',
        subagentFinished: '✅ Subagent abgeschlossen',
        subagentFailed: '⚠️ Subagent fehlgeschlagen',
        subagentCancelled: '⏹ Subagent abgebrochen',
        disconnected: '⚠️ Reporter getrennt — neuer Versuch', close: 'Schließen', connecting: 'Verbinden…',
        restoreBubble: 'Blase wiederherstellen', hidePet: 'Pet ausblenden', showPet: 'Pet anzeigen', openSite: 'DeepSeek Harness öffnen', usePagePet: 'Pet der Seite verwenden',
        activityAria: 'CapyReporter-Aktivität', logAria: 'Details zur Sitzungsaktivität', controlsAria: 'CapyReporter-Steuerung; zum Verschieben ziehen', menuAria: 'CapyReporter-Steuerung', bubbleSizeAria: 'Blasengröße ändern (Pixel)', resetSize: 'Größe zurücksetzen',
        connected: 'Verbunden · Desktop {status}', desktop_off: 'aus', desktop_starting: 'startet', desktop_ready: 'bereit', desktop_unavailable: 'nicht verfügbar',
        floatingRow: 'Schwebender Reporter', floatingHint: 'Verfolgt Live-Sitzungen; meldet Erfolg, Abbruch, Blockade und Fehler getrennt.',
        statusBubbleRow: 'Statusblase', statusBubbleHint: 'Nur Assistent-Meilensteine – Tool-Details bleiben unter Details. Stumm blendet die Blase eine Weile aus; Pet ausblenden hebt die Stummschaltung ebenfalls auf. Ziehe eine Kante oder Ecke (oder Strg + Rad) zum Größenändern; die Ecke reagiert auch auf Pfeiltasten.',
        thinkingRow: 'Denken melden', thinkingHint: 'Aktivieren, um das aktuelle Denken des Modells (💭) als Live-Meilenstein zu zeigen; sonst erscheint nur Assistententext.',
        showThinking: 'Denken zeigen', hideThinking: 'Denken ausblenden',
        desktopRow: 'Pet immer im Vordergrund',
        desktopHintOff: '',
        desktopHintReady: 'Das Pet im Vordergrund läuft. Du kannst jederzeit zum Seiten-Pet zurückkehren.',
        desktopHintStarting: 'Das Pet im Vordergrund startet. Bei Ausbleiben erneut versuchen.',
        enableDesktop: 'Pet im Vordergrund aktivieren', usePageOnly: 'Nur Seiten-Pet', retryDesktop: 'Pet im Vordergrund erneut versuchen',
        petSizeRow: 'Pet-Größe', petSizeHint: '50–250 %. Strg + Rad über dem Pet ändert die Größe ebenfalls.', petSizeAria: 'Pet-Größe in Prozent',
        petArtRow: 'Pet-Aussehen', petArtHint: 'Transparentes PNG · max. 4 MiB · bis 4096 × 4096.', petArtCurrent: 'Aktuelles Pet-Aussehen',
        replaceImage: 'Bild ersetzen…', resetArtwork: 'Bild zurücksetzen',
        notifyRow: 'Abwesenheits-Benachrichtigungen', notifyHint: 'Hier aktivieren und Browser-Berechtigung erteilen. Meldet nur, wenn diese Seite nicht im Fokus ist.',
        enableNotifications: 'Benachrichtigungen aktivieren', disableNotifications: 'Benachrichtigungen deaktivieren',
        keyboardHint: 'Tastatur: Tab zu Steuerung oder Details; Enter/Leertaste aktiviert; Esc schließt. Ausblenden deinstalliert das Plugin nicht.',
        choosePng: 'PNG bis 4 MiB wählen (bis 4096 × 4096).', readFailed: 'Bild konnte nicht gelesen werden',
        notificationsUnavailable: 'Benachrichtigungen sind nicht verfügbar', permissionResult: 'Benachrichtigungs-Berechtigung: {result}',
        goToChatFailed: 'Dieser Chat konnte nicht geöffnet werden',
        languageRow: 'Sprache', languageHint: 'Sprache von Blase, Menüs und Einstellungen; standardmäßig wie im Browser.'
      }
    }
    const LANGUAGES = ['auto', 'en', 'zh', 'es', 'hi', 'ar', 'pt', 'ru', 'ja', 'fr', 'de']
    const LANGUAGE_NAMES = { auto: 'Auto', en: 'English', zh: '中文', es: 'Español', hi: 'हिन्दी', ar: 'العربية', pt: 'Português', ru: 'Русский', ja: '日本語', fr: 'Français', de: 'Deutsch' }
    const autoLocale = () => {
      const lang = (navigator.language || 'en').toLowerCase().split('-')[0]
      return LANGUAGES.includes(lang) && lang !== 'auto' ? lang : 'en'
    }
    const readLanguage = () => {
      try { const saved = localStorage.getItem('dsh-capyreporter:lang'); if (LANGUAGES.includes(saved)) return saved } catch {}
      return 'auto'
    }
    let language = readLanguage()
    let locale = language === 'auto' ? autoLocale() : language
    const setLanguage = next => {
      if (!LANGUAGES.includes(next) || next === language) return language
      language = next
      locale = next === 'auto' ? autoLocale() : next
      try { localStorage.setItem('dsh-capyreporter:lang', next) } catch {}
      emit({ ...snapshot })
      return language
    }
    const t = (key, vars) => {
      let value = STRINGS[locale]?.[key] ?? STRINGS.en[key] ?? key
      if (vars) for (const [name, replacement] of Object.entries(vars)) value = value.split('{' + name + '}').join(String(replacement))
      return value
    }
    const isRtl = () => locale === 'ar'
    // Delegated agents finish inside the parent turn; keep that milestone local.
    const progressLine = item => {
      const key = item.outcome === 'completed' ? 'subagentFinished' : item.outcome === 'error' ? 'subagentFailed' : 'subagentCancelled'
      return t(key) + (item.title ? ' · ' + item.title : '')
    }
    const CSS = `
.dsh-capy-section{display:flex;flex-direction:column;gap:16px;font-size:13px}
.dsh-capy-row{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.dsh-capy-hint{font-size:12px;opacity:.75;line-height:1.5}
.dsh-capy-btn{font:inherit;color:inherit;background:transparent;border:1px solid #8888;border-radius:8px;padding:6px 10px;cursor:pointer}
.dsh-capy-btn:disabled{opacity:.5;cursor:wait}
/* Native selects open an OS popup that ignores inherited colors: without explicit
   option colors a dark theme paints white text on the white popup (invisible choices). */
select.dsh-capy-btn{background:#fdfdf7;color:#22242c;color-scheme:light}
.dsh-capy-btn option{background:#fdfdf7;color:#22242c}
.dsh-capy-btn:focus-visible,.dsh-capy-pet:focus-visible{outline:3px solid #4f8cff;outline-offset:3px}
.dsh-capy-float{position:fixed;z-index:2147483000;user-select:none}
.dsh-capy-pet{display:block;padding:0;border:0;background:none;cursor:grab;touch-action:none}
.dsh-capy-pet img{display:block;width:100%;height:auto;max-height:45vh;object-fit:contain;filter:drop-shadow(0 6px 16px #0006);pointer-events:none}
.dsh-capy-bubble{position:absolute;bottom:100%;width:min(360px,calc(100vw - 24px));display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;background:#fdfdf7;color:#22242c;border-radius:14px;padding:10px 12px;box-shadow:0 4px 14px #0007;font-size:12.5px;line-height:1.45;overflow-wrap:anywhere}
.dsh-capy-rz{position:absolute;z-index:3;touch-action:none}.dsh-capy-rz-n{top:0;left:10px;right:10px;height:7px;cursor:ns-resize}.dsh-capy-rz-s{bottom:0;left:10px;right:10px;height:7px;cursor:ns-resize}.dsh-capy-rz-e{right:0;top:10px;bottom:10px;width:7px;cursor:ew-resize}.dsh-capy-rz-w{left:0;top:10px;bottom:10px;width:7px;cursor:ew-resize}.dsh-capy-rz-ne{top:0;right:0;width:12px;height:12px;cursor:nesw-resize}.dsh-capy-rz-nw{top:0;left:0;width:12px;height:12px;cursor:nwse-resize}.dsh-capy-rz-se{bottom:0;right:0;width:14px;height:14px;cursor:nwse-resize}.dsh-capy-rz-se::after{content:'';position:absolute;right:2px;bottom:2px;width:8px;height:8px;border-right:2px solid #22242c;border-bottom:2px solid #22242c;opacity:.18}.dsh-capy-rz-se:hover::after{opacity:.5}.dsh-capy-rz-sw{bottom:0;left:0;width:12px;height:12px;cursor:nesw-resize}.dsh-capy-rz:focus-visible{outline:2px solid #4f8cff;outline-offset:-2px}
.dsh-capy-head{font-weight:600;margin-bottom:5px;flex:none}
.dsh-capy-body{flex:1 1 auto;min-height:0;max-height:160px;overflow:auto}
.dsh-capy-log{white-space:pre-wrap;margin:6px 0}
.dsh-capy-progress{opacity:.75;margin-top:4px}
.dsh-capy-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;flex:none}
.dsh-capy-menu{position:absolute;bottom:0;left:0;display:flex;flex-direction:column;gap:6px;background:#23262f;color:#e8eaf0;border:1px solid #8888;border-radius:10px;padding:8px;box-shadow:0 8px 24px #0009;min-width:160px}
.dsh-capy-preview{width:100px;height:100px;object-fit:contain;background:#8882;border-radius:10px}
@media(prefers-reduced-motion:reduce){.dsh-capy-section *,.dsh-capy-float *{animation:none!important;transition:none!important}}
`
    let snapshot = { state: null, activity: null, connected: false, error: null }
    let onNavigate = null, lastNav = ''
    const listeners = new Set()
    let timer = null, active = null, failures = 0, stopped = false, generation = 0, pendingRefresh = false
    const seen = new Set(readSeen())
    function readSeen() {
      try {
        const value = JSON.parse(sessionStorage.getItem('dsh-capyreporter:seen') || '[]')
        return Array.isArray(value) ? value.slice(-200) : []
      } catch { return [] }
    }
    function rememberSeen(key) {
      seen.add(key)
      if (seen.size > 200) seen.delete(seen.values().next().value)
      try { sessionStorage.setItem('dsh-capyreporter:seen', JSON.stringify([...seen])) } catch {}
    }
    const emit = value => { snapshot = value; for (const fn of listeners) fn(value) }
    async function request(path, body, signal) {
      const controller = new AbortController()
      const abort = () => controller.abort()
      signal?.addEventListener('abort', abort, { once: true })
      if (signal?.aborted) controller.abort()
      const timeout = setTimeout(abort, 5000)
      try {
        const response = await fetch(ROUTE + path, { method: body === undefined ? 'GET' : 'POST',
          credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
          ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }) })
        const value = await response.json()
        if (!response.ok) throw new Error(value.error || 'Reporter HTTP ' + response.status)
        return value
      } finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort) }
    }
    function notify(activity, state) {
      for (const item of activity?.completions || (activity?.completed ? [activity.completed] : [])) {
        const key = String(item.id) + ':' + item.at
        if (seen.has(key)) continue
        rememberSeen(key)
        // A completion already observed while focused is not replayed on blur.
        if (!state.enabled || !state.notificationsEnabled || (document.visibilityState === 'visible' && document.hasFocus()) || typeof Notification === 'undefined' || Notification.permission !== 'granted') continue
        try { new Notification('CapyReporter', { body: (item.label || t('runEnded')) + ' — ' + item.title, tag: 'dsh-capyreporter:' + key }) } catch {}
      }
    }
    async function poll() {
      if (active || stopped || !listeners.size) return
      active = new AbortController()
      const current = active, started = generation
      pendingRefresh = false
      let delay = 1200
      try {
        const state = await request('/state', undefined, current.signal)
        const activity = state.enabled ? await request('/activity', undefined, current.signal) : null
        if (current.signal.aborted || stopped || started !== generation) return
        failures = 0
        const hostLanguage = LANGUAGES.includes(state.language) ? state.language : 'auto'
        if (hostLanguage !== language) {
          language = hostLanguage
          locale = hostLanguage === 'auto' ? autoLocale() : hostLanguage
          try { localStorage.setItem('dsh-capyreporter:lang', hostLanguage) } catch {}
        }
        const nav = state.navigate
        if (nav && nav.sessionId) {
          const key = String(nav.sessionId) + ':' + String(nav.at)
          if (key !== lastNav) { lastNav = key; try { onNavigate?.(nav.sessionId) } catch {} }
        }
        notify(activity, state)
        emit({ state, activity, connected: true, error: null })
      } catch (error) {
        if (current.signal.aborted || stopped) return
        delay = Math.min(20_000, 1200 * 2 ** Math.min(++failures, 4))
        emit({ ...snapshot, activity: null, connected: false, error: 'Reporter disconnected: ' + error.message })
      } finally {
        if (active === current) active = null
        if (!stopped && listeners.size) timer = setTimeout(poll, pendingRefresh ? 0 : delay)
      }
    }
    const refresh = () => { clearTimeout(timer); if (active) pendingRefresh = true; else void poll() }
    // Hidden tabs throttle chained timers to roughly one wake per minute, so
    // polls (and away notifications) stall while the user is elsewhere. Refresh
    // immediately when the page becomes visible or focused again.
    const wake = () => { if (document.visibilityState === 'visible' || document.hasFocus()) refresh() }
    let wakeInstalled = false
    function installWake() {
      if (wakeInstalled) return
      wakeInstalled = true
      document.addEventListener('visibilitychange', wake)
      window.addEventListener('focus', wake)
    }
    function uninstallWake() {
      wakeInstalled = false
      document.removeEventListener('visibilitychange', wake)
      window.removeEventListener('focus', wake)
    }
    function useReporter() {
      const [value, setValue] = useState(snapshot)
      useEffect(() => {
        listeners.add(setValue)
        stopped = false
        installWake()
        setValue(snapshot)
        refresh()
        return () => {
          listeners.delete(setValue)
          if (!listeners.size) { stopped = true; clearTimeout(timer); active?.abort() }
        }
      }, [])
      return value
    }
    async function mutate(path, body = {}) {
      const value = await request(path, body)
      generation++
      if (snapshot.state) emit({ ...snapshot, state: { ...snapshot.state, ...value } })
      refresh()
      return value
    }
    const signature = activity => JSON.stringify([activity?.completed?.at, activity?.runningCount, activity?.subagentCount, activity?.progress?.at(-1)?.at,
      ...(activity?.running || []).map(r => [r.id, r.title, r.preview, r.lines?.at(-1)])])
    // The green tick belongs to the root chat only. A finishing delegated agent
    // advances the running headline; its completion is reported as progress.
    const subagentCountLabel = n => n === 1 ? t('subagentOne') : t('subagents', { n })
    const subagentActiveLabel = n => n === 1 ? t('subagentActiveOne', { n }) : t('subagentActive', { n })
    const headline = activity => {
      const rows = activity?.running || []
      const roots = activity?.runningCount || 0
      const subagents = activity?.subagentCount || 0
      if (activity?.completed && !roots) {
        const still = rows.length
        return (activity.completed.label || t('runEnded')) + ' — ' + activity.completed.title + (still ? ' · ' + t('stillRunning', { n: still }) : '')
      }
      if (roots || rows.length) {
        const row = rows.find(entry => !entry.subagent) || rows[0]
        const label = subagents
          ? t('runningHeadSubs', { n: roots || rows.length, subs: subagentCountLabel(subagents), title: row.title })
          : t('runningHead', { n: roots || rows.length, title: row.title })
        return label
      }
      return null
    }

    function PetOverlay({ onOpenChat }) {
      const feed = useReporter()
      const [expanded, setExpanded] = useState(false), [menu, setMenu] = useState(false)
      const [suppressed, setSuppressed] = useState(null), [error, setError] = useState(null)
      const [pos, setPos] = useState(() => {
        try { const saved = JSON.parse(localStorage.getItem('dsh-capyreporter:position')); if (Number.isFinite(saved?.left) && Number.isFinite(saved?.top)) return saved } catch {}
        return { left: 24, top: Math.max(160, window.innerHeight - 230) }
      })
      const root = useRef(null), pet = useRef(null), drag = useRef(null), moved = useRef(false), resize = useRef(null), bubbleNode = useRef(null)
      const [bubble, setBubble] = useState(() => {
        const base = { w: 360, h: 480, fixed: false }
        try {
          const saved = JSON.parse(localStorage.getItem('dsh-capyreporter:bubbleSize'))
          if (saved && Number.isFinite(saved.w) && Number.isFinite(saved.h)) return { w: Math.min(560, Math.max(260, Math.round(saved.w))), h: Math.min(720, Math.max(160, Math.round(saved.h))), fixed: !!saved.fixed }
          const legacy = Number(localStorage.getItem('dsh-capyreporter:bubbleWidth'))
          if (Number.isFinite(legacy) && legacy >= 260 && legacy <= 560) return { ...base, w: Math.round(legacy) }
        } catch {}
        return base
      })
      const scale = feed.state?.scale || 1
      const visible = !!feed.state?.enabled && !feed.state?.snoozed && !(feed.connected && feed.state?.desktop)
      const clamp = point => ({ left: Math.max(0, Math.min(point.left, window.innerWidth - Math.round(132 * scale))), top: Math.max(0, Math.min(point.top, window.innerHeight - (pet.current?.getBoundingClientRect().height || Math.min(132 * scale, window.innerHeight * .45)))) })
      useEffect(() => { const save = setTimeout(() => { try { localStorage.setItem('dsh-capyreporter:position', JSON.stringify(pos)) } catch {} }, 200); return () => clearTimeout(save) }, [pos])
      useEffect(() => { const save = setTimeout(() => { try { localStorage.setItem('dsh-capyreporter:bubbleSize', JSON.stringify(bubble)) } catch {} }, 200); return () => clearTimeout(save) }, [bubble])
      useEffect(() => {
        const resize = () => setPos(value => clamp(value))
        resize(); window.addEventListener('resize', resize)
        return () => window.removeEventListener('resize', resize)
      }, [scale])
      useEffect(() => {
        if (!visible || !pet.current) return
        const node = pet.current
        let value = scale, pending
        const wheel = event => {
          if (!event.ctrlKey && !event.metaKey) return
          event.preventDefault()
          value = Math.min(2.5, Math.max(.5, Math.round((value + (event.deltaY < 0 ? .1 : -.1)) * 10) / 10))
          clearTimeout(pending)
          pending = setTimeout(() => mutate('/scale', { scale: value }).catch(e => setError(e.message)), 180)
        }
        node.addEventListener('wheel', wheel, { passive: false })
        return () => { node.removeEventListener('wheel', wheel); clearTimeout(pending) }
      }, [visible, scale])
      useEffect(() => {
        if (!visible || !root.current) return
        const node = root.current
        let value = bubble.w
        const wheel = event => {
          if ((!event.ctrlKey && !event.metaKey) || !event.target?.closest?.('.dsh-capy-bubble')) return
          event.preventDefault()
          value = Math.min(560, Math.max(260, value + (event.deltaY < 0 ? 16 : -16)))
          setBubble(b => ({ ...b, w: Math.round(value) }))
        }
        node.addEventListener('wheel', wheel, { passive: false })
        return () => { node.removeEventListener('wheel', wheel) }
      }, [visible, bubble.w])
      useEffect(() => {
        if (!menu) return
        const close = event => { if (!root.current?.contains(event.target)) setMenu(false) }
        document.addEventListener('pointerdown', close)
        return () => document.removeEventListener('pointerdown', close)
      }, [menu])
      if (!visible) return null
      const activity = feed.activity, sig = signature(activity)
      const done = activity?.completed, running = activity?.running?.[0]
      const rootsRunning = activity?.runningCount || 0
      const subagentsRunning = activity?.subagentCount || 0
      const latestProgress = activity?.progress?.at(-1)
      const live = rootsRunning ? (activity?.running || []).find(row => !row.subagent) : running
      const liveMilestone = live ? (live.kind === 'think' ? '💭 ' + live.preview : live.preview) : null
      const subactive = subagentsRunning ? subagentActiveLabel(subagentsRunning) : null
      const milestone = liveMilestone || subactive || (latestProgress ? progressLine(latestProgress) : null) || done?.preview
      const head = !feed.connected ? t('disconnected') : headline(activity)
      const show = head && (sig !== suppressed || !feed.connected)
      const action = async (path, body) => { try { await mutate(path, body); setError(null) } catch (e) { setError(e.message) } }
      const muteMinutes = feed.state?.snoozeMinutes || 30
      const hideBubble = () => { setSuppressed(sig); setExpanded(false); if (done) void action('/dismiss', { at: done.at }) }
      const mute = () => { setSuppressed(sig); setExpanded(false); void action('/snooze', { minutes: muteMinutes }) }
      const chatId = (activity?.running || []).find(row => !row.subagent)?.id ?? done?.id ?? running?.id
      const openChat = () => { if (!chatId) return; try { onOpenChat?.(chatId) } catch (e) { setError(e.message) } }
      const effW = Math.min(bubble.w, window.innerWidth - 24)
      const effH = Math.min(bubble.h, window.innerHeight - 24)
      const bubbleLeft = Math.max(12 - pos.left, Math.min(0, window.innerWidth - pos.left - effW))
      const onRzDown = dir => event => {
        const rect = bubbleNode.current?.getBoundingClientRect()
        resize.current = { dir, x: event.clientX, y: event.clientY, w: bubble.w, h: bubble.fixed ? bubble.h : Math.round(rect?.height || bubble.h) }
        event.currentTarget.setPointerCapture(event.pointerId)
        event.preventDefault()
      }
      const onRzMove = event => {
        const r = resize.current; if (!r) return
        const dx = event.clientX - r.x, dy = event.clientY - r.y
        const w = Math.round(Math.min(560, Math.max(260, r.dir.includes('e') ? r.w + dx : r.dir.includes('w') ? r.w - dx : r.w)))
        const vertical = r.dir.includes('n') || r.dir.includes('s')
        if (!vertical) { setBubble(b => ({ ...b, w })); return }
        const h = Math.round(Math.min(720, Math.max(160, r.dir.includes('s') ? r.h + dy : r.h - dy)))
        setBubble(b => ({ ...b, w, h, fixed: true }))
      }
      const onRzUp = event => { resize.current = null; try { event.currentTarget.releasePointerCapture(event.pointerId) } catch {} }
      const onRzKey = event => {
        const step = { ArrowLeft: [16, 0], ArrowRight: [-16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] }[event.key]
        if (!step) return
        event.preventDefault()
        if (!step[1]) { setBubble(b => ({ ...b, w: Math.min(560, Math.max(260, b.w + step[0])) })); return }
        const rect = bubbleNode.current?.getBoundingClientRect()
        setBubble(b => ({ ...b, fixed: true, h: Math.min(720, Math.max(160, (b.fixed ? b.h : Math.round(rect?.height || b.h)) + step[1])) }))
      }
      return h('div', { className: 'dsh-capy-float', ref: root, dir: isRtl() ? 'rtl' : undefined, style: { ...pos, width: Math.round(132 * scale) },
        onKeyDown: event => { if (event.key === 'Escape') { setMenu(false); setExpanded(false); pet.current?.focus() } } },
        show && h('section', { className: 'dsh-capy-bubble', ref: bubbleNode, 'aria-label': t('activityAria'), style: { left: bubbleLeft, width: effW, ...(bubble.fixed ? { height: effH } : { maxHeight: effH }), ...(pos.top < 180 ? { bottom: 'auto', top: '100%' } : {}) } },
          h('div', { className: 'dsh-capy-head', role: 'status', 'aria-live': 'polite' }, head),
          h('div', { className: 'dsh-capy-body', style: { ...(bubble.fixed ? { maxHeight: 'none' } : {}) } },
            !expanded && h('div', null, milestone),
            expanded && h('div', { className: 'dsh-capy-log', tabIndex: 0, 'aria-label': t('logAria') },
            done && h('div', { key: 'done' }, done.title, h('div', null, (done.lines || []).join('\n'))),
            (activity?.progress || []).slice(-6).map(item => h('div', { key: 'p' + item.at, className: 'dsh-capy-progress' }, progressLine(item))),
            (activity?.running || []).map(row => h('div', { key: row.id }, h('strong', null, row.title), h('div', null, (row.lines || []).join('\n')), h('div', null, row.preview))))),
          h('div', { className: 'dsh-capy-actions' },
            h('button', { className: 'dsh-capy-btn', 'aria-expanded': expanded, onClick: () => setExpanded(!expanded) }, expanded ? t('collapse') : t('details')),
            chatId && h('button', { className: 'dsh-capy-btn', onClick: openChat }, t('goToChat')),
            h('button', { className: 'dsh-capy-btn', onClick: hideBubble }, done ? t('dismissResult') : t('dismiss')),
            h('button', { className: 'dsh-capy-btn', onClick: mute }, t('muteFor', { n: muteMinutes }))),
          ...['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].map(dir => h('div', { key: dir, className: 'dsh-capy-rz dsh-capy-rz-' + dir,
            ...(dir === 'se' ? { role: 'separator', 'aria-orientation': 'vertical', 'aria-label': t('bubbleSizeAria'), 'aria-valuemin': 260, 'aria-valuemax': 560, 'aria-valuenow': Math.round(effW), 'aria-valuetext': Math.round(effW) + ' × ' + (bubble.fixed ? Math.round(effH) : 'auto') + ' px', tabIndex: 0, onKeyDown: onRzKey } : { 'aria-hidden': true }),
            onPointerDown: onRzDown(dir), onPointerMove: onRzMove, onPointerUp: onRzUp, onPointerCancel: onRzUp, onDoubleClick: () => setBubble({ w: 360, h: 480, fixed: false }) }))),
        error && h('div', { role: 'alert', className: 'dsh-capy-bubble', style: { left: bubbleLeft } }, error, h('button', { onClick: () => setError(null) }, t('close'))),
        h('button', { className: 'dsh-capy-pet', ref: pet, 'aria-label': t('controlsAria'), 'aria-expanded': menu,
          style: { width: '100%' }, onClick: event => { if (event.detail === 0 || !moved.current) setMenu(!menu) },
          onContextMenu: event => { event.preventDefault(); setMenu(!menu) },
          onPointerDown: event => { if (event.button !== 0) return; moved.current = false; drag.current = { x: event.clientX, y: event.clientY, ...pos }; event.currentTarget.setPointerCapture?.(event.pointerId) },
          onPointerMove: event => { const d = drag.current; if (!d) return; const dx = event.clientX - d.x, dy = event.clientY - d.y; if (Math.hypot(dx, dy) > 5) moved.current = true; if (moved.current) setPos(clamp({ left: d.left + dx, top: d.top + dy })) },
          onPointerUp: () => { drag.current = null }, onPointerCancel: () => { drag.current = null; moved.current = false } },
          h('img', { src: ROUTE + '/image?v=' + (feed.state.imageRevision ?? Number(feed.state.hasCustom)), alt: 'CapyReporter', draggable: false, onLoad: () => setPos(value => clamp(value)) })),
        menu && h('div', { className: 'dsh-capy-menu', role: 'group', 'aria-label': t('menuAria') },
          h('button', { className: 'dsh-capy-btn', onClick: () => { setSuppressed(null); setMenu(false); if (feed.state?.snoozed) void action('/snooze', { minutes: 0 }) } }, t('restoreBubble')),
          chatId && h('button', { className: 'dsh-capy-btn', onClick: () => { setMenu(false); openChat() } }, t('goToChat')),
          done && h('button', { className: 'dsh-capy-btn', onClick: () => { hideBubble(); setMenu(false) } }, t('dismissResult')),
          h('button', { className: 'dsh-capy-btn', onClick: () => { mute(); setMenu(false) } }, t('muteFor', { n: muteMinutes })),
          h('button', { className: 'dsh-capy-btn', onClick: () => { setBubble({ w: 360, h: 480, fixed: false }); setMenu(false) } }, t('resetSize')),
          h('button', { className: 'dsh-capy-btn', onClick: () => action('/enabled', { enabled: false }) }, t('hidePet'))))
    }

    function PetSettings() {
      const feed = useReporter()
      const [busy, setBusy] = useState(false), [message, setMessage] = useState(null), [size, setSize] = useState(100)
      const file = useRef(null)
      useEffect(() => { if (feed.state) setSize(Math.round(feed.state.scale * 100)) }, [feed.state?.scale])
      const state = feed.state
      const run = async task => { setBusy(true); setMessage(null); try { await task() } catch (error) { setMessage(error.message) } finally { setBusy(false) } }
      const button = (label, onClick, extra = {}) => h('button', { className: 'dsh-capy-btn', disabled: busy || !feed.connected, onClick, ...extra }, label)
      const row = (title, hint, control) => h('div', { className: 'dsh-capy-row', key: title }, h('div', null, h('strong', null, title), hint ? h('div', { className: 'dsh-capy-hint' }, hint) : null), control)
      const upload = event => {
        const image = event.target.files?.[0]
        event.target.value = ''
        if (!image) return
        if (image.type !== 'image/png' || image.size > 4 * 1024 * 1024) { setMessage(t('choosePng')); return }
        void run(async () => {
          const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error(t('readFailed'))); reader.readAsDataURL(image) })
          await mutate('/image', { dataUrl })
        })
      }
      const desktopEnabled = !!state?.desktopEnabled
      const desktopReady = state?.desktopStatus === 'ready'
      const desktopHint = !desktopEnabled
        ? t('desktopHintOff')
        : desktopReady ? t('desktopHintReady') : t('desktopHintStarting')
      const commitScale = () => { if (!state || Math.round(state.scale * 100) === size) return; void run(() => mutate('/scale', { scale: size / 100 })) }
      return h('div', { className: 'dsh-capy-section', dir: isRtl() ? 'rtl' : undefined },
        h('div', { role: 'status' }, feed.connected ? t('connected', { status: t('desktop_' + (state?.desktopStatus || (state?.desktop ? 'ready' : 'off'))) }) : feed.error || t('connecting')),
        state?.desktopError && h('div', { className: 'dsh-capy-hint' }, state.desktopError),
        row(t('floatingRow'), t('floatingHint'), button(state?.enabled ? t('hidePet') : t('showPet'), () => run(() => mutate('/enabled', { enabled: !state?.enabled })), { 'aria-pressed': !!state?.enabled })),
        row(t('statusBubbleRow'), t('statusBubbleHint'), h('div', { className: 'dsh-capy-row' },
          h('select', { className: 'dsh-capy-btn', 'aria-label': t('muteDuration'), value: String(state?.snoozeMinutes || 30), onChange: e => run(() => mutate('/snooze-minutes', { minutes: Number(e.target.value) })) },
            [10, 30, 60, 240].map(m => h('option', { key: m, value: String(m) }, t('minutes', { n: m })))),
          button(state?.snoozed ? t('unmute') : t('muteNow'), () => run(() => mutate('/snooze', { minutes: state?.snoozed ? 0 : state?.snoozeMinutes || 30 })), { 'aria-pressed': !!state?.snoozed }))),
        row(t('thinkingRow'), t('thinkingHint'), button(state?.showThinking ? t('hideThinking') : t('showThinking'), () => run(() => mutate('/thinking', { enabled: !state?.showThinking })), { 'aria-pressed': !!state?.showThinking })),
        row(t('desktopRow'), desktopHint, button(!desktopEnabled ? t('enableDesktop') : desktopReady ? t('usePageOnly') : t('retryDesktop'), () => run(() => mutate(!desktopEnabled || !desktopReady ? '/desktop/show' : '/desktop/hide')), { 'aria-pressed': desktopEnabled })),
        row(t('petSizeRow'), t('petSizeHint'), h('label', null, h('input', { type: 'range', min: 50, max: 250, step: 5, value: size, disabled: !feed.connected, 'aria-label': t('petSizeAria'), onChange: e => setSize(Number(e.target.value)), onPointerUp: commitScale, onKeyUp: commitScale }), ' ' + size + '%')),
        row(t('petArtRow'), t('petArtHint'), h('div', null,
          state && h('img', { className: 'dsh-capy-preview', alt: t('petArtCurrent'), src: ROUTE + '/image?v=' + (state.imageRevision ?? Number(state.hasCustom)) }),
          h('input', { ref: file, type: 'file', accept: 'image/png', hidden: true, onChange: upload }),
          button(t('replaceImage'), () => file.current.click()), state?.hasCustom && button(t('resetArtwork'), () => run(() => mutate('/reset'))))),
        row(t('notifyRow'), t('notifyHint'), button(state?.notificationsEnabled ? t('disableNotifications') : t('enableNotifications'), () => run(async () => { if (state?.notificationsEnabled) return mutate('/notifications', { enabled: false }); if (typeof Notification === 'undefined') throw new Error(t('notificationsUnavailable')); const permission = await Notification.requestPermission(); if (permission !== 'granted') throw new Error(t('permissionResult', { result: permission })); await mutate('/notifications', { enabled: true }) }), { 'aria-pressed': !!state?.notificationsEnabled })),
        row(t('languageRow'), t('languageHint'), h('select', { className: 'dsh-capy-btn', 'aria-label': t('languageRow'), value: state?.language || language, onChange: event => { const next = event.target.value; setLanguage(next); void run(() => mutate('/language', { language: next })) } },
          LANGUAGES.map(code => h('option', { key: code, value: code }, LANGUAGE_NAMES[code])))),
        h('div', { className: 'dsh-capy-hint' }, t('keyboardHint')),
        message && h('div', { role: 'alert' }, message))
    }

    function apply(ctx) {
      const openChat = id => {
        const workspace = typeof ctx.get === 'function' ? ctx.get('uiWorkspace') : undefined
        if (workspace && typeof workspace.openSession === 'function') { workspace.openSession(id); return }
        throw new Error(t('goToChatFailed'))
      }
      const style = document.createElement('style')
      style.dataset.pluginCss = 'dsh-capyreporter'
      style.textContent = CSS
      document.head.appendChild(style)
      onNavigate = openChat
      ctx.effect(() => () => { onNavigate = null; style.remove(); stopped = true; clearTimeout(timer); active?.abort(); uninstallWake() }, 'dsh-capyreporter: client cleanup')
      ctx.slots.inject('shell.overlay', function* () { yield ctx.slots.register({ name: 'shell.overlay', id: 'dsh-capyreporter-overlay', order: 500 }, () => h(PetOverlay, { onOpenChat: openChat })) })
      ctx.slots.inject('settings.section', function* () { yield ctx.slots.register({ name: 'settings.section', id: 'dsh-capyreporter', order: 90, label: '🐾 CapyReporter' }, () => h(PetSettings)) })
    }
    return { name: 'capyreporter', inject: ['slots'], apply }
  }
}
window.__ModuleLoader__.load({ id: 'dsh-capyreporter', factory: makeFactory() })
