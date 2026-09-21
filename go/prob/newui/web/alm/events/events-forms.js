/*
© 2025 Sharon Aicler (saichler@gmail.com)
Layer 8 Ecosystem is licensed under the Apache License, Version 2.0.
*/
// ALM Events Module - Form Definitions & Primary Keys
//
// The base form is l8ui's shared EventRecord definition; probler appends the
// one field it has no section for — generatedAlarmId, the alarm this event
// raised — as a reference to the Alarm service, which is what the old form's
// alarmId reference did before events moved to l8events.

(function() {
    'use strict';

    window.AlmEvents = window.AlmEvents || {};

    const f = Layer8FormFactory;

    AlmEvents.primaryKeys = {
        EventRecord: 'eventId'
    };

    const eventForm = L8EventsEventViewer.getFormDefinition();
    eventForm.sections.push(
        f.section('Correlation', [
            ...f.reference('generatedAlarmId', 'Generated Alarm', 'Alarm')
        ])
    );

    AlmEvents.forms = {
        EventRecord: eventForm
    };

})();
