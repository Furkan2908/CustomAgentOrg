/**
 * ――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――
 * Class Name      : AgentConfigServiceTest
 * Author          : Furkan Ghalwade
 * Created Date    : Mar 25, 2026
 * Last Modified By: Furkan Ghalwade
 * Last Modified On: Apr 15, 2026
 * Description     : Test class for AgentConfigService.
 *                   Validates that getConfigByName returns a correct
 *                   AgentConfigDTO, handles blank input, and handles
 *                   not-found gracefully.
 *
 * Change History  :
 *  Date          │   Author           │   Change
 * ――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――
 *  Mar 25, 2026  │ Furkan Ghalwade    │ Initial version
 *  Apr 10, 2026  │ Furkan Ghalwade    │ Updated for DTO return type (namespace-safe)
 *  Apr 15, 2026  │ Furkan Ghalwade    │ Fixed homeWidth default assertion (700 → 1500)
 * ――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――
 */

@IsTest
public class AgentConfigServiceTest {

    // ─────────────────────────────────────────────────────────────────────────
    // TEST DATA FACTORY
    // ─────────────────────────────────────────────────────────────────────────

     /**
     * Creates and inserts a fully-populated Agent_Configuration__c record,
     * then re-queries it to get the auto-generated Name field.
     * @return the inserted Agent_Configuration__c, re-queried with Id and Name
     */
    private static Agent_Configuration__c createTestConfig() {
        Agent_Configuration__c config = new Agent_Configuration__c(
            Agent_name__c                      = 'Test Agent',
            showPanel__c                       = true,
            showSidePanel__c                   = false,
            Embedded_Service_API_Name__c       = 'Enhanced_API',
            Enable_PreChat__c                  = true,
            Primary_Color__c                   = '#FF0000',
            Secondary_Color__c                 = '#00FF00',
            Background_Color__c                = '#FFFFFF',
            Header_color__c                    = '#0000FF',
            Gradient_Start__c                  = '#AAAAAA',
            Gradient_End__c                    = '#BBBBBB',
            User_Bubble_Color__c               = '#111111',
            User_message_color__c              = '#222222',
            Bot_Bubble_Color__c                = '#333333',
            Bot_message_color__c               = '#444444',
            Sparkle_Color__c                   = '#555555',
            Wifi_Ring_Color__c                 = '#666666',
            Font_family__c                     = 'Inter',
            Header_font_size__c                = 24,
            Message_font_size__c               = 14,
            Home_Panel_Width__c                = 600,
            Home_Panel_Height__c               = 500,
            Home_Panel_border_radius__c        = 20,
            Home_Panel_Avatar_Border_Radius__c = 50,
            Side_Panel_Width__c                = 350,
            Size_Panel_Height__c               = 650,
            Welcome_Message__c                 = 'Hello!',
            Welcome_Description__c             = 'How can we help?',
            Welcome_Disclaimer__c              = 'Terms apply.',
            Input_Placeholder__c               = 'Type here...',
            Side_Panel_Toast_Msg__c            = 'Chat active',
            First_Bot_Message__c               = 'Hi there!',
            Typing_Indicator_Text__c           = 'Agent is typing...',
            Resume_Button_Label__c             = 'Resume',
            PreChat_Fields_Config__c           = '[{"label":"Name","apiName":"Name","type":"text","required":true}]',
            Header_Content__c                  = 'Support Chat',
            Theme_Mode__c                      = 'Light'
        );
        insert config;

        // Re-query to get the auto-generated Name (auto-number field)
        return [
            SELECT Id, Name
            FROM Agent_Configuration__c
            WHERE Id = :config.Id
            LIMIT 1
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST: SUCCESS — valid config name returns correct DTO
    // ─────────────────────────────────────────────────────────────────────────
    
    @IsTest
    static void testGetConfigByNameSuccess() {
        Agent_Configuration__c config = createTestConfig();

        Test.startTest();
        AgentConfigDTO result = AgentConfigService.getConfigByName(config.Name);
        Test.stopTest();

        assertRecordIdentity(config, result);
        assertBranding(result);
        assertColors(result);
        assertTypography(result);
        assertSizing(result);
        assertContent(result);
        assertIntegration(result);
    }

    private static void assertRecordIdentity(Agent_Configuration__c config, AgentConfigDTO result) {
        System.assertNotEquals(null, result, 'DTO should not be null');
        System.assertEquals(config.Id, result.recordId, 'recordId should match');
        System.assertEquals(config.Name, result.name, 'name should match');
        System.assertEquals(true, result.showPanel, 'showPanel should be true');
        System.assertEquals(false, result.showSidePanel, 'showSidePanel should be false');
    }

    private static void assertBranding(AgentConfigDTO result) {
        System.assertEquals('Test Agent', result.agentName, 'agentName should match');
        System.assertEquals('Enhanced_API', result.embeddedApiName, 'embeddedApiName should match');
        System.assertEquals('Support Chat', result.headerContent, 'headerContent should match');
        System.assertEquals('Light', result.themeMode, 'themeMode should match');
    }

    private static void assertColors(AgentConfigDTO result) {
        System.assertEquals('#FF0000', result.primaryColor, 'primaryColor should match');
        System.assertEquals('#00FF00', result.secondaryColor, 'secondaryColor should match');
        System.assertEquals('#FFFFFF', result.backgroundColor, 'backgroundColor should match');
        System.assertEquals('#0000FF', result.headerColor, 'headerColor should match');
        System.assertEquals('#AAAAAA', result.gradientStart, 'gradientStart should match');
        System.assertEquals('#BBBBBB', result.gradientEnd, 'gradientEnd should match');
        System.assertEquals('#111111', result.userBubbleColor, 'userBubbleColor should match');
        System.assertEquals('#222222', result.userMsgColor, 'userMsgColor should match');
        System.assertEquals('#333333', result.botBubbleColor, 'botBubbleColor should match');
        System.assertEquals('#444444', result.botMsgColor, 'botMsgColor should match');
        System.assertEquals('#555555', result.sparkleColor, 'sparkleColor should match');
        System.assertEquals('#666666', result.wifiColor, 'wifiColor should match');
    }

    private static void assertTypography(AgentConfigDTO result) {
        System.assertEquals('Inter', result.fontFamily, 'fontFamily should match');
        System.assertEquals(24, result.headerFontSize, 'headerFontSize should match');
        System.assertEquals(14, result.messageFontSize, 'messageFontSize should match');
    }

    private static void assertSizing(AgentConfigDTO result) {
        System.assertEquals(600, result.homeWidth, 'homeWidth should match');
        System.assertEquals(500, result.homeHeight, 'homeHeight should match');
        System.assertEquals(20, result.homeRadius, 'homeRadius should match');
        System.assertEquals(50, result.homeAvatarRadius, 'homeAvatarRadius should match');
        System.assertEquals(350, result.sideWidth, 'sideWidth should match');
        System.assertEquals(650, result.sideHeight, 'sideHeight should match');
    }

    private static void assertContent(AgentConfigDTO result) {
        System.assertEquals('Hello!', result.welcomeMessage, 'welcomeMessage should match');
        System.assertEquals('How can we help?', result.welcomeDesc, 'welcomeDesc should match');
        System.assertEquals('Terms apply.', result.welcomeDisclaimer, 'welcomeDisclaimer should match');
        System.assertEquals('Type here...', result.inputPlaceholder, 'inputPlaceholder should match');
        System.assertEquals('Chat active', result.sideToastMsg, 'sideToastMsg should match');
        System.assertEquals('Hi there!', result.firstBotMessage, 'firstBotMessage should match');
        System.assertEquals('Agent is typing...', result.typingIndicator, 'typingIndicator should match');
        System.assertEquals('Resume', result.resumeLabel, 'resumeLabel should match');
    }

    private static void assertIntegration(AgentConfigDTO result) {
        System.assertEquals(true, result.enablePreChat, 'enablePreChat should be true');
        System.assertNotEquals(null, result.preChatConfig, 'preChatConfig should not be null');
        System.assert(result.preChatConfig.contains('apiName'), 'preChatConfig JSON should contain apiName key');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST: BLANK INPUT — null and empty string both return null
    // ─────────────────────────────────────────────────────────────────────────

    private static User createTestUser() {
        Profile p = [SELECT Id FROM Profile WHERE Name = 'Standard User' LIMIT 1];
        User u = new User(
            Alias             = 'tuser',
            Email             = 'testuser@example.com',
            EmailEncodingKey  = 'UTF-8',
            LastName          = 'TestUser',
            LanguageLocaleKey = 'en_US',
            LocaleSidKey      = 'en_US',
            ProfileId         = p.Id,
            TimeZoneSidKey    = 'America/Los_Angeles',
            UserName          = 'testuser' + DateTime.now().getTime() + '@example.com'
        );
        insert u;
        return u;
    }

    @IsTest
    static void testGetConfigByNameNullInput() {
        User testUser = createTestUser();
        AgentConfigDTO result;

        Test.startTest();
        System.runAs(testUser) {
            result = AgentConfigService.getConfigByName(null);
        }
        Test.stopTest();

        System.assertEquals(null, result, 'null input should return null DTO');
    }

    @IsTest
    static void testGetConfigByNameEmptyStringInput() {

        Test.startTest();
        AgentConfigDTO result = AgentConfigService.getConfigByName('');
        Test.stopTest();

        System.assertEquals(null, result, 'empty string input should return null DTO');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST: NOT FOUND — non-existent name returns null
    // ─────────────────────────────────────────────────────────────────────────

    @IsTest
    static void testGetConfigByNameNotFound() {

        Test.startTest();
        AgentConfigDTO result = AgentConfigService.getConfigByName('NoSuchConfig_XYZ');
        Test.stopTest();

        System.assertEquals(null, result, 'unknown name should return null DTO');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEST: NULL SIZING FIELDS — Apex defaults applied correctly
    // ─────────────────────────────────────────────────────────────────────────

    @IsTest
    static void testGetConfigByNameDefaultSizing() {

        // Insert minimal record — no sizing fields set
        Agent_Configuration__c config = new Agent_Configuration__c(
            Agent_name__c = 'Minimal Agent'
        );
        insert config;

        config = [SELECT Id, Name FROM Agent_Configuration__c WHERE Id = :config.Id LIMIT 1];

        Test.startTest();
        AgentConfigDTO result = AgentConfigService.getConfigByName(config.Name);
        Test.stopTest();

        System.assertNotEquals(null, result, 'DTO should not be null for minimal record');

        // Apex defaults should kick in when fields are null
        System.assertEquals(1500, result.homeWidth,        'default homeWidth should be 1500');  // fixed: was 700
        System.assertEquals(560,  result.homeHeight,       'default homeHeight should be 560');
        System.assertEquals(24,   result.homeRadius,       'default homeRadius should be 24');
        System.assertEquals(50,   result.homeAvatarRadius, 'default homeAvatarRadius should be 50');
        System.assertEquals(320,  result.sideWidth,        'default sideWidth should be 320');
        System.assertEquals(640,  result.sideHeight,       'default sideHeight should be 640');
        System.assertEquals(28,   result.headerFontSize,   'default headerFontSize should be 28');
        System.assertEquals(15,   result.messageFontSize,  'default messageFontSize should be 15');

        // Boolean fields should default to false (not null)
        System.assertEquals(false, result.showPanel,     'showPanel default should be false');
        System.assertEquals(false, result.showSidePanel, 'showSidePanel default should be false');
        System.assertEquals(false, result.enablePreChat, 'enablePreChat default should be false');
    }
}