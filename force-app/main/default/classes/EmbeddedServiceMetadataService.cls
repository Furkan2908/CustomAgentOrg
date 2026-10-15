public with sharing class EmbeddedServiceMetadataService {

    // ════════════════════════════════════════════════════════════════════════
    // DTOs
    // ════════════════════════════════════════════════════════════════════════

    public class PrechatFieldDTO {
        @AuraEnabled public String  apiName;
        @AuraEnabled public String  label;
        @AuraEnabled public Boolean required;
        @AuraEnabled public String  fieldType;
        @AuraEnabled public Boolean isHidden;
        @AuraEnabled public Integer displayOrder;
        @AuraEnabled public List<PicklistOptionDTO> options;
    }

    public class PicklistOptionDTO {
        @AuraEnabled public String label;
        @AuraEnabled public String value;
    }

    // ════════════════════════════════════════════════════════════════════════
    // ENTRY POINT
    // ════════════════════════════════════════════════════════════════════════

    @AuraEnabled(cacheable=true)
    public static List<PrechatFieldDTO> getPrechatFields(String deploymentName) {

        List<PrechatFieldDTO> result = new List<PrechatFieldDTO>();

        if (String.isBlank(deploymentName)) {
            return result;
        }

        try {

            String baseUrl   = URL.getOrgDomainUrl().toExternalForm();
            String sessionId = UserInfo.getSessionId();

            return getFieldsFromConfigMetadata(
                baseUrl,
                sessionId,
                deploymentName
            );

        } catch (Exception e) {

            System.debug(
                'EmbeddedServiceMetadataService ERROR: '
                + e.getMessage()
            );

            System.debug(e.getStackTraceString());

            throw new AuraHandledException(
                'Unable to fetch pre-chat fields: '
                + e.getMessage()
            );
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // MAIN IMPLEMENTATION
    // ════════════════════════════════════════════════════════════════════════

    private static List<PrechatFieldDTO> getFieldsFromConfigMetadata(
        String baseUrl,
        String sessionId,
        String deploymentName
    ) {

        List<PrechatFieldDTO> result = new List<PrechatFieldDTO>();

        try {

            // ─────────────────────────────────────────────────────────────
            // STEP 1 — FIND EmbeddedServiceConfig
            // ─────────────────────────────────────────────────────────────

            String soql =
                'SELECT Id, DeveloperName, MasterLabel ' +
                'FROM EmbeddedServiceConfig ' +
                'WHERE DeveloperName = \'' +
                String.escapeSingleQuotes(deploymentName) +
                '\' LIMIT 1';

            String endpoint =
                baseUrl +
                '/services/data/v62.0/tooling/query/?q=' +
                EncodingUtil.urlEncode(soql, 'UTF-8');

            HttpResponse res = doGet(endpoint, sessionId);

            System.debug(
                'EmbeddedServiceConfig Query [' +
                res.getStatusCode() +
                ']: ' +
                res.getBody()
            );

            if (res.getStatusCode() != 200) {
                return result;
            }

            Map<String, Object> body =
                (Map<String, Object>)
                JSON.deserializeUntyped(res.getBody());

            List<Object> records =
                (List<Object>) body.get('records');

            if (records == null || records.isEmpty()) {

                System.debug(
                    'No EmbeddedServiceConfig found for: '
                    + deploymentName
                );

                return result;
            }

            String configId =
                (String)
                ((Map<String, Object>) records[0]).get('Id');

            System.debug('Found Config Id: ' + configId);

            // ─────────────────────────────────────────────────────────────
            // STEP 2 — FETCH METADATA
            // ─────────────────────────────────────────────────────────────

            endpoint =
                baseUrl +
                '/services/data/v62.0/tooling/sobjects/' +
                'EmbeddedServiceConfig/' +
                configId +
                '?fields=Metadata';

            res = doGet(endpoint, sessionId);

            System.debug(
                'EmbeddedServiceConfig Metadata [' +
                res.getStatusCode() +
                ']: ' +
                res.getBody()
            );

            if (res.getStatusCode() != 200) {
                return result;
            }

            Map<String, Object> configBody =
                (Map<String, Object>)
                JSON.deserializeUntyped(res.getBody());

            Map<String, Object> metadata =
                (Map<String, Object>) configBody.get('Metadata');

            if (metadata == null) {

                System.debug('Metadata is NULL');

                return result;
            }

            // VERY IMPORTANT DEBUG
            System.debug(
                'FULL METADATA JSON:\n' +
                JSON.serializePretty(metadata)
            );

            System.debug(
                'TOP LEVEL METADATA KEYS: ' +
                metadata.keySet()
            );

            // ─────────────────────────────────────────────────────────────
            // STEP 3 — FIND PRECHAT FIELDS
            // ─────────────────────────────────────────────────────────────

            List<Object> preChatFields =
                extractPrechatFields(metadata);

            if (preChatFields == null) {

                System.debug(
                    'No pre-chat fields found in metadata.'
                );

                return result;
            }

            System.debug(
                'Pre-chat field count: ' +
                preChatFields.size()
            );

            // ─────────────────────────────────────────────────────────────
            // STEP 4 — MAP DTOs
            // ─────────────────────────────────────────────────────────────

            for (Object fieldObj : preChatFields) {

                try {

                    Map<String, Object> fieldMap =
                        (Map<String, Object>) fieldObj;

                    System.debug(
                        'FIELD JSON:\n' +
                        JSON.serializePretty(fieldMap)
                    );

                    PrechatFieldDTO dto =
                        new PrechatFieldDTO();

                    dto.apiName =
                        firstNonBlank(fieldMap,
                            new List<String>{
                                'formField',
                                'fieldName',
                                'name',
                                'apiName'
                        });

                    dto.label =
                        firstNonBlank(
                            fieldMap,
                            new List<String>{
                                'label',
                                'displayName',
                                'masterLabel'
                            }
                        );

                    dto.required =
                        parseBool(fieldMap.get('isRequired')) ||
                        parseBool(fieldMap.get('required'));

                    dto.isHidden =
                        parseBool(fieldMap.get('isHidden')) ||
                        parseBool(fieldMap.get('hidden'));

                    dto.fieldType =
                        firstNonBlank(fieldMap,
                            new List<String>{
                                'formFieldType',
                                'fieldDataType',
                                'dataType',
                                'type',
                                'fieldType'
                        });

                    dto.displayOrder =
                        intVal(fieldMap.get('displayOrder'));

                    dto.options =
                        parsePicklistOptions(fieldMap);

                    result.add(dto);

                } catch (Exception ex) {

                    System.debug(
                        'Failed parsing field: ' +
                        ex.getMessage()
                    );
                }
            }

            result.sort(new FieldOrderComparator());

            System.debug(
                'FINAL PRECHAT FIELD COUNT: ' +
                result.size()
            );

            return result;

        } catch (Exception e) {

            System.debug(
                'getFieldsFromConfigMetadata ERROR: '
                + e.getMessage()
            );

            System.debug(e.getStackTraceString());

            return result;
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // DYNAMIC FIELD EXTRACTION
    // ════════════════════════════════════════════════════════════════════════

    private static List<Object> extractPrechatFields(
    Map<String, Object> metadata
    ) {

        List<Object> fields = null;

        // ─────────────────────────────────────────────────────────────
        // STRUCTURE 0
        // embeddedServiceForms.embeddedServiceFormFields
        // ─────────────────────────────────────────────────────────────

        Object formsObj = metadata.get('embeddedServiceForms');

        if (formsObj != null) {

            // Case 1 → List<Object>
            if (formsObj instanceof List<Object>) {

                List<Object> formsList =
                    (List<Object>) formsObj;

                for (Object formObj : formsList) {

                    if (!(formObj instanceof Map<String, Object>)) {
                        continue;
                    }

                    Map<String, Object> formMap =
                        (Map<String, Object>) formObj;

                    fields =
                        (List<Object>)
                        formMap.get('embeddedServiceFormFields');

                    if (fields != null && !fields.isEmpty()) {

                        System.debug(
                            'Matched Structure 0A'
                        );

                        return fields;
                    }
                }
            }

            // Case 2 → Single Map<String,Object>
            else if (formsObj instanceof Map<String, Object>) {

                Map<String, Object> formMap =
                    (Map<String, Object>) formsObj;

                fields =
                    (List<Object>)
                    formMap.get('embeddedServiceFormFields');

                if (fields != null && !fields.isEmpty()) {

                    System.debug(
                        'Matched Structure 0B'
                    );

                    return fields;
                }
            }
        }

        // ─────────────────────────────────────────────────────────────
        // STRUCTURE 1
        // embeddedServiceMessagingChannel.preChatFields
        // ─────────────────────────────────────────────────────────────

        Map<String, Object> esmc =
            getNestedMap(metadata, 'embeddedServiceMessagingChannel');

        if (esmc != null) {

            fields =
                (List<Object>) esmc.get('preChatFields');

            if (fields != null && !fields.isEmpty()) {

                System.debug(
                    'Matched Structure 1'
                );

                return fields;
            }
        }

        // ─────────────────────────────────────────────────────────────
        // STRUCTURE 2
        // embeddedServiceMessagingChannel.forms.preChat.fields
        // ─────────────────────────────────────────────────────────────

        if (esmc != null) {

            Map<String, Object> forms =
                getNestedMap(esmc, 'forms');

            Map<String, Object> preChat =
                forms != null
                    ? getNestedMap(forms, 'preChat')
                    : null;

            if (preChat != null) {

                fields =
                    (List<Object>) preChat.get('fields');

                if (fields != null && !fields.isEmpty()) {

                    System.debug(
                        'Matched Structure 2'
                    );

                    return fields;
                }
            }
        }

        // ─────────────────────────────────────────────────────────────
        // STRUCTURE 3
        // conversationConfiguration.preChatForm.fields
        // ─────────────────────────────────────────────────────────────

        Map<String, Object> conversationConfiguration =
            getNestedMap(metadata, 'conversationConfiguration');

        if (conversationConfiguration != null) {

            Map<String, Object> preChatForm =
                getNestedMap(
                    conversationConfiguration,
                    'preChatForm'
                );

            if (preChatForm != null) {

                fields =
                    (List<Object>) preChatForm.get('fields');

                if (fields != null && !fields.isEmpty()) {

                    System.debug(
                        'Matched Structure 3'
                    );

                    return fields;
                }
            }
        }

        // ─────────────────────────────────────────────────────────────
        // STRUCTURE 4
        // embeddedServiceLiveAgent.preChatFields
        // ─────────────────────────────────────────────────────────────

        Map<String, Object> liveAgent =
            getNestedMap(metadata, 'embeddedServiceLiveAgent');

        if (liveAgent != null) {

            fields =
                (List<Object>) liveAgent.get('preChatFields');

            if (fields != null && !fields.isEmpty()) {

                System.debug(
                    'Matched Structure 4'
                );

                return fields;
            }
        }

        // ─────────────────────────────────────────────────────────────
        // STRUCTURE 5
        // Top-level preChatFields
        // ─────────────────────────────────────────────────────────────

        fields =
            (List<Object>) metadata.get('preChatFields');

        if (fields != null && !fields.isEmpty()) {

            System.debug(
                'Matched Structure 5'
            );

            return fields;
        }

        System.debug(
            'No matching pre-chat field structure found.'
        );

        return new List<Object>();
    }

    // ════════════════════════════════════════════════════════════════════════
    // PICKLIST OPTIONS
    // ════════════════════════════════════════════════════════════════════════

    private static List<PicklistOptionDTO> parsePicklistOptions(
        Map<String, Object> fieldMap
    ) {

        List<PicklistOptionDTO> result =
            new List<PicklistOptionDTO>();

        try {

            List<Object> options =
                (List<Object>) fieldMap.get('options');

            if (options == null) {
                options =
                    (List<Object>) fieldMap.get('picklistOptions');
            }

            if (options == null) {
                return result;
            }

            for (Object optionObj : options) {

                Map<String, Object> optionMap =
                    (Map<String, Object>) optionObj;

                PicklistOptionDTO dto =
                    new PicklistOptionDTO();

                dto.label =
                    firstNonBlank(
                        optionMap,
                        new List<String>{
                            'label',
                            'displayName'
                        }
                    );

                dto.value =
                    firstNonBlank(
                        optionMap,
                        new List<String>{
                            'value',
                            'name'
                        }
                    );

                result.add(dto);
            }

        } catch (Exception e) {

            System.debug(
                'parsePicklistOptions ERROR: '
                + e.getMessage()
            );
        }

        return result;
    }

    // ════════════════════════════════════════════════════════════════════════
    // SORTING
    // ════════════════════════════════════════════════════════════════════════

    private class FieldOrderComparator
        implements Comparator<PrechatFieldDTO> {

        public Integer compare(
            PrechatFieldDTO a,
            PrechatFieldDTO b
        ) {

            Integer aOrder =
                a.displayOrder == null
                    ? 9999
                    : a.displayOrder;

            Integer bOrder =
                b.displayOrder == null
                    ? 9999
                    : b.displayOrder;

            return aOrder - bOrder;
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // HTTP
    // ════════════════════════════════════════════════════════════════════════

    private static HttpResponse doGet(
        String endpoint,
        String sessionId
    ) {

        HttpRequest req = new HttpRequest();

        req.setEndpoint(endpoint);
        req.setMethod('GET');

        req.setHeader(
            'Authorization',
            'Bearer ' + sessionId
        );

        req.setHeader(
            'Content-Type',
            'application/json'
        );

        req.setTimeout(20000);

        return new Http().send(req);
    }

    // ════════════════════════════════════════════════════════════════════════
    // HELPERS
    // ════════════════════════════════════════════════════════════════════════

    private static Map<String, Object> getNestedMap(
        Map<String, Object> parent,
        String key
    ) {

        if (parent == null) {
            return null;
        }

        Object value = parent.get(key);

        if (value == null) {
            return null;
        }

        try {

            return (Map<String, Object>) value;

        } catch (Exception e) {

            return null;
        }
    }

    private static String strVal(
        Map<String, Object> mapObj,
        String key
    ) {

        if (mapObj == null) {
            return '';
        }

        Object value = mapObj.get(key);

        return value == null
            ? ''
            : String.valueOf(value);
    }

    private static String firstNonBlank(
        Map<String, Object> mapObj,
        List<String> keys
    ) {

        for (String key : keys) {

            String value =
                strVal(mapObj, key);

            if (String.isNotBlank(value)) {
                return value;
            }
        }

        return '';
    }

    private static Boolean parseBool(Object value) {

        if (value == null) {
            return false;
        }

        if (value instanceof Boolean) {
            return (Boolean) value;
        }

        return String.valueOf(value)
            .equalsIgnoreCase('true');
    }

    private static Integer intVal(Object value) {

        if (value == null) {
            return 0;
        }

        try {

            return Integer.valueOf(
                String.valueOf(value)
            );

        } catch (Exception e) {

            return 0;
        }
    }
}