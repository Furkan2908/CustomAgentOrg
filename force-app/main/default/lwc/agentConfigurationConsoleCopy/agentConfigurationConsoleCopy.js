import { LightningElement, api, wire, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { getRecord, updateRecord } from 'lightning/uiRecordApi';
import { getObjectInfo, getPicklistValues } from 'lightning/uiObjectInfoApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import getAvatarUrl from '@salesforce/apex/AgentConfigurationController.getAvatarUrl';
import publishConfig from '@salesforce/apex/AgentConfigPublishService.publishConfig';
import aviAvatar from "@salesforce/resourceUrl/aviAvatarBG";
import getVersions from '@salesforce/apex/AgentConfigurationController.getVersions';

import AGENT_OBJECT  from '@salesforce/schema/Agent_Configuration__c';
import THEME_MODE    from '@salesforce/schema/Agent_Configuration__c.Theme_Mode__c';
import FONT_FAMILY_FIELD from '@salesforce/schema/Agent_Configuration__c.Font_family__c';

import VERSION_OBJECT        from '@salesforce/schema/Agent_Config_Version__c';
import VERSION_NUMBER        from '@salesforce/schema/Agent_Config_Version__c.Version_Number__c';
import VERSION_IS_ACTIVE     from '@salesforce/schema/Agent_Config_Version__c.Is_Active__c';
import VERSION_CREATED_DATE  from '@salesforce/schema/Agent_Config_Version__c.CreatedDate';

import SHOW_PANEL        from '@salesforce/schema/Agent_Configuration__c.showPanel__c';
import SHOW_SIDE_PANEL   from '@salesforce/schema/Agent_Configuration__c.showSidePanel__c';
import AGENT_NAME        from '@salesforce/schema/Agent_Configuration__c.Agent_name__c';
import AVATAR_URL        from '@salesforce/schema/Agent_Configuration__c.Avatar_URL__c';
import BACKGROUND_COLOR  from '@salesforce/schema/Agent_Configuration__c.Background_Color__c';
import BOT_BUBBLE        from '@salesforce/schema/Agent_Configuration__c.Bot_Bubble_Color__c';
import BOT_MSG           from '@salesforce/schema/Agent_Configuration__c.Bot_message_color__c';
import BOT_TEXT          from '@salesforce/schema/Agent_Configuration__c.Bot_Text_Color__c';
import HEADER_COLOR      from '@salesforce/schema/Agent_Configuration__c.Header_color__c';
import HEADER_CONTENT    from '@salesforce/schema/Agent_Configuration__c.Header_Content__c';
import PRIMARY_COLOR     from '@salesforce/schema/Agent_Configuration__c.Primary_Color__c';
import SECONDARY_COLOR   from '@salesforce/schema/Agent_Configuration__c.Secondary_Color__c';
import USER_MSG          from '@salesforce/schema/Agent_Configuration__c.User_message_color__c';
import USER_BUBBLE       from '@salesforce/schema/Agent_Configuration__c.User_Bubble_Color__c';
import USER_TEXT         from '@salesforce/schema/Agent_Configuration__c.User_Text_Color__c';
import FONT_FAMILY       from '@salesforce/schema/Agent_Configuration__c.Font_family__c';
import FONT              from '@salesforce/schema/Agent_Configuration__c.Font__c';
import HEADER_FONT       from '@salesforce/schema/Agent_Configuration__c.Header_font_size__c';
import MSG_FONT          from '@salesforce/schema/Agent_Configuration__c.Message_font_size__c';
import GRADIENT_START    from '@salesforce/schema/Agent_Configuration__c.Gradient_Start__c';
import GRADIENT_END      from '@salesforce/schema/Agent_Configuration__c.Gradient_End__c';
import HOME_W            from '@salesforce/schema/Agent_Configuration__c.Home_Panel_Width__c';
import HOME_H            from '@salesforce/schema/Agent_Configuration__c.Home_Panel_Height__c';
import HOME_R            from '@salesforce/schema/Agent_Configuration__c.Home_Panel_border_radius__c';
import INPUT_PLACEHOLDER from '@salesforce/schema/Agent_Configuration__c.Input_Placeholder__c';
import SIDE_TOAST        from '@salesforce/schema/Agent_Configuration__c.Side_Panel_Toast_Msg__c';
import SIDE_W            from '@salesforce/schema/Agent_Configuration__c.Side_Panel_Width__c';
import SIDE_H            from '@salesforce/schema/Agent_Configuration__c.Size_Panel_Height__c';
import SPARKLE           from '@salesforce/schema/Agent_Configuration__c.Sparkle_Color__c';
import WELCOME_DESC      from '@salesforce/schema/Agent_Configuration__c.Welcome_Description__c';
import WELCOME_DISC      from '@salesforce/schema/Agent_Configuration__c.Welcome_Disclaimer__c';
import WELCOME_MSG       from '@salesforce/schema/Agent_Configuration__c.Welcome_Message__c';
import WIFI              from '@salesforce/schema/Agent_Configuration__c.Wifi_Ring_Color__c';
import EMBEDDED_API      from '@salesforce/schema/Agent_Configuration__c.Embedded_Service_API_Name__c';
import FIRST_BOT_MESSAGE from '@salesforce/schema/Agent_Configuration__c.First_Bot_Message__c';
import HOME_AVATAR_RADIUS from '@salesforce/schema/Agent_Configuration__c.Home_Panel_Avatar_Border_Radius__c';
import ENABLE_PRECHAT    from '@salesforce/schema/Agent_Configuration__c.Enable_PreChat__c';
import SEND_ICON         from '@salesforce/schema/Agent_Configuration__c.Send_Button_Icon_URL__c';
import PRECHAT_CONFIG    from '@salesforce/schema/Agent_Configuration__c.PreChat_Fields_Config__c';
import TYPING_INDICATOR  from '@salesforce/schema/Agent_Configuration__c.Typing_Indicator_Text__c';

const FIELDS = [
    TYPING_INDICATOR, PRECHAT_CONFIG, SEND_ICON, ENABLE_PRECHAT,
    HOME_AVATAR_RADIUS, FIRST_BOT_MESSAGE, SHOW_PANEL, SHOW_SIDE_PANEL,
    AGENT_NAME, AVATAR_URL, BACKGROUND_COLOR, BOT_BUBBLE, BOT_MSG, BOT_TEXT,
    HEADER_COLOR, HEADER_CONTENT, PRIMARY_COLOR, SECONDARY_COLOR, USER_MSG,
    USER_BUBBLE, USER_TEXT, FONT_FAMILY, FONT, HEADER_FONT, MSG_FONT,
    GRADIENT_START, GRADIENT_END, HOME_W, HOME_H, HOME_R, INPUT_PLACEHOLDER,
    SIDE_TOAST, SIDE_W, SIDE_H, SPARKLE, THEME_MODE, WELCOME_DESC,
    WELCOME_DISC, WELCOME_MSG, WIFI, EMBEDDED_API
];

const FIELD_MAP = {
    showPanel__c                       : SHOW_PANEL,
    showSidePanel__c                   : SHOW_SIDE_PANEL,
    Agent_name__c                      : AGENT_NAME,
    Avatar_URL__c                      : AVATAR_URL,
    Background_Color__c                : BACKGROUND_COLOR,
    Bot_Bubble_Color__c                : BOT_BUBBLE,
    Bot_message_color__c               : BOT_MSG,
    Bot_Text_Color__c                  : BOT_TEXT,
    Header_color__c                    : HEADER_COLOR,
    Header_Content__c                  : HEADER_CONTENT,
    Primary_Color__c                   : PRIMARY_COLOR,
    Secondary_Color__c                 : SECONDARY_COLOR,
    User_message_color__c              : USER_MSG,
    User_Bubble_Color__c               : USER_BUBBLE,
    User_Text_Color__c                 : USER_TEXT,
    Font_family__c                     : FONT_FAMILY,
    Font__c                            : FONT,
    Header_font_size__c                : HEADER_FONT,
    Message_font_size__c               : MSG_FONT,
    Gradient_Start__c                  : GRADIENT_START,
    Gradient_End__c                    : GRADIENT_END,
    Home_Panel_Width__c                : HOME_W,
    Home_Panel_Height__c               : HOME_H,
    Home_Panel_border_radius__c        : HOME_R,
    Input_Placeholder__c               : INPUT_PLACEHOLDER,
    Side_Panel_Toast_Msg__c            : SIDE_TOAST,
    Side_Panel_Width__c                : SIDE_W,
    Size_Panel_Height__c               : SIDE_H,
    Sparkle_Color__c                   : SPARKLE,
    Theme_Mode__c                      : THEME_MODE,
    Welcome_Description__c             : WELCOME_DESC,
    Welcome_Disclaimer__c              : WELCOME_DISC,
    Welcome_Message__c                 : WELCOME_MSG,
    Wifi_Ring_Color__c                 : WIFI,
    Embedded_Service_API_Name__c       : EMBEDDED_API,
    First_Bot_Message__c               : FIRST_BOT_MESSAGE,
    Home_Panel_Avatar_Border_Radius__c : HOME_AVATAR_RADIUS,
    Enable_PreChat__c                  : ENABLE_PRECHAT,
    Send_Button_Icon_URL__c            : SEND_ICON,
    PreChat_Fields_Config__c           : PRECHAT_CONFIG,
    Typing_Indicator_Text__c           : TYPING_INDICATOR
};

const RENDER_DEFAULTS = {
    primaryColor    : '#1a3cff',
    secondaryColor  : '#EAF1FB',
    backgroundColor : '#ffffff',
    headerColor     : '#1a3cff',
    gradientStart   : '',
    gradientEnd     : '',
    userBubbleColor : '#1a3cff',
    userMsgColor    : '#ffffff',
    botBubbleColor  : '#ffffff',
    botMsgColor     : '#1F2937',
    botTextColor    : '#1F2937',
    userTextColor   : '#ffffff',
    headerFontSize  : 18,
    messageFontSize : 14,
    homeWidth       : 700,
    homeHeight      : 560,
    homeRadius      : 24,
    homeAvatarRadius: 50,
    sideWidth       : 320,
    sideHeight      : 640,
    wifiColor       : '#c7b4f8',
    sparkleColor    : '#F5A623',
    agentName       : '',
    headerContent   : '',
    welcomeMessage  : 'Hello! I am your Agentforce Assistant.',
    welcomeDesc     : 'How can I help you today?',
    welcomeDisc     : '',
    inputPlaceholder: 'Type a message...',
    typingIndicator : 'Agent is typing...',
    sideToastMsg    : '👋 Need help? Chat with us!',
    firstBotMessage : 'Hello! How can I help you?',
    embeddedApiName : '',
    fontFamily      : 'System UI',
};

// FIX AG_TC_H161, S105, S106, S118, S121, S133
const SLIDER_BOUNDS = {
    Home_Panel_Width__c                : { min: 320,  max: 1500 },
    Home_Panel_Height__c               : { min: 400,  max: 700  },
    Home_Panel_border_radius__c        : { min: 0,    max: 30   },
    Home_Panel_Avatar_Border_Radius__c : { min: 0,    max: 50   },
    Side_Panel_Width__c                : { min: 200,  max: 800  },
    Size_Panel_Height__c               : { min: 400,  max: 900  },
    Header_font_size__c                : { min: 12,   max: 32   },
    Message_font_size__c               : { min: 12,   max: 32   },
};

// FIX AG_TC_G030/G037 — max avatar file size: 20 MB
const MAX_AVATAR_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

export default class AgentConfigurationConsole extends NavigationMixin(LightningElement) {
    @api recordId;

    @track showVersionHistory = false;
    @track versions           = [];
    @track versionsLoading    = false;
    @track versionsError      = null;

    wiredResult;
    record;
    draftValues      = {};
    themeModeOptions = [];
    fontFamilyOptions = [];
    uploadedFileName  = '';
    uploadedSendIcon  = '';

    showLauncher    = true;
    showSidePreview = false;
    isChatStarted   = false;
    isPrechatStep   = false;
    isWelcomeStep   = false;

    @track messages      = [];
    @track currentInput  = '';
    @track prechatFields = [];
    @track avatar = aviAvatar;

    isHomePrechatStep = false;
    isHomeChatActive  = true;
    isHomeChatStarted = false;

    @track homeMessages     = [];
    @track homeCurrentInput = '';

    isPanelCollapsed = false;
    _panelWidth      = 420;
    _minPanelWidth   = 200;
    _maxPanelWidth   = 700;
    _isDragging      = false;
    _dragStartX      = 0;
    _dragStartWidth  = 0;
    _boundMouseMove  = null;
    _boundMouseUp    = null;

    isHomeTab   = true;
    isSideTab   = false;
    isCommonTab = false;

    showBranding   = false;
    showSizing     = false;
    showMessages   = false;

    showCommonBranding    = true;
    showCommonColors      = false;
    showCommonTypography  = false;
    showCommonMessages    = false;
    showCommonIntegration = false;

    bgColorType = 'solid';

    showHomeConfirmModal = false;
    showConfirmModal     = false;

    @track hasUnpublishedChanges = false;

    // FIX AG_TC_C036 / AG_TC_C043
    _isSendingMessage     = false;
    _isSendingHomeMessage = false;
    _sendDebounceTimer    = null;
    _sendHomeDebounceTimer = null;

    // =========================================================================
    // LIFECYCLE
    // =========================================================================

    connectedCallback() {
        this.initPrechatFields();
        this.initHomeState();
    }

    disconnectedCallback() {
        if (this._boundMouseMove){ 
            document.removeEventListener('mousemove', this._boundMouseMove);
        }
        if (this._boundMouseUp)   {
            document.removeEventListener('mouseup',   this._boundMouseUp);
        }
        document.body.style.userSelect = '';
        document.body.style.cursor     = '';
        if (this._sendDebounceTimer)     {
            clearTimeout(this._sendDebounceTimer);
        }
        if (this._sendHomeDebounceTimer) {
            clearTimeout(this._sendHomeDebounceTimer);
        }
    }

    // =========================================================================
    // WIRE ADAPTERS
    // =========================================================================

    @wire(getRecord, { recordId: '$recordId', fields: FIELDS })
    wiredRecord(result) {
        this.wiredResult = result;
        if (result.data) {
            this.record = result.data;
            const raw = result.data.fields?.[PRECHAT_CONFIG.fieldApiName]?.value;
            try {
                const parsed = raw ? JSON.parse(raw) : [];
                this.prechatFields = parsed.map(f => ({
                    ...f,
                    id: f.id || (Date.now() + Math.random())
                }));
            } catch (e) {
                this.prechatFields = [];
            }
            this.initHomeState();
        }
        if (result.error) {
            console.error('getRecord error:', result.error);
        }
    }

    @wire(getObjectInfo, { objectApiName: AGENT_OBJECT })
    objectInfo;

    @wire(getPicklistValues, {
        recordTypeId: '$objectInfo.data.defaultRecordTypeId',
        fieldApiName: THEME_MODE
    })
    wiredThemeMode({ data, error }) {
        if (data)  {
            this.themeModeOptions = data.values;
        }
        if (error) {
            console.error('ThemeMode picklist error:', error);
        }
    }

    @wire(getPicklistValues, {
        recordTypeId: '$objectInfo.data.defaultRecordTypeId',
        fieldApiName: FONT_FAMILY_FIELD
    })
    wiredFontFamily({ data, error }) {
        if (data)  {
            this.fontFamilyOptions = data.values;
        }
        if (error) {
            console.error('FontFamily picklist error:', error);
        }
    }

    @wire(getVersions, { configId: '$recordId' })
    wiredVersions({ data, error }) {
        if (data) {
            this.versions = data.map(v => ({
                id          : v.Id,
                name        : v.Name,
                versionNum  : v.Version_Number__c,
                numClass    : v.Is_Active__c ? 'vh-num vh-num--active' : 'vh-num',
                isActive    : v.Is_Active__c,
                createdDate : v.CreatedDate
                    ? new Date(v.CreatedDate).toLocaleString('en-US', {
                        month : 'short',
                        day   : 'numeric',
                        year  : 'numeric',
                        hour  : 'numeric',
                        minute: '2-digit'
                    })
                    : ''
            }));
            this.versionsError = null;
        }
        if (error) {
            this.versionsError = error?.body?.message || 'Failed to load versions';
            console.error('getVersions error:', error);
        }
    }

    // =========================================================================
    // CORE UPDATE HELPERS
    // =========================================================================

    updateField(fieldRef, value) {
        const fields = {
            Id: this.recordId,
            [fieldRef.fieldApiName]: value
        };
        return updateRecord({ fields });
    }

    updateFields(fieldValueMap) {
        const fields = { Id: this.recordId };
        Object.entries(fieldValueMap).forEach(([ref, val]) => {
            const apiName = (ref && ref.fieldApiName) ? ref.fieldApiName : ref;
            fields[apiName] = val;
        });
        return updateRecord({ fields });
    }

    // =========================================================================
    // FIELD ACCESSOR HELPERS
    // =========================================================================

    get field() {
        return this.record?.fields;
    }

    _fieldValue(schemaRef, fallback = '') {
        return this.field?.[schemaRef.fieldApiName]?.value ?? fallback;
    }

    // =========================================================================
    // SAFE GETTERS
    // =========================================================================

    get safeWelcomeMessage()   { return this._fieldValue(WELCOME_MSG,        RENDER_DEFAULTS.welcomeMessage); }
    get safeWelcomeDisc()      { return this._fieldValue(WELCOME_DISC,       RENDER_DEFAULTS.welcomeDisc); }
    get safeAgentName()        { return this._fieldValue(AGENT_NAME,         RENDER_DEFAULTS.agentName); }
    get safeHeaderContent()    { return this._fieldValue(AGENT_NAME,     RENDER_DEFAULTS.headerContent); }
    get safeInputPlaceholder() { return this._fieldValue(INPUT_PLACEHOLDER,  RENDER_DEFAULTS.inputPlaceholder); }
    get safeEmbeddedApi()      { return this._fieldValue(EMBEDDED_API,       RENDER_DEFAULTS.embeddedApiName); }
    get safeFontFamily()       { return this._fieldValue(FONT_FAMILY,        RENDER_DEFAULTS.fontFamily); }
    get safeHeaderFontSize()   { return this._fieldValue(HEADER_FONT,        RENDER_DEFAULTS.headerFontSize); }
    get safeMsgFontSize()      { return this._fieldValue(MSG_FONT,           RENDER_DEFAULTS.messageFontSize); }
    get safeHomePanelRadius()  { return this._fieldValue(HOME_R,             RENDER_DEFAULTS.homeRadius); }
    get safeHomeAvatarRadius() { return this._fieldValue(HOME_AVATAR_RADIUS, RENDER_DEFAULTS.homeAvatarRadius); }
    get safeGradientStart()    { return this._fieldValue(GRADIENT_START,     RENDER_DEFAULTS.gradientStart); }
    get safeGradientEnd()      { return this._fieldValue(GRADIENT_END,       RENDER_DEFAULTS.gradientEnd); }
    get safeHeaderColor()      { return this._fieldValue(HEADER_COLOR,       RENDER_DEFAULTS.headerColor); }
    get safePrimaryColor()     { return this._fieldValue(PRIMARY_COLOR,      RENDER_DEFAULTS.primaryColor); }
    get safeSecondaryColor()   { return this._fieldValue(SECONDARY_COLOR,    RENDER_DEFAULTS.secondaryColor); }
    get safeBgColor()          { return this._fieldValue(BACKGROUND_COLOR,   RENDER_DEFAULTS.backgroundColor); }
    get safeUserBubble()       { return this._fieldValue(USER_BUBBLE,        RENDER_DEFAULTS.userBubbleColor); }
    get safeUserMsg()          { return this._fieldValue(USER_MSG,           RENDER_DEFAULTS.userMsgColor); }
    get safeBotBubble()        { return this._fieldValue(BOT_BUBBLE,         RENDER_DEFAULTS.botBubbleColor); }
    get safeBotMsg()           { return this._fieldValue(BOT_MSG,            RENDER_DEFAULTS.botMsgColor); }

    // FIX AG_TC_G279 — Typing Indicator: truncate for preview display only (60 chars max)
    get safeTypingIndicator() {
        const val = this._fieldValue(TYPING_INDICATOR, RENDER_DEFAULTS.typingIndicator);
        return val.length > 60 ? val.substring(0, 57) + '...' : val;
    }

    // Raw value for form input (not truncated)
    get safeTypingIndicatorRaw() {
        return this._fieldValue(TYPING_INDICATOR, RENDER_DEFAULTS.typingIndicator);
    }

    // FIX AG_TC_S003 — Header Content preview truncation
    get safeHeaderContentPreview() {
        const val = this._fieldValue(HEADER_CONTENT, RENDER_DEFAULTS.headerContent);
        return val.length > 40 ? val.substring(0, 37) + '...' : val;
    }

    // FIX AG_TC_S009 — Toast Message preview truncation
    get safeSideToastPreview() {
        const val = this._fieldValue(SIDE_TOAST, RENDER_DEFAULTS.sideToastMsg);
        return val.length > 60 ? val.substring(0, 57) + '...' : val;
    }

    get safeSideToast()         { return this._fieldValue(SIDE_TOAST, RENDER_DEFAULTS.sideToastMsg); }
    get safeFirstBotMessage()   { return this._fieldValue(FIRST_BOT_MESSAGE, RENDER_DEFAULTS.firstBotMessage); }

    // FIX AG_TC_H003/H014 — Welcome Title preview truncation
    get safeWelcomeMessagePreview() {
        const val = this._fieldValue(WELCOME_MSG, RENDER_DEFAULTS.welcomeMessage);
        return val.length > 80 ? val.substring(0, 77) + '...' : val;
    }

    // FIX AG_TC_H018 — Welcome Description: show default when empty
    get safeWelcomeDesc() {
        const val = this._fieldValue(WELCOME_DESC, '');
        return (val && val.trim()) ? val : RENDER_DEFAULTS.welcomeDesc;
    }

    get safeWelcomeDescRaw() {
        return this._fieldValue(WELCOME_DESC, '');
    }

    // FIX AG_TC_S023 — First Bot Message: show default when empty
    get safeFirstBotMessagePreview() {
        const val = this._fieldValue(FIRST_BOT_MESSAGE, '');
        return (val && val.trim()) ? val : RENDER_DEFAULTS.firstBotMessage;
    }

    // FIX AG_TC_H161 — Home panel clamped width/height
    get safeHomePanelWidth() {
        const raw = this._fieldValue(HOME_W, RENDER_DEFAULTS.homeWidth);
        return this._clampSlider('Home_Panel_Width__c', Number(raw));
    }

    get safeHomePanelHeight() {
        const raw = this._fieldValue(HOME_H, RENDER_DEFAULTS.homeHeight);
        return this._clampSlider('Home_Panel_Height__c', Number(raw));
    }

    // FIX AG_TC_S105/S106/S118 — Side panel clamped width
    get safeSidePanelWidth() {
        const raw = this._fieldValue(SIDE_W, RENDER_DEFAULTS.sideWidth);
        return this._clampSlider('Side_Panel_Width__c', Number(raw));
    }

    // FIX AG_TC_S121/S133 — Side panel clamped height
    get safeSidePanelHeight() {
        const raw = this._fieldValue(SIDE_H, RENDER_DEFAULTS.sideHeight);
        return this._clampSlider('Size_Panel_Height__c', Number(raw));
    }

    _clampSlider(fieldName, value) {
        const bounds = SLIDER_BOUNDS[fieldName];
        if (!bounds) {
            return value;
        }
        if (isNaN(value)) {
            return bounds.min;
        }
        return Math.min(bounds.max, Math.max(bounds.min, value));
    }

    // =========================================================================
    // PRIVATE STYLE GETTERS
    // =========================================================================

    get _primary()        { return this._fieldValue(PRIMARY_COLOR); }
    get _secondary()      { return this._fieldValue(SECONDARY_COLOR); }
    get _bg()             { return this._fieldValue(BACKGROUND_COLOR); }
    get _header()         { return this._fieldValue(HEADER_COLOR); }
    get _gradStart()      { return this._fieldValue(GRADIENT_START); }
    get _gradEnd()        { return this._fieldValue(GRADIENT_END); }
    get _font()           { return this._fieldValue(FONT_FAMILY) || this._fieldValue(FONT); }
    get _headerFontSize() { return this._fieldValue(HEADER_FONT); }
    get _msgFontSize()    { return this._fieldValue(MSG_FONT); }
    get _botMsg()         { return this._fieldValue(BOT_MSG); }
    get _userMsg()        { return this._fieldValue(USER_MSG); }
    get _botBubble()      { return this._fieldValue(BOT_BUBBLE); }
    get _userBubble()     { return this._fieldValue(USER_BUBBLE); }
    get _botText()        { return this._fieldValue(BOT_TEXT); }
    get _userText()       { return this._fieldValue(USER_TEXT); }
    get _homeW()          { return this.safeHomePanelWidth; }
    get _homeH()          { return this.safeHomePanelHeight; }
    get _homeR()          { return this._fieldValue(HOME_R); }
    get _sideW()          { return this.safeSidePanelWidth; }
    get _sideH()          { return this.safeSidePanelHeight; }

    // FIX AG_TC_H065/H066/S061/S069/H074
    get _gradientBg() {
        const start = this._gradStart;
        const end   = this._gradEnd;
        if (start && start.trim() && end && end.trim()) {
            return `linear-gradient(160deg, ${start} 0%, ${end} 100%)`;
        }
        if (start && start.trim()){ 
            return start;
        }
        if (end   && end.trim()) {
            return end;
        }
        return this._bg || '#f0f4ff';
    }

    get _fontFamily() {
        switch (this._font) {
            case 'Inter':              return "'Inter', sans-serif";
            case 'System UI':          return "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
            case 'Georgia':            return 'Georgia, serif';
            case 'Monaco (Monospace)': return "Monaco, Consolas, 'Courier New', monospace";
            default:                   return "'Inter', -apple-system, sans-serif";
        }
    }

    // =========================================================================
    // COLOR CONTRAST UTILITY
    // FIX AG_TC_H084/H100/H115/H124
    // =========================================================================

    _getLuminance(hex) {
        if (!hex) {return 1;}
        const clean = hex.replace('#', '');
        const full  = clean.length === 3
            ? clean.split('').map(c => c + c).join('')
            : clean;
        const r = parseInt(full.substring(0, 2), 16) / 255;
        const g = parseInt(full.substring(2, 4), 16) / 255;
        const b = parseInt(full.substring(4, 6), 16) / 255;
        const toLinear = (c) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    }

    _getContrastColor(bgHex) {
        const luminance = this._getLuminance(bgHex);
        return luminance > 0.179 ? '#000000' : '#ffffff';
    }

    _getContrastRatio(hex1, hex2) {
        const l1 = this._getLuminance(hex1);
        const l2 = this._getLuminance(hex2);
        const lighter = Math.max(l1, l2);
        const darker  = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
    }

    _resolveTextColor(bubbleHex, textHex, fallback) {
        if (!bubbleHex || !textHex) {return fallback;}
        const ratio = this._getContrastRatio(bubbleHex, textHex);
        if (ratio < 3) {
            return this._getContrastColor(bubbleHex);
        }
        return textHex;
    }

    // =========================================================================
    // BOOLEAN / TOGGLE GETTERS
    // =========================================================================

    get showHomePanel() {
        return this._fieldValue(SHOW_PANEL, false) === true;
    }

    get showSidePanelChecked() {
        return this._fieldValue(SHOW_SIDE_PANEL, false) === true;
    }

    get enablePrechat() {
        return this._fieldValue(ENABLE_PRECHAT, false) === true;
    }

    // =========================================================================
    // HOME PANEL STATE
    // =========================================================================

    initHomeState() {
        if (this.enablePrechat) {
            this.isHomePrechatStep = true;
            this.isHomeChatActive  = false;
        } else {
            this.isHomePrechatStep = false;
            this.isHomeChatActive  = true;
        }
        this.isHomeChatStarted = false;
        this.homeMessages      = [];

        const firstBotMsg = this.safeFirstBotMessagePreview.trim();
        if (firstBotMsg) {
            this.homeMessages = [{ text: firstBotMsg, type: 'bot' }];
        }
        this.homeCurrentInput = '';
    }

    get isHomePrechatBackVisible() {
        return this.enablePrechat && !this.isHomeChatStarted;
    }

    goHomeToChat() {
        this.isHomePrechatStep = false;
        this.isHomeChatActive  = true;
    }

    goBackToHomePrechat() {
        this.isHomePrechatStep = true;
        this.isHomeChatActive  = false;
        this.isHomeChatStarted = false;
        this.homeMessages      = [];
        this.homeCurrentInput  = '';
    }

    handleHomeInputChange(event) {
        this.homeCurrentInput = event.target.value;
    }

    sendHomeMessage() {
        const trimmed = (this.homeCurrentInput || '').trim();
        if (!trimmed || this._isSendingHomeMessage) {
            return;
        }

        if (this._sendHomeDebounceTimer) {
            clearTimeout(this._sendHomeDebounceTimer);
        }

        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this._sendHomeDebounceTimer = setTimeout(() => {
            this._isSendingHomeMessage = true;

            if (!this.isHomeChatStarted) {
                this.isHomeChatStarted = true;
            }

            this.homeMessages = [
                ...this.homeMessages,
                { text: trimmed, type: 'user' }
            ];
            this.homeCurrentInput = '';

            // eslint-disable-next-line @lwc/lwc/no-async-operation
            setTimeout(() => {
                this.homeMessages = [
                    ...this.homeMessages,
                    { text: 'Hi 👋 This is a demo reply to showcase chat UI.', type: 'bot' }
                ];
                this._isSendingHomeMessage = false;
            }, 500);
        }, 300);
    }

    get formattedHomeMessages() {
        return this.homeMessages.map((msg, index) => {
            const isUser = msg.type === 'user';

            const userBubble  = this._userBubble || '#4A3AFF';
            const userText    = this._resolveTextColor(userBubble, this._userMsg, '#ffffff');
            const botBubble   = this._botBubble || '#ffffff';
            const botText     = this._resolveTextColor(botBubble, this._botMsg, '#1F2937');

            return {
                ...msg,
                id       : index,
                isUser   : isUser,
                userStyle: `background:${userBubble};color:${userText};font-size:${this._msgFontSize || 14}px;font-family:${this._fontFamily};`,
                botStyle : `background:${botBubble};color:${botText};font-size:${this._msgFontSize || 14}px;font-family:${this._fontFamily};`
            };
        });
    }

    handleHomePanelKeyPress(event) {
        if (event.key === 'Enter') {
            this.sendHomeMessage();
        }
    }

    resetHomeChat() {
        this.isHomeChatStarted = false;
        this.homeMessages      = [];
        this.homeCurrentInput  = '';
    }

    // FIX AG_TC_H161
    get homePanelStyle() {
        if (!this.field) {
            return '';
        }
        const s = [
            `background:${this._gradientBg}`,
            `font-family:${this._fontFamily}`
        ];
        if (this._homeW) {
            s.push(`width:${this._homeW}px`);
        }
        if (this._homeH) {
            s.push(`height:${this._homeH}px`);
            s.push('overflow:hidden');
        }
        if (this._homeR) { 
            s.push(`border-radius:${this._homeR}px`);
        }
        return s.join(';');
    }

    get homeChatHeaderStyle() {
        return `background:${this._header || this._primary || '#2D6CDF'}; color:#ffffff;`;
    }

    get homeAgentNameStyle() {
        return [
            `color:${this._primary || '#1a3cff'}`,
            `font-size:${this._msgFontSize || 16}px`,
            `font-family:${this._fontFamily}`,
            'font-weight:600',
            'overflow:hidden',
            'text-overflow:ellipsis',
            'white-space:nowrap',
            'max-width:100%'
        ].join(';');
    }

    get homeBotBubbleStyle() {
        const botBubble = this._botBubble || '#ffffff';
        const botText   = this._resolveTextColor(botBubble, this._botMsg, '#1F2937');
        return [
            `background:${botBubble}`,
            `color:${botText}`,
            `font-family:${this._fontFamily}`,
            `font-size:${this._msgFontSize || 14}px`
        ].join(';');
    }

    get homePrechatTitleStyle() {
        const titleSize = Math.round((this._headerFontSize || 28) * 0.72);
        return [
            `color:${this._primary || '#2952CC'}`,
            `font-size:${titleSize}px`,
            `font-family:${this._fontFamily}`,
            'word-break:break-word',
            'overflow-wrap:break-word'
        ].join(';');
    }

    get homePrechatSubtitleStyle() {
        return [
            `color:${this._botMsg || '#1F2937'}`,
            `font-size:${this._msgFontSize || 15}px`,
            `font-family:${this._fontFamily}`,
            'word-break:break-word',
            'overflow-wrap:break-word'
        ].join(';');
    }

    // FIX AG_TC_G053/G063/G075/G094 — prechat label overflow
    get homePrechatLabelStyle() {
        const labelSize = Math.max((this._msgFontSize || 15) - 2, 12);
        return [
            `color:${this._primary || '#2952CC'}`,
            `font-size:${labelSize}px`,
            `font-family:${this._fontFamily}`,
            'word-break:break-word',
            'overflow-wrap:break-word',
            'max-width:100%',
            'display:block',
            'white-space:normal'
        ].join(';');
    }

    // FIX AG_TC_H003/H014
    get homeTitleStyle() {
        if (!this.field) {
            return '';
        }
        return [
            `color:${this._primary || '#2952CC'}`,
            `font-size:${this._headerFontSize || 28}px`,
            `font-family:${this._fontFamily}`,
            'word-break:break-word',
            'overflow-wrap:break-word',
            'max-width:100%',
            'white-space:normal',
            'text-align:center'
        ].join(';');
    }

    get homeDescStyle() {
        if (!this.field) {
            return '';
        }
        return [
            `color:${this._botMsg || '#3d3d3d'}`,
            `font-size:${this._msgFontSize || 15}px`,
            `font-family:${this._fontFamily}`,
            'word-break:break-word',
            'overflow-wrap:break-word',
            'text-align:center'
        ].join(';');
    }

    get homeInputSectionStyle() { return ''; }
    get homeInputBarStyle()     { return ''; }

    get homeInputFieldStyle() {
        if (!this.field) {
            return '';
        }
        return `font-family:${this._fontFamily}; font-size:${this._msgFontSize || 15}px;`;
    }

    get homeSendBtnStyle() {
        return `background:${this._primary || '#111111'}; color:#ffffff;`;
    }

    get homeChatCompactHeaderStyle() {
        return `background:${this._header || this._primary || '#4A3AFF'}; color:#ffffff;`;
    }

    get homeChatCompactNameStyle() {
        return `font-family:${this._fontFamily}; font-size:${this._msgFontSize || 14}px;`;
    }

    // =========================================================================
    // PRECHAT FIELDS
    // =========================================================================

    initPrechatFields() {
        try {
            const raw    = this._fieldValue(PRECHAT_CONFIG);
            const parsed = raw ? JSON.parse(raw) : [];
            this.prechatFields = parsed.map(f => ({
                ...f,
                id: f.id || Date.now() + Math.random()
            }));
        } catch (e) {
            console.error('Invalid PreChat JSON', e);
            this.prechatFields = [];
        }
    }

    addPrechatField() {
        this.prechatFields = [
            ...this.prechatFields,
            {
                id      : Date.now() + Math.random(),
                label   : '',
                apiName : '',
                type    : 'text',
                required: false
            }
        ];
    }

    removePrechatField(event) {
        const index   = parseInt(event.target.dataset.index, 10);
        const updated = [...this.prechatFields];
        updated.splice(index, 1);
        this.prechatFields = updated;
    }

    // FIX AG_TC_G048/G070/G089 — trim spaces; FIX AG_TC_G069/G088 — empty label validation
    // FIX AG_TC_G053/G063/G075/G094 — max 100 char label
    handlePrechatFieldChange(event) {
        const index = parseInt(event.target.dataset.index, 10);
        const key   = event.target.dataset.key;
        let value   = event.target.type === 'checkbox'
            ? event.target.checked
            : event.target.value;

        if (typeof value === 'string') {
            value = value.trim();
        }

        if (key === 'label') {
            if (!value) {
                this.dispatchEvent(new ShowToastEvent({
                    title  : 'Validation Error',
                    message: 'Label cannot be empty.',
                    variant: 'warning'
                }));
                event.target.value = this.prechatFields[index]?.label || '';
                return;
            }
            if (value.length > 100) {
                this.dispatchEvent(new ShowToastEvent({
                    title  : 'Validation Error',
                    message: `Label must not exceed 100 characters (currently ${value.length}).`,
                    variant: 'warning'
                }));
                event.target.value = value.substring(0, 100);
                value = value.substring(0, 100);
            }
        }

        if (key === 'apiName') {
            if (!value) {
                this.dispatchEvent(new ShowToastEvent({
                    title  : 'Validation Error',
                    message: 'API Name cannot be empty.',
                    variant: 'warning'
                }));
                event.target.value = this.prechatFields[index]?.apiName || '';
                return;
            }
            if (/\s/.test(value)) {
                this.dispatchEvent(new ShowToastEvent({
                    title  : 'Validation Error',
                    message: 'Spaces are not allowed in API Name.',
                    variant: 'warning'
                }));
                return;
            }
            // if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(value)) {
            //     this.dispatchEvent(new ShowToastEvent({
            //         title  : 'Validation Error',
            //         message: 'API Name must start with a letter and contain only letters, numbers, or underscores.',
            //         variant: 'warning'
            //     }));
            //     return;
            // }
            if (value.length > 100) {
                this.dispatchEvent(new ShowToastEvent({
                    title  : 'Validation Error',
                    message: 'API Name must not exceed 100 characters.',
                    variant: 'warning'
                }));
                event.target.value = value.substring(0, 100);
                value = value.substring(0, 100);
            }
            const isDuplicate = this.prechatFields.some(
                (f, i) => i !== index && f.apiName === value
            );
            if (isDuplicate) {
                this.dispatchEvent(new ShowToastEvent({
                    title  : 'Duplicate API Name',
                    message: `API Name "${value}" is already used by another field.`,
                    variant: 'warning'
                }));
                return;
            }
        }

        const updated  = [...this.prechatFields];
        updated[index] = { ...updated[index], [key]: value };
        this.prechatFields = updated;

        if (typeof value === 'string') {
            event.target.value = value;
        }
    }

    savePrechatFields() {
        const fieldErrors = [];

        this.prechatFields.forEach((pf, idx) => {
            const label   = (pf.label   || '').trim();
            const apiName = (pf.apiName || '').trim();

            if (!label) {
                fieldErrors.push(`Field ${idx + 1}: Label cannot be empty.`);
            } else if (label.length > 100) {
                fieldErrors.push(`Field ${idx + 1}: Label must not exceed 100 characters.`);
            }

            if (!apiName) {
                fieldErrors.push(`Field ${idx + 1}: API Name cannot be empty.`);
            } 
            else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(apiName)) {
                fieldErrors.push(`Field ${idx + 1}: Invalid API Name format.`);
            }

            const dupeCount = this.prechatFields.filter(f => (f.apiName || '').trim() === apiName && apiName).length;
            if (dupeCount > 1) {
                fieldErrors.push(`Field ${idx + 1}: Duplicate API Name "${apiName}".`);
            }
        });

        if (fieldErrors.length > 0) {
            this.dispatchEvent(new ShowToastEvent({
                title  : 'Prechat Validation Error',
                message: fieldErrors.slice(0, 3).join(' '),
                variant: 'error',
                mode   : 'sticky'
            }));
            return;
        }

        const normalized = this.prechatFields.map(f => ({
            ...f,
            label  : (f.label   || '').trim(),
            apiName: (f.apiName || '').trim()
        }));

        this.updateField(PRECHAT_CONFIG, JSON.stringify(normalized))
            .then(() => refreshApex(this.wiredResult))
            .then(() => {
                this.dispatchEvent(new ShowToastEvent({
                    title  : 'Saved',
                    message: 'Pre-chat fields saved successfully',
                    variant: 'success'
                }));
            })
            .catch(err => {
                console.error('Prechat save error', err);
                this.dispatchEvent(new ShowToastEvent({
                    title  : 'Error',
                    message: err?.body?.message || 'Failed to save',
                    variant: 'error'
                }));
            });
    }

    get prechatTypeOptions() {
        return [
            { label: 'Text',   value: 'text'   },
            { label: 'Email',  value: 'email'  },
            { label: 'Phone',  value: 'tel'    },
            { label: 'Number', value: 'number' }
        ];
    }

    // =========================================================================
    // TOGGLE HANDLERS
    // =========================================================================

    handleToggle(event) {
        if (!this.recordId) {
            return;
        }
        this.updateField(SHOW_PANEL, event.target.checked)
            .then(() => refreshApex(this.wiredResult))
            .catch(error => console.error('Error saving home panel toggle:', JSON.stringify(error)));
    }

    handleSidePanelToggle(event) {
        if (!this.recordId) {
            return;
        }
        this.updateField(SHOW_SIDE_PANEL, event.target.checked)
            .then(() => refreshApex(this.wiredResult))
            .catch(error => console.error('Error saving side panel toggle:', JSON.stringify(error)));
    }

    handlePrechatToggle(event) {
        const isChecked = event.target.checked;
        this.updateField(ENABLE_PRECHAT, isChecked)
            .then(() => refreshApex(this.wiredResult))
            .catch(err => console.error('Prechat toggle error', err));

        if (isChecked) {
            this.isHomePrechatStep = true;
            this.isHomeChatActive  = false;
        } else {
            this.isHomePrechatStep = false;
            this.isHomeChatActive  = true;
        }
        this.isHomeChatStarted = false;
        this.homeMessages      = [];
    }

    // =========================================================================
    // GENERIC FIELD CHANGE HANDLER
    // =========================================================================

    validateField(bareFieldName, value) {
        const errors = [];

        const rules = {
            Agent_name__c                      : { required: true,  maxLength: 100,   label: 'Agent Name' },
            Header_Content__c                  : { maxLength: 255,  label: 'Header Content' },
            Welcome_Message__c                 : { maxLength: 255,  label: 'Welcome Title' },
            Welcome_Description__c             : { maxLength: 500,  label: 'Welcome Description' },
            Input_Placeholder__c               : { maxLength: 255,  label: 'Input Placeholder' },
            Typing_Indicator_Text__c           : { maxLength: 255,  label: 'Typing Indicator Text' },
            Side_Panel_Toast_Msg__c            : { maxLength: 255,  label: 'Toast Message' },
            First_Bot_Message__c               : { maxLength: 32768, label: 'Initial Bot Message' },
            Embedded_Service_API_Name__c       : { maxLength: 255,  noSpaces: true, label: 'Embedded Service API Name' },
            Header_color__c                    : { isColor: true,   label: 'Header Color' },
            Gradient_Start__c                  : { isColor: true,   label: 'Background Primary' },
            Gradient_End__c                    : { isColor: true,   label: 'Background Secondary' },
            User_Bubble_Color__c               : { isColor: true,   label: 'User Bubble Color' },
            User_message_color__c              : { isColor: true,   label: 'User Message Color' },
            Bot_Bubble_Color__c                : { isColor: true,   label: 'Bot Bubble Color' },
            Bot_message_color__c               : { isColor: true,   label: 'Bot Message Color' },
            Home_Panel_Width__c                : { min: 320,  max: 1500, isNumber: true, label: 'Home Panel Width' },
            Home_Panel_Height__c               : { min: 400,  max: 700,  isNumber: true, label: 'Home Panel Height' },
            Home_Panel_border_radius__c        : { min: 0,    max: 30,   isNumber: true, label: 'Border Radius' },
            Home_Panel_Avatar_Border_Radius__c : { min: 0,    max: 50,   isNumber: true, label: 'Avatar Border Radius' },
            Side_Panel_Width__c                : { min: 200,  max: 800,  isNumber: true, label: 'Side Panel Width' },
            Size_Panel_Height__c               : { min: 400,  max: 900,  isNumber: true, label: 'Side Panel Height' },
            Header_font_size__c                : { min: 12,   max: 32,   isNumber: true, label: 'Header Font Size' },
            Message_font_size__c               : { min: 12,   max: 32,   isNumber: true, label: 'Message Font Size' },
        };

        const rule = rules[bareFieldName];
        if (!rule) {
            return [];
        }

        const strVal = (value ?? '').toString().trim();

        if (rule.required && !strVal) {
            errors.push(`${rule.label} is required.`);
        }

        if (rule.maxLength && strVal.length > rule.maxLength) {
            errors.push(`${rule.label} must not exceed ${rule.maxLength} characters (currently ${strVal.length}).`);
        }

        if (rule.noSpaces && /\s/.test(strVal)) {
            errors.push(`${rule.label} must not contain spaces.`);
        }

        if (rule.isColor && strVal && !/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(strVal)) {
            errors.push(`${rule.label} must be a valid hex color (e.g. #FF0000).`);
        }

        if (rule.isNumber) {
            const num = parseFloat(value);
            if (isNaN(num)) {
                errors.push(`${rule.label} must be a number.`);
            } else {
                if (rule.min !== undefined && num < rule.min)
                    errors.push(`${rule.label} must be at least ${rule.min}.`);
                if (rule.max !== undefined && num > rule.max)
                    errors.push(`${rule.label} must be at most ${rule.max}.`);
            }
        }

        return errors;
    }

    handleChange(event) {
        const bareFieldName = event.target.dataset.field;
        let   value         = event.target.value;
        const fieldRef      = FIELD_MAP[bareFieldName];

        if (!fieldRef) {
            console.error(`[AgentConfigConsole] No FIELD_MAP entry for: "${bareFieldName}"`);
            return;
        }

        // FIX AG_TC_G048/G070/G089
        if (typeof value === 'string') {
            value = value.trim();
            event.target.value = value;
        }

        const errors = this.validateField(bareFieldName, value);
        if (errors.length > 0) {
            this.dispatchEvent(new ShowToastEvent({
                title  : 'Validation Error',
                message: errors.join(' '),
                variant: 'error',
                mode   : 'sticky'
            }));
            return;
        }

        const contrastWarnings = this._validateContrast(bareFieldName, value);
        if (contrastWarnings.length > 0) {
            this.dispatchEvent(new ShowToastEvent({
                title  : 'Contrast Warning',
                message: contrastWarnings.join(' ') + ' The preview will auto-correct for readability.',
                variant: 'warning'
            }));
        }

        this.updateField(fieldRef, value)
            .then(() => {
                this.hasUnpublishedChanges = true;
                return refreshApex(this.wiredResult);
            })
            .catch(error => {
                console.error('Error updating field:', error);
                this.dispatchEvent(new ShowToastEvent({
                    title  : 'Error',
                    message: error?.body?.message || 'Failed to update field',
                    variant: 'error'
                }));
            });
    }

    _validateContrast(bareFieldName, newValue) {
        const errors = [];
        const norm   = (val) => (val || '').trim().toUpperCase();

        const currentUserBubble = norm(this._fieldValue(USER_BUBBLE));
        const currentUserMsg    = norm(this._fieldValue(USER_MSG));
        const currentBotBubble  = norm(this._fieldValue(BOT_BUBBLE));
        const currentBotMsg     = norm(this._fieldValue(BOT_MSG));

        const incoming = norm(newValue);

        if (bareFieldName === 'User_Bubble_Color__c' && incoming && currentUserMsg && incoming === currentUserMsg) {
            errors.push('User Bubble and User Message colors are identical — text will be invisible.');
        }

        if (bareFieldName === 'User_message_color__c' && incoming && currentUserBubble && incoming === currentUserBubble) {
            errors.push('User Message color matches the User Bubble — text will be invisible.');
        }

        if (bareFieldName === 'Bot_Bubble_Color__c' && incoming && currentBotMsg && incoming === currentBotMsg) {
            errors.push('Bot Bubble and Bot Message colors are identical — text will be invisible.');
        }

        if (bareFieldName === 'Bot_message_color__c' && incoming && currentBotBubble && incoming === currentBotBubble) {
            errors.push('Bot Message color matches the Bot Bubble — text will be invisible.');
        }

        return errors;
    }

    // =========================================================================
    // SLIDER — live preview + clamped save
    // FIX AG_TC_H161, S105, S106, S118, S121, S133
    // =========================================================================

    handleSliderInput(event) {
        const bareFieldName = event.target.dataset.field;
        const fieldRef      = FIELD_MAP[bareFieldName];

        if (!fieldRef) {
            console.error(`[AgentConfigConsole] No FIELD_MAP entry for slider field: "${bareFieldName}"`);
            return;
        }

        const raw     = Number(event.target.value);
        const clamped = this._clampSlider(bareFieldName, raw);

        if (clamped !== raw) {
            event.target.value = clamped;
        }

        this.record = {
            ...this.record,
            fields: {
                ...this.record.fields,
                [fieldRef.fieldApiName]: {
                    ...this.record.fields[fieldRef.fieldApiName],
                    value: clamped
                }
            }
        };
    }

// =========================================================================
// AVATAR / SEND ICON UPLOAD
// FIX AG_TC_G030/G037 — max 20 MB
// FIX AG_TC_G031/G043 — corrupted image validation (pre-upload, via native input)
// =========================================================================

/**
 * Validates a File object: size, MIME type, and image decodability.
 * Returns a Promise resolving to { valid: boolean, message?: string }.
 */
    validateImageFile(file) {
        return new Promise((resolve) => {
            if (!file || file.size === 0) {
                resolve({ valid: false, message: 'File is empty or corrupted.' });
                return;
            }
            if (file.size > MAX_AVATAR_SIZE_BYTES) {
                const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
                resolve({
                    valid: false,
                    message: `File size (${sizeMB} MB) exceeds the 20 MB limit. Please upload a smaller image.`
                });
                return;
            }
            const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                resolve({ valid: false, message: 'Unsupported format. Please use PNG, JPG, SVG, or GIF.' });
                return;
            }
            // Decode the image to catch corruption
            const reader = new FileReader();
            reader.onload = () => {
                const img    = new Image();
                img.onload  = () => resolve({ valid: true });
                img.onerror = () => resolve({
                    valid: false,
                    message: 'The image file appears corrupted or invalid. Please use a valid image file.'
                });
                img.src = reader.result;
            };
            reader.onerror = () => resolve({
                valid: false,
                message: 'Unable to read the file — it may be corrupted.'
            });
            reader.readAsDataURL(file);
        });
    }

    /**
     * Called by the native <input type="file"> for avatar (data-upload="avatar").
     * Validates BEFORE handing off to the Salesforce upload chain.
     */
    async handleNativeFileChange(event) {
        const file   = event.target.files && event.target.files[0];
        const target = event.target.dataset.upload; // 'avatar' | 'sendicon'
        event.target.value = ''; // reset so the same file can be re-chosen after an error

        if (!file){ 
            return;
        }

        const { valid, message } = await this.validateImageFile(file);
        if (!valid) {
            this.dispatchEvent(new ShowToastEvent({
                title  : 'Invalid File',
                message: message,
                variant: 'error',
                mode   : 'sticky'
            }));
            return;
        }

        // File is clean — store it so the lightning-file-upload onuploadfinished
        // handler knows which logical slot to update.
        this._pendingUploadTarget = target;

        // Programmatically click the hidden lightning-file-upload input
        // so Salesforce handles the actual Content Version creation.
        const lwcInput = this.template.querySelector(
            target === 'avatar' ? '.hidden-lwc-avatar' : '.hidden-lwc-sendicon'
        );
        if (lwcInput) {
            // lightning-file-upload renders a real <input type="file"> internally
            const inner = lwcInput.querySelector('input[type="file"]');
            if (inner) {
                // Attach the already-validated File via a DataTransfer so the
                // LWC upload sees exactly what the user chose.
                const dt = new DataTransfer();
                dt.items.add(file);
                inner.files = dt.files;
                inner.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    }

    /**
     * Fires after Salesforce finishes the upload (avatar slot).
     */
    handleUploadFinished(event) {
        const uploadedFiles = event.detail.files;
        if (!uploadedFiles?.length) {
            return;
        }

        if (this._lastValidationFailed) {
            this._lastValidationFailed = false;
            return;
        }

        const fileInfo   = uploadedFiles[0];
        const documentId = fileInfo.documentId || fileInfo.contentVersionId;
        this.uploadedFileName = fileInfo.name;

        getAvatarUrl({ contentDocumentId: documentId })
            .then(result => {
                if (!result) {
                    throw new Error('Empty avatar URL response');
                }
                return this.updateField(AVATAR_URL, result);
            })
            .then(() => refreshApex(this.wiredResult))
            .then(() => {
                this.dispatchEvent(new ShowToastEvent({
                    title  : 'Success',
                    message: 'Avatar updated successfully',
                    variant: 'success'
                }));
            })
            .catch(error => {
                console.error('Avatar upload error:', error);
                this.dispatchEvent(new ShowToastEvent({
                    title  : 'Error',
                    message: error?.body?.message || 'Failed to update avatar',
                    variant: 'error'
                }));
            });
    }

    /**
     * Fires after Salesforce finishes the upload (send-icon slot).
     */
    handleSendIconUpload(event) {
        const file = event.detail.files[0];
        if (!file) {
            return;
        }
        const documentId = file.documentId || file.contentVersionId;

        getAvatarUrl({ contentDocumentId: documentId })
            .then(url => {
                this.uploadedSendIcon = url;
                return this.updateField(SEND_ICON, url);
            })
            .then(() => refreshApex(this.wiredResult))
            .then(() => {
                this.dispatchEvent(new ShowToastEvent({
                    title  : 'Success',
                    message: 'Send icon updated successfully',
                    variant: 'success'
                }));
            })
            .catch(err => {
                console.error('Send icon upload error:', err);
                this.dispatchEvent(new ShowToastEvent({
                    title  : 'Error',
                    message: err?.body?.message || 'Failed to update send icon',
                    variant: 'error'
                }));
            });
    }

    get sendIconUrl() { return this._fieldValue(SEND_ICON, ''); }
    get hasSendIcon() { return !!this.sendIconUrl; }
    get avatarUrl()   { return this._fieldValue(AVATAR_URL, ''); }
    get hasAvatar()   { return !!this.avatarUrl; }

    // =========================================================================
    // COLOR PICKER
    // =========================================================================

    openColorPicker(event) {
        const input = event.currentTarget.querySelector('input[type="color"]');
        if (input) {
            input.click();
        }
    }

    // =========================================================================
    // RESIZABLE CONFIG PANEL
    // =========================================================================

    get configPanelClass() {
        return this.isPanelCollapsed ? 'config-panel collapsed' : 'config-panel';
    }

    get configPanelStyle() {
        return this.isPanelCollapsed ? 'width:0;' : `width:${this._panelWidth}px;`;
    }

    get resizeHandleClass() {
        const base = 'resize-handle';
        if (this.isPanelCollapsed) {
            return `${base} panel-collapsed`;
        }
        if (this._isDragging) {
            return `${base} dragging`;
        }
        return base;
    }

    get collapseTooltip() {
        return this.isPanelCollapsed ? 'Expand panel' : 'Collapse panel';
    }

    toggleCollapse(event) {
        event.stopPropagation();
        this.isPanelCollapsed = !this.isPanelCollapsed;
    }

    startResize(event) {
        if (event.target.closest('.resize-collapse-btn')) {
            return;
        }
        if (this.isPanelCollapsed) {
            return;
        }

        this._isDragging     = true;
        this._dragStartX     = event.clientX;
        this._dragStartWidth = this._panelWidth;

        this._boundMouseMove = this._onMouseMove.bind(this);
        this._boundMouseUp   = this._onMouseUp.bind(this);

        document.addEventListener('mousemove', this._boundMouseMove);
        document.addEventListener('mouseup',   this._boundMouseUp);
        document.body.style.userSelect = 'none';
        document.body.style.cursor     = 'col-resize';
        event.preventDefault();
    }

    _onMouseMove(event) {
        if (!this._isDragging) {
            return;
        }
        const delta    = event.clientX - this._dragStartX;
        const newWidth = Math.min(
            this._maxPanelWidth,
            Math.max(this._minPanelWidth, this._dragStartWidth + delta)
        );
        this._panelWidth = newWidth;
        const panel = this.template.querySelector('.config-panel');
        if (panel) {
            panel.style.width = `${newWidth}px`;
        }
    }

    _onMouseUp() {
        if (!this._isDragging) {
            return;
        }
        this._isDragging = false;
        document.removeEventListener('mousemove', this._boundMouseMove);
        document.removeEventListener('mouseup',   this._boundMouseUp);
        document.body.style.userSelect = '';
        document.body.style.cursor     = '';
        this._boundMouseMove = null;
        this._boundMouseUp   = null;
    }

    // =========================================================================
    // TAB ACTIVATION
    // =========================================================================

    activateHomeTab()   { this.isHomeTab = true;  this.isSideTab = false; this.isCommonTab = false; }
    activateSideTab()   { this.isHomeTab = false; this.isSideTab = true;  this.isCommonTab = false; }
    activateCommonTab() { this.isHomeTab = false; this.isSideTab = false; this.isCommonTab = true;  }

    get homePanelTabClass() { return this.isHomeTab   ? 'tab-active' : ''; }
    get sidePanelTabClass() { return this.isSideTab   ? 'tab-active' : ''; }
    get commonTabClass()    { return this.isCommonTab ? 'tab-active' : ''; }

    // =========================================================================
    // ACCORDION TOGGLES
    // =========================================================================

    toggleBranding()          { this.showBranding         = !this.showBranding; }
    toggleSizing()            { this.showSizing            = !this.showSizing; }
    toggleMessages()          { this.showMessages          = !this.showMessages; }
    toggleCommonBranding()    { this.showCommonBranding    = !this.showCommonBranding; }
    toggleCommonColors()      { this.showCommonColors      = !this.showCommonColors; }
    toggleCommonTypography()  { this.showCommonTypography  = !this.showCommonTypography; }
    toggleCommonMessages()    { this.showCommonMessages    = !this.showCommonMessages; }
    toggleCommonIntegration() { this.showCommonIntegration = !this.showCommonIntegration; }

    get _chevronDown() {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
    }

    get _chevronUp() {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`;
    }

    get brandingChevron()          { return this.showBranding         ? this._chevronUp : this._chevronDown; }
    get sizingChevron()            { return this.showSizing            ? this._chevronUp : this._chevronDown; }
    get messagesChevron()          { return this.showMessages          ? this._chevronUp : this._chevronDown; }
    get commonBrandingChevron()    { return this.showCommonBranding    ? this._chevronUp : this._chevronDown; }
    get commonColorsChevron()      { return this.showCommonColors      ? this._chevronUp : this._chevronDown; }
    get commonTypographyChevron()  { return this.showCommonTypography  ? this._chevronUp : this._chevronDown; }
    get commonMessagesChevron()    { return this.showCommonMessages    ? this._chevronUp : this._chevronDown; }
    get commonIntegrationChevron() { return this.showCommonIntegration ? this._chevronUp : this._chevronDown; }

    // =========================================================================
    // SIDE PANEL FLOW
    // =========================================================================

    openSidePanel() {
        this.showLauncher    = false;
        this.showSidePreview = true;

        if (this.enablePrechat) {
            this.isPrechatStep = true;
            this.isWelcomeStep = false;
            this.isChatStarted = false;
        } else {
            this.isPrechatStep = false;
            this.isWelcomeStep = true;
        }
    }

    goToWelcomeScreen() {
        this.isPrechatStep = false;
        this.isWelcomeStep = true;
    }

    goBackToLauncher() {
        this.showLauncher    = true;
        this.showSidePreview = false;
        this.isPrechatStep   = false;
        this.isWelcomeStep   = false;
        this.isChatStarted   = false;
    }

    goBackToPrechat() {
        this.isPrechatStep = true;
        this.isWelcomeStep = false;
        this.isChatStarted = false;
        this.messages      = [];
        this.currentInput  = '';
    }

    // =========================================================================
    // SIDE PANEL CHAT
    // FIX AG_TC_C036 / AG_TC_C043
    // =========================================================================

    handleInputChange(event) {
        this.currentInput = event.target.value;
    }

    sendMessage() {
        const trimmed = (this.currentInput || '').trim();
        if (!trimmed || this._isSendingMessage) {
            return;
        }

        if (this._sendDebounceTimer) {
            clearTimeout(this._sendDebounceTimer);
        }

        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this._sendDebounceTimer = setTimeout(() => {
            this._isSendingMessage = true;

            if (!this.isChatStarted) {
                this.isChatStarted = true;
                this.isWelcomeStep = false;
            }

            const isFirstMessage = this.messages.length === 0;
            if (isFirstMessage) {
                const firstBotMsg = this.safeFirstBotMessagePreview.trim();
                if (firstBotMsg) {
                    this.messages = [{ text: firstBotMsg, type: 'bot' }];
                }
            }

            this.messages = [
                ...this.messages,
                { text: trimmed, type: 'user' }
            ];
            this.currentInput = '';

            // eslint-disable-next-line @lwc/lwc/no-async-operation
            setTimeout(() => {
                this.messages = [
                    ...this.messages,
                    { text: 'Hi 👋 This is a demo reply to showcase chat UI.', type: 'bot' }
                ];
                this._isSendingMessage = false;
            }, 500);
        }, 300);
    }

    get formattedMessages() {
        return this.messages.map((msg, index) => {
            const isUser = msg.type === 'user';

            const userBubble = this._userBubble || '#4A3AFF';
            const userText   = this._resolveTextColor(userBubble, this._userMsg, '#ffffff');
            const botBubble  = this._botBubble  || '#ffffff';
            const botText    = this._resolveTextColor(botBubble,  this._botMsg,  '#1a1a2e');

            return {
                ...msg,
                id      : index,
                isUser  : isUser,
                cssClass: isUser ? 'prev-user-bubble' : 'prev-bot-bubble',
                style   : isUser
                    ? `background:${userBubble};color:${userText};font-size:${this._msgFontSize || 14}px;font-family:${this._fontFamily};`
                    : `background:${botBubble};color:${botText};font-size:${this._msgFontSize || 14}px;font-family:${this._fontFamily};`
            };
        });
    }

    // =========================================================================
    // BACKGROUND TYPE
    // =========================================================================

    get isBgSolid()           { return this.bgColorType === 'solid'; }
    get bgTypeSolidClass()    { return this.bgColorType === 'solid'    ? 'bg-type-active' : ''; }
    get bgTypeGradientClass() { return this.bgColorType === 'gradient' ? 'bg-type-active' : ''; }
    setBgTypeSolid()          { this.bgColorType = 'solid'; }
    setBgTypeGradient()       { this.bgColorType = 'gradient'; }

    // =========================================================================
    // COLOR SWATCH / HEX HELPERS
    // =========================================================================

    _hex(val)   { 
        if (!val) {
            return '------'; 
        } 
        return val.replace('#', '').toUpperCase();
    }
    _swatch(val){ return `background:${val || '#cccccc'};`; }

    get primaryColorHex()       { return this._hex(this._primary); }
    get primaryColorSwatch()    { return this._swatch(this._primary); }
    get secondaryColorHex()     { return this._hex(this._secondary); }
    get secondaryColorSwatch()  { return this._swatch(this._secondary); }
    get bgColorHex()            { return this._hex(this._bg); }
    get bgColorSwatch()         { return this._swatch(this._bg); }
    get headerColorHex()        { return this._hex(this._header); }
    get headerColorSwatch()     { return this._swatch(this._header); }
    get gradientStartHex()      { return this._hex(this._gradStart); }
    get gradientStartSwatch()   { return this._swatch(this._gradStart); }
    get gradientEndHex()        { return this._hex(this._gradEnd); }
    get gradientEndSwatch()     { return this._swatch(this._gradEnd); }
    get userBubbleColorHex()    { return this._hex(this._userBubble); }
    get userBubbleColorSwatch() { return this._swatch(this._userBubble); }
    get userMsgColorHex()       { return this._hex(this._userMsg); }
    get userMsgColorSwatch()    { return this._swatch(this._userMsg); }
    get userTextColorHex()      { return this._hex(this._userText); }
    get userTextColorSwatch()   { return this._swatch(this._userText); }
    get botBubbleColorHex()     { return this._hex(this._botBubble); }
    get botBubbleColorSwatch()  { return this._swatch(this._botBubble); }
    get botMsgColorHex()        { return this._hex(this._botMsg); }
    get botMsgColorSwatch()     { return this._swatch(this._botMsg); }
    get botTextColorHex()       { return this._hex(this._botText); }
    get botTextColorSwatch()    { return this._swatch(this._botText); }
    get sparkleColorHex()       { return this._hex(this._fieldValue(SPARKLE)); }
    get sparkleColorSwatch()    { return this._swatch(this._fieldValue(SPARKLE)); }
    get wifiColorHex()          { return this._hex(this._fieldValue(WIFI)); }
    get wifiColorSwatch()       { return this._swatch(this._fieldValue(WIFI)); }

    // =========================================================================
    // PREVIEW STYLE GETTERS — HOME PANEL
    // =========================================================================

    get homeCardStyle() {
        if (!this.field) {
            return '';
        }
        return [
            `width:${this._homeW || 700}px`,
            `height:${this._homeH || 560}px`,
            `border-radius:${this._homeR || 24}px`,
            `background:${this._gradientBg}`,
            `font-family:${this._fontFamily}`,
            'overflow:hidden'
        ].join(';');
    }

    get homeAvatarStyle() {
        if (!this.field) {
            return '';
        }
        return `border-radius:${this._fieldValue(HOME_AVATAR_RADIUS)}%;`;
    }

    get homeHeroStyle() { return 'background: transparent;'; }

    get homeGlowStyle() {
        const glowColor = this.wifiColorHex || this._secondary || '#c7b4f8';
        return `background: radial-gradient(circle, ${glowColor}60 0%, transparent 65%);`;
    }

    get homeInputBarStyle()     { return ''; }

    get homeInputFieldStyle() {
        if (!this.field) {
            return '';
        }
        return `font-family:${this._fontFamily}; font-size:${this._msgFontSize || 15}px;`;
    }

    get homeSendBtnStyle() {
        return `background:${this._primary || '#111111'}; color:#ffffff;`;
    }

    get homeChatCompactHeaderStyle() {
        return `background:${this._header || this._primary || '#4A3AFF'}; color:#ffffff;`;
    }

    get homeChatCompactNameStyle() {
        return `font-family:${this._fontFamily}; font-size:${this._msgFontSize || 14}px;`;
    }

    // =========================================================================
    // PREVIEW STYLE GETTERS — SIDE / PHONE PANEL
    // FIX AG_TC_S105/S106/S118/S121/S133
    // =========================================================================

    get phoneOuterStyle() {
        if (!this.field) {
            return '';
        }
        return [
            `width:${this._sideW || 320}px`,
            `height:${this._sideH || 640}px`,
            `border-radius:${this._homeR || 40}px`,
            `background:${this._gradientBg}`,
            `font-family:${this._fontFamily}`,
            'overflow:hidden'
        ].join(';');
    }

    get phoneStatusStyle()  { return `background: transparent; color:${this._primary || '#1a1a2e'};`; }
    get phoneMenuStyle()    { return 'background: transparent;'; }

    get phoneMenuBtnStyle() {
        return `background:${this._bg || '#ffffff'}; color:${this._primary || '#1a1a2e'};`;
    }

    get phoneContentStyle() { return 'background: transparent;'; }

    get phoneAvatarRingStyle() {
        return `background:${this._bg || '#ffffff'}; border: 3px solid ${this._secondary || '#c7b4f8'};`;
    }

    // FIX AG_TC_S003 — prevent long header content overflowing
    get phoneAgentNameStyle() {
        if (!this.field) {
            return '';
        }
        return [
            `color:${this._primary || '#2952CC'}`,
            `font-size:${this._headerFontSize || 22}px`,
            `font-family:${this._fontFamily}`,
            'overflow:hidden',
            'text-overflow:ellipsis',
            'white-space:nowrap',
            'max-width:100%',
            'display:block'
        ].join(';');
    }

    get phoneWelcomeTextStyle() {
        if (!this.field) {
            return '';
        }
        return [
            `color:${this._botText || this._botMsg || '#3d3d3d'}`,
            `font-size:${this._msgFontSize || 15}px`,
            `font-family:${this._fontFamily}`,
            'word-break:break-word',
            'overflow-wrap:break-word'
        ].join(';');
    }

    get phoneInputSectionStyle() {
        return `background:${this._bg || '#ffffff'};`;
    }

    get phoneInputBarStyle() {
        return `background:${this._bg || '#f5f5f5'}; border: 1.5px solid ${this._secondary || '#e0e0e0'}33;`;
    }

    get phoneInputFieldStyle() {
        if (!this.field) {
            return '';
        }
        return `font-family:${this._fontFamily}; font-size:${this._msgFontSize || 14}px;`;
    }

    get phoneSendBtnStyle() {
        return `background:${this._primary || '#111111'}; color:#ffffff;`;
    }

    get sideChatHeaderStyle() {
        return `background:${this._header || this._primary || '#4A3AFF'}; color:#ffffff;`;
    }

    // =========================================================================
    // LEGACY ALIASES
    // =========================================================================

    get previewStyle() {
        if (!this.field) {
            return '';
        }
        return `
            --primary-color:${this._primary || '#155ac3'};
            --secondary-color:${this._secondary || '#EAF1FB'};
            --header-color:${this._header || '#2D6CDF'};
            --font-family:${this._fontFamily};
        `;
    }

    get homeContainerStyle() {
        if (!this.field) {
            return '';
        }
        const s = [];
        if (this._homeW) {
            s.push(`width:${this._homeW}px`);
        }
        if (this._homeH) {
            s.push(`height:${this._homeH}px`);
        }
        if (this._homeR) {
            s.push(`border-radius:${this._homeR}px`);
        }
        if (this._bg)    {
            s.push(`background:${this._bg}`);
        }
        return s.join(';');
    }

    get headerStyle()     { return this._header    ? `background:${this._header};`    : ''; }
    get botMsgStyle()     { return this._botMsg    ? `background:${this._botMsg};`    : ''; }
    get userMsgStyle()    { return this._userMsg   ? `background:${this._userMsg};`   : ''; }
    get botBubbleStyle()  { return this._botBubble ? `background:${this._botBubble};` : ''; }
    get userBubbleStyle() { return this._userBubble? `background:${this._userBubble};`: ''; }

    get chatPreviewStyle() {
        const s = [];
        if (this._bg)   {
            s.push(`background:${this._bg}`);
        }
        if (this._font){
             s.push(`font-family:${this._fontFamily}`);
        }
        return s.join(';');
    }

    get previewCardStyle()     { return this.homeCardStyle; }
    get previewHeroStyle()     { return this.homeHeroStyle; }
    get previewGlowStyle()     { return this.homeGlowStyle; }
    get previewTitleStyle()    { return this.homeTitleStyle; }
    get previewDescStyle()     { return this.homeDescStyle; }
    get previewInputBarStyle() { return this.homeInputBarStyle; }
    get previewInputStyle()    { return this.homeInputFieldStyle; }
    get previewSendBtnStyle()  { return this.homeSendBtnStyle; }
    get phoneFrameStyle()      { return this.phoneOuterStyle; }
    get phoneStatusBarStyle()  { return this.phoneStatusStyle; }
    get phoneMenuBarStyle()    { return this.phoneMenuStyle; }
    get phoneAvatarStyle()     { return this.phoneAvatarRingStyle; }
    get phoneTitleStyle()      { return this.phoneAgentNameStyle; }
    get phoneAgentTitleStyle() { return this.phoneAgentNameStyle; }
    get phoneWelcomeMsgStyle() { return this.phoneWelcomeTextStyle; }
    get phoneInputStyle()      { return this.phoneInputFieldStyle; }

    get heroPanelStyle() {
        return `background:transparent; font-family:${this._fontFamily};`;
    }

    get avatarGlowStyle() {
        const glowColor = this._fieldValue(WIFI) || this._secondary || '#c7b4f8';
        return `background: radial-gradient(circle, ${glowColor}60 0%, transparent 65%);`;
    }

    // FIX AG_TC_G053/G063/G075/G094 — long label overflow in side panel preview
    get preChatLabelStyle() {
        const labelSize = Math.max((this._msgFontSize || 15) - 2, 12);
        return [
            `color:${this._primary || '#2952CC'}`,
            `font-size:${labelSize}px`,
            `font-family:${this._fontFamily}`,
            'word-break:break-word',
            'overflow-wrap:break-word',
            'max-width:100%',
            'display:block',
            'white-space:normal'
        ].join(';');
    }

    get botBubbleStyle() {
        const botBubble = this._botBubble || '#ffffff';
        const botText   = this._resolveTextColor(botBubble, this._botMsg, '#1a1a2e');
        return [
            `background:${botBubble}`,
            `color:${botText}`,
            `font-family:${this._fontFamily}`,
            `font-size:${this._msgFontSize || 15}px`
        ].join(';');
    }

    handlePreviewKeyPress(event) {
        if (event.key === 'Enter') {
            this.sendMessage();
        }
    }

    clearAvatar() {
        this.uploadedFileName = '';
        this.updateField(AVATAR_URL, null)
            .then(() => refreshApex(this.wiredResult))
            .then(() => {
                this.dispatchEvent(new ShowToastEvent({
                    title  : 'Removed',
                    message: 'Avatar removed successfully',
                    variant: 'success'
                }));
            })
            .catch(err => console.error('Clear avatar error:', err));
    }

    clearSendIcon() {
        this.uploadedSendIcon = '';
        this.updateField(SEND_ICON, null)
            .then(() => refreshApex(this.wiredResult))
            .catch(err => console.error('Clear send icon error:', err));
    }

    askHomeEndChat()    { this.showHomeConfirmModal = true; }
    hideHomeModal()     { this.showHomeConfirmModal = false; }
    confirmHomeEndChat(){ this.showHomeConfirmModal = false; this.resetHomeChat(); }

    askEndChat()  { this.showConfirmModal = true; }
    hideModal()   { this.showConfirmModal = false; }

    confirmEndChat() {
        this.showConfirmModal = false;
        this.showLauncher     = true;
        this.showSidePreview  = false;
        this.isPrechatStep    = false;
        this.isWelcomeStep    = false;
        this.isChatStarted    = false;
        this.messages         = [];
        this.currentInput     = '';
    }

    async handlePublish() {
        const requiredChecks = [
            { ref: AGENT_NAME,   label: 'Agent Name' },
            { ref: EMBEDDED_API, label: 'Embedded Service API Name' },
        ];

        const missing = requiredChecks
            .filter(({ ref }) => !this._fieldValue(ref, '').trim())
            .map(({ label }) => label);

        if (missing.length > 0) {
            this.dispatchEvent(new ShowToastEvent({
                title  : 'Cannot Publish',
                message: `Please fill in: ${missing.join(', ')}`,
                variant: 'error',
                mode   : 'sticky'
            }));
            return;
        }

        try {
            await publishConfig({ configId: this.recordId });
            this.hasUnpublishedChanges = false;
            this.dispatchEvent(new ShowToastEvent({
                title  : 'Published',
                message: 'Configuration published successfully',
                variant: 'success'
            }));
        } catch (e) {
            console.error(e);
            this.dispatchEvent(new ShowToastEvent({
                title  : 'Error',
                message: e?.body?.message || 'Publish failed',
                variant: 'error'
            }));
        }
    }

    // FIX AG_TC_H074/S069
    clearGradientEnd() {
        this.updateField(GRADIENT_END, '')
            .then(() => {
                this.hasUnpublishedChanges = true;
                return refreshApex(this.wiredResult);
            })
            .catch(error => {
                console.error('Error clearing gradient end color:', error);
                this.dispatchEvent(new ShowToastEvent({
                    title  : 'Error',
                    message: error?.body?.message || 'Failed to clear secondary color',
                    variant: 'error'
                }));
            });
    }

    // =========================================================================
    // VERSION HISTORY
    // =========================================================================

    toggleVersionHistory() {
        this.showVersionHistory = !this.showVersionHistory;
    }

    get versionHistoryBtnClass() {
        return this.showVersionHistory
            ? 'version-history-btn version-history-btn--active'
            : 'version-history-btn';
    }

    get hasVersions()  { return this.versions && this.versions.length > 0; }
    get versionCount() { return this.versions ? this.versions.length : 0; }

    navigateToVersion(event) {
        const recordId = event.currentTarget.dataset.id;
        if (!recordId) {
            return;
        }
        this[NavigationMixin.Navigate]({
            type      : 'standard__recordPage',
            attributes: {
                recordId  : recordId,
                actionName: 'view'
            }
        });
    }

    renderedCallback() {
        if (this._fileInterceptAttached) {
            return;
        }
        this._fileInterceptAttached = true;
        this._attachFileInterceptors();
    }

    _attachFileInterceptors() {
        // lightning-file-upload renders a native <input type="file"> inside its shadow root
        // We listen in capture phase on the host element to intercept before upload fires

        const avatarUpload   = this.template.querySelector('.lwc-avatar-upload');
        const sendIconUpload = this.template.querySelector('.lwc-sendicon-upload');

        if (avatarUpload) {
            avatarUpload.addEventListener('change', (e) => {
                this._interceptUpload(e, 'avatar');
            }, true); // capture phase
        }

        if (sendIconUpload) {
            sendIconUpload.addEventListener('change', (e) => {
                this._interceptUpload(e, 'sendicon');
            }, true);
        }
    }

    async _interceptUpload(event, target) {
        const file = event.target.files && event.target.files[0];
        if (!file) {
            return;
        }

        const { valid, message } = await this.validateImageFile(file);
        if (!valid) {
            // Stop the upload from proceeding
            event.stopImmediatePropagation();
            event.preventDefault();

            // Clear the input so lightning-file-upload doesn't proceed
            try {
                event.target.value = '';
            } catch(e) { /* some browsers block this */ }

            this.dispatchEvent(new ShowToastEvent({
                title  : 'Invalid File',
                message: message,
                variant: 'error',
                mode   : 'sticky'
            }));
        }
        // If valid, do nothing — let lightning-file-upload proceed normally
    }
}