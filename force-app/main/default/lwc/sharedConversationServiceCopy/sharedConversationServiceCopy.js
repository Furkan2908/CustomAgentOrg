import { publish } from 'lightning/messageService';
import ChatChannel from '@salesforce/messageChannel/chatMessageChannel__c';

import getAccessToken from '@salesforce/apex/AgentChatAPIController.getAccessToken';
import createConversation from '@salesforce/apex/AgentChatAPIController.createConversation';
import postMessage from '@salesforce/apex/AgentChatAPIController.sendMessage';
import closeConversationApex from '@salesforce/apex/AgentChatAPIController.closeConversation';
import getConfigByName from '@salesforce/apex/AgentConfigService.getConfigByName';
import getOrgContext from '@salesforce/apex/AgentChatAPIController.getOrgContext';

/* ==========================================
   STORAGE KEYS — single source of truth
========================================== */
const STORAGE_KEYS = {
    CONVERSATION_ID : 'chat_conversationId',
    ACCESS_TOKEN    : 'chat_accessToken',
    ES_DEV_NAME     : 'chat_esDeveloperName',
};

const SS_ALIVE_KEY    = 'chat_ss_alive';
const SS_MESSAGES_KEY = 'chat_messages';

const PRE_CHAT_DATA_KEY = 'chat_preChatData';

/* ==========================================
   SESSION DETECTION
========================================== */
let _isRestorable = false;

let ORG_CONTEXT = {
    orgId: null,
    sseBaseUrl: null
};

try {
    _isRestorable = sessionStorage.getItem(SS_ALIVE_KEY) === '1';

    if (!_isRestorable) {
        Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
        sessionStorage.removeItem(SS_MESSAGES_KEY);
    }

    sessionStorage.setItem(SS_ALIVE_KEY, '1');
} catch (e) {
    console.warn('Storage unavailable', e);
}

async function loadOrgContext() {
    if (ORG_CONTEXT.orgId) {
        return ORG_CONTEXT;
    }

    const ctx = await getOrgContext();

    ORG_CONTEXT.orgId      = ctx.orgId;
    ORG_CONTEXT.sseBaseUrl = ctx.sseBaseUrl;

    return ORG_CONTEXT;
}

function clearChatStorage() {
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
    try {
        sessionStorage.removeItem(SS_MESSAGES_KEY);
        sessionStorage.removeItem(SS_ALIVE_KEY);
    } catch (_) {}
}

/* ─── Message persistence helpers ─────────────────────────── */
function saveMessagesToSession(messages) {
    try {
        sessionStorage.setItem(SS_MESSAGES_KEY, JSON.stringify(messages));
    } catch (e) {
        console.warn('Could not persist messages to sessionStorage', e);
    }
}

// sessionStorage is user-editable, so restored messages are rebuilt field by field, never trusted.
function loadMessagesFromSession() {
    try {
        const raw = sessionStorage.getItem(SS_MESSAGES_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(arr)) {
            return [];
        }
        return arr
            .filter(m => m && typeof m.rawText === 'string')
            .slice(-200)
            .map((m, i) => {
                const rawText = m.rawText.slice(0, 50000);
                const id = (typeof m.id === 'string' || typeof m.id === 'number') ? m.id : `r-${i}`;
                if (m.isUser) {
                    return { id, rawText, text: rawText, isUser: true };
                }
                return {
                    id,
                    entryId      : typeof m.entryId === 'string' ? m.entryId : null,
                    rawText,
                    isBot        : true,
                    isHumanAgent : m.isHumanAgent === true,
                    citations    : Array.isArray(m.citations)
                        ? m.citations
                            .filter(c => c && typeof c.url === 'string')
                            .slice(0, 5)
                            .map(c => ({
                                label: typeof c.label === 'string' ? c.label.slice(0, 120) : '',
                                url  : c.url.slice(0, 2048)
                            }))
                        : []
                };
            });
    } catch (_) {
        return [];
    }
}

