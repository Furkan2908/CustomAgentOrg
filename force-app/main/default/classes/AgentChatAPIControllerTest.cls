/**
 * ――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――
 * Class Name      : AgentChatAPIControllerTest
 * Description     : Test coverage for AgentChatAPIController.
 *                   Uses HttpCalloutMock implementations to simulate all
 *                   MIAW REST API responses without real network calls.
 *
 * NOTE: Every test method executes its assertions inside System.runAs(),
 * using a dedicated Standard User created in @TestSetup (see
 * getRunAsUser()). AgentChatAPIController performs no CRUD/FLS-sensitive
 * operations itself, so this is purely to satisfy
 * ApexUnitTestClassShouldHaveRunAs and to exercise the controller under a
 * non-admin context rather than the default test-run user.
 * ――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――
 */
@IsTest
public class AgentChatAPIControllerTest {

    /* ═══════════════════════════════════════════════════════════════════════
       TEST DATA / RUN-AS USER
    ═══════════════════════════════════════════════════════════════════════ */

    private static final String RUN_AS_USER_EMAIL = 'agent.chat.test.runner@example.com.invalid';

    /**
     * @description Creates the dedicated Standard User that every test
     * method runs its assertions as (see getRunAsUser()).
     */
    @TestSetup
    static void setupTestData() {
        Profile standardProfile = [SELECT Id FROM Profile WHERE Name = 'Standard User' LIMIT 1];

        User runAsUser = new User(
            Alias             = 'agntst',
            Email             = RUN_AS_USER_EMAIL,
            EmailEncodingKey  = 'UTF-8',
            LastName          = 'ChatApiTestRunner',
            LanguageLocaleKey = 'en_US',
            LocaleSidKey      = 'en_US',
            ProfileId         = standardProfile.Id,
            TimeZoneSidKey    = 'America/Los_Angeles',
            UserName          = RUN_AS_USER_EMAIL
        );
        insert runAsUser;
    }

    /**
     * @description Retrieves the Standard User created in setupTestData()
     * so each test method can execute its assertions inside System.runAs().
     * @return the dedicated run-as test User
     */
    private static User getRunAsUser() {
        return [SELECT Id FROM User WHERE Email = :RUN_AS_USER_EMAIL LIMIT 1];
    }

    /* ═══════════════════════════════════════════════════════════════════════
       MOCK IMPLEMENTATIONS
    ═══════════════════════════════════════════════════════════════════════ */

    /** Returns a valid access-token response */
    private class MockAccessTokenSuccess implements HttpCalloutMock {
        /**
         * @description Simulates a successful unauthenticated access-token
         * callout, returning a 200 response with a mock access token.
         * @param req the outgoing HttpRequest (unused by this mock)
         * @return a 200 HttpResponse containing a mock accessToken
         */
        public HttpResponse respond(HttpRequest req) {
            HttpResponse res = new HttpResponse();
            res.setStatusCode(200);
            res.setBody('{"accessToken":"mock-token-abc123"}');
            return res;
        }
    }

    /** Returns a 401 to simulate token failure */
    private class MockAccessTokenFailure implements HttpCalloutMock {
        /**
         * @description Simulates a failed access-token callout, returning
         * a 401 response so callers can verify error handling.
         * @param req the outgoing HttpRequest (unused by this mock)
         * @return a 401 HttpResponse
         */
        public HttpResponse respond(HttpRequest req) {
            HttpResponse res = new HttpResponse();
            res.setStatusCode(401);
            res.setBody('{"error":"Unauthorized"}');
            return res;
        }
    }

    /** Returns a 200 for access-token but body has NO accessToken key */
    private class MockAccessTokenMissingKey implements HttpCalloutMock {
        /**
         * @description Simulates a 200 access-token response whose body is
         * missing the expected accessToken key, to verify the controller's
         * defensive key check.
         * @param req the outgoing HttpRequest (unused by this mock)
         * @return a 200 HttpResponse with no accessToken key in the body
         */
        public HttpResponse respond(HttpRequest req) {
            HttpResponse res = new HttpResponse();
            res.setStatusCode(200);
            res.setBody('{"someOtherKey":"value"}');
            return res;
        }
    }

