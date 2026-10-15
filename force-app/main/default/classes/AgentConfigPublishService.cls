/**
 * ――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――
 * Class Name      : AgentConfigPublishService
 * Author          : <YourName>
 * Created Date    : May 12, 2026
 * Last Modified By: <YourName>
 * Last Modified On: May 12, 2026
 * Description     : This class implements for......
 *
 * Change History  :
 *  Date          │   Author     │   Change
 * ――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――
 *  May 12, 2026  │ <YourName>   │ Initial version
 * ――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――
 */

public with sharing class AgentConfigPublishService {

    /**
     * @description Publishes the given Agent Configuration by serializing its
     * settings into a JSON snapshot and storing that snapshot as a new,
     * active Agent_Config_Version__c record. Any version that was
     * previously active for the same configuration is deactivated first.
     * @param configId Id of the Agent_Configuration__c record to publish
     */
    @AuraEnabled
    public static void publishConfig(Id configId) {

        if (configId == null) {
            throw new AuraHandledException('Config Id is required');
        }

        Agent_Configuration__c rec = fetchConfig(configId);
        AgentConfigDTO dto = buildDto(rec);
        String payload = JSON.serialize(dto);

        deactivateActiveVersions(configId);
        Integer nextVersion = getNextVersionNumber(configId);
        insertNewVersion(configId, payload, nextVersion);
    }

    /**
     * @description Retrieves the Agent_Configuration__c record and all fields
     * required to build the published JSON snapshot.
     * @param configId Id of the Agent_Configuration__c record to fetch
     * @return the Agent_Configuration__c record
     */
    private static Agent_Configuration__c fetchConfig(Id configId) {
        return [
            SELECT Id, Name,
                   showPanel__c, showSidePanel__c,
                   Agent_name__c, Avatar_URL__c, Send_Button_Icon_URL__c,
                   Header_Content__c, Theme_Mode__c,
                   Primary_Color__c, Secondary_Color__c,
                   Background_Color__c, Header_color__c,
                   Gradient_Start__c, Gradient_End__c,
                   User_Bubble_Color__c, User_message_color__c,
                   Bot_Bubble_Color__c, Bot_message_color__c,
                   Sparkle_Color__c, Wifi_Ring_Color__c,
                   Font_family__c, Font__c,
                   Header_font_size__c, Message_font_size__c,
                   Home_Panel_Width__c, Home_Panel_Height__c,
                   Home_Panel_border_radius__c,
                   Home_Panel_Avatar_Border_Radius__c,
                   Side_Panel_Width__c, Size_Panel_Height__c,
                   Welcome_Message__c, Welcome_Description__c,
                   Welcome_Disclaimer__c, Input_Placeholder__c,
                   Side_Panel_Toast_Msg__c, First_Bot_Message__c,
                   Typing_Indicator_Text__c, Resume_Button_Label__c,
                   Embedded_Service_API_Name__c,
                   Enable_PreChat__c, PreChat_Fields_Config__c
            FROM Agent_Configuration__c
            WHERE Id = :configId
            WITH USER_MODE
            LIMIT 1
        ];
    }

    /**
     * @description Maps an Agent_Configuration__c record onto an
     * AgentConfigDTO, applying default values for numeric fields that
     * are not populated on the record.
     * @param rec the Agent_Configuration__c record to map
     * @return a populated AgentConfigDTO
     */
    private static AgentConfigDTO buildDto(Agent_Configuration__c rec) {
        AgentConfigDTO dto = new AgentConfigDTO();

        dto.recordId          = rec.Id;
        dto.name              = rec.Name;

        dto.showPanel         = rec.showPanel__c;
        dto.showSidePanel     = rec.showSidePanel__c;

        dto.agentName         = rec.Agent_name__c;
        dto.avatarUrl         = rec.Avatar_URL__c;
        dto.sendIconUrl       = rec.Send_Button_Icon_URL__c;
        dto.headerContent     = rec.Header_Content__c;
        dto.themeMode         = rec.Theme_Mode__c;

        dto.primaryColor      = rec.Primary_Color__c;
        dto.secondaryColor    = rec.Secondary_Color__c;
        dto.backgroundColor   = rec.Background_Color__c;
        dto.headerColor       = rec.Header_color__c;
        dto.gradientStart     = rec.Gradient_Start__c;
        dto.gradientEnd       = rec.Gradient_End__c;
        dto.userBubbleColor   = rec.User_Bubble_Color__c;
        dto.userMsgColor      = rec.User_message_color__c;
        dto.botBubbleColor    = rec.Bot_Bubble_Color__c;
        dto.botMsgColor       = rec.Bot_message_color__c;
        dto.sparkleColor      = rec.Sparkle_Color__c;
        dto.wifiColor         = rec.Wifi_Ring_Color__c;

        dto.fontFamily        = rec.Font_family__c;
        dto.font              = rec.Font__c;

        dto.headerFontSize    = defaultInt(rec.Header_font_size__c, 28);
        dto.messageFontSize   = defaultInt(rec.Message_font_size__c, 15);
        dto.homeWidth         = defaultInt(rec.Home_Panel_Width__c, 1500);
        dto.homeHeight        = defaultInt(rec.Home_Panel_Height__c, 560);
        dto.homeRadius        = defaultInt(rec.Home_Panel_border_radius__c, 24);
        dto.homeAvatarRadius  = defaultInt(rec.Home_Panel_Avatar_Border_Radius__c, 50);
        dto.sideWidth         = defaultInt(rec.Side_Panel_Width__c, 320);
        dto.sideHeight        = defaultInt(rec.Size_Panel_Height__c, 640);

        dto.welcomeMessage    = rec.Welcome_Message__c;
        dto.welcomeDesc       = rec.Welcome_Description__c;
        dto.welcomeDisclaimer = rec.Welcome_Disclaimer__c;
        dto.inputPlaceholder  = rec.Input_Placeholder__c;
        dto.sideToastMsg      = rec.Side_Panel_Toast_Msg__c;
        dto.firstBotMessage   = rec.First_Bot_Message__c;
        dto.typingIndicator   = rec.Typing_Indicator_Text__c;
        dto.resumeLabel       = rec.Resume_Button_Label__c;

        dto.embeddedApiName   = rec.Embedded_Service_API_Name__c;
        dto.enablePreChat     = rec.Enable_PreChat__c;
        dto.preChatConfig     = rec.PreChat_Fields_Config__c;

        return dto;
    }

    /**
     * @description Returns the given decimal value as an Integer, or the
     * supplied default when the value is null.
     * @param value the source value, may be null
     * @param defaultValue the value to use when value is null
     * @return value as an Integer, or defaultValue
     */
    private static Integer defaultInt(Decimal value, Integer defaultValue) {
        return value != null ? Integer.valueOf(value) : defaultValue;
    }

    /**
     * @description Deactivates any Agent_Config_Version__c records that are
     * currently marked active for the given configuration.
     * @param configId Id of the parent Agent_Configuration__c record
     */
    private static void deactivateActiveVersions(Id configId) {
        List<Agent_Config_Version__c> activeVersions = [
            SELECT Id
            FROM Agent_Config_Version__c
            WHERE Agent_Configuration__c = :configId
            AND Is_Active__c = true
            WITH USER_MODE
        ];

        if (activeVersions.isEmpty()) {
            return;
        }

        for (Agent_Config_Version__c v : activeVersions) {
            v.Is_Active__c = false;
        }

        update as user activeVersions;
    }

    /**
     * @description Calculates the next version number to use for a new
     * Agent_Config_Version__c record belonging to the given configuration.
     * @param configId Id of the parent Agent_Configuration__c record
     * @return the next version number, starting at 1 when none exist
     */
    private static Integer getNextVersionNumber(Id configId) {
        AggregateResult[] results = [
            SELECT MAX(Version_Number__c) maxVersion
            FROM Agent_Config_Version__c
            WHERE Agent_Configuration__c = :configId
            WITH USER_MODE
        ];

        Object maxVersion = results[0].get('maxVersion');

        return maxVersion != null ? Integer.valueOf(maxVersion) + 1 : 1;
    }

    /**
     * @description Inserts a new active Agent_Config_Version__c record
     * holding the published JSON snapshot.
     * @param configId Id of the parent Agent_Configuration__c record
     * @param payload the serialized JSON snapshot to store
     * @param versionNumber the version number to assign to the new record
     */
    private static void insertNewVersion(Id configId, String payload, Integer versionNumber) {
        Agent_Config_Version__c versionRecord = new Agent_Config_Version__c(
            Agent_Configuration__c = configId,
            Published_Config_JSON__c = payload,
            Version_Number__c = versionNumber,
            Published_By__c = UserInfo.getUserId(),
            Published_On__c = System.now(),
            Is_Active__c = true
        );

        insert as user versionRecord;
    }
}