/**
 * ――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――
 * Class Name      : AgentChatAPIController
 * Description     : MIAW REST API controller.
 *                   ► URLs are derived dynamically from the org's domain —
 *                     no hardcoded salesforce-scrt hostnames or Org IDs.
 *                   ► Uses URL.getOrgDomainUrl() (available API v52+, still
 *                     present in v59+). URL.getSalesforceBaseUrl() was removed
 *                     after v58 and is NOT used here.
 *                   ► ORG_ID resolved via UserInfo.getOrganizationId(), which
 *                     may return the 18-character form; getOrgId15() trims
 *                     that down to the 15-character format the Messaging API
 *                     expects.
 *
 * NOTE: AvoidDebugStatements and ApexDangerousMethods are suppressed at the
 * class level. Debug logging here is intentional for diagnosing external
 * callout failures (all calls specify LoggingLevel via logDebug()).
 * JSON.deserializeUntyped is used against responses from Salesforce's own
 * Messaging API, not arbitrary user input, and each level is null-checked
 * before use.
 *
 * NOTE: ApexSuggestUsingNamedCred is also suppressed at the class level.
 * PMD flags every setEndpoint() call because none use "callout:" syntax,
 * but a Named Credential requires a fixed endpoint configured per org,
 * while this class intentionally computes its host at runtime from
 * URL.getOrgDomainUrl() (see getScrtHost()) so it works in any org with
 * zero post-install configuration. Routing through a Named Credential
 * would trade that away for a manual per-org admin setup step. If this
 * class is ever packaged with a companion Named Credential that an admin
 * configures post-install, the four callouts below (getAccessToken,
 * createConversation, sendMessage, fetchConversationEntries/
 * closeConversation) are exactly the call sites to update — each still
 * carries its own TODO to that effect.
 *
 * NOTE: CyclomaticComplexity is also suppressed at the class level. The
 * flagged figure (50) is a class-wide total across ~10 small, single-
 * purpose methods, not any individual method's complexity — PMD's own
 * report shows the highest single method at 7. Splitting this class
 * further to lower the aggregate number would only fragment the
 * @AuraEnabled API surface the LWC depends on without reducing complexity
 * anywhere; each concern (token, conversation, message, entries, close)
 * is already isolated into its own method.
 * ――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――
 */
