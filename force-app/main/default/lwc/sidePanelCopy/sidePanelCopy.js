import { LightningElement, wire, api, track } from "lwc";
import getConfigByName from '@salesforce/apex/AgentConfigService.getConfigByName';

import aviAvatar from "@salesforce/resourceUrl/aviAvatarBG";
import logo from "@salesforce/resourceUrl/chatbot1";

import {
    registerMessageContext,
    startConversation,
    sendMessage,
    closeChat,
    getState,
    loadConfig,
    getAvatarUrl,
    setAvatarUrl,
    restoreConversation,
    getSendIconUrl,
    setSendIconUrl,
    getSavedPreChatData 
} from "c/sharedConversationServiceCopy";

import { subscribe, MessageContext } from "lightning/messageService";
import ChatChannel from "@salesforce/messageChannel/chatMessageChannel__c";

export default class SidePanel extends LightningElement {

    /* ===============================
       STATE
    =============================== */

    panelOpen         = false;
    messages          = [];
    inputText         = "";
    showEndChatButton = false;
    showWelcomePop    = true;
    showConfirmModal  = false;

    hasStartedChat    = false;
    chatAvailable     = false;
    themeApplied      = false;

    @api configRecordId;
    logo = logo;

    @track config    = {};
    @track avatarUrl = aviAvatar;
    @track sendIcon  = '';

    _configLoaded = false;

    isBotTyping    = false;
    isAgentTyping  = false;
    isAgentJoining = false;

    // ── Pre-chat state ────────────────────────────────────────────────────────
    @track showPreChat   = false;
    @track preChatFields = {};      // keyed by apiName (dynamic)
    @track preChatErrors = {};

    @track isMobileView = false;
    _mobileMql = null;

    /* ===============================
       WIRE — receives AgentConfigDTO (namespace-free keys)
    =============================== */

    @wire(getConfigByName, { configName: '$configRecordId' })
    wiredConfig({ data, error }) {
        if (data) {
            this.config = data;

            // ✅ DTO keys
            if (data.avatarUrl) {
                this.avatarUrl = data.avatarUrl;
            }
            if (data.sendIconUrl) {
                this.sendIcon = data.sendIconUrl;
                setSendIconUrl(data.sendIconUrl);
            }

            setAvatarUrl(data.avatarUrl);
            this.applyDynamicTheme();
            this._configLoaded = true;
            this.tryRestoreConversation();
        }
        if (error) {
            console.error("Config load error:", error);
        }
    }

    /* ===============================
       VISIBILITY GETTERS
    =============================== */

    get isSidePanelVisible() {
        return this.config?.showSidePanel === true;      // ✅ DTO key
    }

    // ── Unified typing getter ─────────────────────────────────────────────────
    get isTyping() {
        return this.isBotTyping || this.isAgentTyping;
    }

    get showLauncher() { return !this.panelOpen; }
    get showToast()    { return this.showWelcomePop && !this.panelOpen; }
    get panelClasses() { return this.panelOpen ? "side-panel open" : "side-panel"; }
    get hasMessages()  { return this.messages.length > 0; }
    get firstBotMessage() {
        return this.config?.firstBotMessage || 'Hi there! How can I help you today ?';
    }

    /* ===============================
       PRIVATE THEME HELPERS — DTO keys
    =============================== */

    get _primary()        { return this.config?.primaryColor; }
    get _secondary()      { return this.config?.secondaryColor; }
    get _bg()             { return this.config?.backgroundColor; }
    get _header()         { return this.config?.headerColor; }
    get _gradStart()      { return this.config?.gradientStart; }
    get _gradEnd()        { return this.config?.gradientEnd; }
    get _font()           { return this.config?.fontFamily; }
    get _headerFontSize() { return this.config?.headerFontSize; }
    get _msgFontSize()    { return this.config?.messageFontSize; }
    get _botMsg()         { return this.config?.botMsgColor; }
    get _botBubble()      { return this.config?.botBubbleColor; }
    get _userBubble()     { return this.config?.userBubbleColor; }
    get _userMsg()        { return this.config?.userMsgColor; }
    get _wifiColor()      { return this.config?.wifiColor; }
    get _sparkleColor()   { return this.config?.sparkleColor; }
    get _sideW()          { return this.config?.sideWidth; }
    get _sideH()          { return this.config?.sideHeight; }
    get _homeR()          { return this.config?.homeRadius; }