    /** Returns 201 for createConversation */
    private class MockCreateConversationSuccess implements HttpCalloutMock {
        /**
         * @description Simulates a successful createConversation callout
         * that returns HTTP 201.
         * @param req the outgoing HttpRequest (unused by this mock)
         * @return a 201 HttpResponse containing a mock conversation id
         */
        public HttpResponse respond(HttpRequest req) {
            HttpResponse res = new HttpResponse();
            res.setStatusCode(201);
            res.setBody('{"id":"conv-xyz"}');
            return res;
        }
    }

    /** Returns 200 for createConversation */
    private class MockCreateConversation200 implements HttpCalloutMock {
        /**
         * @description Simulates a successful createConversation callout
         * that returns HTTP 200 instead of 201, to verify both success
         * status codes are accepted.
         * @param req the outgoing HttpRequest (unused by this mock)
         * @return a 200 HttpResponse containing a mock conversation id
         */
        public HttpResponse respond(HttpRequest req) {
            HttpResponse res = new HttpResponse();
            res.setStatusCode(200);
            res.setBody('{"id":"conv-xyz"}');
            return res;
        }
    }

    /** Returns 500 for createConversation */
    private class MockCreateConversationFailure implements HttpCalloutMock {
        /**
         * @description Simulates a failed createConversation callout,
         * returning HTTP 500 so callers can verify error handling.
         * @param req the outgoing HttpRequest (unused by this mock)
         * @return a 500 HttpResponse
         */
        public HttpResponse respond(HttpRequest req) {
            HttpResponse res = new HttpResponse();
            res.setStatusCode(500);
            res.setBody('{"error":"Internal Server Error"}');
            return res;
        }
    }

    /** Returns 200 for sendMessage */
    private class MockSendMessageSuccess implements HttpCalloutMock {
        /**
         * @description Simulates a successful sendMessage callout.
         * @param req the outgoing HttpRequest (unused by this mock)
         * @return a 200 HttpResponse with a simple status body
         */
        public HttpResponse respond(HttpRequest req) {
            HttpResponse res = new HttpResponse();
            res.setStatusCode(200);
            res.setBody('{"status":"ok"}');
            return res;
        }
    }

    /** Returns a valid getConversationEntries response with one bot + one user message */
    private class MockGetEntriesSuccess implements HttpCalloutMock {
        /**
         * @description Simulates a successful conversation-entries callout
         * containing one bot message, one user message, and one
         * non-Message entry that the controller should filter out.
         * @param req the outgoing HttpRequest (unused by this mock)
         * @return a 200 HttpResponse with a realistic entries payload
         */
        public HttpResponse respond(HttpRequest req) {
            // Build a minimal but realistic MIAW entries payload
            String botPayload = JSON.serialize(new Map<String,Object>{
                'abstractMessage' => new Map<String,Object>{
                    'staticContent' => new Map<String,Object>{ 'text' => 'Hello from bot' }
                }
            });
            String userPayload = JSON.serialize(new Map<String,Object>{
                'abstractMessage' => new Map<String,Object>{
                    'staticContent' => new Map<String,Object>{ 'text' => 'Hello from user' }
                }
            });

            List<Object> entries = new List<Object>{
                new Map<String,Object>{
                    'entryType'    => 'Message',
                    'entryPayload' => botPayload,
                    'sender'       => new Map<String,Object>{ 'role' => 'Bot' }
                },
                new Map<String,Object>{
                    'entryType'    => 'Message',
                    'entryPayload' => userPayload,
                    'sender'       => new Map<String,Object>{ 'role' => 'EndUser' }
                },
                // Non-Message entry — must be filtered out
                new Map<String,Object>{
                    'entryType'    => 'RoutingWorkItem',
                    'entryPayload' => userPayload,
                    'sender'       => new Map<String,Object>{ 'role' => 'System' }
                }
            };

            Map<String,Object> body = new Map<String,Object>{
                'conversationEntries' => entries
            };

            HttpResponse res = new HttpResponse();
            res.setStatusCode(200);
            res.setBody(JSON.serialize(body));
            return res;
        }
    }