/* ==========================================
   GLOBAL STATE
========================================== */
let state = {
    isActive               : false,
    accessToken            : null,
    conversationId         : null,
    esDeveloperName        : null,
    messages               : [],
    startedFrom            : null,
    hasUserSentFirstMessage: false,
    agentHasJoined         : false,
    pendingFirstMessage    : null,
    isRestoring            : false,
    activeParticipantRole  : null   // 'Bot' | 'Chatbot' | 'Agent' | null
};

/* Snapshot for other components / LMS. Never contains credentials or the parked message. */
function viewState() {
    return {
        isActive                : state.isActive,
        startedFrom             : state.startedFrom,
        hasUserSentFirstMessage : state.hasUserSentFirstMessage,
        agentHasJoined          : state.agentHasJoined,
        activeParticipantRole   : state.activeParticipantRole,
        messages                : state.messages.slice()
    };
}

function extractCitations(staticContent) {
    const list = staticContent?.citationContent?.citations;
    if (!Array.isArray(list)) {
        return [];
    }
    const out = [];
    for (const c of list) {
        const ref = c?.citedReference;
        const url = ref?.link?.url;
        if (typeof url === 'string' && url) {
            out.push({
                label: typeof ref.label === 'string' ? ref.label.slice(0, 120) : '',
                url  : url.slice(0, 2048)
            });
        }
        if (out.length >= 5) {
            break;
        }
    }
    return out;
}

/*
 * ─── WELCOME GREETING ───────────────────────────────────────────────────────
 *
 * On a fresh conversation the platform sends its own generic welcome as the
 * first bot message. The panels already show the admin-configured first bot
 * message, so that platform welcome is dropped.
 *
 * It is ONE-SHOT and only ever looks at the first bot message of a fresh
 * conversation:
 *   • If that message carries a "<timestamp>-REQ-<n>" identifier it is an
 *     agent REPLY to something the user sent (not a welcome) and is shown.
 *     This keeps a real first answer visible if a platform never sends a welcome.
 *   • Anything else is treated as the welcome and dropped.
 *
 * The user's first message is sent exactly ONCE. The agent answers it
 * directly; it is never re-sent.
 * ────────────────────────────────────────────────────────────────────────── */
let _dropWelcomeGreeting = false;

// Agent replies observed in the SSE stream use ids like "1790665212772-REQ-1";
// the welcome uses a plain UUID.
function isAgentReplyId(entryId) {
    return typeof entryId === 'string' && /-REQ-\d+$/.test(entryId);
}

/* ==========================================
   AVATAR / CONFIG STATE
========================================== */
let _avatarUrl         = null;
let _sendIconUrl = null;
let _configLoaded      = false;
let _configLoadPromise = null;

export async function loadConfig(configName) {
    if (_configLoaded) {
        return;
    }
    if (_configLoadPromise) {
        return _configLoadPromise;
    }

    _configLoadPromise = getConfigByName({ configName })
        .then(data => {
            if (data?.Avatar_URL__c){
                 _avatarUrl = data.Avatar_URL__c;
            }

            if (data.Send_Button_Icon_URL__c) {
                setSendIconUrl(data.Send_Button_Icon_URL__c);
            }
            _configLoaded      = true;
            _configLoadPromise = null;
            broadcast('avatarLoaded', { avatarUrl: _avatarUrl });
        })
        .catch(err => {
            console.error('SharedService: config load error', err);
            _configLoadPromise = null;
        });

    return _configLoadPromise;
}

export function getAvatarUrl()    { return _avatarUrl; }
export function setAvatarUrl(url) {
    if (!url || _avatarUrl === url){
        return;
    }
    _avatarUrl    = url;
    _configLoaded = true;
    broadcast('avatarLoaded', { avatarUrl: _avatarUrl });
}

export function getSendIconUrl() {
    return _sendIconUrl;
}

export function setSendIconUrl(url) {
    if (!url || _sendIconUrl === url) {
        return;
    }

    _sendIconUrl = url;

    broadcast('sendIconLoaded', {
        sendIconUrl: _sendIconUrl
    });
}

/* ==========================================
   MESSAGE CONTEXT + SSE
========================================== */
let msgContext         = null;
let sseAbortController = null;
let sseReader          = null;
let sseBuffer          = '';