    get _gradientBg() {
        if (this._gradStart && this._gradEnd)
            return `linear-gradient(270deg, ${this._gradStart} 0%, ${this._gradEnd} 100%)`;
        if (this._gradStart) return this._gradStart;
        if (this._gradEnd)   return this._gradEnd;
        // DEFAULT: matches screenshot
        return 'linear-gradient(270deg, #F9FAFF 0%, #F5F7FF 51.88%, #F2F4FF 100%)';
    }

    get _fontFamily() {
        switch (this._font) {
            case 'Inter':              return "'Inter', sans-serif";
            case 'System UI':          return "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
            case 'Georgia':            return "Georgia, serif";
            case 'Monaco (Monospace)': return "Monaco, Consolas, 'Courier New', monospace";
            default:                   return "Arial, Helvetica, sans-serif";
        }
    }

    /* ===============================
       STYLE GETTERS
    =============================== */

    get launcherBtnStyle() {
        return `background:${this._primary || '#2D6CDF'};`;
    }

    get panelOuterStyle() {
        const s = [
            `background:${this._gradientBg}`,
            `font-family:${this._fontFamily}`
        ];
        // Only apply admin-configured width/height/radius on desktop —
        // on mobile, CSS media queries handle full-screen sizing and
        // inline styles would otherwise override them.
        if (!this.isMobileView) {
            if (this._sideW) s.push(`width:${this._sideW}px`);
            if (this._sideH) s.push(`max-height:${this._sideH}px`);
            if (this._homeR) s.push(`border-radius:${this._homeR}px`);
        }
        return s.join(';');
    }

    get headerStyle() {
        return `background:${this._header || '#2D6CDF'}; color:#ffffff;`;
    }

    get heroPanelStyle() {
        return `background:transparent; font-family:${this._fontFamily};`;
    }

    get avatarRingStyle() {
    const bg     = '#ffffff';
    const border = this._secondary ? this._secondary : '#E0E4F0';
    return `background:${bg}; border:3px solid ${border};`;
}

    get avatarGlowStyle() {
        const glowColor = this._wifiColor || this._secondary || '#c7b4f8';
        return `background: radial-gradient(circle, ${glowColor}60 0%, transparent 65%);`;
    }

    get homeGlowStyle() { return this.avatarGlowStyle; }

    get sparkleStyle() {
        return `color:${this._sparkleColor || '#fff'};`;
    }

    get welcomeTitleStyle() {
    return [
        `color:${this._primary || '#2D6CDF'}`,
        `font-size:${this._headerFontSize || 28}px`,
        `font-family:${this._fontFamily}`
    ].join(';');
}
 
// ── Welcome sub — dark gray by default ───────────────────────────────────────
get welcomeSubStyle() {
    return [
        `color:${this._botMsg || '#2c2c3e'}`,
        `font-size:${this._msgFontSize || 15}px`,
        `font-family:${this._fontFamily}`
    ].join(';');
}

    get userBubbleStyle() {
        return [
            `background:${this._userBubble || this._userMsg || '#2D6CDF'}`,
            `color:#ffffff`,
            `font-family:${this._fontFamily}`,
            `font-size:${this._msgFontSize || 15}px`
        ].join(';');
    }

    get botBubbleStyle() {
        return [
            `background:${this._botBubble || this._botMsg || '#ffffff'}`,
            `color:#1a1a2e`,
            `font-family:${this._fontFamily}`,
            `font-size:${this._msgFontSize || 15}px`
        ].join(';');
    }

    get inputSectionStyle() {
    // Only apply bg color if config explicitly sets one
    return this._bg ? `background:${this._bg};` : 'background:transparent;';
}

    get inputBarStyle() {
    const bg     = this._bg || 'rgba(255,255,255,0.92)';
    const border = this._secondary || 'rgba(200, 210, 235, 0.55)';
    return [
        `background:${bg}`,
        `border:1px solid ${border}`,
        `font-family:${this._fontFamily}`
    ].join(';');
}

    get inputFieldStyle() {
        return `font-family:${this._fontFamily}; font-size:${this._msgFontSize || 15}px;`;
    }

    get sendBtnStyle() {
    return `background:${this._primary || '#111111'}; color:#ffffff;`;
}
    get sendBtnFullStyle() {
    return `background:${this._primary || '#111111'}; color:#ffffff;`;
}

    // ── Pre-chat style getters ────────────────────────────────────────────────

    get preChatTitleStyle() {
        const basePx    = this._headerFontSize || 28;
        const titleSize = Math.round(basePx * 0.72);
        return [
            `color:${this._primary || '#2952CC'}`,
            `font-size:${titleSize}px`,
            `font-family:${this._fontFamily}`
        ].join(';');
    }