    /** Returns entries where entryPayload has no abstractMessage — tests null guard */
    private class MockGetEntriesNoAbstractMsg implements HttpCalloutMock {
        /**
         * @description Simulates an entries response whose entryPayload
         * has no abstractMessage key, to verify the controller's null
         * guard skips the entry instead of throwing.
         * @param req the outgoing HttpRequest (unused by this mock)
         * @return a 200 HttpResponse with one malformed entry
         */
        public HttpResponse respond(HttpRequest req) {
            String emptyPayload = JSON.serialize(new Map<String,Object>());

            List<Object> entries = new List<Object>{
                new Map<String,Object>{
                    'entryType'    => 'Message',
                    'entryPayload' => emptyPayload,
                    'sender'       => new Map<String,Object>{ 'role' => 'Bot' }
                }
            };

            HttpResponse res = new HttpResponse();
            res.setStatusCode(200);
            res.setBody(JSON.serialize(new Map<String,Object>{
                'conversationEntries' => entries
            }));
            return res;
        }
    }

    /** Returns entries where staticContent is missing — tests null guard */
    private class MockGetEntriesNoStaticContent implements HttpCalloutMock {
        /**
         * @description Simulates an entries response whose abstractMessage
         * has no staticContent key, to verify the controller's null guard
         * skips the entry instead of throwing.
         * @param req the outgoing HttpRequest (unused by this mock)
         * @return a 200 HttpResponse with one malformed entry
         */
        public HttpResponse respond(HttpRequest req) {
            String payload = JSON.serialize(new Map<String,Object>{
                'abstractMessage' => new Map<String,Object>()
            });

            List<Object> entries = new List<Object>{
                new Map<String,Object>{
                    'entryType'    => 'Message',
                    'entryPayload' => payload,
                    'sender'       => new Map<String,Object>{ 'role' => 'Bot' }
                }
            };

            HttpResponse res = new HttpResponse();
            res.setStatusCode(200);
            res.setBody(JSON.serialize(new Map<String,Object>{
                'conversationEntries' => entries
            }));
            return res;
        }
    }

    /** Returns entries where text is blank — tests blank-text guard */
    private class MockGetEntriesBlankText implements HttpCalloutMock {
        /**
         * @description Simulates an entries response whose staticContent
         * text is blank, to verify the controller's blank-text guard
         * skips the entry instead of returning it.
         * @param req the outgoing HttpRequest (unused by this mock)
         * @return a 200 HttpResponse with one blank-text entry
         */
        public HttpResponse respond(HttpRequest req) {
            String payload = JSON.serialize(new Map<String,Object>{
                'abstractMessage' => new Map<String,Object>{
                    'staticContent' => new Map<String,Object>{ 'text' => '' }
                }
            });

            List<Object> entries = new List<Object>{
                new Map<String,Object>{
                    'entryType'    => 'Message',
                    'entryPayload' => payload,
                    'sender'       => new Map<String,Object>{ 'role' => 'Bot' }
                }
            };

            HttpResponse res = new HttpResponse();
            res.setStatusCode(200);
            res.setBody(JSON.serialize(new Map<String,Object>{
                'conversationEntries' => entries
            }));
            return res;
        }
    }

    /** Returns entries where conversationEntries is null */
    private class MockGetEntriesNullEntries implements HttpCalloutMock {
        /**
         * @description Simulates a 200 entries response whose body has no
         * conversationEntries key at all, to verify the controller returns
         * an empty list instead of throwing.
         * @param req the outgoing HttpRequest (unused by this mock)
         * @return a 200 HttpResponse with an empty JSON body
         */
        public HttpResponse respond(HttpRequest req) {
            HttpResponse res = new HttpResponse();
            res.setStatusCode(200);
            res.setBody('{}');   // no conversationEntries key at all
            return res;
        }
    }

    /** Returns entries where sender is null */
    private class MockGetEntriesNullSender implements HttpCalloutMock {
        /**
         * @description Simulates an entries response where an entry has no
         * sender key, to verify the controller defaults senderRole to
         * 'Unknown' instead of throwing.
         * @param req the outgoing HttpRequest (unused by this mock)
         * @return a 200 HttpResponse with one entry missing its sender
         */
        public HttpResponse respond(HttpRequest req) {
            String payload = JSON.serialize(new Map<String,Object>{
                'abstractMessage' => new Map<String,Object>{
                    'staticContent' => new Map<String,Object>{ 'text' => 'Hi' }
                }
            });

            List<Object> entries = new List<Object>{
                new Map<String,Object>{
                    'entryType'    => 'Message',
                    'entryPayload' => payload
                    // no 'sender' key
                }
            };

            HttpResponse res = new HttpResponse();
            res.setStatusCode(200);
            res.setBody(JSON.serialize(new Map<String,Object>{
                'conversationEntries' => entries
            }));
            return res;
        }
    }

