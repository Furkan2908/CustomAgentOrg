import { LightningElement, wire, api, track } from 'lwc';
import getConfigByName from '@salesforce/apex/AgentConfigService.getConfigByName';

import aviAvatar from '@salesforce/resourceUrl/aviAvatarBG';

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
    isConversationActive,
    getSavedPreChatData 
} from 'c/sharedConversationServiceCopy';

import { subscribe, MessageContext } from 'lightning/messageService';
import ChatChannel from '@salesforce/messageChannel/chatMessageChannel__c';

// ─── Default design tokens (match the screenshot exactly) ────────────────────
const DEFAULT_BG         = 'linear-gradient(270deg, #F9FAFF 0%, #F5F7FF 51.88%, #F2F4FF 100%)';
const DEFAULT_GLOW       = '#c7b4f8';          // soft purple radial behind avatar
const DEFAULT_PRIMARY    = '#1a3cff';           // vivid blue used for title & send btn
const DEFAULT_TITLE_SIZE = 42;                  // large bold heading
const DEFAULT_MSG_SIZE   = 16;
const DEFAULT_TITLE_CLR  = '#1a3cff';
const DEFAULT_DESC_CLR   = '#1F2937';
const DEFAULT_SEND_BG    = '#111111';           // black circular send button
const DEFAULT_INPUT_BG   = '#ffffff';
const DEFAULT_FONT       = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

export default class HomePanel extends LightningElement {

    messages      = [];
    inputText     = '';

    isBotTyping    = false;
    isAgentTyping  = false;
    isAgentJoining = false;

    hasStartedChat = false;
    chatAvailable  = false;

    config       = {};
    themeApplied = false;

    @track avatarUrl = aviAvatar;

    @api configName;

    @track showPreChat         = false;
    // @track preChatFieldsConfig = [];
    @track preChatValues       = {};
    @track preChatErrors       = {};
    @track filePreviews = []; 

    // ─────────────────────────────────────────────────────────────────────────
    // WIRE
    // ─────────────────────────────────────────────────────────────────────────

    @wire(getConfigByName, { configName: '$configName' })
    wiredConfig({ data, error }) {
        if (data) {
            this.config = data;

            if (data.avatarUrl) {
                this.avatarUrl = data.avatarUrl;
            }
            
            // this.loadDynamicPrechatFields();

            setAvatarUrl(data.avatarUrl);
            this.applyDynamicTheme();
            this.tryRestoreConversation();
            // this.handleInitialUI();
        }
        if (error) {
            console.error('Config load error:', error);
        }
    }

    // async loadDynamicPrechatFields() {

    //     try {

    //         const deploymentName = this.config?.embeddedApiName;

    //         if (!deploymentName) {
    //             console.warn('No embeddedApiName found');
    //             return;
    //         }

    //         console.log(
    //             '📋 Loading dynamic pre-chat fields for:',
    //             deploymentName
    //         );

    //         const fields = await getPrechatFields({
    //             deploymentName
    //         });

    //         console.log(
    //             '✅ Dynamic pre-chat fields loaded:',
    //             JSON.stringify(fields)
    //         );

    //         this.preChatFieldsConfig = Array.isArray(fields)
    //             ? fields
    //             : [];

    //     } catch (e) {

    //         console.error(
    //             '❌ Failed to load dynamic pre-chat fields',
    //             e
    //         );

    //         this.preChatFieldsConfig = [];
    //     }
    // }

    // ─────────────────────────────────────────────────────────────────────────
    // VISIBILITY
    // ─────────────────────────────────────────────────────────────────────────

    get isHomePanelVisible() {
        // If no config yet, still show panel (renders with defaults)
        return this.config?.showPanel !== false;
    }

    get showHomeScreen() {
        return !this.showPreChat && !this.hasStartedChat;
    }

