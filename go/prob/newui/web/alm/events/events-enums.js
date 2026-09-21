/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// ALM Events Module - Enum Definitions
//
// The alm-local /10/Event service is gone; this module now reads l8events's
// shared EventRecord store at /76/Events. EventRecord's enums live in l8ui's
// L8EventsEnums (severity/state/category), so they are re-exported here rather
// than redefined — a second copy would silently drift from the .pb.go ordering.
//
// Gone with the old Event model: EVENT_TYPE (eventType is a free-form string on
// EventRecord, not an enum) and EVENT_PROCESSING_STATE (renamed to `state`,
// and its 'Processing' member no longer exists — EventState is
// Unspecified/New/Processed/Discarded/Archived).

(function() {
    'use strict';

    window.AlmEvents = window.AlmEvents || {};

    const shared = L8EventsEnums;

    AlmEvents.enums = {
        SEVERITY: shared.SEVERITY.enum,
        EVENT_STATE: shared.EVENT_STATE.enum,
        EVENT_CATEGORY: shared.EVENT_CATEGORY.enum
    };

    AlmEvents.render = {
        severity: shared.render.severity,
        state: shared.render.eventState,
        category: shared.render.eventCategory
    };

})();