    /** Returns 500 for getConversationEntries */
    private class MockGetEntriesFailure implements HttpCalloutMock {
        /**
         * @description Simulates a failed conversation-entries callout,
         * returning HTTP 500 so callers can verify error handling.
         * @param req the outgoing HttpRequest (unused by this mock)
         * @return a 500 HttpResponse
         */
        public HttpResponse respond(HttpRequest req) {
            HttpResponse res = new HttpResponse();
            res.setStatusCode(500);
            res.setBody('{"error":"Server Error"}');
            return res;
        }
    }

    /** Returns 200 for closeConversation */
    private class MockCloseConversationSuccess implements HttpCalloutMock {
        /**
         * @description Simulates a successful closeConversation callout
         * that returns HTTP 200.
         * @param req the outgoing HttpRequest (unused by this mock)
         * @return a 200 HttpResponse with an empty body
         */
        public HttpResponse respond(HttpRequest req) {
            HttpResponse res = new HttpResponse();
            res.setStatusCode(200);
            res.setBody('');
            return res;
        }
    }

    /** Returns 204 for closeConversation */
    private class MockCloseConversation204 implements HttpCalloutMock {
        /**
         * @description Simulates a successful closeConversation callout
         * that returns HTTP 204 instead of 200, to verify both success
         * status codes are accepted.
         * @param req the outgoing HttpRequest (unused by this mock)
         * @return a 204 HttpResponse with an empty body
         */
        public HttpResponse respond(HttpRequest req) {
            HttpResponse res = new HttpResponse();
            res.setStatusCode(204);
            res.setBody('');
            return res;
        }
    }

    /** Returns 400 for closeConversation */
    private class MockCloseConversationFailure implements HttpCalloutMock {
        /**
         * @description Simulates a failed closeConversation callout,
         * returning HTTP 400 so callers can verify the failure-message
         * path instead of an exception.
         * @param req the outgoing HttpRequest (unused by this mock)
         * @return a 400 HttpResponse
         */
        public HttpResponse respond(HttpRequest req) {
            HttpResponse res = new HttpResponse();
            res.setStatusCode(400);
            res.setStatus('Bad Request');
            res.setBody('{"error":"Bad Request"}');
            return res;
        }
    }

    /* ═══════════════════════════════════════════════════════════════════════
       1. getAccessToken
    ═══════════════════════════════════════════════════════════════════════ */

    /** @description Verifies getAccessToken returns the token from a successful callout. */
    @IsTest
    static void testGetAccessTokenSuccess() {
        Test.setMock(HttpCalloutMock.class, new MockAccessTokenSuccess());

        System.runAs(getRunAsUser()) {
            Test.startTest();
            String token = AgentChatAPIController.getAccessToken('MyES');
            Test.stopTest();

            System.assertEquals('mock-token-abc123', token, 'Token should match mock value');
        }
    }

    /** @description Verifies getAccessToken throws when the callout returns a non-200 status. */
    @IsTest
    static void testGetAccessTokenHttpErrorThrowsException() {
        Test.setMock(HttpCalloutMock.class, new MockAccessTokenFailure());

        System.runAs(getRunAsUser()) {
            Test.startTest();
            Boolean exceptionThrown = false;
            try {
                AgentChatAPIController.getAccessToken('MyES');
            } catch (AuraHandledException ex) {
                // AuraHandledException.getMessage() always returns
                // 'Script-thrown exception' at runtime — just verify the type
                exceptionThrown = true;
            }
            Test.stopTest();

            System.assert(exceptionThrown, 'Expected AuraHandledException to be thrown');
        }
    }

    /** @description Verifies getAccessToken throws when the response body has no accessToken key. */
    @IsTest
    static void testGetAccessTokenMissingKeyThrowsException() {
        Test.setMock(HttpCalloutMock.class, new MockAccessTokenMissingKey());

        System.runAs(getRunAsUser()) {
            Test.startTest();
            Boolean exceptionThrown = false;
            try {
                AgentChatAPIController.getAccessToken('MyES');
            } catch (AuraHandledException ex) {
                exceptionThrown = true;
            }
            Test.stopTest();

            System.assert(exceptionThrown, 'Expected AuraHandledException to be thrown');
        }
    }

