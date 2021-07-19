public with sharing class HierarchyController {
    @AuraEnabled
    public static List<HierarchyWrapper> getHierarchyRecords(
        String objectName,
        String parentId,
        Integer recordsPerBatch,
        Integer batchNumber
    ) {
        String query = 'SELECT Id, RecordType.Name, Name FROM ' + objectName;
        String whereStatement = '';

        if (String.isBlank(parentId)) {
            whereStatement = ' WHERE ParentId = null AND RecordType.Name = \'Chain\'';
        } else {
            whereStatement = ' WHERE ParentId =\'' + parentId + '\'';
        }
        query += whereStatement;
        query +=
            ' LIMIT ' +
            recordsPerBatch +
            ' OFFSET ' +
            batchNumber * recordsPerBatch;
        List<SObject> records = Database.query(query);
        System.debug(query);
        return wrapRecords(records);
    }

    @AuraEnabled
    public static Integer getHierarchyRecordCount(
        String objectName,
        String parentId
    ) {
        String query = 'SELECT COUNT() FROM ' + objectName;
        String whereStatement = '';

        if (String.isBlank(parentId)) {
            whereStatement = ' WHERE ParentId = null AND RecordType.Name = \'Chain\'';
        } else {
            whereStatement = ' WHERE ParentId =\'' + parentId + '\'';
        }
        query += whereStatement;
        system.debug(query);
        return Database.countQuery(query);
    }

    private static List<HierarchyWrapper> wrapRecords(
        List<SObject> recordsToWrap
    ) {
        List<HierarchyWrapper> recordsToReturn = new List<HierarchyWrapper>();
        for (SObject recordToWrap : recordsToWrap) {
            HierarchyWrapper wrapper = new HierarchyWrapper();
            wrapper.hierarchyLevel = (String) recordToWrap.getSObject(
                    'RecordType'
                )
                .get('Name');
            wrapper.recordId = recordToWrap.Id;
            wrapper.recordName = (String) recordToWrap.get('Name');
            recordsToReturn.add(wrapper);
        }
        system.debug(recordsToReturn);
        return recordsToReturn;
    }

    public class HierarchyWrapper {
        @AuraEnabled
        public String recordName;
        @AuraEnabled
        public String hierarchyLevel;
        @AuraEnabled
        public String recordId;
    }
}
