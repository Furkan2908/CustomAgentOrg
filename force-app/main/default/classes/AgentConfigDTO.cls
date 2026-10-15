/**
 * ――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――
 * Class Name      : AgentConfigDTO
 * Author          : <YourName>
 * Created Date    : Apr 10, 2026
 * Last Modified By: <YourName>
 * Last Modified On: Apr 10, 2026
 * Description     : This class implements for......
 *  
 * Change History  :
 *  Date          │   Author     │   Change
 * ――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――
 *  Apr 10, 2026  │ <YourName>   │ Initial version
 * ――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――
 */

@SuppressWarnings('PMD.ExcessivePublicCount, PMD.ApexDoc, PMD.AvoidBooleanMethodParameters')
public class AgentConfigDTO {

    // ── Identity ──────────────────────────────────────────────────────────────
    @AuraEnabled public Id     recordId          { get; set; }
    @AuraEnabled public String name              { get; set; }

    // ── Panel visibility ──────────────────────────────────────────────────────
    @AuraEnabled public Boolean showPanel        { get; set; }
    @AuraEnabled public Boolean showSidePanel    { get; set; }

    // ── Branding ──────────────────────────────────────────────────────────────
    @AuraEnabled public String agentName         { get; set; }
    @AuraEnabled public String avatarUrl         { get; set; }
    @AuraEnabled public String sendIconUrl       { get; set; }
    @AuraEnabled public String headerContent     { get; set; }
    @AuraEnabled public String themeMode         { get; set; }

    // ── Colors ────────────────────────────────────────────────────────────────
    @AuraEnabled public String primaryColor      { get; set; }
    @AuraEnabled public String secondaryColor    { get; set; }
    @AuraEnabled public String backgroundColor   { get; set; }
    @AuraEnabled public String headerColor       { get; set; }
    @AuraEnabled public String gradientStart     { get; set; }
    @AuraEnabled public String gradientEnd       { get; set; }
    @AuraEnabled public String userBubbleColor   { get; set; }
    @AuraEnabled public String userMsgColor      { get; set; }
    @AuraEnabled public String botBubbleColor    { get; set; }
    @AuraEnabled public String botMsgColor       { get; set; }
    @AuraEnabled public String sparkleColor      { get; set; }
    @AuraEnabled public String wifiColor         { get; set; }

    // ── Typography ────────────────────────────────────────────────────────────
    @AuraEnabled public String  fontFamily       { get; set; }
    @AuraEnabled public String  font             { get; set; }
    @AuraEnabled public Integer headerFontSize   { get; set; }
    @AuraEnabled public Integer messageFontSize  { get; set; }

    // ── Home Panel sizing ─────────────────────────────────────────────────────
    @AuraEnabled public Integer homeWidth        { get; set; }
    @AuraEnabled public Integer homeHeight       { get; set; }
    @AuraEnabled public Integer homeRadius       { get; set; }
    @AuraEnabled public Integer homeAvatarRadius { get; set; }

    // ── Side Panel sizing ─────────────────────────────────────────────────────
    @AuraEnabled public Integer sideWidth        { get; set; }
    @AuraEnabled public Integer sideHeight       { get; set; }

    // ── Messages / Content ────────────────────────────────────────────────────
    @AuraEnabled public String welcomeMessage    { get; set; }
    @AuraEnabled public String welcomeDesc       { get; set; }
    @AuraEnabled public String welcomeDisclaimer { get; set; }
    @AuraEnabled public String inputPlaceholder  { get; set; }
    @AuraEnabled public String sideToastMsg      { get; set; }
    @AuraEnabled public String firstBotMessage   { get; set; }
    @AuraEnabled public String typingIndicator   { get; set; }
    @AuraEnabled public String resumeLabel       { get; set; }

    // ── Integration ───────────────────────────────────────────────────────────
    @AuraEnabled public String  embeddedApiName  { get; set; }
    @AuraEnabled public Boolean enablePreChat    { get; set; }
    @AuraEnabled public String  preChatConfig    { get; set; }
    @AuraEnabled public Boolean fileInput        { get; set; }
}