export function registerMessageContext(context) {
    msgContext = context;
}

function broadcast(type, payload = {}) {
    if (!msgContext) return;
    publish(msgContext, ChatChannel, { type, payload });
}

/* ==========================================
   RESTORE CONVERSATION (on soft navigation / F5)
========================================== */
export async function restoreConversation(esDeveloperName) {

    if (!_isRestorable) {
        return null;
    }

    const conversationId = localStorage.getItem(STORAGE_KEYS.CONVERSATION_ID);
    if (!conversationId) {
        return null;
    }

    const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (!accessToken) {
        console.warn('⚠️ Original access token missing — cannot restore safely. Clearing storage.');
        clearChatStorage();
        return null;
    }

    try {
        state.accessToken              = accessToken;
        state.conversationId           = conversationId;
        state.esDeveloperName          = esDeveloperName;
        state.isActive                 = true;
        state.agentHasJoined           = true;
        state.hasUserSentFirstMessage  = true;
        state.pendingFirstMessage      = null;
        state.isRestoring              = true;

        // Restored sessions never drop anything — all messages were already visible.
        _dropWelcomeGreeting = false;

        state.messages = loadMessagesFromSession();

        localStorage.setItem(STORAGE_KEYS.ES_DEV_NAME, esDeveloperName);

        // eslint-disable-next-line @lwc/lwc/no-async-operation
        startSSE();

        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            state.isRestoring = false;
        }, 3000);

        return viewState();

    } catch (e) {
        console.error('Failed to restore conversation', e);
        clearChatStorage();
        return null;
    }
}

/* ==========================================
   START CONVERSATION (fresh)
========================================== */
export async function startConversation(source = 'home', esDeveloperName, preChatData = null) {
    if (state.isActive) {
        broadcast('chatStarted', viewState());
        return viewState();
    }

    state.esDeveloperName = esDeveloperName;
    state.accessToken     = await getAccessToken({ esDeveloperName });

    let routingAttributesJson = null;
    if (preChatData && typeof preChatData === 'object') {
        const cleaned = {};
        Object.entries(preChatData).forEach(([k, v]) => {
            if (v !== null && v !== undefined && v !== '') {
                cleaned[k] = v;
            }
        });
        if (Object.keys(cleaned).length > 0) {
            routingAttributesJson = JSON.stringify(cleaned);
            savePreChatData(cleaned);
        }
    }

    state.conversationId = await createConversation({
        accessToken       : state.accessToken,
        esDeveloperName,
        routingAttributes : routingAttributesJson
    });

    state.isActive                = true;
    state.messages                = [];
    state.startedFrom             = source;
    state.hasUserSentFirstMessage = false;
    state.agentHasJoined          = false;
    state.pendingFirstMessage     = null;
    state.isRestoring             = false;
    state.activeParticipantRole   = null;

    // The first bot message of a fresh conversation is the platform welcome (see note above).
    _dropWelcomeGreeting = true;

    localStorage.setItem(STORAGE_KEYS.CONVERSATION_ID, state.conversationId);
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN,    state.accessToken);
    localStorage.setItem(STORAGE_KEYS.ES_DEV_NAME,     esDeveloperName);

    try { sessionStorage.setItem(SS_ALIVE_KEY, '1'); } catch (_) {}

    // eslint-disable-next-line @lwc/lwc/no-async-operation
    startSSE();

    broadcast('chatStarted', viewState());

    if (preChatData && Object.keys(preChatData).length > 0) {
        broadcast('preChatSubmitted', { preChatData });
    }

    return viewState();
}

