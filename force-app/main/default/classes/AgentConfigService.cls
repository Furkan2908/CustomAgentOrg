/**
 * @description Provides read access to published Agent Configuration
 * JSON snapshots by configuration name.
 */
public with sharing class AgentConfigService {

    /**
     * @description Retrieves the currently active, published configuration
     * JSON for the given Agent_Configuration__c name and deserializes it
     * into an AgentConfigDTO.
     * @param configName Name of the parent Agent_Configuration__c record
     * @return the active AgentConfigDTO, or null if none exists
     */
    @AuraEnabled(cacheable=true)
    public static AgentConfigDTO getConfigByName(String configName) {

        if (String.isBlank(configName)) {
            return null;
        }

        List<Agent_Config_Version__c> versions = [

            SELECT
                Published_Config_JSON__c

            FROM Agent_Config_Version__c

            WHERE
                Agent_Configuration__r.Name = :configName
                AND Is_Active__c = true
                
            WITH USER_MODE

            ORDER BY Version_Number__c DESC

            LIMIT 1
        ];

        if (versions.isEmpty()) {
            return null;
        }

        return (AgentConfigDTO)
            JSON.deserialize(
                versions[0].Published_Config_JSON__c,
                AgentConfigDTO.class
            );
    }
}