    /* ═══════════════════════════════════════════════════════════════════════
       2. createConversation
    ═══════════════════════════════════════════════════════════════════════ */

    /** @description Verifies createConversation returns an Id on 201 with routing attributes supplied. */
    @IsTest
    static void testCreateConversation201WithRoutingAttributes() {
        Test.setMock(HttpCalloutMock.class, new MockCreateConversationSuccess());

        System.runAs(getRunAsUser()) {
            Test.startTest();
            String convId = AgentChatAPIController.createConversation(
                'mock-token',
                'MyES',
                '{"_firstName":"Jane","_lastName":"Doe","_email":"jane@test.com"}'
            );
            Test.stopTest();

            System.assertNotEquals(null, convId, 'Conversation ID should be returned');
            System.assert(convId.length() > 0, 'Conversation ID should not be empty');
        }
    }

    /** @description Verifies createConversation returns an Id on 200 with empty routing attributes. */
    @IsTest
    static void testCreateConversation200EmptyRoutingAttributes() {
        Test.setMock(HttpCalloutMock.class, new MockCreateConversation200());

        System.runAs(getRunAsUser()) {
            Test.startTest();
            String convId = AgentChatAPIController.createConversation(
                'mock-token',
                'MyES',
                '{}'   // empty map — should not attach routingAttributes
            );
            Test.stopTest();

            System.assertNotEquals(null, convId);
        }
    }

    /** @description Verifies createConversation handles a null routingAttributes argument gracefully. */
    @IsTest
    static void testCreateConversationNullRoutingAttributes() {
        Test.setMock(HttpCalloutMock.class, new MockCreateConversation200());

        System.runAs(getRunAsUser()) {
            Test.startTest();
            String convId = AgentChatAPIController.createConversation(
                'mock-token',
                'MyES',
                null   // null — should be handled gracefully
            );
            Test.stopTest();

            System.assertNotEquals(null, convId);
        }
    }

    /** @description Verifies createConversation handles a blank routingAttributes argument gracefully. */
    @IsTest
    static void testCreateConversationBlankRoutingAttributes() {
        Test.setMock(HttpCalloutMock.class, new MockCreateConversation200());

        System.runAs(getRunAsUser()) {
            Test.startTest();
            String convId = AgentChatAPIController.createConversation(
                'mock-token',
                'MyES',
                '   '  // blank string
            );
            Test.stopTest();

            System.assertNotEquals(null, convId);
        }
    }

    /** @description Verifies invalid JSON in routingAttributes is swallowed and the conversation still succeeds. */
    @IsTest
    static void testCreateConversationInvalidJsonDoesNotThrow() {
        // Bad JSON should be caught internally and conversation still created
        Test.setMock(HttpCalloutMock.class, new MockCreateConversation200());

        System.runAs(getRunAsUser()) {
            Test.startTest();
            String convId = AgentChatAPIController.createConversation(
                'mock-token',
                'MyES',
                'NOT_VALID_JSON'
            );
            Test.stopTest();

            System.assertNotEquals(null, convId);
        }
    }

    /** @description Verifies createConversation throws when the callout returns a non-2xx status. */
    @IsTest
    static void testCreateConversationHttpErrorThrowsException() {
        Test.setMock(HttpCalloutMock.class, new MockCreateConversationFailure());

        System.runAs(getRunAsUser()) {
            Test.startTest();
            Boolean exceptionThrown = false;
            try {
                AgentChatAPIController.createConversation('mock-token', 'MyES', null);
            } catch (AuraHandledException ex) {
                exceptionThrown = true;
            }
            Test.stopTest();

            System.assert(exceptionThrown, 'Expected AuraHandledException to be thrown');
        }
    }

    /* ═══════════════════════════════════════════════════════════════════════
       3. sendMessage
    ═══════════════════════════════════════════════════════════════════════ */