/* ==========================================
   SSE
========================================== */
async function startSSE() {

    if (sseAbortController || sseReader) {
        return;
    }

    sseAbortController = new AbortController();

    try {
        const ctx = await loadOrgContext();

        const sseUrl = `${ctx.sseBaseUrl}/eventrouter/v1/sse`;

        const res = await fetch(sseUrl, {
            headers: {
                Authorization  : `Bearer ${state.accessToken}`,
                Accept         : 'text/event-stream',
                'Cache-Control': 'no-cache',
                'X-Org-Id'     : ctx.orgId
            },
            signal: sseAbortController.signal
        });

        const decoder = new TextDecoder();
        sseReader = res.body.getReader();

        while (true) {
            const { done, value } = await sseReader.read();
            if (done) break;

            sseBuffer += decoder.decode(value, { stream: true });
            processSSEBuffer();
        }

    } catch (e) {
        if (e?.name !== 'AbortError') {
            console.error('❌ SSE connection error', e);
        }
    }
}

function processSSEBuffer() {
    let boundary;
    while ((boundary = sseBuffer.indexOf('\n\n')) !== -1) {
        const rawEvent = sseBuffer.slice(0, boundary).trim();
        sseBuffer      = sseBuffer.slice(boundary + 2);
        parseSSEEvent(rawEvent);
    }
}

async function parseSSEEvent(raw) {
    const lines = raw.split('\n');
    let type    = '';
    let data    = '';

    lines.forEach(l => {
        if (l.startsWith('event:')) {
            type  = l.replace('event:', '').trim();
        }
        if (l.startsWith('data:')) {
             data += l.replace('data:', '').trim();
        }
    });

    if (!data) return;

    try {
        const json = JSON.parse(data);

        if (type === 'CONVERSATION_MESSAGE') {
            const entry = JSON.parse(json.conversationEntry?.entryPayload || '{}');
            if (entry.entryType !== 'Message') return;
            if (json.conversationEntry?.sender?.role === 'EndUser') return;

            const senderRole    = json.conversationEntry?.sender?.role;
            const staticContent = entry?.abstractMessage?.staticContent;
            const text          = staticContent?.text;
            if (text) {
                await pushBotMessage(
                    text,
                    senderRole,
                    json.conversationEntry?.identifier,
                    extractCitations(staticContent)
                );
            }
        }

        if (type === 'CONVERSATION_PARTICIPANT_CHANGED') {
            await handleParticipantChanged(json);
        }

        if (type === 'CONVERSATION_TYPING_STARTED_INDICATOR') {
            const isLiveAgent = state.activeParticipantRole === 'Agent';
            if (isLiveAgent) {
                broadcast('agentTypingStart');
            } else {
                broadcast('botTypingStart');
            }
        }

        if (type === 'CONVERSATION_TYPING_STOPPED_INDICATOR') {
            const isLiveAgent = state.activeParticipantRole === 'Agent';
            if (isLiveAgent) {
                broadcast('agentTypingStop');
            } else {
                broadcast('botTypingStop');
            }
        }

    } catch (e) {
        console.error('❌ SSE parse failed', e, raw);
    }
}

/* ==========================================
   PARTICIPANT CHANGED
========================================== */
async function handleParticipantChanged(json) {
    const entry       = JSON.parse(json.conversationEntry?.entryPayload || '{}');
    const participant = entry?.entries?.[0];
    const operation   = participant?.operation;
    const role        = participant?.participant?.role;


    if (state.isRestoring) {
        return;
    }

    if (operation?.toLowerCase() === 'add') {
        state.activeParticipantRole = role;
    } else if (operation?.toLowerCase() === 'remove') {
        if (role === 'Chatbot' || role === 'Bot') {
            broadcast('agentJoining');
        }
        if (state.activeParticipantRole === role) {
            state.activeParticipantRole = null;
        }
    }

    if (operation?.toLowerCase() !== 'add') return;

    const validRoles = ['Bot', 'Agent', 'Chatbot'];
    if (!validRoles.includes(role)) return;
    if (state.agentHasJoined && state.pendingFirstMessage === null) return;

    state.agentHasJoined = true;

    if (role === 'Agent') {
        broadcast('agentJoined', { role });
    }

    if (state.pendingFirstMessage) {
        const text = state.pendingFirstMessage;
        state.pendingFirstMessage = null;

        try {
            await postMessage({
                accessToken          : state.accessToken,
                conversationId       : state.conversationId,
                text,
                isNewMessagingSession: true,
                esDeveloperName      : state.esDeveloperName
            });
            state.hasUserSentFirstMessage = true;
        } catch (e) {
            console.error('❌ Failed to send parked first message', e);
            state.pendingFirstMessage = text;
            state.agentHasJoined      = false;
        }
    }
}

