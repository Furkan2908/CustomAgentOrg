/**
 * ――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――
 * Class Name      : AgentConfigurationController
 * Author          : <YourName>
 * Created Date    : Feb 20, 2026
 * Last Modified By: <YourName>
 * Last Modified On: Feb 20, 2026
 * Description     : This class implements for......
 *
 * Change History  :
 *  Date          │   Author     │   Change
 * ――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――
 *  Feb 20, 2026  │ <YourName>   │ Initial version
 * ――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――
 */

public with sharing class AgentConfigurationController {

    /**
     * Given a ContentDocument Id (from lightning-file-upload),
     * returns the latest ContentVersion's download URL.
     * This URL can be stored in Avatar_URL__c and used directly as <img src=...>
     *
     * @param contentDocumentId Id of the ContentDocument uploaded by the user
     * @return String Public/download URL of the latest ContentVersion
     */
    @AuraEnabled
    public static String getAvatarUrl(Id contentDocumentId) {

        List<ContentVersion> cvList = [
            SELECT Id
            FROM ContentVersion
            WHERE ContentDocumentId = :contentDocumentId
            AND IsLatest = true
            WITH USER_MODE
            LIMIT 1
        ];

        if (cvList.isEmpty()) {
            throw new AuraHandledException('No ContentVersion found for the given ContentDocument.');
        }

        if (!Schema.sObjectType.ContentDistribution.isCreateable()) {
            throw new AuraHandledException('Insufficient permissions to create ContentDistribution.');
        }

        ContentDistribution dist = new ContentDistribution();
        dist.Name = 'Avatar Public Link';
        dist.ContentVersionId = cvList[0].Id;

        dist.PreferencesAllowViewInBrowser = true;
        dist.PreferencesAllowOriginalDownload = true;
        dist.PreferencesLinkLatestVersion = true;
        dist.PreferencesNotifyOnVisit = false;

        insert as user dist;

        dist = [
            SELECT ContentDownloadUrl, DistributionPublicUrl
            FROM ContentDistribution
            WHERE Id = :dist.Id
            WITH USER_MODE
        ];

        return dist.ContentDownloadUrl;
    }

    /**
     * Retrieves up to 50 most recent Agent_Config_Version__c records for a given
     * Agent_Configuration__c parent, ordered by version number descending.
     *
     * @param configId Id of the parent Agent_Configuration__c record
     * @return List<Agent_Config_Version__c> Versions belonging to the given configuration
     */
    @AuraEnabled(cacheable=true)
    public static List<Agent_Config_Version__c> getVersions(Id configId) {
        return [
            SELECT Id, Name, Version_Number__c, Is_Active__c, CreatedDate
            FROM Agent_Config_Version__c
            WHERE Agent_Configuration__c = :configId
            WITH USER_MODE
            ORDER BY Version_Number__c DESC
            LIMIT 50
        ];
    }
}