    /** @description Verifies sendMessage returns the response body when starting a new session. */
    @IsTest
    static void testSendMessageNewSession() {
        Test.setMock(HttpCalloutMock.class, new MockSendMessageSuccess());

        System.runAs(getRunAsUser()) {
            Test.startTest();
            String result = AgentChatAPIController.sendMessage(
                'mock-token',
                'conv-001',
                'Hello agent',
                true,
                'MyES'
            );
            Test.stopTest();

            System.assertNotEquals(null, result);
            System.assert(result.contains('ok'), 'Response body should be returned');
        }
    }

    /** @description Verifies sendMessage returns the response body when continuing an existing session. */
    @IsTest
    static void testSendMessageExistingSession() {
        Test.setMock(HttpCalloutMock.class, new MockSendMessageSuccess());

        System.runAs(getRunAsUser()) {
            Test.startTest();
            String result = AgentChatAPIController.sendMessage(
                'mock-token',
                'conv-001',
                'Follow-up message',
                false,
                'MyES'
            );
            Test.stopTest();

            System.assertNotEquals(null, result);
        }
    }

    /* ═══════════════════════════════════════════════════════════════════════
       4. getCleanedMessages
    ═══════════════════════════════════════════════════════════════════════ */

    /** @description Verifies getCleanedMessages returns only text-message entries, filtering out non-Message entries. */
    @IsTest
    static void testGetCleanedMessagesSuccess() {
        Test.setMock(HttpCalloutMock.class, new MockGetEntriesSuccess());

        System.runAs(getRunAsUser()) {
            Test.startTest();
            List<Map<String,Object>> messages = AgentChatAPIController.getCleanedMessages(
                'mock-token', 'conv-001', 'MyES'
            );
            Test.stopTest();

            // RoutingWorkItem entry must be filtered; 2 real messages expected
            System.assertEquals(2, messages.size(), 'Should return 2 cleaned messages');
            System.assertEquals('Bot',     (String)messages[0].get('senderRole'));
            System.assertEquals('EndUser', (String)messages[1].get('senderRole'));
            System.assertEquals('Hello from bot',  (String)messages[0].get('text'));
            System.assertEquals('Hello from user', (String)messages[1].get('text'));
        }
    }

    /** @description Verifies getCleanedMessages throws when accessToken is blank. */
    @IsTest
    static void testGetCleanedMessagesMissingParametersThrowsException() {
        System.runAs(getRunAsUser()) {
            Test.startTest();
            Boolean exceptionThrown = false;
            try {
                AgentChatAPIController.getCleanedMessages('', 'conv-001', 'MyES');
            } catch (AuraHandledException ex) {
                exceptionThrown = true;
            }
            Test.stopTest();

            System.assert(exceptionThrown, 'Expected AuraHandledException for blank accessToken');
        }
    }

    /** @description Verifies getCleanedMessages throws when all parameters are null. */
    @IsTest
    static void testGetCleanedMessagesAllParamsBlankThrowsException() {
        System.runAs(getRunAsUser()) {
            Test.startTest();
            Boolean exceptionThrown = false;
            try {
                AgentChatAPIController.getCleanedMessages(null, null, null);
            } catch (AuraHandledException ex) {
                exceptionThrown = true;
            }
            Test.stopTest();

            System.assert(exceptionThrown, 'Expected AuraHandledException for all null params');
        }
    }

    /** @description Verifies getCleanedMessages throws when the entries callout returns HTTP 500. */
    @IsTest
    static void testGetCleanedMessagesHttpErrorThrowsException() {
        Test.setMock(HttpCalloutMock.class, new MockGetEntriesFailure());

        System.runAs(getRunAsUser()) {
            Test.startTest();
            Boolean exceptionThrown = false;
            try {
                AgentChatAPIController.getCleanedMessages('mock-token', 'conv-001', 'MyES');
            } catch (AuraHandledException ex) {
                exceptionThrown = true;
            }
            Test.stopTest();

            System.assert(exceptionThrown, 'Expected AuraHandledException on HTTP 500');
        }
    }

    /** @description Verifies getCleanedMessages returns an empty list when conversationEntries is absent. */
    @IsTest
    static void testGetCleanedMessagesNullConversationEntriesReturnsEmpty() {
        Test.setMock(HttpCalloutMock.class, new MockGetEntriesNullEntries());

        System.runAs(getRunAsUser()) {
            Test.startTest();
            List<Map<String,Object>> messages = AgentChatAPIController.getCleanedMessages(
                'mock-token', 'conv-001', 'MyES'
            );
            Test.stopTest();

            System.assertEquals(0, messages.size(), 'Should return empty list when entries is null');
        }
    }