/* ==========================================
   PUSH BOT/AGENT MESSAGE
========================================== */
async function pushBotMessage(text, senderRole, entryId, citations) {

    /* ── WELCOME GREETING (one-shot, see note at top) ──────────────────── */
    if (_dropWelcomeGreeting) {
        _dropWelcomeGreeting = false;
        if (!isAgentReplyId(entryId)) {
            return;
        }
    }

    // Duplicate guards — same entry replayed (e.g. SSE reconnect), or same bot text twice
    if (entryId && state.messages.some(m => m.entryId === entryId)) return;
    if (state.messages.some(m => m.rawText === text && m.isBot)) return;

    const msg = {
        id          : entryId || `m-${Date.now()}-${state.messages.length}`,
        entryId     : entryId || null,
        rawText     : text,               // raw text only; c-chat-message-body parses it safely
        isBot       : true,
        isHumanAgent: senderRole === 'Agent',
        citations   : Array.isArray(citations) ? citations : []
    };
    state.messages.push(msg);
    saveMessagesToSession(state.messages);

    broadcast('chatUpdated', viewState());
}

/* ==========================================
   SEND MESSAGE
========================================== */
export async function sendMessage(text) {
    if (!state.isActive) {
        throw new Error('Chat not started');
    }

    const userMsg = { id: Date.now(), rawText: text, text, isUser: true };
    state.messages.push(userMsg);
    saveMessagesToSession(state.messages);
    broadcast('chatUpdated', viewState());

    try {
        /* ── PARK the message if the agent hasn't joined yet ────────────────
         * Only park if this is the very first user message AND no park is
         * already pending.
         * ─────────────────────────────────────────────────────────────────── */
        if (!state.agentHasJoined && !state.hasUserSentFirstMessage && !state.pendingFirstMessage) {
            state.pendingFirstMessage = text;
            return;
        }

        const isNewSession = !state.hasUserSentFirstMessage && !state.isRestoring;


        await postMessage({
            accessToken          : state.accessToken,
            conversationId       : state.conversationId,
            text,
            isNewMessagingSession: isNewSession,
            esDeveloperName      : state.esDeveloperName
        });

        state.hasUserSentFirstMessage = true;
    } catch (e) {
        console.error('❌ Failed to send message:', e);
    }
}

export function getSavedPreChatData() {
    try {
        const raw = localStorage.getItem(PRE_CHAT_DATA_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (_) {
        return null;
    }
}

export function savePreChatData(data) {
    try {
        if (data && Object.keys(data).length > 0) {
            localStorage.setItem(PRE_CHAT_DATA_KEY, JSON.stringify(data));
        }
    } catch (_) {}
}

export function clearSavedPreChatData() {
    try { localStorage.removeItem(PRE_CHAT_DATA_KEY); } catch (_) {}
}

/* ==========================================
   CLOSE CHAT
========================================== */
export async function closeChat() {
    try {
        await closeConversationApex({
            accessToken    : state.accessToken,
            conversationId : state.conversationId,
            esDeveloperName: state.esDeveloperName
        });
    } catch (_) {}

    if (sseAbortController) {
        sseAbortController.abort();
        sseAbortController = null;
    }
    sseReader = null;
    sseBuffer = '';

    clearChatStorage();

    _dropWelcomeGreeting = false;

    state = {
        isActive               : false,
        accessToken            : null,
        conversationId         : null,
        esDeveloperName        : null,
        messages               : [],
        startedFrom            : null,
        hasUserSentFirstMessage: false,
        agentHasJoined         : false,
        pendingFirstMessage    : null,
        isRestoring            : false,
        activeParticipantRole  : null
    };

    broadcast('chatClosed', {});
}

/* ==========================================
   PUBLIC HELPERS
========================================== */
export function getState()             { return viewState(); }
export function isConversationActive() { return state.isActive; }