    get preChatSubtitleStyle() {
        return [
            `color:${this._botMsg || '#3d3d3d'}`,
            `font-size:${this._msgFontSize || 15}px`,
            `font-family:${this._fontFamily}`
        ].join(';');
    }

    get preChatLabelStyle() {
        const labelSize = Math.max((this._msgFontSize || 15) - 2, 12);
        return [
            `color:${this._primary || '#2952CC'}`,
            `font-size:${labelSize}px`,
            `font-family:${this._fontFamily}`
        ].join(';');
    }

    get preChatInputStyle() {
        return `font-family:${this._fontFamily}; font-size:${this._msgFontSize || 15}px;`;
    }

    /* ===============================
       APPLY THEME
    =============================== */

    applyDynamicTheme() {
        const host = this.template.host;
        if (!host) return;

        this.loadFont(this.config?.fontFamily);           // ✅ DTO key

        host.style.setProperty('--font-family',         this._fontFamily);
        host.style.setProperty('--header-color',        this._header       || '#2D6CDF');
        host.style.setProperty('--primary-color',       this._primary      || '#155ac3');
        host.style.setProperty('--secondary-color',     this._secondary    || '#EAF1FB');
        host.style.setProperty('--user-bubble',         this._userBubble   || this._userMsg  || '#155ac3');
        host.style.setProperty('--bot-bubble',          this._botBubble    || this._botMsg   || '#FFFFFF');
        host.style.setProperty('--sparkle-color',       this._sparkleColor || '#F5A623');
        host.style.setProperty('--wifi-color',          this._wifiColor    || '#2D6CDF');
        host.style.setProperty('--gradient-bg',         this._gradientBg);
        host.style.setProperty('--header-font-size',    `${this._headerFontSize || 28}px`);
        host.style.setProperty('--message-font-size',   `${this._msgFontSize    || 15}px`);
        host.style.setProperty('--side-panel-width',    `${this._sideW          || 420}px`);
        host.style.setProperty('--side-panel-height',   `${this._sideH          || 600}px`);
        host.style.setProperty('--panel-border-radius', `${this._homeR          || 24}px`);

        this.themeApplied = true;
    }

    loadFont(font) {
        const fontUrls = {
            Inter: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap'
        };
        if (!fontUrls[font]) return;
        if (!document.querySelector(`link[data-font="${font}"]`)) {
            const link        = document.createElement('link');
            link.rel          = 'stylesheet';
            link.href         = fontUrls[font];
            link.dataset.font = font;
            document.head.appendChild(link);
        }
    }

    /* ===============================
       AVATAR
    =============================== */

    handleAvatarError(event) {
        event.target.src = aviAvatar;
    }

    get robotIcon() { return this.avatarUrl; }

    /* ===============================
       TEXT GETTERS — DTO keys
    =============================== */

    get headerTitle()         { return this.config?.headerContent     || "How can I help?"; }
    get agnetName()           { return this.config?.agentName         || ""; }
    get welcomeMsg()          { return this.config?.welcomeMessage    || ""; }
    get welcomeDesc()         { return this.config?.welcomeDesc       || ""; }
    get welcomeDisc()         { return this.config?.welcomeDisclaimer || ""; }
    get placeholder()         { return this.config?.inputPlaceholder  || "Type a message..."; }
    get resumeMsg()           { return this.config?.sideToastMsg      || "Session active in background"; }
    get resumeLabel()         { return this.config?.resumeLabel       || "Resume"; }
    get popupMsg()            { return this.config?.sideToastMsg      || "👋 Need help? Chat with us!"; }
    get typingIndicatorText() { return this.config?.typingIndicator   || 'Agent is typing...'; }

    get preChatEnabled() {
        return this.config?.enablePreChat === true;       // ✅ DTO key
    }

    get preChatTitle()         { return 'Before we start'; }
    get preChatSubtitle()      { return 'Please fill in your details so we can help you better.'; }
    get preChatStartBtnLabel() { return 'Start Chat'; }

    /* ===============================
       DYNAMIC PRE-CHAT FIELDS — DTO key
    =============================== */

