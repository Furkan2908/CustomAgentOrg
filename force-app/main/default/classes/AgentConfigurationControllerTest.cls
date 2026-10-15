@IsTest
public class AgentConfigurationControllerTest {

    @IsTest
    static void testGetAvatarUrl() {

        // Step 1: Create a ContentVersion (this auto-creates ContentDocument)
        ContentVersion cv = new ContentVersion(
            Title = 'Test File',
            PathOnClient = 'test.png',
            VersionData = Blob.valueOf('Test Data'),
            IsMajorVersion = true
        );
        insert cv;

        // Fetch ContentDocumentId
        cv = [SELECT Id, ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id];

        System.Test.startTest();
        String url = AgentConfigurationController.getAvatarUrl(cv.ContentDocumentId);
        System.Test.stopTest();

        System.assertNotEquals(null, url);
        System.assert(url.contains('/sfc/dist/version/download/'));
    }
}