    /** @description Verifies an entry with no abstractMessage is skipped rather than throwing. */
    @IsTest
    static void testGetCleanedMessagesNoAbstractMessageSkipped() {
        Test.setMock(HttpCalloutMock.class, new MockGetEntriesNoAbstractMsg());

        System.runAs(getRunAsUser()) {
            Test.startTest();
            List<Map<String,Object>> messages = AgentChatAPIController.getCleanedMessages(
                'mock-token', 'conv-001', 'MyES'
            );
            Test.stopTest();

            System.assertEquals(0, messages.size(), 'Entry without abstractMessage should be skipped');
        }
    }

    /** @description Verifies an entry with no staticContent is skipped rather than throwing. */
    @IsTest
    static void testGetCleanedMessagesNoStaticContentSkipped() {
        Test.setMock(HttpCalloutMock.class, new MockGetEntriesNoStaticContent());

        System.runAs(getRunAsUser()) {
            Test.startTest();
            List<Map<String,Object>> messages = AgentChatAPIController.getCleanedMessages(
                'mock-token', 'conv-001', 'MyES'
            );
            Test.stopTest();

            System.assertEquals(0, messages.size(), 'Entry without staticContent should be skipped');
        }
    }

    /** @description Verifies an entry with blank text is skipped rather than returned. */
    @IsTest
    static void testGetCleanedMessagesBlankTextSkipped() {
        Test.setMock(HttpCalloutMock.class, new MockGetEntriesBlankText());

        System.runAs(getRunAsUser()) {
            Test.startTest();
            List<Map<String,Object>> messages = AgentChatAPIController.getCleanedMessages(
                'mock-token', 'conv-001', 'MyES'
            );
            Test.stopTest();

            System.assertEquals(0, messages.size(), 'Entry with blank text should be skipped');
        }
    }

    /** @description Verifies an entry with no sender defaults senderRole to 'Unknown'. */
    @IsTest
    static void testGetCleanedMessagesNullSenderReturnsUnknown() {
        Test.setMock(HttpCalloutMock.class, new MockGetEntriesNullSender());

        System.runAs(getRunAsUser()) {
            Test.startTest();
            List<Map<String,Object>> messages = AgentChatAPIController.getCleanedMessages(
                'mock-token', 'conv-001', 'MyES'
            );
            Test.stopTest();

            System.assertEquals(1, messages.size());
            System.assertEquals('Unknown', (String)messages[0].get('senderRole'),
                'Null sender should default to Unknown');
        }
    }

    /* ═══════════════════════════════════════════════════════════════════════
       5. closeConversation
    ═══════════════════════════════════════════════════════════════════════ */

    /** @description Verifies closeConversation reports success on HTTP 200. */
    @IsTest
    static void testCloseConversation200() {
        Test.setMock(HttpCalloutMock.class, new MockCloseConversationSuccess());

        System.runAs(getRunAsUser()) {
            Test.startTest();
            String result = AgentChatAPIController.closeConversation(
                'conv-001', 'mock-token', 'MyES'
            );
            Test.stopTest();

            System.assertEquals('Conversation closed successfully.', result);
        }
    }

    /** @description Verifies closeConversation reports success on HTTP 204. */
    @IsTest
    static void testCloseConversation204() {
        Test.setMock(HttpCalloutMock.class, new MockCloseConversation204());

        System.runAs(getRunAsUser()) {
            Test.startTest();
            String result = AgentChatAPIController.closeConversation(
                'conv-001', 'mock-token', 'MyES'
            );
            Test.stopTest();

            System.assertEquals('Conversation closed successfully.', result);
        }
    }

    /** @description Verifies closeConversation returns a failure message (not an exception) on HTTP error. */
    @IsTest
    static void testCloseConversationFailure() {
        Test.setMock(HttpCalloutMock.class, new MockCloseConversationFailure());

        System.runAs(getRunAsUser()) {
            Test.startTest();
            String result = AgentChatAPIController.closeConversation(
                'conv-001', 'mock-token', 'MyES'
            );
            Test.stopTest();

            System.assert(result.startsWith('Failed:'), 'Should indicate failure');
        }
    }
}