    get dynamicPreChatFields() {
        try {
            const raw = this.config?.preChatConfig;      // ✅ DTO key
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    get dynamicPreChatFieldsUI() {
        return this.dynamicPreChatFields.map(f => ({
            ...f,
            value: this.preChatFields[f.apiName] || '',
            error: this.preChatErrors[f.apiName] || ''
        }));
    }

    /* ===============================
       LMS
    =============================== */

    @wire(MessageContext) messageContext;

    async connectedCallback() {
        registerMessageContext(this.messageContext);
        this.subscribeToEvents();

        // ── Mobile detection ──
        this._mobileMql = window.matchMedia('(max-width: 600px)');
        this.isMobileView = this._mobileMql.matches;
        this._handleMqlChange = (e) => { this.isMobileView = e.matches; };
        this._mobileMql.addEventListener('change', this._handleMqlChange);

        const esDeveloperName = this.config?.embeddedApiName;   // ✅ DTO key
        if (!esDeveloperName) return;

        const restored = await restoreConversation(esDeveloperName);
        if (restored) {
            this.hasStartedChat = true;
            this.messages       = [...restored.messages];
        }

        const icon = getSendIconUrl();
        if (icon) this.sendIcon = icon;

        const cached = getAvatarUrl();
        if (cached) this.avatarUrl = cached;

        const state = getState();
        if (state.isActive) {
            this.showEndChatButton = true;
            this.messages = this.mergeFirstBotMessage(state.messages);

            if (state.startedFrom === "home") {
                this.chatAvailable = true;
            } else {
                this.hasStartedChat = true;
            }
        }

        setTimeout(() => { this.showWelcomePop = false; }, 6000);
    }

    disconnectedCallback() {
        if (this._mobileMql && this._handleMqlChange) {
            this._mobileMql.removeEventListener('change', this._handleMqlChange);
        }
    }

    async tryRestoreConversation() {
        const esDeveloperName = this.config?.embeddedApiName;
        if (!esDeveloperName) return;

        const restored = await restoreConversation(esDeveloperName);

        if (restored) {                          // ✅ just check restored, not message count
            this.hasStartedChat    = true;
            this.showEndChatButton = true;
            this.messages          = [...restored.messages];
            this.showPreChat       = false;
        } else {
            this.showPreChat = this.preChatEnabled && !getSavedPreChatData();
        }
    }

    subscribeToEvents() {
        if (this.subscription) return;
        this.subscription = subscribe(
            this.messageContext,
            ChatChannel,
            (msg) => this.handleEvents(msg)
        );
    }

    handleEvents(msg) {
        const { type, payload } = msg;

        if (type === 'botTypingStart')   { this.isBotTyping   = true;  return; }
        if (type === 'botTypingStop')    { this.isBotTyping   = false; return; }
        if (type === 'agentTypingStart') { this.isAgentTyping = true;  return; }
        if (type === 'agentTypingStop')  { this.isAgentTyping = false; return; }

        if (type === 'agentJoining') {
            this.isAgentJoining = true;
            this.isBotTyping    = false;
            this.isAgentTyping  = false;
            return;
        }

        if (type === 'agentJoined') {
            this.isAgentJoining = false;
            return;
        }

        if (type === 'chatStarted') {
            this.showPreChat       = false;
            this.hasStartedChat    = true;
            this.chatAvailable     = false;
            this.showEndChatButton = true;
            if (payload?.messages) this.messages = this.mergeFirstBotMessage(payload.messages);
            // if (!this.panelOpen) this.panelOpen = true;
            this.scrollToBottom();
            return;
        }

        if (type === 'preChatSubmitted') {
            this.showPreChat = false;
            return;
        }

        if (type === 'chatReady')        { this.showEndChatButton = true; return; }
        if (type === 'firstMessageSent') { this.showEndChatButton = true; return; }

        if (type === 'chatUpdated') {
            this.isAgentJoining = false;
            this.messages = this.mergeFirstBotMessage(payload.messages);
            this.isBotTyping    = false;
            this.isAgentTyping  = false;
            this.scrollToBottom();
            return;
        }

        if (type === 'chatClosed') {
            this.resetUI();
            return;
        }
    }

    /* ===============================
       PANEL
    =============================== */

    togglePanel() {
        this.panelOpen      = true;
        this.showWelcomePop = false;

        if (this.isMobileView) {
            document.body.style.overflow = 'hidden';
        }

        if (!this._configLoaded) {
            return; // wait for wiredConfig to populate config/preChat state first
        }

        if (!this.hasStartedChat && !this.hasMessages) {
            this.showPreChat = this.preChatEnabled && !getSavedPreChatData();
        } else {
            this.showPreChat = false;
        }
    }

    minimizePanel() {
        this.panelOpen = false;
        document.body.style.overflow = '';
    }

    enterChat() {
        const state        = getState();
        this.chatAvailable = false;
        this.hasStartedChat = true;
        this.messages = this.mergeFirstBotMessage(state.messages);
    }

    handleSkipPreChat() {
        this.showPreChat = false;
    }

    /* ===============================
       PRE-CHAT FORM
       ✅ FIXED: removed duplicate handlePreChatInput and _validatePreChat
    =============================== */

    handlePreChatInput(event) {
        const field = event.target.dataset.field;
        if (!field) return;

        this.preChatFields = {
            ...this.preChatFields,
            [field]: event.target.value
        };

        // Clear error on input
        if (this.preChatErrors[field]) {
            this.preChatErrors = {
                ...this.preChatErrors,
                [field]: ''
            };
        }
    }

    _validatePreChat() {
        const errors = {};

        this.dynamicPreChatFields.forEach(f => {
            const value = this.preChatFields[f.apiName]?.trim();
            if (f.required && !value) {
                errors[f.apiName] = `${f.label} is required`;
            }
        });

        this.preChatErrors = errors;
        return Object.keys(errors).length === 0;
    }

    async handlePreChatSubmit() {
        if (!this._validatePreChat()) return;

        const preChatData = {};

        this.dynamicPreChatFields.forEach(f => {
            const val = this.preChatFields[f.apiName]?.trim();
            if (val) preChatData[f.apiName] = val;
        });

        this.showPreChat = false;
        await this._doStartConversation(preChatData);
    }

    async _doStartConversation(preChatData) {
        try {
            const esDeveloperName = this.config?.embeddedApiName;
            const state = await startConversation("side", esDeveloperName, preChatData);
            this.hasStartedChat    = true;
            this.chatAvailable     = false;
            this.showEndChatButton = true;
            this.messages = this.mergeFirstBotMessage(state.messages);
        } catch (e) {
            console.error('❌ Failed to start conversation', e);
            this.showPreChat = true; // let them retry
        }
    }

    /* ===============================
       CHAT
    =============================== */

    handleInput(e)    { this.inputText = e.target.value; }
    handleKeyPress(e) { if (e.key === 'Enter') this.sendMsg(); }

    get isSendDisabled() {
        return !this._configLoaded;
    }

    async sendMsg() {
        if (!this.inputText.trim()) return;

        if (!this._configLoaded) {
            console.warn('⏳ Config not loaded yet — ignoring send attempt');
            return; // or queue it — see below
        }

        const text = this.inputText;
        this.inputText = "";

        try {
            if (!this.hasStartedChat) {
                const esDeveloperName = this.config?.embeddedApiName;
                const saved = getSavedPreChatData();
                await startConversation("side", esDeveloperName, saved || null);
                this.hasStartedChat    = true;
                this.showEndChatButton = true;
            }
            await sendMessage(text);
        } catch (e) {
            console.error('❌ Failed to send message from side panel', e);
            this.inputText = text;
        }
    }

    /* ===============================
       END CHAT
    =============================== */

    askEndChat()  { this.showConfirmModal = true; }
    hideModal()   { this.showConfirmModal = false; }

    async confirmEndChat() {
        this.showConfirmModal = false;
        await closeChat();
        this.resetUI();
    }

    async endChat() {
        await closeChat();
        this.resetUI();
    }

    resetUI() {
        this.messages          = [];
        this.inputText         = '';
        this.panelOpen         = false;
        this.showEndChatButton = false;
        this.isBotTyping       = false;
        this.isAgentTyping     = false;
        this.isAgentJoining    = false;
        this.hasStartedChat    = false;
        this.chatAvailable     = false;
        this.showPreChat       = false;
        this.preChatFields     = {};
        this.preChatErrors     = {};
    }

    /* ===============================
       RENDERING
       ✅ FIXED: applyDynamicTheme only called when config loaded,
          not on every single render cycle
    =============================== */

    scrollToBottom() {
        requestAnimationFrame(() => {
            const el = this.template.querySelector(".messages-wrapper");
            if (el) el.scrollTop = el.scrollHeight;
        });
    }

    renderedCallback() {
        if (this._configLoaded && !this.themeApplied) {
            this.applyDynamicTheme();
        }
    }

    mergeFirstBotMessage(messages = []) {

        const firstMsg = this.firstBotMessage?.trim();

        if (!firstMsg) {
            return [...messages];
        }

        const alreadyExists = messages.some(
            msg =>
                msg?.isBot &&
                msg?.rawText === firstMsg          // was: msg?.text === firstMsg
        );

        if (alreadyExists) {
            return [...messages];
        }

        return [
            {
                id: 'first-bot-message',
                rawText: firstMsg,                 // was: text: firstMsg
                isBot: true,
                isUser: false,
                isHumanAgent: false
            },
            ...messages
        ];
    }
}