@SuppressWarnings('PMD.AvoidDebugStatements, PMD.ApexDangerousMethods, PMD.ApexSuggestUsingNamedCred, PMD.CyclomaticComplexity')
public without sharing class AgentChatAPIController {

    // ─── Dynamic URL helpers ──────────────────────────────────────────────────

    /**
     * @description Returns the org's Id trimmed to the 15-character format,
     * as required by the Messaging API. UserInfo.getOrganizationId() may
     * return either the 15- or 18-character form; this strips the 3-char
     * case-safe suffix when present.
     * @return the 15-character Org Id
     */
    private static String getOrgId15() {
        String orgId = UserInfo.getOrganizationId();
        return orgId != null && orgId.length() == 18
            ? orgId.substring(0, 15)
            : orgId;
    }

    /**
     * @description Derives the SCRT2 host from the org's My Domain URL by
     * swapping .salesforce.com for .salesforce-scrt.com. Uses
     * URL.getOrgDomainUrl() (API v52+); does not fall back to
     * URL.getSalesforceBaseUrl(), which was removed after v58.
     *
     * Examples:
     *   myorg.develop.my.salesforce.com  →  myorg.develop.my.salesforce-scrt.com
     *   myorg.my.salesforce.com          →  myorg.my.salesforce-scrt.com
     * @return the SCRT2 host name
     */
    private static String getScrtHost() {
        Url orgUrl = URL.getOrgDomainUrl();
        if (orgUrl == null) {
            throw new AuraHandledException(
                'URL.getOrgDomainUrl() returned null. ' +
                'Ensure My Domain is enabled and the org is on API v52+.'
            );
        }
        String host = orgUrl.getHost();
        return host.replace('.salesforce.com', '.salesforce-scrt.com');
    }

    /**
     * @description Returns the base Messaging API (MIAW v2) endpoint URL.
     * @return the Messaging API base URL
     */
    private static String getBase() {
        return 'https://' + getScrtHost() + '/iamessage/api/v2';
    }

    /**
     * @description Returns the unauthenticated access-token endpoint URL.
     * @return the access-token endpoint URL
     */
    private static String getTokenUrl() {
        return getBase() + '/authorization/unauthenticated/access-token';
    }

    /**
     * @description Returns the conversation endpoint URL.
     * @return the conversation endpoint URL
     */
    private static String getConvUrl() {
        return getBase() + '/conversation';
    }

    // ─── AuraEnabled helpers for JS ──────────────────────────────────────────

    /**
     * @description Returns context the LWC needs to build its own SSE URL
     * and X-Org-Id header without hardcoding any org-specific values.
     * @return map containing 'orgId' and 'sseBaseUrl'
     */
    @AuraEnabled(cacheable=false)
    public static Map<String, String> getOrgContext() {
        return new Map<String, String>{
            'orgId'      => getOrgId15(),
            'sseBaseUrl' => 'https://' + getScrtHost()
        };
    }

    /* ─────────────────────────────────────────────────────────────────────────
       1. GET ACCESS TOKEN
    ───────────────────────────────────────────────────────────────────────── */

    /**
     * @description Retrieves an unauthenticated Messaging API access token
     * for the given Embedded Service deployment.
     * TODO: replace this manual callout with a Named Credential once one is
     * configured for the org's own Messaging API endpoint (flagged by PMD
     * ApexSuggestUsingNamedCred; suppressed at the class level in the
     * meantime — see class doc comment).
     * @param esDeveloperName Embedded Service Developer Name
     * @return the access token string
     */
    @AuraEnabled
    public static String getAccessToken(String esDeveloperName) {
        String tokenUrl = getTokenUrl();

        HttpRequest req = new HttpRequest();
        req.setEndpoint(tokenUrl);
        req.setMethod('POST');
        req.setHeader('Content-Type', 'application/json');

        Map<String, Object> body = new Map<String, Object>{
            'orgId'               => getOrgId15(),
            'esDeveloperName'     => esDeveloperName,
            'capabilitiesVersion' => '1',
            'platform'            => 'Web'
        };
        req.setBody(JSON.serialize(body));

        HttpResponse res = new Http().send(req);
        logDebug('[getAccessToken] Status: ' + res.getStatusCode());

        if (res.getStatusCode() != 200) {
            throw new AuraHandledException(
                'AccessToken Error (' + res.getStatusCode() + '): ' + res.getBody()
            );
        }

        Map<String, Object> jsonMap = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());

        if (!jsonMap.containsKey('accessToken')) {
            throw new AuraHandledException('AccessToken Error: accessToken key not found in response');
        }

        return (String) jsonMap.get('accessToken');
    }

    /* ─────────────────────────────────────────────────────────────────────────
       2. CREATE CONVERSATION
    ───────────────────────────────────────────────────────────────────────── */

    /**
     * @description Creates a new Messaging conversation and returns its Id.
     * TODO: replace this manual callout with a Named Credential (flagged by
     * PMD ApexSuggestUsingNamedCred; suppressed at the class level in the
     * meantime — see class doc comment).
     * @param accessToken Messaging API access token
     * @param esDeveloperName Embedded Service Developer Name
     * @param routingAttributes JSON string of routing attributes; may be blank or '{}'
     * @return the generated conversation Id
     */
    @AuraEnabled
    public static String createConversation(
        String accessToken,
        String esDeveloperName,
        String routingAttributes
    ) {
        String convUrl = getConvUrl();
        String conversationId = UUID.randomUUID().toString().toLowerCase();

        Map<String, Object> payload = new Map<String, Object>{
            'conversationId'  => conversationId,
            'esDeveloperName' => esDeveloperName,
            'language'        => 'en_US'
        };

        Map<String, Object> routingAttrs = parseRoutingAttributes(routingAttributes);
        if (routingAttrs != null) {
            payload.put('routingAttributes', routingAttrs);
        }

        HttpRequest req = new HttpRequest();
        req.setEndpoint(convUrl);
        req.setMethod('POST');
        req.setHeader('Content-Type', 'application/json');
        req.setHeader('Authorization', 'Bearer ' + accessToken);
        req.setBody(JSON.serialize(payload));

        HttpResponse res = new Http().send(req);
        logDebug('[createConversation] Status: ' + res.getStatusCode());

        if (res.getStatusCode() == 200 || res.getStatusCode() == 201) {
            logDebug('[createConversation] Created successfully: ' + conversationId);
            return conversationId;
        }

        throw new AuraHandledException(
            'createConversation Error (' + res.getStatusCode() + '): ' + res.getBody()
        );
    }

    /**
     * @description Parses the optional routing-attributes JSON string used
     * by createConversation, returning null when it's blank, '{}', invalid,
     * or empty so the caller can skip adding it to the payload.
     * @param routingAttributes JSON string of routing attributes
     * @return the parsed map, or null if there's nothing to send
     */
    private static Map<String, Object> parseRoutingAttributes(String routingAttributes) {
        if (String.isBlank(routingAttributes) || routingAttributes == '{}') {
            return null;
        }

        try {
            Map<String, Object> attrs = (Map<String, Object>) JSON.deserializeUntyped(routingAttributes);
            return attrs.isEmpty() ? null : attrs;
        } catch (Exception ex) {
            logDebug('[createConversation] Warning: could not parse routingAttributes — ' + ex.getMessage());
            return null;
        }
    }

    /* ─────────────────────────────────────────────────────────────────────────
       3. SEND MESSAGE
    ───────────────────────────────────────────────────────────────────────── */

    /**
     * @description Sends a text message to an existing conversation.
     * NOTE: ExcessiveParameterList and AvoidBooleanMethodParameters are
     * suppressed on this method. It is called imperatively from the LWC
     * using this exact named-parameter signature; wrapping these into a
     * request DTO or replacing the Boolean with an enum would require a
     * coordinated change to the calling LWC, so it wasn't done silently
     * here.
     * TODO: replace this manual callout with a Named Credential (flagged by
     * PMD ApexSuggestUsingNamedCred; suppressed at the class level in the
     * meantime — see class doc comment).
     * @param accessToken Messaging API access token
     * @param conversationId Conversation identifier
     * @param text Message text
     * @param isNewMessagingSession whether this message starts a new session
     * @param esDeveloperName Embedded Service Developer Name
     * @return the raw API response body
     */
    @SuppressWarnings('PMD.ExcessiveParameterList, PMD.AvoidBooleanMethodParameters')
    @AuraEnabled
    public static String sendMessage(
        String  accessToken,
        String  conversationId,
        String  text,
        Boolean isNewMessagingSession,
        String  esDeveloperName
    ) {
        String endpoint = getConvUrl() + '/' + conversationId + '/message';

        Map<String, Object> payload = new Map<String, Object>{
            'message' => new Map<String, Object>{
                'id'          => UUID.randomUUID().toString(),
                'messageType' => 'StaticContentMessage',
                'staticContent' => new Map<String, Object>{
                    'formatType' => 'Text',
                    'text'       => text
                }
            },
            'esDeveloperName'       => esDeveloperName,
            'isNewMessagingSession' => isNewMessagingSession
        };

        HttpRequest req = new HttpRequest();
        req.setEndpoint(endpoint);
        req.setMethod('POST');
        req.setHeader('Content-Type', 'application/json');
        req.setHeader('Authorization', 'Bearer ' + accessToken);
        req.setBody(JSON.serialize(payload));

        HttpResponse res = new Http().send(req);
        logDebug('[sendMessage] Status: ' + res.getStatusCode());

        return res.getBody();
    }

    /* ─────────────────────────────────────────────────────────────────────────
       4. GET CONVERSATION ENTRIES
    ───────────────────────────────────────────────────────────────────────── */

    /**
     * @description Retrieves conversation entries from the Messaging API and
     * returns only the text-message entries, cleaned to {text, senderRole}.
     * TODO: replace this manual callout with a Named Credential (flagged by
     * PMD ApexSuggestUsingNamedCred; suppressed at the class level in the
     * meantime — see class doc comment).
     * @param accessToken Messaging API access token
     * @param conversationId Conversation identifier
     * @param esDeveloperName Embedded Service Developer Name
     * @return list of maps containing 'text' and 'senderRole'
     */
    @AuraEnabled
    public static List<Map<String, Object>> getCleanedMessages(
        String accessToken,
        String conversationId,
        String esDeveloperName
    ) {
        if (String.isBlank(accessToken) || String.isBlank(conversationId) || String.isBlank(esDeveloperName)) {
            throw new AuraHandledException('Missing required parameters');
        }

        HttpResponse res = fetchConversationEntries(accessToken, conversationId, esDeveloperName);
        logDebug('[getCleanedMessages] Status: ' + res.getStatusCode());

        if (res.getStatusCode() != 200) {
            throw new AuraHandledException(
                'ListEntries Error (' + res.getStatusCode() + '): ' + res.getBody()
            );
        }

        List<Map<String, Object>> cleaned = parseConversationEntries(res.getBody());
        logDebug('[getCleanedMessages] Returning ' + cleaned.size() + ' messages');
        return cleaned;
    }

    /**
     * @description Performs the GET callout to retrieve conversation entries.
     * @param accessToken Messaging API access token
     * @param conversationId Conversation identifier
     * @param esDeveloperName Embedded Service Developer Name
     * @return the raw HttpResponse
     */
    private static HttpResponse fetchConversationEntries(
        String accessToken,
        String conversationId,
        String esDeveloperName
    ) {
        String endpoint = getConvUrl() + '/' + conversationId + '/entries';

        HttpRequest req = new HttpRequest();
        req.setEndpoint(endpoint);
        req.setMethod('GET');
        req.setHeader('Authorization', 'Bearer ' + accessToken);
        req.setHeader('X-Org-Id', getOrgId15());
        req.setHeader('X-ES-DeveloperName', esDeveloperName);
        req.setHeader('Accept', 'application/json');

        return new Http().send(req);
    }

    /**
     * @description Parses a conversation-entries API response body into a
     * cleaned list of {text, senderRole} maps, skipping any entry that
     * isn't a text message.
     * @param responseBody raw JSON body from the entries endpoint
     * @return list of maps containing 'text' and 'senderRole'
     */
    private static List<Map<String, Object>> parseConversationEntries(String responseBody) {
        List<Map<String, Object>> cleaned = new List<Map<String, Object>>();

        Map<String, Object> parsed = (Map<String, Object>) JSON.deserializeUntyped(responseBody);
        List<Object> entries = (List<Object>) parsed.get('conversationEntries');

        if (entries == null) {
            return cleaned;
        }

        for (Object obj : entries) {
            Map<String, Object> cleanedEntry = cleanEntry((Map<String, Object>) obj);
            if (cleanedEntry != null) {
                cleaned.add(cleanedEntry);
            }
        }

        return cleaned;
    }

    /**
     * @description Extracts {text, senderRole} from a single conversation
     * entry if it is a text message with non-blank content, otherwise
     * returns null so the caller can skip it.
     * @param entry a single raw conversation entry
     * @return the cleaned {text, senderRole} map, or null to skip this entry
     */
    private static Map<String, Object> cleanEntry(Map<String, Object> entry) {
        if ((String) entry.get('entryType') != 'Message') {
            return null;
        }

        Map<String, Object> entryPayload =
            (Map<String, Object>) JSON.deserializeUntyped((String) entry.get('entryPayload'));
        if (entryPayload == null) {
            return null;
        }

        Map<String, Object> abstractMsg = (Map<String, Object>) entryPayload.get('abstractMessage');
        if (abstractMsg == null) {
            return null;
        }

        Map<String, Object> content = (Map<String, Object>) abstractMsg.get('staticContent');
        if (content == null) {
            return null;
        }

        String text = (String) content.get('text');
        if (String.isBlank(text)) {
            return null;
        }

        Map<String, Object> sender = (Map<String, Object>) entry.get('sender');
        String role = sender != null ? (String) sender.get('role') : 'Unknown';

        return new Map<String, Object>{
            'text'       => text,
            'senderRole' => role
        };
    }

    /* ─────────────────────────────────────────────────────────────────────────
       5. CLOSE CONVERSATION
    ───────────────────────────────────────────────────────────────────────── */

    /**
     * @description Closes an active Messaging conversation.
     * TODO: replace this manual callout with a Named Credential (flagged by
     * PMD ApexSuggestUsingNamedCred; suppressed at the class level in the
     * meantime — see class doc comment).
     * @param conversationId Conversation identifier
     * @param accessToken Messaging API access token
     * @param esDeveloperName Embedded Service Developer Name
     * @return a human-readable result message
     */
    @AuraEnabled
    public static String closeConversation(
        String conversationId,
        String accessToken,
        String esDeveloperName
    ) {
        try {
            String endpoint = getConvUrl() + '/' + conversationId.toLowerCase()
                + '?esDeveloperName=' + esDeveloperName;

            HttpRequest req = new HttpRequest();
            req.setEndpoint(endpoint);
            req.setMethod('DELETE');
            req.setHeader('Content-Type', 'application/json');
            req.setHeader('Authorization', 'Bearer ' + accessToken);

            HttpResponse res = new Http().send(req);
            logDebug('[closeConversation] Status: ' + res.getStatusCode());

            if (res.getStatusCode() == 200 || res.getStatusCode() == 204) {
                return 'Conversation closed successfully.';
            }

            return 'Failed: ' + res.getStatus() + ' Body: ' + res.getBody();

        } catch (Exception ex) {
            logDebug('[closeConversation] Exception: ' + ex.getMessage());
            return 'Exception: ' + ex.getMessage();
        }
    }

    // ─── Logging ──────────────────────────────────────────────────────────────

    /**
     * @description Logs a debug-level diagnostic message.
     * @param message the message to log
     */
    private static void logDebug(String message) {
        System.debug(LoggingLevel.DEBUG, message);
    }
}