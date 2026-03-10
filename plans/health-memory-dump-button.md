# Plan: Add Memory Dump Button to Health Details Popup

## Overview
Add a "Memory Dump" button to the System/Health detail popup that fetches a pprof memory dump for the selected service and downloads it as a `.dat` file.

## How It Works

### Request
- **Endpoint**: Same Health GET endpoint (`/0/Health`)
- **Method**: GET
- **Body parameter (`?body=`)**: Instead of an L8Query, send the L8Health JSON payload for the selected service (the `rawData` object already stored in `healthDataMap`)
- The server recognizes this as a memory dump request because the body is an L8Health object rather than an L8Query

### Response
- The server returns the same L8Health payload with a populated `pprof` field (base64-encoded `[]byte` in JSON)
- The `pprof` field contains the raw pprof memory profile data

### File Download
- Decode the base64 `pprof` data into binary
- Create a Blob and trigger a browser download
- Filename: `<alias>.dat` (e.g., `collector.dat`, `parser.dat`)

## Changes

### File: `go/prob/newui/web/l8ui/sys/health/l8health.js`

#### 1. Add `fetchMemoryDump(rawData)` function (~25 lines)
- Constructs the GET request to the Health endpoint
- Encodes the `rawData` (L8Health payload) as `?body=` parameter (same as L8Query encoding: `encodeURIComponent(JSON.stringify(rawData))`)
- On success, reads `response.pprof` (base64 string)
- Decodes base64 to binary using `atob()` + `Uint8Array`
- Creates a `Blob` with type `application/octet-stream`
- Creates a temporary `<a>` element with `URL.createObjectURL(blob)`, sets `download` to `rawData.alias + ".dat"`, clicks it, then cleans up
- Shows an error via alert or popup if the response has no `pprof` data

#### 2. Modify `showHealthDetailsModal(rowData)` to add button
- Change `showFooter: false` to `showFooter: true`
- Add a custom footer button "Memory Dump" using Layer8DPopup's `buttons` or `customFooter` option
- The button calls `fetchMemoryDump(rawData)` with the raw L8Health data for the selected service
- Add a loading/disabled state while the fetch is in progress to prevent double-clicks

### No other files need changes
- No CSS changes needed (l8ui popup buttons are already styled)
- No new files needed
- No backend changes needed (server already supports this)

## Implementation Details

### GET Request Construction
```javascript
var endpoint = getHealthEndpoint();
var body = encodeURIComponent(JSON.stringify(rawData));
fetch(endpoint + '?body=' + body, {
    method: 'GET',
    headers: Layer8DConfig.getAuthHeaders()
})
```

### Base64 to File Download
```javascript
var binaryStr = atob(responseData.pprof);
var bytes = new Uint8Array(binaryStr.length);
for (var i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
}
var blob = new Blob([bytes], { type: 'application/octet-stream' });
var url = URL.createObjectURL(blob);
var a = document.createElement('a');
a.href = url;
a.download = rawData.alias + '.dat';
a.click();
URL.revokeObjectURL(url);
```

## Estimated Scope
- ~40 lines of new code in `l8health.js`
- Single file change
