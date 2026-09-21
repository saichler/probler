/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// ALM Events Module - Column Definitions
//
// Columns come from l8ui's shared L8EventsEventViewer, which is built for
// l8events.EventRecord (occurredAt/category/eventType/severity/sourceName/
// message/state) — the shape /76/Events actually returns. The old hand-written
// column set targeted the deleted Event model and referenced fields EventRecord
// does not have (processingState, nodeName).

(function() {
    'use strict';

    window.AlmEvents = window.AlmEvents || {};

    AlmEvents.columns = {
        EventRecord: L8EventsEventViewer.getColumns()
    };

})();