    get isTyping() {
        return this.isBotTyping || this.isAgentTyping;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRE-CHAT
    // ─────────────────────────────────────────────────────────────────────────

    get preChatEnabled() {
        return this.config?.enablePreChat === true;
    }

    get dynamicPreChatFields() {
        try {
            const raw = this.config?.preChatConfig;
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    get computedPrechatFields() {
        return this.dynamicPreChatFields.map(f => ({
            ...f,
            value: this.preChatValues[f.apiName] || '',
            error: this.preChatErrors[f.apiName] || ''
        }));
    }

    get preChatTitle()         { return 'Before we start'; }
    get preChatSubtitle()      { return 'Please fill in your details so we can help you better.'; }
    get preChatStartBtnLabel() { return 'Start Chat'; }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE GETTERS — resolve config value OR fall back to design token
    // ─────────────────────────────────────────────────────────────────────────

    get _primary()        { return this.config?.primaryColor    || DEFAULT_PRIMARY; }
    get _secondary()      { return this.config?.secondaryColor  || ''; }
    get _bg()             { return this.config?.backgroundColor || ''; }
    get _header()         { return this.config?.headerColor     || DEFAULT_PRIMARY; }
    get _gradStart()      { return this.config?.gradientStart   || ''; }
    get _gradEnd()        { return this.config?.gradientEnd     || ''; }
    get _font()           { return this.config?.fontFamily      || ''; }
    get _headerFontSize() { return this.config?.headerFontSize  || DEFAULT_TITLE_SIZE; }
    get _msgFontSize()    { return this.config?.messageFontSize || DEFAULT_MSG_SIZE; }
    get _botMsg()         { return this.config?.botMsgColor     || DEFAULT_DESC_CLR; }
    get _userMsg()        { return this.config?.userMsgColor    || '#ffffff'; }
    get _wifiColor()      { return this.config?.wifiColor       || DEFAULT_GLOW; }
    get _sparkleColor()   { return this.config?.sparkleColor    || '#F5A623'; }
    get _botBubble()      { return this.config?.botBubbleColor  || '#ffffff'; }
    get _userBubble()     { return this.config?.userBubbleColor || DEFAULT_PRIMARY; }
    get _homeAvatarR()    { return this.config?.homeAvatarRadius ?? 50; }

    // ─────────────────────────────────────────────────────────────────────────
    // BACKGROUND — config gradient beats config solid, both beat the default
    // ─────────────────────────────────────────────────────────────────────────

    get _resolvedBackground() {
        // Config gradient takes top priority
        if (this._gradStart && this._gradEnd) {
            return `linear-gradient(160deg, ${this._gradStart} 0%, ${this._gradEnd} 100%)`;
        }
        if (this._gradStart) {
             return this._gradStart;
        }
        if (this._gradEnd) { 
             return this._gradEnd;
        }
        // Config solid background
        if (this._bg){
             return this._bg;
        }
        // Screenshot default
        return DEFAULT_BG;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FONT FAMILY
    // ─────────────────────────────────────────────────────────────────────────

    get _fontFamily() {
        switch (this._font) {
            case 'Inter':              return "'Inter', sans-serif";
            case 'System UI':          return "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
            case 'Georgia':            return 'Georgia, serif';
            case 'Monaco (Monospace)': return "Monaco, Consolas, 'Courier New', monospace";
            default:                   return DEFAULT_FONT;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PANEL STYLE — full width, full height, no fixed px dimensions by default
    // ─────────────────────────────────────────────────────────────────────────

    get panelStyle() {
        const s = [];
        s.push(`background:${this._resolvedBackground}`);
        s.push(`font-family:${this._fontFamily}`);

        // Only apply px sizing if config explicitly sets them
        if (this.config?.homeWidth)  {
            s.push(`width:${this.config.homeWidth}px`);
        }
        if (this.config?.homeHeight) {
            s.push(`height:${this.config.homeHeight}px`);
        }
        if (this.config?.homeRadius) {
            s.push(`border-radius:${this.config.homeRadius}px`);
        }

        return s.join(';');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AVATAR STYLE
    // ─────────────────────────────────────────────────────────────────────────

    get homeAvatarStyle() {
        return `border-radius:${this._homeAvatarR}%;`;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GLOW — purple radial behind avatar (from screenshot)
    // ─────────────────────────────────────────────────────────────────────────

    get homeGlowStyle() {
        const glowColor = this._wifiColor || DEFAULT_GLOW;
        return `background: radial-gradient(circle, ${glowColor}55 0%, transparent 65%);`;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TITLE STYLE — large bold blue, left-aligned
    // ─────────────────────────────────────────────────────────────────────────

    get homeTitleStyle() {
        return [
            `color:${this._primary || DEFAULT_TITLE_CLR}`,
            `font-size:${this._headerFontSize}px`,
            `font-family:${this._fontFamily}`,
            `text-align: center`,
            'font-weight:800',
            'line-height:1.15'
        ].join(';');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DESC STYLE — dark gray, normal weight, readable
    // ─────────────────────────────────────────────────────────────────────────

    get homeDescStyle() {
        return [
            `color:${this._botMsg || DEFAULT_DESC_CLR}`,
            `font-size:${this._msgFontSize}px`,
            `font-family:${this._fontFamily}`,
            'line-height:1.6'
        ].join(';');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CHAT HEADER STYLE
    // ─────────────────────────────────────────────────────────────────────────

    get chatHeaderStyle() {
        return `background:${this._header}; color:#ffffff;`;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // INPUT BAR STYLE — white pill, no border, subtle shadow (CSS handles it)
    // ─────────────────────────────────────────────────────────────────────────

    get homeInputBarStyle() {
        const bg = this._bg || DEFAULT_INPUT_BG;
        return `background:${bg}; font-family:${this._fontFamily};`;
    }

    get homeInputFieldStyle() {
        return [
            `font-family:${this._fontFamily}`,
            `font-size:${this._msgFontSize}px`,
            `color:${DEFAULT_DESC_CLR}`
        ].join(';');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SEND BUTTON STYLE — dark circle by default (matches screenshot)
    // ─────────────────────────────────────────────────────────────────────────

    get homeSendBtnStyle() {
        const bg = this.config?.primaryColor || DEFAULT_SEND_BG;
        return `background:${bg}; color:#ffffff;`;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BUBBLE STYLES
    // ─────────────────────────────────────────────────────────────────────────

    get userBubbleStyle() {
        return `background:${this._userBubble}; color:${this._userMsg};`;
    }

    get botBubbleStyle() {
        return `background:${this._botBubble}; color:${this._botMsg};`;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRE-CHAT STYLES
    // ─────────────────────────────────────────────────────────────────────────

    get preChatTitleStyle() {
        const titleSize = Math.round(this._headerFontSize * 0.72);
        return [
            `color:${this._primary}`,
            `font-size:${titleSize}px`,
            `font-family:${this._fontFamily}`
        ].join(';');
    }

    get preChatSubtitleStyle() {
        return [
            `color:${this._botMsg}`,
            `font-size:${this._msgFontSize}px`,
            `font-family:${this._fontFamily}`
        ].join(';');
    }

    get preChatLabelStyle() {
        const labelSize = Math.max(this._msgFontSize - 2, 12);
        return [
            `color:${this._primary}`,
            `font-size:${labelSize}px`,
            `font-family:${this._fontFamily}`
        ].join(';');
    }

    get preChatInputStyle() {
        return `font-family:${this._fontFamily}; font-size:${this._msgFontSize}px;`;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MISC GETTERS
    // ─────────────────────────────────────────────────────────────────────────

    get homeAgentNameStyle() {
        return [
            `color:${this._primary}`,
            `font-size:${this._msgFontSize}px`,
            `font-family:${this._fontFamily}`,
            'font-weight:600'
        ].join(';');
    }

    get sparkleStyle()        { return `color:${this._sparkleColor};`; }
    get isSidePanelEnabled()  { return this.config?.showSidePanel === true; }
    get welcomeDisclaimer()   { return this.config?.welcomeDisclaimer || ''; }
    get firstBotMessage()     { return this.config?.firstBotMessage   || 'Hi there! How can I help you today ?'; }
    get sendIconUrl()         { return this.config?.sendIconUrl        || ''; }
    get hasSendIcon()         { return !!this.sendIconUrl; }

    get robotIcon()           { return this.avatarUrl; }
    get headerTitle()         { return this.config?.headerContent    || 'AI Agent'; }
    get agnetName()           { return this.config?.agentName        || 'Agentforce Agent'; }
    get welcomeMsg()          { return this.config?.welcomeMessage   || 'Hello! I am your Agentforce Assistant.'; }
    get welcomeDesc()         { return this.config?.welcomeDesc      || ''; }
    get inputPlaceholder()    { return this.config?.inputPlaceholder || 'Type a message...'; }
    get resumeMsg()           { return this.config?.sideToastMsg     || 'Session active in background'; }
    get resumeLabel()         { return this.config?.resumeLabel      || 'Resume'; }
    get typingIndicatorText() { return this.config?.typingIndicator  || 'Agent is typing...'; }


    get hasFilePreviews() {
        return this.filePreviews.length > 0;
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) {return};
    
        // Reset the input so the same file can be re-selected after removal
        event.target.value = '';
    
        const id       = Date.now();
        const nameParts = file.name.split('.');
        const ext      = nameParts.length > 1 ? nameParts.pop().toUpperCase() : '';
        const baseName = nameParts.join('.');
        const shortName = baseName.length > 18 ? baseName.slice(0, 16) + '…' : baseName;
        const isImage  = file.type.startsWith('image/');
    
        const preview = { id, name: file.name, shortName, ext, isImage, dataUrl: '', file };
    
        if (isImage) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.filePreviews = this.filePreviews.map(fp =>
                    fp.id === id ? { ...fp, dataUrl: e.target.result } : fp
                );
            };
            reader.readAsDataURL(file);
        }
    
        this.filePreviews = [...this.filePreviews, preview];
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // removeFilePreview  — called by the × button on each preview chip
    // ─────────────────────────────────────────────────────────────────────────────
    
    removeFilePreview(event) {
        const id = Number(event.currentTarget.dataset.id);
        this.filePreviews = this.filePreviews.filter(fp => fp.id !== id);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // THEME — apply CSS custom properties to host
    // ─────────────────────────────────────────────────────────────────────────

    applyDynamicTheme() {
        const host = this.template.host;
        if (!host) {
            return
        };

        this.loadFont(this.config?.fontFamily);

        host.style.setProperty('--font-family',       this._fontFamily);
        host.style.setProperty('--header-color',      this._header);
        host.style.setProperty('--primary-color',     this._primary);
        host.style.setProperty('--secondary-color',   this.config?.secondaryColor   || '#EAF1FB');
        host.style.setProperty('--user-bubble',       this._userBubble);
        host.style.setProperty('--bot-bubble',        this._botBubble);
        host.style.setProperty('--user-msg-color',    this._userMsg);
        host.style.setProperty('--bot-msg-color',     this._botMsg);
        host.style.setProperty('--sparkle-color',     this._sparkleColor);
        host.style.setProperty('--wifi-color',        this._wifiColor);
        host.style.setProperty('--header-font-size',  this._headerFontSize  + 'px');
        host.style.setProperty('--message-font-size', this._msgFontSize     + 'px');
        host.style.setProperty('--background-color',  this._resolvedBackground);

        this.themeApplied = true;
    }

    loadFont(font) {
        const fontUrls = {
            Inter: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap'
        };
        if (!fontUrls[font]) {
            return;
        }
        if (!document.querySelector(`link[data-font="${font}"]`)) {
            const link        = document.createElement('link');
            link.rel          = 'stylesheet';
            link.href         = fontUrls[font];
            link.dataset.font = font;
            document.head.appendChild(link);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MESSAGE SERVICE
    // ─────────────────────────────────────────────────────────────────────────

    @wire(MessageContext) messageContext;

    async connectedCallback() {
        registerMessageContext(this.messageContext);
        this.subscribeToEvents();

        const esDeveloperName = this.config?.embeddedApiName;

        if (esDeveloperName) {
            const restored = await restoreConversation(esDeveloperName);
            if (restored && restored.messages?.length > 0) {
                this.hasStartedChat = true;
                this.showPreChat    = false;
                this.messages       = [...restored.messages];
                this.scrollToBottom();
                return;
            }
        }

       this.showPreChat = this.config?.enablePreChat === true && !getSavedPreChatData();
    }

    async tryRestoreConversation() {
        const esDeveloperName = this.config?.embeddedApiName;
        if (!esDeveloperName) {
            return;
        }

        if (isConversationActive()) {
            this._syncFromState();
            this.hasStartedChat = true;
            return;
        }

        const restored = await restoreConversation(esDeveloperName);
        if (restored && restored.messages?.length > 0) {
            this.hasStartedChat = true;
            this.messages       = [...restored.messages];
            this.scrollToBottom();
        }else {
            // Fresh visit, no active or restored conversation — show pre-chat if enabled
            this.showPreChat = this.preChatEnabled && !getSavedPreChatData();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CHAT ACTIONS
    // ─────────────────────────────────────────────────────────────────────────

    async startChatFromHome() {
        if (this.preChatEnabled) {
            const saved = getSavedPreChatData();
            if (saved) {
                await this._doStartConversation(saved);
                return;
            }
            this.showPreChat = true;
            return;
        }
        await this._doStartConversation(null);
    }

    handlePreChatInput(event) {
        const field = event.target.dataset.field;
        this.preChatValues = { ...this.preChatValues, [field]: event.target.value };
        if (this.preChatErrors[field]) {
            this.preChatErrors[field] = '';
        }
    }

    async handlePreChatSubmit() {
        if (!this._validatePreChat()) return;
        const preChatData = {};
        this.dynamicPreChatFields.forEach(f => {
            const val = this.preChatValues[f.apiName]?.trim();
            if (val) {
                preChatData[f.apiName] = val;
            }
        });
        this.showPreChat = false;
        await this._doStartConversation(preChatData);
    }

    handlePreChatBack() {
        this.showPreChat   = false;
        this.preChatErrors = {};
    }

    async _doStartConversation(preChatData) {
        const esDeveloperName = this.config?.embeddedApiName;
        const chatState = await startConversation('home', esDeveloperName, preChatData);
        this.hasStartedChat = true;
        this.chatAvailable  = false;
        this.messages = this.mergeFirstBotMessage(chatState.messages);
        this.scrollToBottom();
    }

    _validatePreChat() {
        const errors = {};
        this.dynamicPreChatFields.forEach(field => {
            if (field.required && !this.preChatValues[field.apiName]?.trim()) {
                errors[field.apiName] = `${field.label} is required`;
            }
        });
        this.preChatErrors = errors;
        return Object.keys(errors).length === 0;
    }

    enterChat() {
        this._syncFromState();
        this.chatAvailable  = false;
        this.hasStartedChat = true;
    }

    async sendUserMsg() {
        const hasText  = this.inputText.trim().length > 0;
        const hasFiles = this.filePreviews.length > 0;
    
        if (!hasText && !hasFiles) {
            return;
        }
    
        // Start conversation if not already active
        if (!this.hasStartedChat) {
            const esDeveloperName = this.config?.embeddedApiName;
            const saved = getSavedPreChatData();
            await startConversation('home', esDeveloperName, saved || null);
            this.hasStartedChat = true;
        }
    
        // Upload each queued file
        for (const fp of this.filePreviews) {
            const msgId = Date.now();
            const previewMsg = {
                id: msgId, isUser: true, isBot: false,
                isAttachment: true, fileName: fp.name,
                uploading: true, progress: 0, progressStyle: 'width: 0%'
            };
            this.messages = [...this.messages, previewMsg];
            await this._uploadFileWithProgress(msgId, fp.file);
        }
    
        this.filePreviews = [];
    
        // Send text if present
        if (hasText) {
            await sendMessage(this.inputText);
            this.inputText = '';
        }
    }

    _uploadFileWithProgress(msgId, file) {
        return new Promise((resolve) => {
            let progress = 0;
            const interval = setInterval(async () => {
                progress += 20;
                this.messages = this.messages.map(msg => {
                    if (msg.id === msgId) {
                        return { ...msg, progress, progressStyle: `width: ${progress}%` };
                    }
                    return msg;
                });
                if (progress >= 100) {
                    clearInterval(interval);
                    this.messages = this.messages.map(msg =>
                        msg.id === msgId ? { ...msg, uploading: false } : msg
                    );
                    await sendMessage(`[Attachment] ${file.name}`);
                    resolve();
                }
            }, 120);
        });
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) {
            return;
        }
        const id = Date.now();
        const previewMsg = {
            id, isUser: true, isAttachment: true,
            fileName: file.name, uploading: true, progress: 0, progressStyle: 'width: 0%'
        };
        this.messages = [...this.messages, previewMsg];
        this.simulateUploadProgress(id, file);
    }

    simulateUploadProgress(msgId, file) {
        let progress = 0;
        const interval = setInterval(async () => {
            progress += 10;
            this.updateProgress(msgId, progress);
            if (progress >= 100) {
                clearInterval(interval);
                this.finishUpload(msgId, file);
            }
        }, 150);
    }

    updateProgress(msgId, progress) {
        this.messages = this.messages.map(msg => {
            if (msg.id === msgId) {
                msg.progress      = progress;
                msg.progressStyle = `width: ${progress}%`;
            }
            return msg;
        });
    }

    async finishUpload(msgId, file) {
        this.messages = this.messages.map(msg => {
            if (msg.id === msgId) {
                msg.uploading = false;
            }
            return msg;
        });
        await sendMessage(`[Attachment] ${file.name}`);
    }

    async endChat() {
        await closeChat();
        this.resetUI();
    }

    resetUI() {
        this.messages       = [];
        this.hasStartedChat = false;
        this.chatAvailable  = false;
        this.inputText      = '';
        this.showPreChat    = false;
        this.preChatErrors  = {};
        this.isBotTyping    = false;
        this.isAgentTyping  = false;
        this.isAgentJoining = false;
        this.preChatValues  = {};
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LMS
    // ─────────────────────────────────────────────────────────────────────────

    subscribeToEvents() {
        if (this.subscription) {return;}
        this.subscription = subscribe(this.messageContext, ChatChannel, msg => this.handleEvents(msg));
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

        if (type === 'agentJoined') { this.isAgentJoining = false; return; }

        if (type === 'chatUpdated') {
            this.isAgentJoining = false;
            if (this.hasStartedChat) {
                this.messages = this.mergeFirstBotMessage(payload.messages);
                this.isBotTyping   = false;
                this.isAgentTyping = false;
                this.scrollToBottom();
            } else if (payload.messages?.length > 0) {
                this.hasStartedChat = true;
                this.messages = this.mergeFirstBotMessage(payload.messages);
                this.isBotTyping    = false;
                this.isAgentTyping  = false;
                this.scrollToBottom();
            }
            return;
        }

        if (type === 'chatStarted') {
            this.showPreChat    = false;
            this.hasStartedChat = true;
            this.chatAvailable  = false;
            if (payload?.messages) {
                this.messages = this.mergeFirstBotMessage(payload.messages);
            }
            this.scrollToBottom();
            return;
        }

        if (type === 'preChatSubmitted') { this.showPreChat = false; return; }

        if (type === 'chatReady') {
            this.chatAvailable  = true;
            this.hasStartedChat = false;
        }

        if (type === 'chatClosed') { this.resetUI(); }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RENDERING
    // ─────────────────────────────────────────────────────────────────────────

    // renderedCallback() {
    //     this.messages.forEach(msg => {
    //         if (msg.isBot) {
    //             const el = this.template.querySelector(`[data-id="${msg.id}"]`);
    //             if (el && el.innerHTML !== msg.text) {
    //                 el.innerHTML = msg.text;
    //             }
    //         }
    //     });
    // }

    scrollToBottom() {
        requestAnimationFrame(() => {
            const el = this.template.querySelector('.messages-wrapper');
            if (el) {
                el.scrollTop = el.scrollHeight;
            }
        });
    }

    handleInput(event)    { this.inputText = event.target.value; }
    handleKeyPress(event) { 
        if (event.key === 'Enter') {this.sendUserMsg();} 
    }

    _syncFromState() {
        const s = getState();
        this.messages = this.mergeFirstBotMessage(s.messages);
        this.hasStartedChat = s.isActive;
    }

    async handleInitialUI() {
        const esDeveloperName = this.config?.embeddedApiName;

        if (esDeveloperName) {
            const restored = await restoreConversation(esDeveloperName);
            if (restored && restored.messages?.length > 0) {
                this.hasStartedChat = true;
                this.showPreChat    = false;
                this.messages       = [...restored.messages];
                this.scrollToBottom();
                return;
            }
        }

        this.showPreChat = this.config?.enablePreChat === true;
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