public with sharing class AgentChatController {

    // Explicit access modifier added
    private static final String NAMED_CREDENTIAL = 'callout:Agentforce_NC';
    private static final String API_VERSION = 'v60.0'; // Centralized for easier updates

    private static final String baseUrl = URL.getOrgDomainUrl().toExternalForm();

    private static final String jwtBearer = 'eyJvcmdKd3QuaW5jbCI6ZmFsc2UsImtpZCI6ImE5MWI1Y2ZkMmJhYmNjNTAwNGVlZjA5ZTdhNjUzZjhjZDMxNmUxZGFkNjYxM2M5NTdmNDJjNDAxZTQzM2E1OWQiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ2Mi9pYW1lc3NhZ2UvVU5BVVRIL05BL3VpZDozOWRhMmNiMy1iMmU5LTRjYjgtOTk4MS0xMTM2ZDRiN2U3ZWIiLCJjbGllbnRJZCI6InYxL1Rlc3RfUG9zdG1hbi85NDQwODNhMi05YWI4LTRlMDktYjE0Yy1kOTQ1NDBhMDk5ZTkiLCJmYWxjb25DZWxsIjoic2NydDAxIiwiY2hhbm5lbEFkZElkIjoiOGNjYTk1NzItZTE1Mi00YjFkLWI5YjItZWViMmFjNTk1MmJmIiwiaXNzIjoiaWFtZXNzYWdlIiwiZmFsY29uRkQiOiJ1ZW5nYWdlMSIsImNsaWVudFZlcnNpb24iOiIxLjIuMyIsImRldmljZUlkIjoiTExTa3lxQk5xSUNoMExiUmVQS2dnN1lSRk1JdDVIdjMza3R1ZFZyaGRJa2NCZ1ZSbGNSTXduSDQ5OSsrMXJNUHNhUHQ2WFBORFd1VTFTTUVjUVJzUWc9PSIsImNhcGFiaWxpdGllc1ZlcnNpb24iOiIyNDgiLCJvcmdJZCI6IjAwRGdLMDAwMDBCUmJNeiIsImRldmljZUluZm8iOiJ7XCJhcHBOYW1lXCI6XCJQb3N0bWFuXCIsXCJjbGllbnRWZXJzaW9uXCI6XCIxLjIuM1wifSIsInBsYXRmb3JtIjoiV2ViIiwiZmFsY29uRklIYXNoIjoiNThrdGF6Iiwiand0SWQiOiI1N1hnMGpsNUplbnBtenNrOFRhMzJGIiwiY2xpZW50U2Vzc2lvbklkIjoiNWFkMTViNWEtMzhhOC00MTFkLTk5MDUtNjQzN2ZlZmM2OGUyIiwiYXVkIjoiVVNFUiIsImV2dEtleSI6InNjcnQucHJvZC5ldmVudHJvdXRlcl9fYXdzLmF3cy1wcm9kOC1jYWNlbnRyYWwxLnVlbmdhZ2UxLmFqbmFsb2NhbDFfX3B1YmxpYy5ldmVudHMuc2NydDAxOjkwIiwib3JnTWlncmF0aW9uQmVoYXZpb3IiOnRydWUsImFwaVZlcnNpb24iOiJ2MiIsInNjb3BlIjoicHVibGljIiwiandrc191cmkiOiJodHRwczovL3NjcnQwMS51ZW5nYWdlMS5zZmRjLTU4a3Rhei5zdmMuc2ZkY2ZjLm5ldC9pYW1lc3NhZ2UvdjEvLndlbGwta25vd24vandrcy5qc29uP2tleUlkPWE5MWI1Y2ZkMmJhYmNjNTAwNGVlZjA5ZTdhNjUzZjhjZDMxNmUxZGFkNjYxM2M5NTdmNDJjNDAxZTQzM2E1OWQiLCJlc0RlcGxveW1lbnRUeXBlIjoiQVBJIiwiZXhwIjoxNzY3ODczNTk5LCJpYXQiOjE3Njc4NTE5OTl9.OEL9X6B0LXX5qoWZBrEJWDXdPXWrSelsxze2UlCqi09gnnH2-fNc1m9DX9YL-fGQtuZXSJiDYJcTeu4iXYvxcE77B8iDWo5AsMDO2ddBXKbys9Oqe_eCZDlZnpuwdGhQxX4iRb3eS6UbmykbUHxxRHMLmWqq4GrVB7NON4vuH7N-4xt2yM_YcH64bFWjV78D42E506CX93CXyp2_-tdkYLd21AclCH4TESeASIkCEXPStp1rrrU_TOKGh0Zplxu8l68YER_G97x2OuBuTjvIvrlxPcAizLiOEb_2_cuWfnoebYxmwc8MK94D-6npgWiFSBXWTMPnTBWvT32qi0FSKgA';


    /* -------------------------------
       START CONVERSATION
    --------------------------------*/
    @AuraEnabled(cacheable=false)
    public static String startConversation() {

        System.debug(baseUrl);

        HttpRequest req = new HttpRequest();
        req.setEndpoint(
            baseUrl +
            '/services/data/' + API_VERSION + '/messaging/conversations'
        );
        req.setMethod('POST');
        req.setHeader('Content-Type', 'application/json');
        req.setHeader('Accept', 'application/json');
        req.setHeader('Authorization', 'Bearer ' + jwtBearer);


        req.setBody(JSON.serialize(new Map<String, Object>{
            'channel' => 'web'
        }));

        Http http = new Http();
        HttpResponse res;
        
        try {
            res = http.send(req);
            
            if (res.getStatusCode() != 201) {
                System.debug(LoggingLevel.ERROR, 'startConversation callout failed: ' + 
                    res.getStatus() + ' statusCode=' + res.getStatusCode() + 
                    ' body=' + res.getBody());
                throw new AuraHandledException('Conversation creation failed. Status: ' + 
                    res.getStatusCode() + '. Please try again later.');
            }

            // Add null check for response body
            String responseBody = res.getBody();
            if (String.isBlank(responseBody)) {
                throw new AuraHandledException('Empty response from server.');
            }
            
            Map<String, Object> response = 
                (Map<String, Object>) JSON.deserializeUntyped(responseBody);
            
            String conversationId = (String) response.get('id');
            
            if (String.isBlank(conversationId)) {
                throw new AuraHandledException('No conversation ID returned.');
            }
            
            return conversationId;
            
        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'Exception in startConversation: ' + 
                e.getMessage() + ' StackTrace: ' + e.getStackTraceString());
            throw new AuraHandledException('Failed to start conversation: ' + e.getMessage());
            //return e.getMessage();
        }
    }

    /* -------------------------------
       SEND MESSAGE TO AGENT
    --------------------------------*/
    @AuraEnabled(cacheable=false)
    public static String sendMessage(String conversationId, String message) {
        
        // Input validation
        if (String.isBlank(conversationId) || String.isBlank(message)) {
            throw new AuraHandledException('Conversation ID and message are required.');
        }

        HttpRequest req = new HttpRequest();
        req.setEndpoint(
            NAMED_CREDENTIAL +
            '/services/data/' + API_VERSION + '/messaging/conversations/' +
            conversationId + '/messages'
        );

        req.setMethod('POST');
        req.setHeader('Content-Type', 'application/json');
        req.setHeader('Accept', 'application/json');


        Map<String, Object> body = new Map<String, Object>{
            'type' => 'text',
            'text' => message.trim() // Trim message to avoid whitespace issues
        };

        req.setBody(JSON.serialize(body));

        Http http = new Http();
        HttpResponse res;
        
        try {
            res = http.send(req);

            if (res.getStatusCode() >= 300) {
                System.debug(LoggingLevel.ERROR, 'sendMessage callout failed: ' + 
                    res.getStatus() + ' statusCode=' + res.getStatusCode() + 
                    ' body=' + res.getBody());
                throw new AuraHandledException('Unable to send message. Status: ' + 
                    res.getStatusCode());
            }

            /* ------------------------------------
               FETCH LAST AGENT RESPONSE (POLL)
            -------------------------------------*/
            return fetchLatestAgentMessage(conversationId);
            
        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'Exception in sendMessage: ' + 
                e.getMessage() + ' StackTrace: ' + e.getStackTraceString());
            throw new AuraHandledException('Failed to send message: ' + e.getMessage());
        }
    }

    /* -------------------------------
       FETCH AGENT RESPONSE
    --------------------------------*/
    private static String fetchLatestAgentMessage(String conversationId) {

        HttpRequest req = new HttpRequest();
        req.setEndpoint(
            NAMED_CREDENTIAL +
            '/services/data/' + API_VERSION + '/messaging/conversations/' +
            conversationId + '/messages'
        );
        req.setMethod('GET');
        req.setHeader('Accept', 'application/json');
        req.setHeader('Authorization', 'Bearer ' + UserInfo.getSessionId());


        Http http = new Http();
        HttpResponse res;
        
        try {
            res = http.send(req);

            if (res.getStatusCode() != 200) {
                System.debug(LoggingLevel.ERROR, 'fetchLatestAgentMessage failed: ' + 
                    res.getStatus() + ' statusCode=' + res.getStatusCode() + 
                    ' body=' + res.getBody());
                return 'Unable to fetch agent response.';
            }

            String responseBody = res.getBody();
            if (String.isBlank(responseBody)) {
                return 'No messages available.';
            }
            
            Map<String, Object> response = 
                (Map<String, Object>) JSON.deserializeUntyped(responseBody);

            List<Object> messages = 
                (List<Object>) response.get('messages');
                
            if (messages == null || messages.isEmpty()) {
                return 'No messages yet.';
            }

            // Search for latest agent message (your existing logic)
            for (Integer i = messages.size() - 1; i >= 0; i--) {
                Map<String, Object> msg = 
                    (Map<String, Object>) messages[i];

                if (msg != null && (String) msg.get('sender') == 'agent') {
                    String agentMessage = (String) msg.get('text');
                    return String.isNotBlank(agentMessage) ? agentMessage : 'Agent sent an empty message.';
                }
            }

            return 'No agent reply yet.';
            
        } catch (Exception e) {
            System.debug(LoggingLevel.ERROR, 'Exception in fetchLatestAgentMessage: ' + 
                e.getMessage() + ' StackTrace: ' + e.getStackTraceString());
            return 'Error fetching agent response.';
        }
    }
    public static void check(){
        try {
        	String auth = Auth.AuthToken.getAccessToken('0SOgK000001LzJF', 'full');
            System.debug(auth);
        }
catch(Exception e){
    System.debug(LoggingLevel.ERROR, 'Exception in fetchLatestAgentMessage: ' + 
                e.getMessage() + ' StackTrace: ' + e.getStackTraceString());
}
    }
}